import { loadPyodide, type PyodideInterface } from 'pyodide';
import type { Evaluator, EvaluationResult } from './types';

export class PyodideEvaluator implements Evaluator {
  private pyodide: PyodideInterface | null = null;
  private stdout: string = '';
  private stderr: string = '';

  async initialize(): Promise<void> {
    if (this.pyodide) return;

    this.pyodide = await loadPyodide({
      indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.29.3/full/'
    });
  }

  async evaluate(code: string): Promise<EvaluationResult> {
    if (!this.pyodide) {
      await this.initialize();
    }

    this.stdout = '';
    this.stderr = '';

    if (this.pyodide) {
      this.pyodide.setStdout({
        batched: (str) => {
          this.stdout += str + '\n';
        }
      });
      this.pyodide.setStderr({
        batched: (str) => {
          this.stderr += str + '\n';
        }
      });

      try {
        let result = await this.pyodide.runPythonAsync(code);
        let finalResult = result;
        if (result !== null && typeof result === 'object' && typeof result.toJs === 'function') {
          finalResult = result.toJs();
          result.destroy();
        }
        
        return {
          stdout: this.stdout,
          stderr: this.stderr,
          result: finalResult !== undefined ? String(finalResult) : undefined
        };
      } catch (e: any) {
        return {
          stdout: this.stdout,
          stderr: this.stderr,
          error: e.message
        };
      }
    }

    throw new Error('Pyodide not initialized');
  }
}
