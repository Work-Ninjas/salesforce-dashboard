const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();

    console.log('=== TESTING ALL FIXES ===\n');

    // Navigate to dashboard
    await page.goto('http://localhost:3003');
    await page.waitForTimeout(3000);

    // 1. TEST: Data order (should be descending by year)
    console.log('1. CHECKING YEAR ORDER:');
    const firstYears = await page.locator('#divisionTable tbody tr td:first-child').allTextContents();
    const uniqueYears = [...new Set(firstYears.filter(y => y && y !== 'TOTAL'))];
    console.log('   Years order:', uniqueYears.slice(0, 5).join(', '));
    const isDescending = uniqueYears.every((y, i) => i === 0 || parseInt(y) <= parseInt(uniqueYears[i-1]));
    console.log('   ✓ Descending order:', isDescending ? 'YES' : 'NO');

    // 2. TEST: Top metrics (should show grand total)
    console.log('\n2. TOP METRICS:');
    const totalOpp = await page.locator('#totalOpportunities').textContent();
    const totalRev = await page.locator('#totalRevenue').textContent();
    console.log('   Total Opportunities:', totalOpp);
    console.log('   Total Revenue:', totalRev);
    console.log('   ✓ Should be grand total of all years');

    // 3. TEST: Click on Open cell and verify no Lost records
    console.log('\n3. TESTING OPEN DRILL-THROUGH:');
    // Find an Open cell with value > 0
    const openCells = await page.locator('#divisionTable tbody tr').filter({ hasText: '2025' }).first()
        .locator('td').nth(5); // Open column
    const openValue = await openCells.textContent();
    console.log('   Open value to test:', openValue);

    if (openValue && openValue !== '0') {
        await openCells.click();
        await page.waitForTimeout(2000);

        // Check modal content
        const modalTitle = await page.locator('#modalTitle').textContent();
        console.log('   Modal title:', modalTitle);

        // Check if any Lost records appear
        const stageNames = await page.locator('#detailTable tbody td:nth-child(3)').allTextContents();
        const hasLost = stageNames.some(s => s === 'Lost');
        console.log('   ✓ Contains Lost records:', hasLost ? 'ERROR - YES' : 'CORRECT - NO');

        // Close modal
        await page.locator('[data-bs-dismiss="modal"]').click();
        await page.waitForTimeout(1000);
    }

    // 4. TEST: Click on Close Rate % (should show Approved records)
    console.log('\n4. TESTING CLOSE RATE DRILL-THROUGH:');
    const closeRateCell = await page.locator('#divisionTable tbody tr').filter({ hasText: '2024' }).first()
        .locator('td').nth(6); // Close Rate column
    const closeRateValue = await closeRateCell.textContent();
    console.log('   Close Rate value:', closeRateValue);

    await closeRateCell.click();
    await page.waitForTimeout(2000);

    const modalVisible = await page.locator('#detailModal').isVisible();
    console.log('   ✓ Modal opens on Close Rate click:', modalVisible ? 'YES' : 'NO');

    if (modalVisible) {
        await page.locator('[data-bs-dismiss="modal"]').click();
        await page.waitForTimeout(1000);
    }

    // 5. TEST: Filters
    console.log('\n5. TESTING FILTERS:');
    // Select year 2024
    await page.selectOption('#yearFilter', '2024');
    await page.click('button:has-text("Apply Filters")');
    await page.waitForTimeout(1000);

    // Check if table filtered
    const visibleYears = await page.locator('#divisionTable tbody tr td:first-child').allTextContents();
    const only2024 = visibleYears.every(y => y === '2024' || y === '');
    console.log('   ✓ Year filter works:', only2024 ? 'YES' : 'NO');

    // Check metrics updated
    const filteredOpp = await page.locator('#totalOpportunities').textContent();
    console.log('   Filtered Total Opp:', filteredOpp);

    // Clear filters
    await page.click('button:has-text("Clear")');
    await page.waitForTimeout(1000);

    // 6. TEST: Visual improvements
    console.log('\n6. VISUAL CHECKS:');
    // Check if links don't have underline by default
    const linkStyle = await page.locator('.clickable-value').first().evaluate(el => {
        return window.getComputedStyle(el).textDecoration;
    });
    console.log('   ✓ Links without underline:', !linkStyle.includes('underline') ? 'YES' : 'NO');

    // Take final screenshot
    await page.screenshot({ path: 'dashboard-all-fixes.png', fullPage: true });
    console.log('\n✓ Screenshot saved as dashboard-all-fixes.png');

    await page.waitForTimeout(3000);
    await browser.close();

    console.log('\n=== ALL TESTS COMPLETE ===');
})();