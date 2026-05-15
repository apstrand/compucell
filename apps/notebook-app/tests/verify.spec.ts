import { test, expect } from '@playwright/test';

test('Verify Pyodide initialization and evaluation', async ({ page }) => {
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.type(), msg.text()));
  page.on('pageerror', err => console.log('BROWSER PAGE ERROR:', err.message));
  
  await page.goto('http://localhost:5173/?test=true');
  
  // Wait for "Initializing..." to disappear
  await expect(page.getByText('Initializing environment...')).not.toBeVisible({ timeout: 60000 });
  
  const editor = page.locator('.cm-content');
  await editor.click();
  await page.keyboard.press('Control+A');
  await page.keyboard.press('Backspace');
  await page.keyboard.type('123 + 456');
  
  await page.getByRole('button', { name: '▶' }).click();
  
  const result = page.locator('.result-value');
  await expect(result).toHaveText('579', { timeout: 10000 });
});
