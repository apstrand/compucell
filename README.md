# Coding Machine: Interactive Notebook Framework

A highly modular, multi-engine notebook framework built with **Svelte 5**, **Vite**, and **Pyodide**. This monorepo allows you to build specialized interactive environments (tutorials, playgrounds, developer tools) sharing a single core engine.

## 🏗 Architecture

This project uses **npm workspaces** to separate the core framework from specific applications.

- **`packages/notebook-core`**: The shared engine. Contains UI components (`Notebook`, `CodeCell`, `MarkdownCell`) and code execution logic (`Evaluators`).
- **`apps/notebook-app`**: A data-science-focused tutorial site using Pyodide and Plotly.
- **`apps/embedded-tool`**: A developer tool for remote hardware control using MicroPython WebREPL.

---

## 🚀 Getting Started

### Prerequisites
- Node.js 20+
- npm 10+

### Installation
```bash
npm install
```

### Development
Start all apps in parallel:
```bash
npm run dev
```

Run integration tests:
```bash
npm test
```

---

## 🧩 Core Concepts

### 1. The Notebook Format
Notebooks are stored as plain JSON. Each cell has an `id`, a `type` (`code` or `markdown`), and for code cells, an `engine` identifier.

```json
{
  "id": "my-tutorial",
  "title": "Introduction",
  "cells": [
    { "id": "c1", "type": "markdown", "content": "# Hello" },
    { "id": "c2", "type": "code", "engine": "pyodide", "content": "print('World')" }
  ]
}
```

### 2. Evaluators (Kernels)
Execution logic is abstracted via the `Evaluator` interface.
- **`PyodideEvaluator`**: Runs Python in a Web Worker (off-main-thread). Supports Pandas, Matplotlib, and Plotly.
- **`JavaScriptEvaluator`**: Runs JS in the browser context.
- **`MicroPythonRemoteEvaluator`**: Connects to ESP32/ESP8266 devices via WebSockets (WebREPL).

### 3. Rich Display System
The framework supports Jupyter-style rich representations. Any Python object with a `_repr_html_` or `_repr_png_` method will be rendered with its rich output. Interactive Plotly plots are supported via a custom script-injection layer in `CodeCell.svelte`.

---

## 🛠 Adding a New Use-case (Site)

To create a new application using the framework:

1.  **Scaffold the app:**
    ```bash
    mkdir -p apps/my-new-app/src
    cp apps/notebook-app/package.json apps/my-new-app/
    # Update name in apps/my-new-app/package.json
    ```
2.  **Configure Evaluators:**
    In your `App.svelte`, choose which engines to support:
    ```typescript
    import { Notebook, PyodideEvaluator } from '@coding-machine/notebook-core';
    
    const evaluators = {
      pyodide: new PyodideEvaluator()
    };
    ```
3.  **Load Content:**
    Fetch a JSON file or define a notebook object, then pass it to the component:
    ```svelte
    <Notebook {notebook} {evaluators} />
    ```
4.  **Update Root Config:**
    Vite needs to know about the workspace link. Ensure your `vite.config.ts` includes the alias and `fs.allow` as seen in existing apps.

---

## 📡 Deployment

Since these are Svelte/Vite apps, they can be deployed to any static hosting provider (Vercel, Netlify, GitHub Pages).

### Building
```bash
# Build all apps
npm run build
```

### Static Assets
Tutorial JSON files must be placed in the `public/tutorials/` folder of the specific app repository so they can be fetched at runtime.

---

## 🤖 Internal Implementation Notes (For Agents)

- **Worker Context:** Pyodide runs in `pyodide.worker.ts`. This worker handles package loading (including `micropip` for Plotly).
- **Introspection:** The worker uses the Python `ast` module to track defined variables. These are returned in the `metadata` field of the execution result.
- **Persistence:** By default, `CodeCell` and `MarkdownCell` persist their content to `localStorage` using a key derived from `notebook.id` and `cell.id`. Use the "Reset Progress" button in the UI to clear this.
- **Strict Mode Testing:** Playwright tests use a `?test=true` URL parameter. When this is present, `App.svelte` should render a simplified UI and `PyodideEvaluator` skips heavy package loading to ensure fast, reliable test runs.
