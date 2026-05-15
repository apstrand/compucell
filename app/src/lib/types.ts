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
  metadata?: Record<string, any>;
  cells: NotebookCell[];
}
