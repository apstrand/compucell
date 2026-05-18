<script lang="ts">
  import { 
    Notebook, 
    PyodideEvaluator, 
    JavaScriptEvaluator, 
    MicroPythonRemoteEvaluator 
  } from '@compucell/notebook-core';
  import type { Notebook as NotebookType, EvaluatorMap } from '@compucell/notebook-core';
  import { onMount } from 'svelte';

  let wsUrl = 'ws://192.168.4.1:8266';
  let password = 'python';
  let connected = false;
  let connecting = false;
  let initialized = false;

  const pyEvaluator = new PyodideEvaluator();
  const jsEvaluator = new JavaScriptEvaluator();
  let mpyEvaluator: MicroPythonRemoteEvaluator | null = null;

  let evaluators: EvaluatorMap = {
    pyodide: pyEvaluator,
    javascript: jsEvaluator
  };

  let notebook: NotebookType = {
    id: 'embedded-1',
    title: 'Embedded MicroPython Tool',
    cells: [
      {
        id: 'intro',
        type: 'markdown',
        content: '# Remote MicroPython Console\nUse this tool to interact with your ESP32/ESP8266 device via WebREPL.'
      },
      {
        id: 'local-calc',
        type: 'code',
        engine: 'pyodide',
        content: '# This runs LOCALLY in your browser\nprint("Local Python (Pyodide) is ready")\n2 + 2'
      },
      {
        id: 'remote-test',
        type: 'code',
        engine: 'micropython',
        content: '# This runs REMOTELY on your device\nimport machine\nprint("Device Unique ID:", machine.unique_id())\n# machine.Pin(2, machine.Pin.OUT).value(1) # Toggle LED'
      }
    ]
  };

  onMount(async () => {
    await Promise.all([pyEvaluator.initialize(), jsEvaluator.initialize()]);
    initialized = true;
  });

  async function connect() {
    connecting = true;
    try {
      mpyEvaluator = new MicroPythonRemoteEvaluator({ url: wsUrl, password });
      await mpyEvaluator.initialize();
      evaluators = { ...evaluators, micropython: mpyEvaluator };
      connected = true;
    } catch (e: any) {
      alert('Failed to connect: ' + e.message);
    } finally {
      connecting = false;
    }
  }

  function disconnect() {
    mpyEvaluator?.disconnect();
    connected = false;
    const { micropython, ...rest } = evaluators;
    evaluators = rest;
  }
</script>

<main>
  <header>
    <div class="title-group">
        <h1>{notebook.title}</h1>
        <div class="status-badge" class:connected>{connected ? 'CONNECTED' : 'DISCONNECTED'}</div>
    </div>
    
    <div class="connection-controls">
      <input type="text" bind:value={wsUrl} placeholder="ws://192.168.4.1:8266" disabled={connected} />
      <input type="password" bind:value={password} placeholder="password" disabled={connected} />
      {#if !connected}
        <button on:click={connect} disabled={connecting} class="connect-btn">
          {connecting ? 'Connecting...' : 'Connect to Device'}
        </button>
      {:else}
        <button on:click={disconnect} class="disconnect-btn">Disconnect</button>
      {/if}
    </div>
  </header>

  {#if initialized}
    <Notebook {notebook} {evaluators} />
  {:else}
    <div class="loading">
      <div class="spinner-large"></div>
      <p>Loading local engines...</p>
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
    align-items: flex-start;
    margin-bottom: 3rem;
    background: #f8fafc;
    padding: 1.5rem;
    border-radius: 12px;
    border: 1px solid #e2e8f0;
  }
  .title-group {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
  }
  h1 {
    color: #0f172a;
    margin: 0;
    font-weight: 800;
    font-size: 1.5rem;
  }
  .status-badge {
      display: inline-block;
      font-size: 0.7rem;
      font-weight: 900;
      padding: 2px 8px;
      border-radius: 99px;
      background: #ef4444;
      color: white;
      width: fit-content;
  }
  .status-badge.connected {
      background: #22c55e;
  }
  .connection-controls {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }
  input {
      padding: 0.5rem;
      border-radius: 6px;
      border: 1px solid #cbd5e1;
      font-size: 0.875rem;
  }
  button {
    padding: 0.5rem 1rem;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.875rem;
    font-weight: 600;
    border: none;
    transition: all 0.2s;
  }
  .connect-btn {
    background: #3b82f6;
    color: white;
  }
  .connect-btn:hover { background: #2563eb; }
  .disconnect-btn {
    background: #64748b;
    color: white;
  }
  .disconnect-btn:hover { background: #475569; }

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
