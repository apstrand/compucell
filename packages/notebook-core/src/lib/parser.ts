import type { Notebook, NotebookCell } from './types';

export function parseMarkdownNotebook(md: string, filename: string = 'notebook'): Notebook {
  const cells: NotebookCell[] = [];
  
  // 1. Parse Frontmatter (simple version)
  let title = filename;
  let metadata: Record<string, any> = {};
  let content = md;

  if (md.startsWith('---')) {
    const endMatch = md.indexOf('---', 3);
    if (endMatch !== -1) {
      const yaml = md.substring(3, endMatch);
      content = md.substring(endMatch + 3).trim();
      
      // Basic YAML-like parsing
      yaml.split('\n').forEach(line => {
        const [key, ...val] = line.split(':');
        if (key && val.length) {
          const v = val.join(':').trim().replace(/^["']|["']$/g, '');
          if (key.trim() === 'title') title = v;
          else metadata[key.trim()] = v;
        }
      });
    }
  }

  // 2. Parse Cells (Regex for code blocks)
  // This regex finds ```lang {metadata}\n content \n```
  const codeBlockRegex = /```(\w+)(?:\s+\{(.+?)\})?\n([\s\S]*?)\n```/g;
  
  let lastIndex = 0;
  let match;
  let cellCounter = 0;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    // Everything before the code block is a Markdown cell
    const before = content.substring(lastIndex, match.index).trim();
    if (before) {
      cells.push({
        id: `text-${cellCounter++}`,
        type: 'markdown',
        content: before
      });
    }

    const lang = match[1];
    const attrStr = match[2] || '';
    const code = match[3];

    // Parse attributes like {id="abc", engine="pyodide"}
    const attrs: Record<string, string> = {};
    attrStr.split(',').forEach(attr => {
      const [k, v] = attr.split('=').map(s => s.trim().replace(/^["']|["']$/g, ''));
      if (k && v) attrs[k] = v;
    });

    cells.push({
      id: attrs.id || `code-${cellCounter++}`,
      type: 'code',
      engine: attrs.engine || (lang === 'js' ? 'javascript' : lang),
      content: code,
      metadata: attrs
    });

    lastIndex = codeBlockRegex.lastIndex;
  }

  // Final markdown cell if anything is left
  const remaining = content.substring(lastIndex).trim();
  if (remaining) {
    cells.push({
      id: `text-${cellCounter++}`,
      type: 'markdown',
      content: remaining
    });
  }

  return {
    id: metadata.id || filename,
    title,
    metadata,
    cells
  };
}
