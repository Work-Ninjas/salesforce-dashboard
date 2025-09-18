const ExcelJS = require('exceljs');
const fs = require('fs');

async function checkExcel(filename) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filename);

    console.log(`\n=== Checking ${filename} ===`);
    console.log('Number of worksheets:', workbook.worksheets.length);
    console.log('Worksheet names:', workbook.worksheets.map(ws => ws.name).join(', '));

    // Check first worksheet columns
    const firstSheet = workbook.worksheets[0];
    console.log('\nFirst sheet name:', firstSheet.name);
    console.log('Columns:');

    const headerRow = firstSheet.getRow(1);
    headerRow.eachCell((cell, colNumber) => {
        console.log(`  ${colNumber}. ${cell.value}`);
    });

    // Count data rows
    let rowCount = 0;
    firstSheet.eachRow((row, rowNumber) => {
        if (rowNumber > 1) rowCount++;
    });
    console.log('\nData rows:', rowCount);
}

// Test division export
checkExcel('test-division.xlsx').catch(console.error);