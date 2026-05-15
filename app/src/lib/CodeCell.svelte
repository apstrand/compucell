<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { EditorView, basicSetup } from 'codemirror';
  import { python } from '@codemirror/lang-python';
  import { EditorState } from '@codemirror/state';
  import { keymap } from '@codemirror/view';
  import { defaultKeymap, indentWithTab } from '@codemirror/commands';
  import type { Evaluator, EvaluationResult } from './evaluators/types';

  export let evaluator: Evaluator;
  export let initialCode: string = '';
  export let id: string = 'cell-1';

  let editorContainer: HTMLElement;
  let view: EditorView;
  let result: EvaluationResult | null = null;
  let running = false;
  let autoRun = localStorage.getItem(`autoRun-${id}`) === 'true';
  let isStale = false;
  let isManualRun = false;
  let debounceTimer: ReturnType<typeof setTimeout>;

  onMount(() => {
    const savedCode = localStorage.getItem(`code-${id}`);
    const codeToLoad = savedCode !== null ? savedCode : initialCode;

    // Explicitly handle Shift+Enter to ensure it works reliably across environments
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        runCode(true);
      }
    };
    editorContainer.addEventListener('keydown', handleKeydown, true);

    const startState = EditorState.create({
      doc: codeToLoad,
      extensions: [
        basicSetup,
        python(),
        keymap.of([
          ...defaultKeymap,
          indentWithTab
        ]),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            const newCode = update.state.doc.toString();
            localStorage.setItem(`code-${id}`, newCode);
            isStale = true;
            if (autoRun) {
              clearTimeout(debounceTimer);
              debounceTimer = setTimeout(() => runCode(false), 500);
            }
          }
        }),
        EditorView.theme({
          "&": { height: "250px", fontSize: "14px" },
          ".cm-scroller": { overflow: "auto" },
          ".cm-content": { fontFamily: "var(--mono)" }
        })
      ]
    });

    view = new EditorView({
      state: startState,
      parent: editorContainer
    });

    // Initial run if there was saved code or initial code
    if (codeToLoad) {
      runCode(false);
    }

    return () => {
      editorContainer.removeEventListener('keydown', handleKeydown, true);
    };
  });

  $: {
    localStorage.setItem(`autoRun-${id}`, String(autoRun));
  }

  onDestroy(() => {
    if (view) {
      view.destroy();
    }
  });

  async function runCode(manual = true) {
    if (running) return;
    running = true;
    isManualRun = manual;
    try {
      const code = view.state.doc.toString();
      const newResult = await evaluator.evaluate(code);
      
      // If auto-running and there's an error, don't update the UI yet (unless we're already showing an error)
      if (!manual && newResult.error && !result?.error) {
        // Keep previous result but mark as stale
        isStale = true;
      } else {
        result = newResult;
        isStale = false;
      }
    } catch (e: any) {
      if (manual) {
        result = { stdout: '', stderr: '', error: e.message };
        isStale = false;
      }
    } finally {
      running = false;
    }
  }
</script>

<div class="code-cell">
  <div class="editor-container">
    <div bind:this={editorContainer} class="editor"></div>
    <div class="side-controls">
      <button class="run-button" on:click={() => runCode(true)} disabled={running} title="Shift+Enter">
        {#if running}
          <span class="spinner"></span>
        {:else}
          ▶
        {/if}
      </button>
      <label class="auto-run-toggle" title="Auto-run on change">
        <input type="checkbox" bind:checked={autoRun} />
        <span class="toggle-label">Auto</span>
      </label>
    </div>
  </div>
  
  {#if result && (result.stdout || result.stderr || result.error || (result.result !== undefined && result.result !== 'undefined'))}
    <div class="output-area" class:stale={isStale}>
      {#if result.stdout}
        <div class="output-line stdout">{result.stdout}</div>
      {/if}
      {#if result.stderr}
        <div class="output-line stderr">{result.stderr}</div>
      {/if}
      {#if result.error}
        <div class="output-line error">{result.error}</div>
      {/if}
      {#if result.result !== undefined && result.result !== 'undefined'}
        <div class="result-line">
          <span class="out-prefix">Out:</span>
          <pre class="result-value">{result.result}</pre>
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .code-cell {
    border: 1px solid var(--border);
    border-radius: 8px;
    margin-bottom: 1.5rem;
    overflow: hidden;
    background: var(--bg);
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    text-align: left;
    width: 100%;
    box-sizing: border-box;
  }
  .editor-container {
    position: relative;
    display: flex;
    align-items: stretch;
  }
  .editor {
    flex-grow: 1;
    border-right: 1px solid var(--border);
  }
  .side-controls {
    width: 60px;
    background: #f8f8f8;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    padding-top: 0.5rem;
  }
  .run-button {
    width: 40px;
    height: 40px;
    background: #fff;
    border: 1px solid #ddd;
    border-radius: 4px;
    cursor: pointer;
    font-size: 1rem;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
    color: #4caf50;
  }
  .run-button:hover:not(:disabled) {
    background: #f0f0f0;
    border-color: #4caf50;
  }
  .auto-run-toggle {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    cursor: pointer;
    font-size: 0.7rem;
    color: #666;
  }
  .auto-run-toggle input {
    margin: 0;
    cursor: pointer;
  }
  .toggle-label {
    font-weight: bold;
    text-transform: uppercase;
  }
  .run-button:disabled {
    cursor: wait;
    opacity: 0.7;
  }

  .output-area {
    padding: 0.75rem;
    background: #fafafa;
    border-top: 1px solid var(--border);
    font-family: var(--mono);
    font-size: 0.9rem;
    transition: opacity 0.2s;
    max-height: 120px;
    overflow-y: auto;
  }
  .output-area.stale {
    opacity: 0.5;
    filter: grayscale(1);
  }
  .output-line {
    white-space: pre-wrap;
    margin-bottom: 0.25rem;
  }
  .stdout { color: #333; }
  .stderr { color: #d32f2f; }
  .error { 
    color: #d32f2f; 
    background: #ffebee;
    padding: 0.5rem;
    border-radius: 4px;
    margin: 0.5rem 0;
  }
  
  .result-line {
    display: flex;
    gap: 0.5rem;
    margin-top: 0.5rem;
    padding-top: 0.5rem;
    border-top: 1px dashed var(--border);
  }
  .out-prefix {
    color: #d32f2f;
    font-weight: bold;
    min-width: 40px;
  }
  .result-value {
    margin: 0;
    color: #333;
    white-space: pre-wrap;
  }

  .spinner {
    width: 20px;
    height: 20px;
    border: 2px solid #ccc;
    border-top-color: #4caf50;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
</style>
