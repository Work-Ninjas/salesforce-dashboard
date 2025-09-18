const { chromium } = require('playwright');

async function testDeployment(url) {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    console.log(`🧪 Testing deployment at: ${url}`);
    console.log('=====================================\n');

    try {
        // Test 1: Homepage loads
        console.log('1️⃣ Testing homepage...');
        const homeResponse = await page.goto(url, {
            waitUntil: 'networkidle',
            timeout: 30000
        });

        if (homeResponse.status() === 200) {
            console.log('✅ Homepage loads successfully');
        } else {
            console.log(`❌ Homepage returned status: ${homeResponse.status()}`);
            return false;
        }

        // Test 2: Check for dashboard title
        console.log('\n2️⃣ Checking dashboard title...');
        const title = await page.title();
        if (title.includes('Salesforce') || title.includes('Dashboard')) {
            console.log(`✅ Title found: ${title}`);
        } else {
            console.log(`⚠️ Unexpected title: ${title}`);
        }

        // Test 3: Test API endpoints
        console.log('\n3️⃣ Testing API endpoints...');

        const endpoints = [
            '/api/division-summary',
            '/api/lead-summary',
            '/api/opportunity-detail'
        ];

        for (const endpoint of endpoints) {
            const apiResponse = await page.evaluate(async (ep) => {
                try {
                    const res = await fetch(ep);
                    const data = await res.json();
                    return {
                        status: res.status,
                        success: data.success,
                        hasData: data.data && data.data.length > 0
                    };
                } catch (e) {
                    return { error: e.message };
                }
            }, endpoint);

            if (apiResponse.status === 200 && apiResponse.success) {
                console.log(`✅ ${endpoint}: Working (${apiResponse.hasData ? 'with data' : 'no data'})`);
            } else {
                console.log(`❌ ${endpoint}: Failed - ${JSON.stringify(apiResponse)}`);
            }
        }

        // Test 4: Check if filters exist
        console.log('\n4️⃣ Checking UI elements...');
        const yearFilter = await page.$('#yearFilter');
        if (yearFilter) {
            console.log('✅ Year filter found');

            // Check if it has options
            const options = await page.$$eval('#yearFilter option', opts => opts.length);
            console.log(`   Found ${options} year options`);
        } else {
            console.log('❌ Year filter not found');
        }

        // Test 5: Check tables exist
        const divisionTable = await page.$('#divisionTable');
        const leadTable = await page.$('#leadTable');

        if (divisionTable) {
            console.log('✅ Division table found');
            const rows = await page.$$eval('#divisionTable tbody tr', rows => rows.length);
            console.log(`   Found ${rows} rows in division table`);
        }

        if (leadTable) {
            console.log('✅ Lead table found');
            const rows = await page.$$eval('#leadTable tbody tr', rows => rows.length);
            console.log(`   Found ${rows} rows in lead table`);
        }

        // Test 6: Screenshot for visual verification
        console.log('\n5️⃣ Taking screenshot...');
        await page.screenshot({ path: 'deployment-test.png', fullPage: true });
        console.log('✅ Screenshot saved as deployment-test.png');

        console.log('\n=====================================');
        console.log('🎉 All tests completed successfully!');
        return true;

    } catch (error) {
        console.error('\n❌ Test failed with error:', error.message);

        // Take error screenshot
        await page.screenshot({ path: 'deployment-error.png', fullPage: true });
        console.log('📸 Error screenshot saved as deployment-error.png');

        return false;
    } finally {
        await browser.close();
    }
}

// Run test
const deploymentUrl = process.argv[2] || 'https://salesforce-dashboard-wn.azurewebsites.net';

testDeployment(deploymentUrl).then(success => {
    if (success) {
        console.log('\n✅ Deployment is working correctly!');
        process.exit(0);
    } else {
        console.log('\n❌ Deployment has issues');
        process.exit(1);
    }
});