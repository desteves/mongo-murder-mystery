import { test, expect } from '@playwright/test';

test.describe('MongoDB Murder Mystery - Home Page', () => {
  test('should load the home page', async ({ page }) => {
    await page.goto('/');
    
    // Check that the title is correct
    await expect(page).toHaveTitle(/MongoDB Murder Mystery/);
    
    // Check that the main heading is visible
    await expect(page.locator('text=whodunnit')).toBeVisible();
  });

  test('should have navigation links', async ({ page }) => {
    await page.goto('/');
    
    // Check for navigation links
    await expect(page.locator('nav >> text=Home')).toBeVisible();
    await expect(page.locator('nav >> text=Walkthrough')).toBeVisible();
    await expect(page.locator('nav >> text=About')).toBeVisible();
  });

  test('should navigate to walkthrough page', async ({ page }) => {
    await page.goto('/');
    
    // Click on Walkthrough link
    await page.click('nav >> text=Walkthrough');
    
    // Wait for navigation
    await page.waitForURL('**/walkthrough**');
    
    // Check that we're on the walkthrough page
    await expect(page.locator('text=The Plot')).toBeVisible();
  });

  test('should navigate to about page', async ({ page }) => {
    await page.goto('/');
    
    // Click on About link
    await page.click('nav >> text=About');
    
    // Wait for navigation
    await page.waitForURL('**/about**');
    
    // Check that we're on the about page
    await expect(page.locator('text=Motivation')).toBeVisible();
  });
});

