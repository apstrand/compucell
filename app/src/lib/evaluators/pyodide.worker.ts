import { loadPyodide, type PyodideInterface } from 'pyodide';

let pyodide: PyodideInterface | null = null;

async function initPyodide() {
  if (pyodide) return;
  pyodide = await loadPyodide({
    indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.29.3/full/'
  });
  
  // Load common data science packages
  await pyodide.loadPackage(['pandas', 'matplotlib']);
  
  // Setup matplotlib to use a non-interactive backend and provide a helper for rich output
  await pyodide.runPythonAsync(`
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import io, base64

def _matplotlib_to_base64():
    buf = io.BytesIO()
    plt.savefig(buf, format='png', bbox_inches='tight')
    plt.close()
    return base64.b64encode(buf.getvalue()).decode('utf-8')

# Monkey patch plt.show to return the rich representation if called
_old_show = plt.show
def _new_show(*args, **kwargs):
    return _matplotlib_to_base64()
plt.show = _new_show
  `);
}

self.onmessage = async (event) => {
  const { type, code, id } = event.data;

  if (type === 'init') {
    try {
      await initPyodide();
      self.postMessage({ type: 'init-completed', id });
    } catch (error: any) {
      self.postMessage({ type: 'error', error: error.message, id });
    }
    return;
  }

  if (type === 'evaluate') {
    if (!pyodide) {
      await initPyodide();
    }

    let stdout = '';
    let stderr = '';

    if (pyodide) {
      pyodide.setStdout({
        batched: (str) => {
          stdout += str + '\n';
        }
      });
      pyodide.setStderr({
        batched: (str) => {
          stderr += str + '\n';
        }
      });

      try {
        // Special check for matplotlib plt.show() at the end of the code
        let processedCode = code;
        if (code.trim().endsWith('plt.show()')) {
          // Wrap it to ensure it's the returned result
          processedCode = code.trim();
        }

        let result = await pyodide.runPythonAsync(processedCode);
        let formats: { [key: string]: string } = {};

        if (result !== null && result !== undefined) {
          // Check for rich representations
          if (typeof result === 'object') {
            if (typeof result._repr_html_ === 'function') {
              formats['text/html'] = result._repr_html_();
            }
            if (typeof result._repr_png_ === 'function') {
              formats['image/png'] = result._repr_png_();
            }
            // Handle our custom matplotlib string return
            if (typeof result === 'string' && result.length > 1000 && !result.includes(' ')) {
                // Heuristic: looks like a base64 image
                formats['image/png'] = result;
                result = undefined;
            }
          } else if (typeof result === 'string' && result.length > 100 && /^[A-Za-z0-9+/=]+$/.test(result)) {
              // It's likely the base64 from our patched plt.show()
              formats['image/png'] = result;
              result = undefined;
          }

          if (result && typeof result.toJs === 'function') {
            const jsResult = result.toJs();
            result.destroy();
            result = jsResult;
          }
        }

        self.postMessage({
          type: 'evaluate-completed',
          id,
          stdout,
          stderr,
          formats,
          result: result !== undefined ? String(result) : undefined
        });
      } catch (e: any) {
        self.postMessage({
          type: 'evaluate-completed',
          id,
          stdout,
          stderr,
          error: e.message
        });
      }
    }
  }
};
