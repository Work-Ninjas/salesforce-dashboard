const { chromium } = require('playwright');

(async () => {
    // Launch browser
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();

    console.log('=== TESTING DASHBOARD ===');

    // Navigate to dashboard
    await page.goto('http://localhost:3003');
    console.log('✓ Dashboard loaded');

    // Wait for data to load
    await page.waitForTimeout(3000);

    // Check if tables are populated
    const divisionTableRows = await page.locator('#divisionTable tbody tr').count();
    console.log(`✓ Division table has ${divisionTableRows} rows`);

    const leadTableRows = await page.locator('#leadTable tbody tr').count();
    console.log(`✓ Lead table has ${leadTableRows} rows`);

    // Check if columns are correct
    const headers = await page.locator('#divisionTable thead th').allTextContents();
    console.log('\n=== DIVISION TABLE HEADERS ===');
    headers.forEach((h, i) => console.log(`${i+1}. ${h}`));

    // Get sample data from first row
    const firstRow = await page.locator('#divisionTable tbody tr').first();
    const firstRowData = await firstRow.locator('td').allTextContents();
    console.log('\n=== FIRST ROW DATA ===');
    firstRowData.forEach((d, i) => console.log(`${i+1}. ${d}`));

    // Test drill-through on a specific cell
    console.log('\n=== TESTING DRILL-THROUGH ===');

    // Find a cell with data (not zero) to click
    const clickableCells = await page.locator('#divisionTable .drill-cell').all();
    console.log(`Found ${clickableCells.length} clickable cells`);

    if (clickableCells.length > 0) {
        // Click on first clickable cell
        await clickableCells[0].click();
        console.log('✓ Clicked on a drill-through cell');

        // Wait for modal
        await page.waitForTimeout(2000);

        // Check if modal opened
        const modalVisible = await page.locator('#detailModal').isVisible();
        console.log(`✓ Detail modal is ${modalVisible ? 'visible' : 'NOT visible'}`);

        if (modalVisible) {
            // Count detail records
            const detailRows = await page.locator('#detailTable tbody tr').count();
            console.log(`✓ Detail table has ${detailRows} records`);

            // Close modal
            await page.locator('[data-bs-dismiss="modal"]').click();
            console.log('✓ Modal closed');
        }
    } else {
        console.log('⚠ No clickable cells found - checking why...');

        // Check actual HTML structure
        const sampleCell = await page.locator('#divisionTable tbody td').nth(2);
        const cellHTML = await sampleCell.innerHTML();
        console.log('Sample cell HTML:', cellHTML);
    }

    // Take screenshot
    await page.screenshot({ path: 'dashboard-test.png', fullPage: true });
    console.log('\n✓ Screenshot saved as dashboard-test.png');

    // Keep browser open for 5 seconds to observe
    await page.waitForTimeout(5000);

    await browser.close();
    console.log('\n=== TEST COMPLETE ===');
})();