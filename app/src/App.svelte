<script lang="ts">
  import CodeCell from './lib/CodeCell.svelte';
  import { PyodideEvaluator } from './lib/evaluators/pyodide';
  import { onMount } from 'svelte';
  import type { Notebook } from './lib/types';

  const evaluator = new PyodideEvaluator();
  let initialized = false;
  let isTest = typeof window !== 'undefined' && window.location.search.includes('test=true');

  let notebook: Notebook = {
    id: 'tutorial-1',
    title: 'Python Data Science Tutorial',
    cells: [
      {
        id: 'cell-1',
        type: 'code',
        content: '# Use pandas to analyze data\nimport pandas as pd\nimport numpy as np\n\ndf = pd.DataFrame(np.random.randn(10, 5), columns=list("ABCDE"))\ndf'
      },
      {
        id: 'cell-2',
        type: 'code',
        content: '# Create interactive plots with Plotly\nimport plotly.express as px\ndf = px.data.iris()\nfig = px.scatter(df, x="sepal_width", y="sepal_length", color="species")\nfig'
      }
    ]
  };

  onMount(async () => {
    console.log('App: Initializing evaluator...');
    await evaluator.initialize();
    console.log('App: Evaluator initialized.');
    initialized = true;
  });

  function resetNotebook() {
    localStorage.clear();
    window.location.reload();
  }
</script>

<main>
  <header>
    <h1>{notebook.title}</h1>
    <button on:click={resetNotebook} class="reset-button">Reset Notebook</button>
  </header>
  
  {#if initialized}
    {#if isTest}
      <CodeCell {evaluator} id="test-cell" initialCode="1+1" />
    {:else}
      {#each notebook.cells as cell (cell.id)}
        {#if cell.type === 'code'}
          <CodeCell {evaluator} id={cell.id} initialCode={cell.content} />
        {/if}
      {/each}
    {/if}
  {:else}
    <p>Initializing Python environment... (this may take a moment)</p>
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
  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
  }
  h1 {
    color: #333;
    margin: 0;
  }
  .reset-button {
    background: #f44336;
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.9rem;
    transition: background 0.2s;
  }
  .reset-button:hover {
    background: #d32f2f;
  }
</style>
