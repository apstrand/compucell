<script lang="ts">
  import CodeCell from './lib/CodeCell.svelte';
  import { PyodideEvaluator } from './lib/evaluators/pyodide';
  import { onMount } from 'svelte';

  const evaluator = new PyodideEvaluator();
  let initialized = false;
  let isTest = typeof window !== 'undefined' && window.location.search.includes('test=true');

  onMount(async () => {
    console.log('App: Initializing evaluator...');
    await evaluator.initialize();
    console.log('App: Evaluator initialized.');
    initialized = true;
  });
</script>

<main>
  <h1>Python Learning App</h1>
  
  {#if initialized}
    {#if isTest}
      <CodeCell {evaluator} id="test-cell" initialCode="1+1" />
    {:else}
      <CodeCell {evaluator} id="cell-1" initialCode={`import pandas as pd\nimport numpy as np\n\n# Create a sample DataFrame\ndf = pd.DataFrame(np.random.randn(10, 5), columns=['A', 'B', 'C', 'D', 'E'])\ndf`} />
      
      <h2>Matplotlib Visualization</h2>
      <CodeCell {evaluator} id="cell-2" initialCode={`import matplotlib.pyplot as plt\nimport numpy as np\n\nx = np.linspace(0, 10, 100)\ny = np.sin(x)\n\nplt.figure(figsize=(8, 4))\nplt.plot(x, y, label='sin(x)')\nplt.title('Simple Plot')\nplt.legend()\nplt.show()`} />
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
  h1 {
    color: #333;
    text-align: center;
  }
</style>
