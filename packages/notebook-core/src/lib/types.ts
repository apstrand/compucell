import type { Evaluator } from './evaluators/types';

export interface NotebookCell {
  id: string;
  type: 'code' | 'markdown';
  content: string;
  engine?: string;
  metadata?: Record<string, any>;
  outputs?: any[];
}

export interface Notebook {
  id: string;
  title: string;
  description?: string;
  metadata?: Record<string, any>;
  cells: NotebookCell[];
}

export type EvaluatorMap = Record<string, Evaluator>;
