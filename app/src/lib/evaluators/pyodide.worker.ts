import { loadPyodide, type PyodideInterface } from 'pyodide';

let pyodide: PyodideInterface | null = null;

async function initPyodide(isTest = false) {
  if (pyodide) return;
  pyodide = await loadPyodide({
    indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.29.3/full/'
  });
  
  if (!isTest) {
    await pyodide.loadPackage(['pandas', 'matplotlib', 'micropip']);
    const micropip = pyodide.pyimport('micropip');
    await micropip.install('plotly');
    
    // Configure plotly for pyodide
    await pyodide.runPythonAsync(`
import plotly.io as pio
plotly_html_template = """
<div id='{id}'></div>
<script type='text/javascript'>
    {script}
    var layout = {layout};
    var data = {data};
    Plotly.newPlot('{id}', data, layout);
</script>
"""
# Set a default renderer that works well with our setup
pio.renderers.default = "notebook"
    `);
  } else {
    // Basic init for tests
    await pyodide.loadPackage(['micropip']);
  }
  
  // Setup matplotlib and rich representation helpers
  await pyodide.runPythonAsync(`
try:
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    import io, base64

    def _matplotlib_to_base64():
        buf = io.BytesIO()
        plt.savefig(buf, format='png', bbox_inches='tight')
        plt.close()
        return base64.b64encode(buf.getvalue()).decode('utf-8')

    # Monkey patch plt.show to return the rich representation
    _old_show = plt.show
    def _new_show(*args, **kwargs):
        return _matplotlib_to_base64()
    plt.show = _new_show
except ImportError:
    pass

def _get_representations(obj):
    reprs = {}
    if obj is None:
        return reprs
        
    # Specialized handling for Plotly figures
    try:
        import plotly.graph_objects as go
        if isinstance(obj, go.Figure):
            reprs["text/html"] = obj.to_html(full_html=False, include_plotlyjs=False)
            return reprs
    except ImportError:
        pass

    # Check for common Jupyter representation methods
    if hasattr(obj, "_repr_html_"):
        try:
            reprs["text/html"] = obj._repr_html_()
        except Exception:
            pass
            
    if hasattr(obj, "_repr_png_"):
        try:
            reprs["image/png"] = obj._repr_png_()
        except Exception:
            pass
            
    # Specialized handling for patched plt.show()
    if isinstance(obj, str) and len(obj) > 100 and not " " in obj:
        reprs["image/png"] = obj
        
    return reprs
  `);
}

self.onmessage = async (event) => {
  const { type, code, id, isTest } = event.data;

  if (type === 'init') {
    try {
      await initPyodide(isTest);
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
        let processedCode = code;
        if (code.trim().endsWith('plt.show()')) {
          processedCode = code.trim();
        }

        let result = await pyodide.runPythonAsync(processedCode);

        let formats: { [key: string]: string } = {};
        
        const pyRepresentations = pyodide.globals.get('_get_representations');
        const pyFormats = pyRepresentations(result);
        formats = pyFormats.toJs();
        pyFormats.destroy();
        pyRepresentations.destroy();

        if (result !== null && result !== undefined) {
          if (typeof result === 'object' && typeof result.toJs === 'function') {
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
          result: result !== undefined && result !== null ? String(result) : undefined
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

