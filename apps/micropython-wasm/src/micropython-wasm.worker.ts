let mp: any = null;
let currentOutput = '';
let currentStderr = '';
let evaluating = false;

async function doInit(id: string) {
    try {
        const { loadMicroPython } = await import(/* @vite-ignore */ '/micropython/micropython.mjs');
        const decoder = new TextDecoder();

        mp = await loadMicroPython({
            stdout: (s: string | Uint8Array) => {
                currentOutput += typeof s === 'string' ? s : decoder.decode(s);
            },
            stderr: (s: string | Uint8Array) => {
                currentStderr += typeof s === 'string' ? s : decoder.decode(s);
            },
            linebuffer: false,
        });

        self.postMessage({ type: 'init-completed', id });
    } catch (err: any) {
        self.postMessage({ type: 'error', error: err.message, id });
    }
}

// mp.runPython uses a synchronous ccall for mp_js_do_exec, which aborts when
// the GC triggers emscripten_scan_registers (an ASYNCIFY-enabled import).
// We bypass runPython and call mp_js_do_exec directly with async:true.
async function asyncExec(src: string): Promise<void> {
    const Module = (self as any).Module;
    const len = Module.lengthBytesUTF8(src);
    const buf = Module._malloc(len + 1);
    Module.stringToUTF8(src, buf, len + 1);
    const value = Module._malloc(3 * 4);
    try {
        await Module.ccall(
            'mp_js_do_exec',
            'number',
            ['pointer', 'number', 'pointer'],
            [buf, len, value],
            { async: true },
        );
    } finally {
        Module._free(buf);
        Module._free(value);
    }
}

// JS-side heuristic: last line is an expression if it doesn't start with a
// statement keyword and isn't a plain assignment.
function isExpression(line: string): boolean {
    const s = line.trim();
    if (!s) return false;
    if (/^(if|else|elif|for|while|def|class|import|from|return|try|except|finally|with|pass|break|continue|del|global|nonlocal|raise|assert|yield|async)\b/.test(s)) return false;
    if (/^[\w.[\]]+\s*(?:[+\-*/%&|^]|\/\/|\*\*|>>|<<)?=(?!=)/.test(s)) return false;
    return true;
}

async function doEvaluate(code: string, id: string) {
    if (evaluating) {
        self.postMessage({ type: 'error', error: 'Already evaluating', id });
        return;
    }
    evaluating = true;
    currentOutput = '';
    currentStderr = '';

    try {
        const lines = code.trim().split('\n');
        const lastLine = lines[lines.length - 1];

        if (isExpression(lastLine)) {
            if (lines.length > 1) {
                await asyncExec(lines.slice(0, -1).join('\n'));
            }
            // Print the expression result like a REPL — Python exceptions still surface to stderr
            await asyncExec(`__r__ = (${lastLine})\nif __r__ is not None:\n    print(repr(__r__))`);
        } else {
            await asyncExec(code);
        }

        self.postMessage({ type: 'evaluate-completed', id, stdout: currentOutput, stderr: currentStderr });
    } catch (err: any) {
        self.postMessage({ type: 'evaluate-completed', id, stdout: currentOutput, stderr: currentStderr, error: err.message });
    } finally {
        evaluating = false;
    }
}

self.onmessage = (e) => {
    const { type, code, id } = e.data;
    if (type === 'init') {
        doInit(id);
    } else if (type === 'evaluate') {
        if (!mp) {
            self.postMessage({ type: 'error', error: 'Not initialized', id });
            return;
        }
        doEvaluate(code, id);
    }
};
