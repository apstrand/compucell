import { test, expect } from '@playwright/test';

test.describe('Python Evaluation', () => {
  test.beforeEach(async ({ page }) => {
    page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
    // Use test mode to speed up and simplify
    await page.goto('/?test=true');
    // Wait for initialization to complete
    await expect(page.getByText('Initializing Python environment...')).not.toBeVisible({ timeout: 30000 });
  });

  async function typeCode(page, code) {
    const editor = page.locator('.cm-content');
    await editor.click();
    await page.keyboard.press('Control+A');
    await page.keyboard.press('Backspace');
    await page.keyboard.type(code);
    await page.waitForTimeout(500);
  }

  test('should evaluate a simple expression', async ({ page }) => {
    await typeCode(page, '1 + 1');
    await page.getByRole('button', { name: '▶' }).click();

    const result = page.locator('.result-value');
    await expect(result).toHaveText('2');
  });

  test('should capture stdout from print()', async ({ page }) => {
    await typeCode(page, "print('Hello World')");
    await page.getByRole('button', { name: '▶' }).click();

    const stdout = page.locator('.stdout');
    await expect(stdout).toContainText('Hello World');
  });

  test('should show error messages for invalid code', async ({ page }) => {
    await typeCode(page, 'syntax error here');
    await page.getByRole('button', { name: '▶' }).click();

    const error = page.locator('.error');
    await expect(error).toBeVisible();
    await expect(error).toContainText('SyntaxError');
  });

  test('should run code with Shift+Enter', async ({ page }) => {
    await typeCode(page, '123 * 2');
    
    // Ensure the editor still has focus
    await page.locator('.cm-content').focus();
    await page.keyboard.down('Shift');
    await page.keyboard.press('Enter');
    await page.keyboard.up('Shift');

    // Wait for either result-value or error to appear
    await expect(page.locator('.output-area')).toBeVisible({ timeout: 10000 });
    
    const result = page.locator('.result-value');
    await expect(result).toHaveText('246');
  });
});
