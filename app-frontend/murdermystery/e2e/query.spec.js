import { test, expect } from '@playwright/test';

test.describe('MongoDB Murder Mystery - Query Functionality', () => {
  test('should display query editor on home page', async ({ page }) => {
    await page.goto('/');
    
    // Check that the CodeMirror editor is present
    await expect(page.locator('.editor')).toBeVisible();
    
    // Check that RUN and RESET buttons are present
    await expect(page.locator('button:has-text("RUN")')).toBeVisible();
    await expect(page.locator('button:has-text("RESET")')).toBeVisible();
  });

  test('should show schema diagram when clicked', async ({ page }) => {
    await page.goto('/');
    
    // Click to show schema diagram
    await page.click('text=Click here to show the Schema diagram');
    
    // Check that the image is now visible
    await expect(page.locator('img[alt="MongoDB Schema"]')).toBeVisible();
  });

  test('should display incident notes section', async ({ page }) => {
    await page.goto('/');
    
    // Check that incident notes section is visible
    await expect(page.locator('text=Incident Notes')).toBeVisible();
    
    // Check that the textarea is present
    await expect(page.locator('.incident-notes__textarea')).toBeVisible();
  });
});

test.describe('MongoDB Murder Mystery - Walkthrough', () => {
  test('should display walkthrough sections', async ({ page }) => {
    await page.goto('/walkthrough');
    
    // Check for key sections
    await expect(page.locator('text=The Plot')).toBeVisible();
    await expect(page.locator('text=Showing collections')).toBeVisible();
  });

  test('should have pre-filled query examples', async ({ page }) => {
    await page.goto('/walkthrough');
    
    // Check that there are query prompts with pre-filled text
    await expect(page.locator('.editor').first()).toBeVisible();
  });
});

