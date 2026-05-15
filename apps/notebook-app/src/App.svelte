<script lang="ts">
  import { Notebook, PyodideEvaluator, JavaScriptEvaluator, parseMarkdownNotebook, CodeCell } from '@coding-machine/notebook-core';
  import type { Notebook as NotebookType, EvaluatorMap } from '@coding-machine/notebook-core';
  import { onMount } from 'svelte';

  const pyEvaluator = new PyodideEvaluator();
  const jsEvaluator = new JavaScriptEvaluator();
  
  const evaluators: EvaluatorMap = {
    pyodide: pyEvaluator,
    javascript: jsEvaluator
  };

  let notebook: NotebookType | null = null;
  let initialized = false;
  let isTest = typeof window !== 'undefined' && (window.location.search.includes('test=true') || window.location.pathname.includes('test'));

  onMount(async () => {
    // 1. Initialize engines
    console.log('App: Initializing evaluators...');
    await Promise.all([pyEvaluator.initialize(), jsEvaluator.initialize()]);
    console.log('App: Evaluators initialized.');
    
    // 2. Fetch and parse tutorial
    if (!isTest) {
        try {
          const res = await fetch('/tutorials/tutorial-features.md');
          const md = await res.text();
          notebook = parseMarkdownNotebook(md, 'features');
        } catch (e) {
          console.error('Failed to load tutorial', e);
        }
    }
    
    initialized = true;
  });

  function resetNotebook() {
    localStorage.clear();
    window.location.reload();
  }
</script>

<main>
  {#if notebook && !isTest}
    <header>
      <h1>{notebook.title}</h1>
      <button on:click={resetNotebook} class="reset-button">Reset Progress</button>
    </header>
  {/if}
  
  {#if initialized}
    {#if isTest}
      <div class="test-container">
        <CodeCell evaluator={pyEvaluator} id="test-cell" initialCode="1+1" />
      </div>
    {:else if notebook}
      <Notebook {notebook} {evaluators} />
    {/if}
  {:else}
    <div class="loading">
      <div class="spinner-large"></div>
      <p>Initializing environment... (this may take a moment)</p>
    </div>
  {/if}
</main>

<style>
  main {
    max-width: 1100px;
    width: 95%;
    margin: 0 auto;
    padding: 2rem;
    box-sizing: border-box;
  }
  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 3rem;
  }
  h1 {
    color: #111827;
    margin: 0;
    font-weight: 800;
    letter-spacing: -0.025em;
  }
  .reset-button {
    background: #fee2e2;
    color: #dc2626;
    border: 1px solid #fecaca;
    padding: 0.5rem 1rem;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.875rem;
    font-weight: 600;
  }
  .reset-button:hover {
    background: #fecaca;
  }

  .loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 4rem;
    color: #6b7280;
  }
  .spinner-large {
    width: 40px;
    height: 40px;
    border: 4px solid #f3f4f6;
    border-top-color: #3b82f6;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 1rem;
  }
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
</style>
