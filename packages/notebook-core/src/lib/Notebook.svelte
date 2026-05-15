<script lang="ts">
  import CodeCell from './CodeCell.svelte';
  import MarkdownCell from './MarkdownCell.svelte';
  import type { Notebook, NotebookCell, EvaluatorMap } from './types';
  import { createEventDispatcher } from 'svelte';

  export let notebook: Notebook;
  export let evaluators: EvaluatorMap;
  export let editable: boolean = true;

  const dispatch = createEventDispatcher<{
    change: Notebook;
  }>();

  function addCell(index: number, type: 'code' | 'markdown', engine: string = 'pyodide') {
    if (!editable) return;
    const newCell: NotebookCell = {
      id: `cell-${Math.random().toString(36).substring(7)}`,
      type,
      content: type === 'code' ? (engine === 'javascript' ? '// JS code' : '# Python code') : 'New text section',
      engine: type === 'code' ? engine : undefined
    };
    notebook.cells = [
      ...notebook.cells.slice(0, index + 1),
      newCell,
      ...notebook.cells.slice(index + 1)
    ];
    dispatch('change', notebook);
  }

  function removeCell(id: string) {
    if (!editable) return;
    notebook.cells = notebook.cells.filter(c => c.id !== id);
    dispatch('change', notebook);
  }

  function moveCell(index: number, direction: 'up' | 'down') {
    if (!editable) return;
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= notebook.cells.length) return;
    
    const newCells = [...notebook.cells];
    [newCells[index], newCells[newIndex]] = [newCells[newIndex], newCells[index]];
    notebook.cells = newCells;
    dispatch('change', notebook);
  }
</script>

<div class="notebook">
  {#each notebook.cells as cell, i (cell.id)}
    <div class="cell-wrapper" class:read-only={!editable}>
      {#if editable}
        <div class="cell-actions top">
          <button class="add-btn" on:click={() => addCell(i - 1, 'code')}>+ Python</button>
          <button class="add-btn" on:click={() => addCell(i - 1, 'code', 'javascript')}>+ JS</button>
          <button class="add-btn" on:click={() => addCell(i - 1, 'markdown')}>+ Text</button>
        </div>
      {/if}
      
      <div class="cell-content">
        {#if cell.type === 'markdown'}
          <MarkdownCell id={`${notebook.id}-${cell.id}`} initialContent={cell.content} />
        {:else if cell.type === 'code'}
          <div class="code-cell-container">
            <div class="engine-badge {cell.engine}">{cell.engine}</div>
            <CodeCell 
              evaluator={evaluators[cell.engine || 'pyodide']} 
              id={`${notebook.id}-${cell.id}`} 
              initialCode={cell.content} 
            />
          </div>
        {/if}
      </div>

      {#if editable}
        <div class="cell-sidebar">
          <button class="icon-btn" on:click={() => moveCell(i, 'up')} disabled={i === 0}>▲</button>
          <button class="icon-btn delete" on:click={() => removeCell(cell.id)}>×</button>
          <button class="icon-btn" on:click={() => moveCell(i, 'down')} disabled={i === notebook.cells.length - 1}>▼</button>
        </div>
      {/if}

      {#if editable && i === notebook.cells.length - 1}
        <div class="cell-actions bottom">
          <button class="add-btn" on:click={() => addCell(i, 'code')}>+ Python</button>
          <button class="add-btn" on:click={() => addCell(i, 'code', 'javascript')}>+ JS</button>
          <button class="add-btn" on:click={() => addCell(i, 'markdown')}>+ Text</button>
        </div>
      {/if}
    </div>
  {/each}
</div>

<style>
  .notebook {
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
  .cell-wrapper.read-only {
    grid-template-columns: 1fr;
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

  .code-cell-container {
    display: flex;
    gap: 0.75rem;
    align-items: flex-start;
  }

  .engine-badge {
    margin-top: 1rem;
    writing-mode: vertical-lr;
    transform: rotate(180deg);
    font-size: 0.65rem;
    text-transform: uppercase;
    font-weight: 800;
    padding: 8px 4px;
    border-radius: 4px;
    letter-spacing: 0.1em;
    min-width: 24px;
    text-align: center;
  }
  .engine-badge.pyodide { background: #e0f2fe; color: #0369a1; }
  .engine-badge.javascript { background: #fef3c7; color: #92400e; }
  .engine-badge.micropython { background: #dcfce7; color: #166534; }
</style>
