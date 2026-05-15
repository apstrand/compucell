---
title: "Data Science with Python"
id: "tutorial-1"
---

# Python Data Science 101

This notebook runs entirely in your browser using **Pyodide**. You can analyze data with Pandas and create interactive plots.

Try running the cells below!

```python {engine="pyodide", id="data-load"}
import pandas as pd
import numpy as np

# Generate some random data
df = pd.DataFrame({
    'Month': ['Jan', 'Feb', 'Mar', 'Apr', 'May'],
    'Revenue': [100, 120, 150, 130, 180],
    'Costs': [80, 85, 100, 95, 110]
})
df['Profit'] = df['Revenue'] - df['Costs']
df
```

## JavaScript Interop

You can also mix in JavaScript for quick calculations or UI interactions.

```javascript {id="js-code"}
const now = new Date();
`Current time is: ${now.toLocaleTimeString()}`
```

## Interactive Visualizations

Finally, let's look at a plot.

```python {engine="pyodide", id="viz-code"}
import plotly.express as px
fig = px.line(df, x='Month', y=['Revenue', 'Costs', 'Profit'], title='Company Performance')
fig
```
