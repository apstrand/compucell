<script lang="ts">
  import { marked } from 'marked';
  import { onMount } from 'svelte';

  export let initialContent: string = '';
  export let id: string = '';

  let content = localStorage.getItem(`markdown-${id}`) || initialContent;
  let editing = false;
  let textarea: HTMLTextAreaElement;

  function toggleEdit() {
    editing = !editing;
    if (editing) {
      setTimeout(() => textarea.focus(), 0);
    }
  }

  function save() {
    localStorage.setItem(`markdown-${id}`, content);
    editing = false;
  }

  $: rendered = marked.parse(content);
</script>

<div class="markdown-cell" on:dblclick={toggleEdit}>
  {#if editing}
    <div class="editor-container">
      <textarea
        bind:this={textarea}
        bind:value={content}
        on:blur={save}
        placeholder="Type markdown here..."
      ></textarea>
      <div class="hint">Press Esc or click outside to save</div>
    </div>
  {:else}
    <div class="prose">
      {@html rendered}
    </div>
  {/if}
</div>

<style>
  .markdown-cell {
    padding: 1rem;
    margin-bottom: 1rem;
    border: 1px solid transparent;
    border-radius: 8px;
    transition: border-color 0.2s;
    cursor: text;
  }
  .markdown-cell:hover {
    border-color: #eee;
  }
  .prose {
    line-height: 1.6;
    color: #374151;
  }
  .editor-container {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  textarea {
    width: 100%;
    min-height: 150px;
    padding: 0.75rem;
    border: 1px solid var(--border);
    border-radius: 4px;
    font-family: inherit;
    font-size: 1rem;
    resize: vertical;
  }
  .hint {
    font-size: 0.8rem;
    color: #9ca3af;
  }
</style>
