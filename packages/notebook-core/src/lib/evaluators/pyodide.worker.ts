// Defensive environment polyfills for Pyodide in various bundling contexts
(globalThis as any).process = { env: { NODE_DEBUG: undefined } };
(globalThis as any).IN_NODE = false;

import { loadPyodide, type PyodideInterface } from 'pyodide';

let pyodide: PyodideInterface | null = null;

async function initPyodide(isTest = false) {
  if (pyodide) return;
  
  pyodide = await loadPyodide({
    indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/'
  });
  
  if (!isTest) {
    await pyodide.loadPackage(['pandas', 'matplotlib', 'micropip']);
    const micropip = pyodide.pyimport('micropip');
    await micropip.install('plotly');
    
    // Configure plotly for pyodide
    await pyodide.runPythonAsync(`
import plotly.io as pio
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

def _introspect_code(code):
    import ast
    try:
        tree = ast.parse(code)
        defined_names = []
        for node in tree.body:
            if isinstance(node, ast.Assign):
                for target in node.targets:
                    if isinstance(target, ast.Name):
                        defined_names.append(target.id)
            elif isinstance(node, (ast.FunctionDef, ast.ClassDef)):
                defined_names.append(node.name)
        return {"defined_names": defined_names}
    except Exception:
        return {}
  `);
}

/**
 * Robustly ensure an object is safe to send via postMessage.
 */
function safeClone(obj: any, depth = 0): any {
    if (depth > 5) return "[Truncated]";
    if (obj === null || obj === undefined) return obj;
    if (typeof obj === 'number' || typeof obj === 'string' || typeof obj === 'boolean') return obj;

    if (typeof obj === 'object' && typeof obj.toJs === 'function') {
        try {
            return safeClone(obj.toJs(), depth + 1);
        } catch (e) {
            return String(obj);
        }
    }

    if (Array.isArray(obj)) {
        return obj.map(i => safeClone(i, depth + 1));
    }

    if (typeof obj === 'object') {
        const clone: any = {};
        for (const key in obj) {
            try {
                const val = obj[key];
                if (typeof val !== 'function' && typeof val !== 'symbol') {
                    clone[key] = safeClone(val, depth + 1);
                }
            } catch (e) {}
        }
        return clone;
    }
    return String(obj);
}

function sendToMain(message: any) {
    // CRITICAL: Ensure fields like error are explicitly present in the final object
    const payload = {
        type: message.type,
        id: message.id,
        stdout: message.stdout,
        stderr: message.stderr,
        formats: message.formats,
        metadata: message.metadata,
        result: message.result,
        error: message.error
    };

    console.log('Worker: postMessage with error check:', !!payload.error);
    if (payload.error) {
        console.log('Worker: Error value type:', typeof payload.error);
    }
    
    try {
        self.postMessage(payload);
    } catch (e) {
        console.error('Worker: postMessage failed, attempting minimal fallback', e);
        try {
            const simplified = {
                type: message.type,
                id: message.id,
                stdout: String(message.stdout || ''),
                stderr: String(message.stderr || ''),
                result: String(message.result || ''),
                error: message.error ? String(message.error.message || message.error) : 'Serialization Error',
                formats: {},
                metadata: {}
            };
            self.postMessage(simplified);
        } catch (e2) {
            console.error('Worker: Critical failure in postMessage', e2);
        }
    }
}

self.onmessage = async (event) => {
  const { type, code, id, isTest } = event.data;

  if (type === 'init') {
    try {
      await initPyodide(isTest);
      sendToMain({ type: 'init-completed', id });
    } catch (error: any) {
      console.error('Worker init error:', error);
      sendToMain({ type: 'error', error: String(error.message || error), id });
    }
    return;
  }

  if (type === 'evaluate') {
    if (!pyodide) await initPyodide();

    let stdout = '';
    let stderr = '';

    pyodide.setStdout({ batched: (str: string) => { stdout += str + '\n'; } });
    pyodide.setStderr({ batched: (str: string) => { stderr += str + '\n'; } });

    try {
        let result = await pyodide.runPythonAsync(code);
        
        let formats: any = {};
        let metadata: any = {};
        
        try {
            const pyRepr = pyodide.globals.get('_get_representations');
            const pyResultProxy = pyRepr(result);
            formats = safeClone(pyResultProxy);
            if (pyResultProxy && pyResultProxy.destroy) pyResultProxy.destroy();
            pyRepr.destroy();

            const pyIntrospect = pyodide.globals.get('_introspect_code');
            const pyMetadataProxy = pyIntrospect(code);
            metadata = safeClone(pyMetadataProxy);
            if (pyMetadataProxy && pyMetadataProxy.destroy) pyMetadataProxy.destroy();
            pyIntrospect.destroy();
        } catch (e) {
            console.error('Worker: Post-processing error:', e);
        }

        const finalResult = safeClone(result);
        if (result && result.destroy) result.destroy();

        sendToMain({
            type: 'evaluate-completed',
            id,
            stdout: String(stdout),
            stderr: String(stderr),
            formats,
            metadata,
            result: finalResult !== undefined ? String(finalResult) : undefined,
            error: undefined
        });

    } catch (e: any) {
        console.error('Worker: Evaluation error caught in catch:', e);
        // CRITICAL: Explicitly stringify the error here!
        const errorMessage = String(e.message || e);
        
        sendToMain({
            type: 'evaluate-completed',
            id,
            stdout: String(stdout),
            stderr: String(stderr),
            formats: {},
            metadata: {},
            result: undefined,
            error: errorMessage
        });
    }
  }
};
