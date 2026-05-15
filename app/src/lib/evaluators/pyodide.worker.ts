import { loadPyodide, type PyodideInterface } from 'pyodide';

let pyodide: PyodideInterface | null = null;

async function initPyodide() {
  if (pyodide) return;
  pyodide = await loadPyodide({
    indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.29.3/full/'
  });
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
        let result = await pyodide.runPythonAsync(code);
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
          }

          if (typeof result.toJs === 'function') {
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
