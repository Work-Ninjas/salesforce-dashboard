const { test, expect } = require('@playwright/test');

test.describe('Deployed Dashboard Tests', () => {
    test('should load deployed dashboard', async ({ page }) => {
        await page.goto('https://thankful-sand-0d606571e.1.azurestaticapps.net');
        await expect(page).toHaveTitle(/Salesforce Dashboard/);

        await page.waitForSelector('#divisionTable', { timeout: 30000 });

        const divisionRows = await page.$$('#divisionTable tbody tr');
        expect(divisionRows.length).toBeGreaterThan(0);
    });

    test('should fetch division summary from API', async ({ page }) => {
        const response = await page.request.get('https://thankful-sand-0d606571e.1.azurestaticapps.net/api/division-summary');
        expect(response.status()).toBe(200);

        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.data).toBeDefined();
    });

    test('should fetch lead summary from API', async ({ page }) => {
        const response = await page.request.get('https://thankful-sand-0d606571e.1.azurestaticapps.net/api/lead-summary');
        expect(response.status()).toBe(200);

        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.data).toBeDefined();
    });

    test('should fetch opportunity details from API', async ({ page }) => {
        const response = await page.request.get('https://thankful-sand-0d606571e.1.azurestaticapps.net/api/opportunity-detail?year=2025');
        expect(response.status()).toBe(200);

        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.data).toBeDefined();
    });
});