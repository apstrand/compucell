/**
 * Represents the result of a code evaluation.
 */
export interface EvaluationResult {
  stdout: string;
  stderr: string;
  result?: any;
  error?: string;
}

/**
 * Interface for code evaluators. 
 * Allows swapping between different execution environments (Pyodide, Remote, etc.)
 */
export interface Evaluator {
  /**
   * Initialize the evaluator (e.g., load WASM, connect to server).
   */
  initialize(): Promise<void>;

  /**
   * Evaluate the given code and return the result.
   */
  evaluate(code: string): Promise<EvaluationResult>;
}
