import type { Evaluator, EvaluationResult } from './types';

export class JavaScriptEvaluator implements Evaluator {
  async initialize(): Promise<void> {
    return Promise.resolve();
  }

  async evaluate(code: string): Promise<EvaluationResult> {
    const originalLog = console.log;
    const originalError = console.error;
    let stdout = '';
    let stderr = '';

    console.log = (...args) => {
      stdout += args.map(a => String(a)).join(' ') + '\n';
    };
    console.error = (...args) => {
      stderr += args.map(a => String(a)).join(' ') + '\n';
    };

    try {
      // Try to evaluate as a single expression first
      // If that fails, run as a script
      let result;
      try {
        result = await eval(`(${code})`);
      } catch (e) {
        result = await eval(code);
      }
      
      return {
        stdout,
        stderr,
        result: result !== undefined ? String(result) : undefined
      };
    } catch (e: any) {
      return {
        stdout,
        stderr,
        error: e.message
      };
    } finally {
      console.log = originalLog;
      console.error = originalError;
    }
  }
}
