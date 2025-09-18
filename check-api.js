const fs = require('fs');

const data = JSON.parse(fs.readFileSync('test-response.json', 'utf-8'));

console.log('Total records returned:', data.length);

// Count by stage
const stageCount = {};
data.forEach(record => {
    const stage = record.StageName;
    stageCount[stage] = (stageCount[stage] || 0) + 1;
});

console.log('\nRecords by stage:');
Object.entries(stageCount).forEach(([stage, count]) => {
    console.log(`  ${stage}: ${count}`);
});

// Check if Lost and Approved are included
console.log('\nERROR CHECK:');
console.log('  Contains Lost records:', stageCount['Lost'] > 0 ? `YES - ${stageCount['Lost']} records` : 'NO');
console.log('  Contains Approved records:', stageCount['Approved'] > 0 ? `YES - ${stageCount['Approved']} records` : 'NO');

// Show a few sample records
console.log('\nSample records:');
data.slice(0, 3).forEach((record, i) => {
    console.log(`${i + 1}. ${record.StageName} - ${record.Division} - ${record.YearValue}`);
});