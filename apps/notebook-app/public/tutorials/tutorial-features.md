---
title: "Framework Features Showcase"
id: "features-demo"
author: "Gemini CLI"
---

# 🚀 Interactive Notebook Features

Welcome to the **Coding Machine** showcase! This notebook demonstrates the core capabilities of our modular framework.

## 1. Multi-Engine Support
Each cell can run on a different engine. Below is a **JavaScript** cell followed by a **Python (Pyodide)** cell.

```javascript {id="js-demo", engine="javascript"}
// JavaScript execution in the browser
const greet = (name) => `Hello, ${name}! The year is ${new Date().getFullYear()}.`;
greet("User")
```

```python {id="py-demo", engine="pyodide"}
# Python execution via WebAssembly
import math
print(f"Pi is approximately {math.pi:.4f}")
"Success from Pyodide!"
```

---

## 2. Rich Data Visualizations
We support **Pandas** for data analysis and **Plotly** for interactive charts.

```python {id="pandas-demo", engine="pyodide"}
import pandas as pd
import numpy as np

# DataFrames render as styled HTML tables
df = pd.DataFrame({
    "Feature": ["Interactive", "Modular", "Web-based", "Fast"],
    "Score": [10, 10, 9, 8],
    "Verified": [True, True, True, True]
})
df
```

```python {id="plotly-demo", engine="pyodide"}
import plotly.express as px

# Create an interactive plot
fig = px.bar(df, x="Feature", y="Score", color="Feature", title="Framework Strengths")
fig
```

---

## 3. Variable Introspection
The framework analyzes your code using the Python `ast` module to find defined variables. Check the **"Defined"** tags below the cell after running it!

```python {id="introspection-demo", engine="pyodide"}
my_variable = 42
def my_helper_function(x):
    return x * 2

class MyAwesomeClass:
    pass

"Variable analysis complete."
```

---

## 4. Markdown Editing
**Double-click** any text cell (like this one) to edit its content. We use `marked` for fast, client-side rendering.

- Support for **lists**
- **Bold** and *Italic*
- [Links](https://pyodide.org)
- Even math-like symbols: $\pi r^2$ (rendering via standard markdown)

---

## 5. Persistence & Progress
Your changes are automatically saved to `localStorage`. Refresh the page, and your code edits will still be here. Use the **Reset Progress** button at the top to revert to the original tutorial state.
