<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { EditorView, basicSetup } from 'codemirror';
  import { python } from '@codemirror/lang-python';
  import { EditorState } from '@codemirror/state';
  import { keymap } from '@codemirror/view';
  import { defaultKeymap, indentWithTab } from '@codemirror/commands';
  import type { Evaluator, EvaluationResult } from './evaluators/types';

  export let evaluator: Evaluator | undefined;
  export let initialCode: string = '';
  export let id: string = 'cell-1';
  export let collapsed: boolean = false;
  export let label: string = '';

  let editorContainer: HTMLElement;
  let view: EditorView;
  // Initialize with a safe empty result to avoid null-pointer errors in template
  let result: EvaluationResult = { stdout: '', stderr: '', formats: {}, metadata: {} };
  let running = false;
  let autoRun = localStorage.getItem(`autoRun-${id}`) === 'true';
  let isStale = false;
  let isManualRun = false;
  let debounceTimer: ReturnType<typeof setTimeout>;
  let isCollapsed = collapsed;

  $: statusOk = !result.error && (!!result.stdout || !!result.result ||
    (result.formats != null && Object.keys(result.formats).length > 0));
  $: statusErr = !!result.error;

  /**
   * Action to execute script tags in HTML content
   */
  function executeScripts(node: HTMLElement) {
    const scripts = node.querySelectorAll('script');
    scripts.forEach((oldScript) => {
      const newScript = document.createElement('script');
      Array.from(oldScript.attributes).forEach((attr) =>
        newScript.setAttribute(attr.name, attr.value)
      );
      newScript.appendChild(document.createTextNode(oldScript.innerHTML));
      oldScript.parentNode?.replaceChild(newScript, oldScript);
    });
  }

  onMount(() => {
    const savedCode = localStorage.getItem(`code-${id}`);
    const codeToLoad = savedCode !== null ? savedCode : initialCode;

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
    console.log('CodeCell: runCode called, manual:', manual);
    if (running) return;
    if (!evaluator) {
      if (manual) {
        result = { stdout: '', stderr: '', error: 'No evaluator available. Connect to the device first.', formats: {}, metadata: {} };
      }
      return;
    }
    running = true;
    isManualRun = manual;

    try {
      const code = view.state.doc.toString();
      console.log('CodeCell: Evaluating code:', code.substring(0, 30));
      const newResult = await evaluator.evaluate(code);
      console.log('CodeCell: Received result:', newResult);
      
      // If auto-running and there's an error, don't update the UI yet (unless we're already showing an error)
      if (!manual && newResult.error && !result.error) {
        isStale = true;
      } else {
        result = {
            stdout: newResult.stdout || '',
            stderr: newResult.stderr || '',
            formats: newResult.formats || {},
            metadata: newResult.metadata || {},
            result: newResult.result,
            error: newResult.error
        };
        isStale = false;
      }
    } catch (e: any) {
      console.error('CodeCell: Evaluation fatal error:', e);
      if (manual) {
        result = { 
            stdout: '', 
            stderr: '', 
            error: String(e.message || e),
            formats: {},
            metadata: {}
        };
        isStale = false;
      }
    } finally {
      running = false;
    }
  }
</script>

<div class="code-cell">
  {#if label}
    <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
    <div class="cell-header" on:click={() => isCollapsed = !isCollapsed}>
      <span class="cell-toggle">{isCollapsed ? '▶' : '▼'}</span>
      <span class="cell-label">{label}</span>
      <div class="cell-header-right">
        {#if running}
          <span class="spinner-tiny"></span>
        {:else if statusErr}
          <span class="status-dot status-err" title="Error">●</span>
        {:else if statusOk}
          <span class="status-dot status-ok" title="Ready">●</span>
        {/if}
        <button class="run-button-inline" on:click|stopPropagation={() => runCode(true)}
          disabled={running} title="Run (Shift+Enter)">▶</button>
      </div>
    </div>
  {/if}

  <div class="editor-container" style:display={isCollapsed ? 'none' : 'flex'}>
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
  
  {#if !isCollapsed && ((result && (result.stdout || result.stderr || result.error || (result.result !== undefined && result.result !== 'undefined' && result.result !== null) || (result.formats && Object.keys(result.formats).length > 0))) || running)}
    <div class="output-area" class:stale={isStale || running}>
      {#if running}
        <div class="loading-status">
          <span class="spinner-tiny"></span> 
          {#if !result?.stdout && !result?.result}Initializing engine...{:else}Running...{/if}
        </div>
      {/if}

      {#if result.stdout}
        <div class="output-line stdout">{result?.stdout}</div>
      {/if}
      {#if result.stderr}
        <div class="output-line stderr">{result?.stderr}</div>
      {/if}
      {#if result.error}
        <div class="output-line error">{result?.error}</div>
      {/if}
      
      {#if result.formats}
        {#if result.formats['text/html']}
          {#key result}
            <div class="rich-output html-output" use:executeScripts>
              {@html result.formats['text/html']}
            </div>
          {/key}
        {/if}
        {#if result.formats['image/png']}
          <div class="rich-output image-output">
            <img src="data:image/png;base64,{result.formats['image/png']}" alt="Python Output" />
          </div>
        {/if}
      {/if}

      {#if result.result !== undefined && result.result !== 'undefined' && result.result !== null && (!result.formats || (!result.formats['text/html'] && !result.formats['image/png']))}
        <div class="result-line">
          <span class="out-prefix">Out:</span>
          <pre class="result-value">{result?.result}</pre>
        </div>
      {/if}

      {#if result.metadata && result.metadata.defined_names && result.metadata.defined_names.length > 0}
        <div class="metadata-line">
          <span class="meta-label">Defined:</span>
          <div class="tags">
            {#each result.metadata.defined_names as name}
              <span class="tag">{name}</span>
            {/each}
          </div>
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
    max-height: 500px;
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
  
  .rich-output {
    margin-top: 0.5rem;
    background: #fff;
    border: 1px solid #eee;
    border-radius: 4px;
    padding: 0.5rem;
    overflow: auto;
    display: flex;
    justify-content: center;
  }
  .image-output img {
    max-width: 100%;
    height: auto;
    display: block;
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

  .metadata-line {
    margin-top: 0.5rem;
    padding-top: 0.5rem;
    border-top: 1px solid #eee;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.75rem;
  }
  .meta-label {
    color: #666;
    font-weight: bold;
  }
  .tags {
    display: flex;
    gap: 0.25rem;
    flex-wrap: wrap;
  }
  .tag {
    background: #eef2ff;
    color: #4f46e5;
    padding: 2px 6px;
    border-radius: 4px;
    font-family: var(--mono);
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

  .loading-status {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.8rem;
    color: #666;
    margin-bottom: 0.5rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid #eee;
  }
  .spinner-tiny {
    width: 12px;
    height: 12px;
    border: 2px solid #ccc;
    border-top-color: #3b82f6;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  .cell-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.45rem 0.75rem;
    background: #f1f5f9;
    border-bottom: 1px solid var(--border);
    cursor: pointer;
    user-select: none;
    font-size: 0.82rem;
    font-weight: 600;
    color: #475569;
  }
  .cell-header:hover {
    background: #e8edf3;
  }
  .cell-toggle {
    font-size: 0.7rem;
    color: #94a3b8;
    flex-shrink: 0;
  }
  .cell-label {
    flex: 1;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    font-size: 0.72rem;
  }
  .cell-header-right {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .status-dot {
    font-size: 0.65rem;
  }
  .status-ok  { color: #22c55e; }
  .status-err { color: #ef4444; }
  .run-button-inline {
    padding: 1px 7px;
    font-size: 0.75rem;
    background: #fff;
    border: 1px solid #cbd5e1;
    border-radius: 4px;
    cursor: pointer;
    color: #4caf50;
    line-height: 1.4;
  }
  .run-button-inline:hover:not(:disabled) {
    background: #f0fdf4;
    border-color: #4caf50;
  }
  .run-button-inline:disabled {
    opacity: 0.5;
    cursor: wait;
  }

</style>
