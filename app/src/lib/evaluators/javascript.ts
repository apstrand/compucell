import type { Evaluator, EvaluationResult } from './types';

export class JavaScriptEvaluator implements Evaluator {
  async initialize(): Promise<void> {
    // No initialization needed for basic JS
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
      // Use an IIFE with async support if needed
      const result = await eval(`(async () => { return ${code} })()`);
      
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
