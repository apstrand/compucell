<script lang="ts">
  import { Notebook } from '@compucell/notebook-core';
  import type { Notebook as NotebookType, EvaluatorMap } from '@compucell/notebook-core';
  import { onMount } from 'svelte';

  class MicroPythonWASMEvaluator {
    private worker: Worker | null = null;
    private initialized: Promise<void> | null = null;
    private pendingResolves = new Map<string, (data: any) => void>();

    async initialize(): Promise<void> {
      if (this.initialized) return this.initialized;
      this.initialized = new Promise((resolve, reject) => {
        import('./micropython-wasm.worker?worker').then(({ default: MPWorker }) => {
          this.worker = new MPWorker();
          const id = Math.random().toString(36).substring(7);

          const handleInit = (e: MessageEvent) => {
            if (e.data.type === 'init-completed' && e.data.id === id) {
              this.worker?.removeEventListener('message', handleInit);
              resolve();
            } else if (e.data.type === 'error' && e.data.id === id) {
              reject(new Error(e.data.error));
            }
          };
          this.worker.addEventListener('message', handleInit);
          this.worker.addEventListener('message', (e: MessageEvent) => {
            const { type, id, ...data } = e.data;
            if (type === 'evaluate-completed') {
              const res = this.pendingResolves.get(id);
              if (res) { res(data); this.pendingResolves.delete(id); }
            }
          });
          this.worker.postMessage({ type: 'init', id });
        }).catch(reject);
      });
      return this.initialized;
    }

    async evaluate(code: string): Promise<any> {
      await this.initialize();
      const id = Math.random().toString(36).substring(7);
      return new Promise((resolve) => {
        this.pendingResolves.set(id, resolve);
        this.worker?.postMessage({ type: 'evaluate', code, id });
      });
    }
  }

  const mpyEvaluator = new MicroPythonWASMEvaluator();

  const evaluators: EvaluatorMap = {
    micropython: mpyEvaluator,
  };

  const notebook: NotebookType = {
    id: 'micropython-wasm-demo',
    title: 'MicroPython WASM Notebook',
    cells: [
      {
        id: 'intro',
        type: 'markdown',
        content: '# MicroPython in the Browser\nAll cells run **MicroPython compiled to WebAssembly** — no device or server required.',
      },
      {
        id: 'basics',
        type: 'code',
        engine: 'micropython',
        content: '# Arithmetic and built-ins\nresult = sum(i**2 for i in range(10))\nprint("Sum of squares 0–9:", result)\nresult',
      },
      {
        id: 'strings',
        type: 'code',
        engine: 'micropython',
        content: 'words = ["MicroPython", "runs", "in", "WebAssembly"]\n" ".join(words).upper()',
      },
      {
        id: 'collections',
        type: 'code',
        engine: 'micropython',
        content: 'from collections import OrderedDict\nd = OrderedDict()\nfor ch in "banana":\n    d[ch] = d.get(ch, 0) + 1\nprint(dict(d))',
      },
      {
        id: 'json',
        type: 'code',
        engine: 'micropython',
        content: 'import json\ndata = {"sensor": "DHT22", "temp": 23.4, "humidity": 61}\nencoded = json.dumps(data)\nprint(encoded)\njson.loads(encoded)["temp"]',
      },
      {
        id: 'gc',
        type: 'code',
        engine: 'micropython',
        content: 'import gc\ngc.collect()\nprint("Free memory:", gc.mem_free(), "bytes")',
      },
    ],
  };

  let initialized = false;

  onMount(async () => {
    await mpyEvaluator.initialize();
    initialized = true;
  });
</script>

<main>
  <header>
    <h1>{notebook.title}</h1>
  </header>

  {#if initialized}
    <Notebook {notebook} {evaluators} />
  {:else}
    <div class="loading">
      <div class="spinner"></div>
      <p>Loading MicroPython WASM…</p>
    </div>
  {/if}
</main>

<style>
  main {
    max-width: 900px;
    width: 95%;
    margin: 0 auto;
    padding: 2rem;
    box-sizing: border-box;
  }
  header {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 2rem;
  }
  h1 {
    margin: 0;
    font-weight: 800;
    color: #111827;
    letter-spacing: -0.025em;
  }
  .badge {
    font-size: 0.7rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    padding: 3px 10px;
    border-radius: 99px;
    background: #dcfce7;
    color: #166534;
    white-space: nowrap;
  }
  .loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 4rem;
    color: #6b7280;
  }
  .spinner {
    width: 36px;
    height: 36px;
    border: 3px solid #f3f4f6;
    border-top-color: #166534;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 1rem;
  }
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
</style>
