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
