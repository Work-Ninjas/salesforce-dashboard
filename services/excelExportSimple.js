const ExcelJS = require('exceljs');
const { getDivisionSummary, getLeadSummary, getOpportunityDetail } = require('./queries');

async function generateDivisionExcel() {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Salesforce Dashboard';
    workbook.created = new Date();

    const divisionData = await getDivisionSummary();

    const divisionSheet = workbook.addWorksheet('Division Summary', {
        properties: { tabColor: { argb: '1B5E20' } }
    });

    // Setup columns with correct names matching the SQL output
    divisionSheet.columns = [
        { header: 'Year', key: 'Year', width: 10 },
        { header: 'Division', key: 'Division', width: 25 },
        { header: 'Total Opportunities', key: 'TotalOpp', width: 18 },
        { header: 'Won', key: 'Approved', width: 10 },
        { header: 'Lost', key: 'Lost', width: 10 },
        { header: 'Open', key: 'OpenOpp', width: 10 },
        { header: 'Total Revenue', key: 'Revenue', width: 18 },
        { header: 'Avg Ticket', key: 'AverageTicket', width: 15 },
        { header: 'Close Rate (Std) %', key: 'CloseRate_Std', width: 18 },
        { header: 'Close Rate (Exclude Open) %', key: 'CloseRate_ExcludeOpen', width: 25 }
    ];

    // Style header row
    divisionSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
    divisionSheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: '4CAF50' }
    };
    divisionSheet.getRow(1).alignment = { horizontal: 'center' };

    // Add data
    divisionData.forEach(row => {
        const newRow = divisionSheet.addRow(row);

        // Style TOTAL row
        if (row.Division === 'TOTAL') {
            newRow.font = { bold: true };
            newRow.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'E8F5E9' }
            };
        }
    });

    // Add autofilter
    divisionSheet.autoFilter = {
        from: 'A1',
        to: 'J1'
    };

    return workbook;
}

async function generateLeadExcel() {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Salesforce Dashboard';
    workbook.created = new Date();

    const leadData = await getLeadSummary();

    const leadSheet = workbook.addWorksheet('Lead Type Summary', {
        properties: { tabColor: { argb: '1565C0' } }
    });

    // Setup columns with correct names matching the SQL output
    leadSheet.columns = [
        { header: 'Year', key: 'Year', width: 10 },
        { header: 'Lead Type', key: 'LeadType', width: 25 },
        { header: 'Total Opportunities', key: 'TotalOpp', width: 18 },
        { header: 'Won', key: 'Approved', width: 10 },
        { header: 'Lost', key: 'Lost', width: 10 },
        { header: 'Open', key: 'OpenOpp', width: 10 },
        { header: 'Total Revenue', key: 'Revenue', width: 18 },
        { header: 'Avg Ticket', key: 'AverageTicket', width: 15 },
        { header: 'Close Rate (Std) %', key: 'CloseRate_Std', width: 18 },
        { header: 'Close Rate (Exclude Open) %', key: 'CloseRate_ExcludeOpen', width: 25 }
    ];

    // Style header row
    leadSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
    leadSheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: '2196F3' }
    };
    leadSheet.getRow(1).alignment = { horizontal: 'center' };

    // Add data
    leadData.forEach(row => {
        const newRow = leadSheet.addRow(row);

        // Style TOTAL row
        if (row.LeadType === 'TOTAL') {
            newRow.font = { bold: true };
            newRow.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'E3F2FD' }
            };
        }
    });

    // Add autofilter
    leadSheet.autoFilter = {
        from: 'A1',
        to: 'J1'
    };

    return workbook;
}

async function generateDetailExcel(filters = {}) {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Salesforce Dashboard';
    workbook.created = new Date();

    const detailData = await getOpportunityDetail(filters);

    const detailSheet = workbook.addWorksheet('Opportunity Detail', {
        properties: { tabColor: { argb: 'FF6F00' } }
    });

    // Setup columns
    detailSheet.columns = [
        { header: 'ID', key: 'Id', width: 20 },
        { header: 'Name', key: 'Name', width: 40 },
        { header: 'Stage', key: 'StageName', width: 15 },
        { header: 'Amount', key: 'Amount', width: 15 },
        { header: 'Division', key: 'Division', width: 20 },
        { header: 'Lead Type', key: 'LeadType', width: 20 },
        { header: 'Created Date', key: 'Created_Date', width: 18 },
        { header: 'Last Stage Date', key: 'LastStageChangeDate', width: 18 }
    ];

    // Style header row
    detailSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
    detailSheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF6F00' }
    };
    detailSheet.getRow(1).alignment = { horizontal: 'center' };

    // Add data
    detailData.forEach(row => {
        const newRow = detailSheet.addRow(row);

        // Format amount as currency
        newRow.getCell('Amount').numFmt = '$#,##0.00';

        // Style based on stage
        if (row.StageName === 'Approved') {
            newRow.getCell('StageName').fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'C8E6C9' }
            };
        } else if (row.StageName === 'Lost') {
            newRow.getCell('StageName').fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFCDD2' }
            };
        }
    });

    // Add autofilter
    detailSheet.autoFilter = {
        from: 'A1',
        to: 'H1'
    };

    // Add summary at the top
    const summarySheet = workbook.addWorksheet('Summary');
    summarySheet.columns = [
        { header: 'Metric', key: 'metric', width: 30 },
        { header: 'Value', key: 'value', width: 20 }
    ];

    summarySheet.getRow(1).font = { bold: true };
    summarySheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: '9E9E9E' }
    };

    // Add summary metrics
    const approved = detailData.filter(d => d.StageName === 'Approved').length;
    const lost = detailData.filter(d => d.StageName === 'Lost').length;
    const open = detailData.filter(d => d.StageName !== 'Approved' && d.StageName !== 'Lost').length;
    const totalRevenue = detailData
        .filter(d => d.StageName === 'Approved')
        .reduce((sum, d) => sum + (d.Amount || 0), 0);

    summarySheet.addRow({ metric: 'Total Records', value: detailData.length });
    summarySheet.addRow({ metric: 'Approved', value: approved });
    summarySheet.addRow({ metric: 'Lost', value: lost });
    summarySheet.addRow({ metric: 'Open', value: open });
    summarySheet.addRow({ metric: 'Total Revenue', value: `$${totalRevenue.toFixed(2)}` });

    // Add filter information if provided
    if (Object.keys(filters).length > 0) {
        summarySheet.addRow({ metric: '', value: '' });
        summarySheet.addRow({ metric: 'Filters Applied:', value: '' });
        if (filters.year) summarySheet.addRow({ metric: 'Year', value: filters.year });
        if (filters.division) summarySheet.addRow({ metric: 'Division', value: filters.division });
        if (filters.leadType) summarySheet.addRow({ metric: 'Lead Type', value: filters.leadType });
        if (filters.stage) summarySheet.addRow({ metric: 'Stage', value: filters.stage });
        if (filters.excludeStages) summarySheet.addRow({ metric: 'Excluded Stages', value: filters.excludeStages });
    }

    return workbook;
}

module.exports = {
    generateDivisionExcel,
    generateLeadExcel,
    generateDetailExcel,
    generateExcelReport: generateDivisionExcel // Keep for backward compatibility
};