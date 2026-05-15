import type { Evaluator, EvaluationResult } from './types';

// Use a global to store the worker factory
let cachedWorkerFactory: any = null;

export class PyodideEvaluator implements Evaluator {
  private worker: Worker | null = null;
  private pendingResolves: Map<string, (result: any) => void> = new Map();
  private initialized: Promise<void> | null = null;

  async initialize(): Promise<void> {
    if (this.initialized) return this.initialized;

    this.initialized = (async () => {
      try {
        if (!cachedWorkerFactory) {
            // Revert to a simpler import to see if bundling is the issue
            // @ts-ignore
            const mod = await import('./pyodide.worker?worker');
            cachedWorkerFactory = mod.default;
        }
        
        this.worker = new cachedWorkerFactory();

        return new Promise<void>((resolve, reject) => {
          const id = Math.random().toString(36).substring(7);

          const onMessage = (event: MessageEvent) => {
            const { type, id: msgId, error, ...data } = event.data;
            
            if (type === 'init-completed' && msgId === id) {
              resolve();
            } else if (type === 'error' && msgId === id) {
              reject(new Error(error || 'Unknown initialization error'));
            } else if (type === 'evaluate-completed') {
              const resolver = this.pendingResolves.get(msgId);
              if (resolver) {
                resolver(data);
                this.pendingResolves.delete(msgId);
              }
            }
          };

          this.worker!.addEventListener('message', onMessage);
          
          const isTest = typeof window !== 'undefined' && (window.location.search.includes('test=true') || window.location.pathname.includes('test'));
          this.worker!.postMessage({ type: 'init', id, isTest });
        });
      } catch (err) {
        reject(err);
      }
    })();

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
