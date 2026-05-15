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
    <CodeCell {evaluator} initialCode={`print('Hello from Pyodide!')\n2 + 2`} />
  {:else}
    <p>Initializing Python environment...</p>
  {/if}
</main>

<style>
  main {
    max-width: 800px;
    margin: 0 auto;
    padding: 2rem;
  }
  h1 {
    color: #333;
    text-align: center;
  }
</style>
