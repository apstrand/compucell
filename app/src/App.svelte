<script lang="ts">
  import CodeCell from './lib/CodeCell.svelte';
  import { PyodideEvaluator } from './lib/evaluators/pyodide';
  import { onMount } from 'svelte';

  const evaluator = new PyodideEvaluator();
  let initialized = false;

  onMount(async () => {
    await evaluator.initialize();
    initialized = true;
  });
</script>

<main>
  <h1>Python Learning App</h1>
  
  {#if initialized}
    <CodeCell {evaluator} id="cell-1" initialCode={`print('Hello from Pyodide!')\n2 + 2`} />
    
    <h2>Rich Output Demo</h2>
    <CodeCell {evaluator} id="cell-2" initialCode={`class StyledBox:\n    def _repr_html_(self):\n        return '<div style="background: #ffeb3b; padding: 20px; border-radius: 10px; border: 2px solid #fbc02d; text-align: center;"><b>I am an HTML representation!</b></div>'\n\nStyledBox()`} />
  {:else}
    <p>Initializing Python environment...</p>
  {/if}
</main>

<style>
  main {
    max-width: 1100px;
    width: 95%;
    margin: 0 auto;
    padding: 2rem;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    align-items: stretch;
  }
  h1 {
    color: #333;
    text-align: center;
  }
</style>
