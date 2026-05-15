import type { Evaluator, EvaluationResult } from './types';

export class PyodideEvaluator implements Evaluator {
  private worker: Worker | null = null;
  private pendingResolves: Map<string, (result: any) => void> = new Map();
  private initialized: Promise<void> | null = null;

  async initialize(): Promise<void> {
    if (this.initialized) return this.initialized;

    this.initialized = new Promise((resolve, reject) => {
      // Vite handles ?worker import
      import('./pyodide.worker?worker').then(({ default: PyodideWorker }) => {
        this.worker = new PyodideWorker();
        const id = Math.random().toString(36).substring(7);

        const handleInit = (event: MessageEvent) => {
          if (event.data.type === 'init-completed' && event.data.id === id) {
            this.worker?.removeEventListener('message', handleInit);
            resolve();
          } else if (event.data.type === 'error' && event.data.id === id) {
            this.worker?.removeEventListener('message', handleInit);
            reject(new Error(event.data.error));
          }
        };

        this.worker.addEventListener('message', handleInit);
        
        // Setup persistent message handler for evaluations
        this.worker.addEventListener('message', (event) => {
          const { type, id, ...data } = event.data;
          if (type === 'evaluate-completed') {
            const resolver = this.pendingResolves.get(id);
            if (resolver) {
              resolver(data);
              this.pendingResolves.delete(id);
            }
          }
        });

        const isTest = typeof window !== 'undefined' && window.location.search.includes('test=true');
        this.worker.postMessage({ type: 'init', id, isTest });
      }).catch(reject);
    });

    return this.initialized;
  }

  async evaluate(code: string): Promise<EvaluationResult> {
    await this.initialize();
    
    if (!this.worker) throw new Error('Worker not initialized');

    const id = Math.random().toString(36).substring(7);
    
    return new Promise((resolve) => {
      this.pendingResolves.set(id, resolve);
      this.worker?.postMessage({ type: 'evaluate', code, id });
    });
  }
}
