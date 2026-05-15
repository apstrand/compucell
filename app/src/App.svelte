<script lang="ts">
  import CodeCell from './lib/CodeCell.svelte';
  import MarkdownCell from './lib/MarkdownCell.svelte';
  import { PyodideEvaluator } from './lib/evaluators/pyodide';
  import { JavaScriptEvaluator } from './lib/evaluators/javascript';
  import { onMount } from 'svelte';
  import type { Notebook, NotebookCell } from './lib/types';

  const pyEvaluator = new PyodideEvaluator();
  const jsEvaluator = new JavaScriptEvaluator();
  
  let initialized = false;
  let isTest = typeof window !== 'undefined' && window.location.search.includes('test=true');

  let notebook: Notebook = {
    id: 'tutorial-1',
    title: 'Python & JS Data Science Tutorial',
    cells: [
      {
        id: 'cell-0',
        type: 'markdown',
        content: '# Welcome to the Interactive Tutorial\nDouble click this cell to edit the markdown. Below you can explore Python and JavaScript.'
      },
      {
        id: 'cell-1',
        type: 'code',
        engine: 'pyodide',
        content: '# Use pandas to analyze data\nimport pandas as pd\nimport numpy as np\n\ndf = pd.DataFrame(np.random.randn(10, 5), columns=list("ABCDE"))\ndf'
      },
      {
        id: 'cell-2',
        type: 'code',
        engine: 'pyodide',
        content: '# Create interactive plots with Plotly\nimport plotly.express as px\ndf = px.data.iris()\nfig = px.scatter(df, x="sepal_width", y="sepal_length", color="species")\nfig'
      },
      {
        id: 'cell-3',
        type: 'markdown',
        content: '## JavaScript Support\nYou can also run JavaScript in cells!'
      },
      {
        id: 'cell-4',
        type: 'code',
        engine: 'javascript',
        content: '// Simple JS computation\nconst x = 10;\nconst y = 20;\n`The sum of ${x} and ${y} is ${x + y}`'
      }
    ]
  };

  onMount(async () => {
    console.log('App: Initializing evaluators...');
    await Promise.all([pyEvaluator.initialize(), jsEvaluator.initialize()]);
    console.log('App: Evaluators initialized.');
    initialized = true;
  });

  function resetNotebook() {
    localStorage.clear();
    window.location.reload();
  }

  function addCell(index: number, type: 'code' | 'markdown', engine: string = 'pyodide') {
    const newCell: NotebookCell = {
      id: `cell-${Math.random().toString(36).substring(7)}`,
      type,
      content: type === 'code' ? '# New code cell' : 'New markdown cell',
      engine: type === 'code' ? engine : undefined
    };
    notebook.cells = [
      ...notebook.cells.slice(0, index + 1),
      newCell,
      ...notebook.cells.slice(index + 1)
    ];
  }

  function removeCell(id: string) {
    notebook.cells = notebook.cells.filter(c => c.id !== id);
  }

  function moveCell(index: number, direction: 'up' | 'down') {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= notebook.cells.length) return;
    
    const newCells = [...notebook.cells];
    [newCells[index], newCells[newIndex]] = [newCells[newIndex], newCells[index]];
    notebook.cells = newCells;
  }
</script>

<main>
  <header>
    <h1>{notebook.title}</h1>
    <button on:click={resetNotebook} class="reset-button">Reset Notebook</button>
  </header>
  
  {#if initialized}
    {#if isTest}
      <CodeCell evaluator={pyEvaluator} id="test-cell" initialCode="1+1" />
    {:else}
      <div class="cells-container">
        {#each notebook.cells as cell, i (cell.id)}
          <div class="cell-wrapper">
            <div class="cell-actions top">
              <button class="add-btn" on:click={() => addCell(i - 1, 'code')}>+ Code</button>
              <button class="add-btn" on:click={() => addCell(i - 1, 'markdown')}>+ Text</button>
            </div>
            
            <div class="cell-content">
              {#if cell.type === 'markdown'}
                <MarkdownCell id={cell.id} initialContent={cell.content} />
              {:else if cell.type === 'code'}
                <div class="engine-badge {cell.engine}">{cell.engine}</div>
                <CodeCell 
                  evaluator={cell.engine === 'javascript' ? jsEvaluator : pyEvaluator} 
                  id={cell.id} 
                  initialCode={cell.content} 
                />
              {/if}
            </div>

            <div class="cell-sidebar">
              <button class="icon-btn" on:click={() => moveCell(i, 'up')} disabled={i === 0}>▲</button>
              <button class="icon-btn delete" on:click={() => removeCell(cell.id)}>×</button>
              <button class="icon-btn" on:click={() => moveCell(i, 'down')} disabled={i === notebook.cells.length - 1}>▼</button>
            </div>

            {#if i === notebook.cells.length - 1}
              <div class="cell-actions bottom">
                <button class="add-btn" on:click={() => addCell(i, 'code')}>+ Code</button>
                <button class="add-btn" on:click={() => addCell(i, 'markdown')}>+ Text</button>
              </div>
            {/if}
          </div>
        {/each}
      </div>
    {/if}
  {:else}
    <div class="loading">
      <div class="spinner-large"></div>
      <p>Initializing environment... (loading Pandas, Matplotlib, Plotly)</p>
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

  .cells-container {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .cell-wrapper {
    position: relative;
    display: grid;
    grid-template-columns: 1fr 40px;
    gap: 1rem;
    padding: 0.5rem 0;
  }

  .cell-content {
    min-width: 0;
  }

  .cell-sidebar {
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 0.25rem;
    opacity: 0;
    transition: opacity 0.2s;
  }
  .cell-wrapper:hover .cell-sidebar {
    opacity: 1;
  }

  .cell-actions {
    position: absolute;
    left: 0;
    right: 0;
    display: flex;
    justify-content: center;
    gap: 0.5rem;
    opacity: 0;
    transition: opacity 0.2s;
    z-index: 10;
  }
  .cell-actions.top { top: -12px; }
  .cell-actions.bottom { bottom: -12px; }
  .cell-wrapper:hover .cell-actions {
    opacity: 1;
  }

  .add-btn {
    background: white;
    border: 1px solid #e5e7eb;
    padding: 2px 12px;
    border-radius: 12px;
    font-size: 0.75rem;
    font-weight: 600;
    color: #6b7280;
    cursor: pointer;
    box-shadow: 0 1px 2px rgba(0,0,0,0.05);
  }
  .add-btn:hover {
    background: #f9fafb;
    border-color: #d1d5db;
    color: #111827;
  }

  .icon-btn {
    width: 32px;
    height: 32px;
    border-radius: 6px;
    border: 1px solid #e5e7eb;
    background: white;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: #6b7280;
  }
  .icon-btn:hover:not(:disabled) {
    background: #f3f4f6;
    color: #111827;
  }
  .icon-btn:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }
  .icon-btn.delete:hover {
    background: #fee2e2;
    color: #dc2626;
    border-color: #fecaca;
  }

  .engine-badge {
    display: inline-block;
    font-size: 0.7rem;
    text-transform: uppercase;
    font-weight: 800;
    padding: 2px 6px;
    border-radius: 4px;
    margin-bottom: 4px;
  }
  .engine-badge.pyodide { background: #e0f2fe; color: #0369a1; }
  .engine-badge.javascript { background: #fef3c7; color: #92400e; }

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
