const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();

    console.log('=== TESTING OPEN DRILL-THROUGH FIX ===\n');

    // Navigate to dashboard (port 3004 now)
    await page.goto('http://localhost:3004');
    await page.waitForTimeout(3000);

    // Find the 2023 Residential Reroof row with 1470 Open
    console.log('1. Finding 2023 Residential Reroof row...');
    const targetRow = await page.locator('#divisionTable tbody tr').filter({
        has: page.locator('td').filter({ hasText: '2023' })
    }).filter({
        has: page.locator('td').filter({ hasText: 'Residential Reroof' })
    }).first();

    // Get the Open value (should be 1470)
    const openCell = await targetRow.locator('td').nth(5); // Open column
    const openValue = await openCell.textContent();
    console.log('   Open value found:', openValue);

    // Click on Open cell
    console.log('\n2. Clicking on Open cell...');
    await openCell.click();
    await page.waitForTimeout(2000);

    // Check modal opened
    const modalVisible = await page.locator('#detailModal').isVisible();
    console.log('   Modal opened:', modalVisible ? 'YES' : 'NO');

    if (modalVisible) {
        // Count detail records
        const detailRows = await page.locator('#detailTable tbody tr').count();
        console.log('\n3. RESULTS:');
        console.log('   Expected records: ~1470 (from summary)');
        console.log('   Actual records:', detailRows);

        // Check stages in detail
        const stages = await page.locator('#detailTable tbody td:nth-child(3)').allTextContents();
        const uniqueStages = [...new Set(stages)];
        console.log('   Stages found:', uniqueStages.join(', '));

        // Check for incorrect stages
        const hasApproved = stages.includes('Approved');
        const hasLost = stages.includes('Lost');

        console.log('\n4. VALIDATION:');
        console.log('   Contains Approved:', hasApproved ? 'ERROR - YES' : 'CORRECT - NO');
        console.log('   Contains Lost:', hasLost ? 'ERROR - YES' : 'CORRECT - NO');
        console.log('   Record count matches:', Math.abs(detailRows - 1470) < 10 ? 'YES ✓' : 'NO - ERROR');

        // Close modal
        await page.locator('[data-bs-dismiss="modal"]').click();
    }

    // Test another Open cell to be sure
    console.log('\n5. Testing another Open cell...');
    const anotherRow = await page.locator('#divisionTable tbody tr').filter({
        has: page.locator('td').filter({ hasText: '2024' })
    }).first();

    const anotherOpenCell = await anotherRow.locator('td').nth(5);
    const anotherOpenValue = await anotherOpenCell.textContent();

    if (anotherOpenValue && anotherOpenValue !== '0') {
        console.log('   Testing Open value:', anotherOpenValue);
        await anotherOpenCell.click();
        await page.waitForTimeout(2000);

        const stages2 = await page.locator('#detailTable tbody td:nth-child(3)').allTextContents();
        const uniqueStages2 = [...new Set(stages2)];
        console.log('   Stages found:', uniqueStages2.slice(0, 5).join(', '));

        const hasApproved2 = stages2.includes('Approved');
        const hasLost2 = stages2.includes('Lost');
        console.log('   Contains Approved/Lost:', (hasApproved2 || hasLost2) ? 'ERROR' : 'CORRECT ✓');

        await page.locator('[data-bs-dismiss="modal"]').click();
    }

    // Take screenshot
    await page.screenshot({ path: 'open-fix-test.png', fullPage: true });
    console.log('\n✓ Screenshot saved as open-fix-test.png');

    await page.waitForTimeout(3000);
    await browser.close();

    console.log('\n=== TEST COMPLETE ===');
})();