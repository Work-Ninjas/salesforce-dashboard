const ExcelJS = require('exceljs');
const { getDivisionSummary, getLeadSummary, getOpportunityDetail } = require('./queries');

async function generateExcelReport() {
    const workbook = new ExcelJS.Workbook();

    workbook.creator = 'Salesforce Dashboard';
    workbook.created = new Date();

    const divisionData = await getDivisionSummary();
    const leadData = await getLeadSummary();
    const detailData = await getOpportunityDetail();

    const divisionSheet = workbook.addWorksheet('Division Summary', {
        properties: { tabColor: { argb: '1B5E20' } }
    });
    addDivisionSummarySheet(divisionSheet, divisionData);

    const leadSheet = workbook.addWorksheet('Lead Summary', {
        properties: { tabColor: { argb: '1565C0' } }
    });
    addLeadSummarySheet(leadSheet, leadData);

    const detailSheet = workbook.addWorksheet('All Details', {
        properties: { tabColor: { argb: 'E65100' } }
    });
    addDetailSheet(detailSheet, detailData);

    const divisionDrillSheets = new Map();
    const usedSheetNames = new Set(['Division Summary', 'Lead Summary', 'All Details']);
    for (const row of divisionData.filter(d => d.Division !== 'TOTAL')) {
        const baseKey = `DIV_${row.Year}_${row.Division}`;

        const allOppsData = await getOpportunityDetail({
            year: row.Year,
            division: row.Division
        });
        divisionDrillSheets.set(`${baseKey}_Total`, allOppsData);

        const wonOppsData = await getOpportunityDetail({
            year: row.Year,
            division: row.Division,
            stage: 'Approved'
        });
        divisionDrillSheets.set(`${baseKey}_Won`, wonOppsData);

        const lostOppsData = await getOpportunityDetail({
            year: row.Year,
            division: row.Division,
            stage: 'Lost'
        });
        divisionDrillSheets.set(`${baseKey}_Lost`, lostOppsData);

        const openOppsData = allOppsData.filter(
            opp => opp.StageName !== 'Approved' && opp.StageName !== 'Lost'
        );
        divisionDrillSheets.set(`${baseKey}_Open`, openOppsData);

        const sheetConfig = [
            {
                name: `D${row.Year}-${sanitizeSheetName(row.Division, 8)}-Tot`,
                data: allOppsData,
                metric: 'Total Opportunities',
                count: row.TotalOpportunities,
                color: '9E9E9E'
            },
            {
                name: `D${row.Year}-${sanitizeSheetName(row.Division, 8)}-Won`,
                data: wonOppsData,
                metric: 'Won Opportunities',
                count: row.WonOpportunities,
                color: '4CAF50'
            },
            {
                name: `D${row.Year}-${sanitizeSheetName(row.Division, 8)}-Lost`,
                data: lostOppsData,
                metric: 'Lost Opportunities',
                count: row.LostOpportunities,
                color: 'F44336'
            },
            {
                name: `D${row.Year}-${sanitizeSheetName(row.Division, 8)}-Open`,
                data: openOppsData,
                metric: 'Open Opportunities',
                count: row.OpenOpportunities,
                color: 'FF9800'
            }
        ];

        for (const config of sheetConfig) {
            if (config.data.length > 0) {
                let finalSheetName = config.name.substring(0, 31);
                let counter = 1;
                while (usedSheetNames.has(finalSheetName)) {
                    finalSheetName = `${config.name.substring(0, 28)}_${counter}`.substring(0, 31);
                    counter++;
                }
                usedSheetNames.add(finalSheetName);
                const sheet = workbook.addWorksheet(finalSheetName, {
                    properties: { tabColor: { argb: config.color } }
                });
                addMetricDrillSheet(sheet, config.data, row, config.metric, config.count);
            }
        }

        if (row.WonOpportunities > 0) {
            let revSheetName = `D${row.Year}-${sanitizeSheetName(row.Division, 8)}-Rev`.substring(0, 31);
            let counter = 1;
            while (usedSheetNames.has(revSheetName)) {
                revSheetName = `D${row.Year}-${sanitizeSheetName(row.Division, 6)}-Rev${counter}`.substring(0, 31);
                counter++;
            }
            usedSheetNames.add(revSheetName);
            const revenueSheet = workbook.addWorksheet(revSheetName,
                { properties: { tabColor: { argb: '2196F3' } } }
            );
            addMetricDrillSheet(revenueSheet, wonOppsData, row, 'Total Revenue', row.TotalRevenue, true);

            let avgSheetName = `D${row.Year}-${sanitizeSheetName(row.Division, 8)}-Avg`.substring(0, 31);
            counter = 1;
            while (usedSheetNames.has(avgSheetName)) {
                avgSheetName = `D${row.Year}-${sanitizeSheetName(row.Division, 6)}-Avg${counter}`.substring(0, 31);
                counter++;
            }
            usedSheetNames.add(avgSheetName);
            const avgSheet = workbook.addWorksheet(avgSheetName,
                { properties: { tabColor: { argb: '9C27B0' } } }
            );
            addMetricDrillSheet(avgSheet, wonOppsData, row, 'Average Ticket', row.AverageTicket, true);
        }

        const closeRateData = allOppsData;
        let crSheetName = `D${row.Year}-${sanitizeSheetName(row.Division, 8)}-CR`.substring(0, 31);
        let counter2 = 1;
        while (usedSheetNames.has(crSheetName)) {
            crSheetName = `D${row.Year}-${sanitizeSheetName(row.Division, 6)}-CR${counter2}`.substring(0, 31);
            counter2++;
        }
        usedSheetNames.add(crSheetName);
        const closeRateSheet = workbook.addWorksheet(crSheetName,
            { properties: { tabColor: { argb: '00BCD4' } } }
        );
        addCloseRateDrillSheet(closeRateSheet, closeRateData, row, 'Close Rate (Std)', row.CloseRate_Std);

        const closeRateNoLostData = allOppsData.filter(opp => opp.StageName !== 'Lost');
        let crnlSheetName = `D${row.Year}-${sanitizeSheetName(row.Division, 8)}-CRNL`.substring(0, 31);
        counter2 = 1;
        while (usedSheetNames.has(crnlSheetName)) {
            crnlSheetName = `D${row.Year}-${sanitizeSheetName(row.Division, 5)}-CRNL${counter2}`.substring(0, 31);
            counter2++;
        }
        usedSheetNames.add(crnlSheetName);
        const closeRateNoLostSheet = workbook.addWorksheet(crnlSheetName,
            { properties: { tabColor: { argb: '009688' } } }
        );
        addCloseRateDrillSheet(closeRateNoLostSheet, closeRateNoLostData, row, 'Close Rate (No Lost)', row.CloseRate_NoLost);
    }

    const leadDrillSheets = new Map();
    for (const row of leadData.filter(l => l.LeadType !== 'TOTAL')) {
        const baseKey = `LEAD_${row.Year}_${row.LeadType}`;

        const allOppsData = await getOpportunityDetail({
            year: row.Year,
            leadType: row.LeadType
        });
        leadDrillSheets.set(`${baseKey}_Total`, allOppsData);

        const wonOppsData = await getOpportunityDetail({
            year: row.Year,
            leadType: row.LeadType,
            stage: 'Approved'
        });
        leadDrillSheets.set(`${baseKey}_Won`, wonOppsData);

        const lostOppsData = await getOpportunityDetail({
            year: row.Year,
            leadType: row.LeadType,
            stage: 'Lost'
        });
        leadDrillSheets.set(`${baseKey}_Lost`, lostOppsData);

        const openOppsData = allOppsData.filter(
            opp => opp.StageName !== 'Approved' && opp.StageName !== 'Lost'
        );
        leadDrillSheets.set(`${baseKey}_Open`, openOppsData);

        const sheetConfig = [
            {
                name: `L${row.Year}-${sanitizeSheetName(row.LeadType, 8)}-Tot`,
                data: allOppsData,
                metric: 'Total Opportunities',
                count: row.TotalOpportunities,
                color: '9E9E9E'
            },
            {
                name: `L${row.Year}-${sanitizeSheetName(row.LeadType, 8)}-Won`,
                data: wonOppsData,
                metric: 'Won Opportunities',
                count: row.WonOpportunities,
                color: '4CAF50'
            },
            {
                name: `L${row.Year}-${sanitizeSheetName(row.LeadType, 8)}-Lost`,
                data: lostOppsData,
                metric: 'Lost Opportunities',
                count: row.LostOpportunities,
                color: 'F44336'
            },
            {
                name: `L${row.Year}-${sanitizeSheetName(row.LeadType, 8)}-Open`,
                data: openOppsData,
                metric: 'Open Opportunities',
                count: row.OpenOpportunities,
                color: 'FF9800'
            }
        ];

        for (const config of sheetConfig) {
            if (config.data.length > 0) {
                let finalSheetName = config.name.substring(0, 31);
                let counter = 1;
                while (usedSheetNames.has(finalSheetName)) {
                    finalSheetName = `${config.name.substring(0, 28)}_${counter}`.substring(0, 31);
                    counter++;
                }
                usedSheetNames.add(finalSheetName);
                const sheet = workbook.addWorksheet(finalSheetName, {
                    properties: { tabColor: { argb: config.color } }
                });
                addMetricDrillSheet(sheet, config.data, row, config.metric, config.count, false, true);
            }
        }

        if (row.WonOpportunities > 0) {
            let revSheetName = `L${row.Year}-${sanitizeSheetName(row.LeadType, 8)}-Rev`.substring(0, 31);
            let counter = 1;
            while (usedSheetNames.has(revSheetName)) {
                revSheetName = `L${row.Year}-${sanitizeSheetName(row.LeadType, 6)}-Rev${counter}`.substring(0, 31);
                counter++;
            }
            usedSheetNames.add(revSheetName);
            const revenueSheet = workbook.addWorksheet(revSheetName,
                { properties: { tabColor: { argb: '2196F3' } } }
            );
            addMetricDrillSheet(revenueSheet, wonOppsData, row, 'Total Revenue', row.TotalRevenue, true, true);

            let avgSheetName = `L${row.Year}-${sanitizeSheetName(row.LeadType, 8)}-Avg`.substring(0, 31);
            counter = 1;
            while (usedSheetNames.has(avgSheetName)) {
                avgSheetName = `L${row.Year}-${sanitizeSheetName(row.LeadType, 6)}-Avg${counter}`.substring(0, 31);
                counter++;
            }
            usedSheetNames.add(avgSheetName);
            const avgSheet = workbook.addWorksheet(avgSheetName,
                { properties: { tabColor: { argb: '9C27B0' } } }
            );
            addMetricDrillSheet(avgSheet, wonOppsData, row, 'Average Ticket', row.AverageTicket, true, true);
        }

        const closeRateData = allOppsData;
        let crSheetName = `L${row.Year}-${sanitizeSheetName(row.LeadType, 8)}-CR`.substring(0, 31);
        let counter2 = 1;
        while (usedSheetNames.has(crSheetName)) {
            crSheetName = `L${row.Year}-${sanitizeSheetName(row.LeadType, 6)}-CR${counter2}`.substring(0, 31);
            counter2++;
        }
        usedSheetNames.add(crSheetName);
        const closeRateSheet = workbook.addWorksheet(crSheetName,
            { properties: { tabColor: { argb: '00BCD4' } } }
        );
        addCloseRateDrillSheet(closeRateSheet, closeRateData, row, 'Close Rate (Std)', row.CloseRate_Std, true);

        const closeRateNoLostData = allOppsData.filter(opp => opp.StageName !== 'Lost');
        let crnlSheetName = `L${row.Year}-${sanitizeSheetName(row.LeadType, 8)}-CRNL`.substring(0, 31);
        counter2 = 1;
        while (usedSheetNames.has(crnlSheetName)) {
            crnlSheetName = `L${row.Year}-${sanitizeSheetName(row.LeadType, 5)}-CRNL${counter2}`.substring(0, 31);
            counter2++;
        }
        usedSheetNames.add(crnlSheetName);
        const closeRateNoLostSheet = workbook.addWorksheet(crnlSheetName,
            { properties: { tabColor: { argb: '009688' } } }
        );
        addCloseRateDrillSheet(closeRateNoLostSheet, closeRateNoLostData, row, 'Close Rate (No Lost)', row.CloseRate_NoLost, true);
    }

    return workbook;
}

function sanitizeSheetName(name, maxLength = 10) {
    if (!name) return 'Unknown';
    const sanitized = name.replace(/[:\\/\[\]*?]/g, '').replace(/\s+/g, '');
    return sanitized.substring(0, Math.min(sanitized.length, maxLength));
}

function addDivisionSummarySheet(sheet, data) {
    sheet.columns = [
        { header: 'Year', key: 'Year', width: 10 },
        { header: 'Division', key: 'Division', width: 20 },
        { header: 'Total Opportunities', key: 'TotalOpportunities', width: 18 },
        { header: 'Won', key: 'WonOpportunities', width: 10 },
        { header: 'Lost', key: 'LostOpportunities', width: 10 },
        { header: 'Open', key: 'OpenOpportunities', width: 10 },
        { header: 'Total Revenue', key: 'TotalRevenue', width: 18, style: { numFmt: '$#,##0.00' } },
        { header: 'Avg Ticket', key: 'AverageTicket', width: 15, style: { numFmt: '$#,##0.00' } },
        { header: 'Close Rate (Std)', key: 'CloseRate_Std', width: 15, style: { numFmt: '0.00%' } },
        { header: 'Close Rate (No Lost)', key: 'CloseRate_NoLost', width: 18, style: { numFmt: '0.00%' } }
    ];

    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: '4CAF50' }
    };

    data.forEach(row => {
        const newRow = sheet.addRow(row);

        if (row.Division === 'TOTAL') {
            newRow.font = { bold: true };
            newRow.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'E8F5E9' }
            };
        }

        newRow.getCell('TotalRevenue').numFmt = '$#,##0.00';
        newRow.getCell('AverageTicket').numFmt = '$#,##0.00';
        newRow.getCell('CloseRate_Std').numFmt = '0.00%';
        newRow.getCell('CloseRate_NoLost').numFmt = '0.00%';
    });

    sheet.autoFilter = {
        from: 'A1',
        to: 'J1'
    };
}

function addLeadSummarySheet(sheet, data) {
    sheet.columns = [
        { header: 'Year', key: 'Year', width: 10 },
        { header: 'Lead Type', key: 'LeadType', width: 20 },
        { header: 'Total Opportunities', key: 'TotalOpportunities', width: 18 },
        { header: 'Won', key: 'WonOpportunities', width: 10 },
        { header: 'Lost', key: 'LostOpportunities', width: 10 },
        { header: 'Open', key: 'OpenOpportunities', width: 10 },
        { header: 'Total Revenue', key: 'TotalRevenue', width: 18, style: { numFmt: '$#,##0.00' } },
        { header: 'Avg Ticket', key: 'AverageTicket', width: 15, style: { numFmt: '$#,##0.00' } },
        { header: 'Close Rate (Std)', key: 'CloseRate_Std', width: 15, style: { numFmt: '0.00%' } },
        { header: 'Close Rate (No Lost)', key: 'CloseRate_NoLost', width: 18, style: { numFmt: '0.00%' } }
    ];

    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: '2196F3' }
    };

    data.forEach(row => {
        const newRow = sheet.addRow(row);

        if (row.LeadType === 'TOTAL') {
            newRow.font = { bold: true };
            newRow.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'E3F2FD' }
            };
        }

        newRow.getCell('TotalRevenue').numFmt = '$#,##0.00';
        newRow.getCell('AverageTicket').numFmt = '$#,##0.00';
        newRow.getCell('CloseRate_Std').numFmt = '0.00%';
        newRow.getCell('CloseRate_NoLost').numFmt = '0.00%';
    });

    sheet.autoFilter = {
        from: 'A1',
        to: 'J1'
    };
}

function addDetailSheet(sheet, data) {
    sheet.columns = [
        { header: 'ID', key: 'Id', width: 20 },
        { header: 'Name', key: 'Name', width: 30 },
        { header: 'Year', key: 'YearValue', width: 10 },
        { header: 'Stage', key: 'StageName', width: 15 },
        { header: 'Division', key: 'Division', width: 20 },
        { header: 'Lead Type', key: 'LeadType', width: 20 },
        { header: 'Amount', key: 'Amount', width: 15, style: { numFmt: '$#,##0.00' } },
        { header: 'Created Date', key: 'Created_Date', width: 15 },
        { header: 'Last Stage Change', key: 'LastStageChangeDate', width: 18 }
    ];

    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF6F00' }
    };

    data.forEach(row => {
        const newRow = sheet.addRow(row);
        newRow.getCell('Amount').numFmt = '$#,##0.00';

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

    sheet.autoFilter = {
        from: 'A1',
        to: 'I1'
    };
}

function addMetricDrillSheet(sheet, data, summary, metricName, metricValue, isMonetary = false, isLeadType = false) {
    const groupBy = isLeadType ? 'Lead Type' : 'Division';
    const groupValue = isLeadType ? summary.LeadType : summary.Division;

    sheet.getRow(1).values = [`${metricName} Detail - Year: ${summary.Year}, ${groupBy}: ${groupValue}`];
    sheet.getRow(1).font = { bold: true, size: 14 };
    sheet.mergeCells('A1:I1');

    sheet.getRow(3).values = ['Metric Summary'];
    sheet.getRow(3).font = { bold: true, size: 12 };
    sheet.mergeCells('A3:B3');

    sheet.getRow(4).values = ['Metric', 'Value'];
    sheet.getRow(4).font = { bold: true };
    sheet.getRow(4).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'E0E0E0' }
    };

    let displayValue = metricValue;
    if (isMonetary) {
        displayValue = typeof metricValue === 'number' ? `$${metricValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : metricValue;
    }

    sheet.getRow(5).values = [metricName, displayValue];
    sheet.getRow(6).values = ['Record Count', data.length];

    if (isMonetary && metricName === 'Total Revenue') {
        const totalCalc = data.reduce((sum, rec) => sum + (rec.Amount || 0), 0);
        sheet.getRow(7).values = ['Sum of Amounts', `$${totalCalc.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`];
    } else if (isMonetary && metricName === 'Average Ticket') {
        const totalCalc = data.reduce((sum, rec) => sum + (rec.Amount || 0), 0);
        const avgCalc = data.length > 0 ? totalCalc / data.length : 0;
        sheet.getRow(7).values = ['Calculated Average', `$${avgCalc.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`];
    }

    sheet.getRow(9).values = ['Detail Records'];
    sheet.getRow(9).font = { bold: true, size: 12 };
    sheet.mergeCells('A9:I9');

    sheet.getRow(10).values = [
        'ID', 'Name', 'Stage', isLeadType ? 'Division' : 'Lead Type', 'Amount', 'Created Date', 'Last Stage Change'
    ];
    sheet.getRow(10).font = { bold: true };
    sheet.getRow(10).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'B0BEC5' }
    };

    data.forEach(record => {
        const newRow = sheet.addRow([
            record.Id,
            record.Name,
            record.StageName,
            isLeadType ? record.Division : record.LeadType,
            record.Amount,
            record.Created_Date,
            record.LastStageChangeDate
        ]);

        newRow.getCell(5).numFmt = '$#,##0.00';

        if (record.StageName === 'Approved') {
            newRow.getCell(3).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'C8E6C9' }
            };
        } else if (record.StageName === 'Lost') {
            newRow.getCell(3).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFCDD2' }
            };
        }
    });

    sheet.columns.forEach(column => {
        column.width = 15;
    });
    sheet.getColumn(2).width = 30;

    sheet.autoFilter = {
        from: 'A10',
        to: 'G10'
    };
}

function addCloseRateDrillSheet(sheet, data, summary, metricName, metricValue, isLeadType = false) {
    const groupBy = isLeadType ? 'Lead Type' : 'Division';
    const groupValue = isLeadType ? summary.LeadType : summary.Division;

    sheet.getRow(1).values = [`${metricName} Detail - Year: ${summary.Year}, ${groupBy}: ${groupValue}`];
    sheet.getRow(1).font = { bold: true, size: 14 };
    sheet.mergeCells('A1:I1');

    sheet.getRow(3).values = ['Metric Calculation'];
    sheet.getRow(3).font = { bold: true, size: 12 };
    sheet.mergeCells('A3:B3');

    sheet.getRow(4).values = ['Component', 'Value'];
    sheet.getRow(4).font = { bold: true };
    sheet.getRow(4).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'E0E0E0' }
    };

    const approvedCount = data.filter(d => d.StageName === 'Approved').length;
    const totalCount = data.length;
    const calcRate = totalCount > 0 ? (approvedCount / totalCount) * 100 : 0;

    sheet.getRow(5).values = [metricName, `${(metricValue * 100).toFixed(2)}%`];
    sheet.getRow(6).values = ['Approved (Numerator)', approvedCount];
    sheet.getRow(7).values = ['Total (Denominator)', totalCount];
    sheet.getRow(8).values = ['Calculated Rate', `${calcRate.toFixed(2)}%`];

    sheet.getRow(10).values = ['Approved Records'];
    sheet.getRow(10).font = { bold: true, size: 12, color: { argb: '2E7D32' } };
    sheet.mergeCells('A10:I10');

    sheet.getRow(11).values = [
        'ID', 'Name', 'Stage', isLeadType ? 'Division' : 'Lead Type', 'Amount', 'Created Date', 'Last Stage Change'
    ];
    sheet.getRow(11).font = { bold: true };
    sheet.getRow(11).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'C8E6C9' }
    };

    const approvedRecords = data.filter(d => d.StageName === 'Approved');
    approvedRecords.forEach(record => {
        const newRow = sheet.addRow([
            record.Id,
            record.Name,
            record.StageName,
            isLeadType ? record.Division : record.LeadType,
            record.Amount,
            record.Created_Date,
            record.LastStageChangeDate
        ]);
        newRow.getCell(5).numFmt = '$#,##0.00';
    });

    const nonApprovedStart = sheet.rowCount + 2;
    sheet.getRow(nonApprovedStart).values = [metricName.includes('No Lost') ? 'Other Records (Excluding Lost)' : 'All Other Records'];
    sheet.getRow(nonApprovedStart).font = { bold: true, size: 12, color: { argb: 'D32F2F' } };
    sheet.mergeCells(`A${nonApprovedStart}:I${nonApprovedStart}`);

    sheet.getRow(nonApprovedStart + 1).values = [
        'ID', 'Name', 'Stage', isLeadType ? 'Division' : 'Lead Type', 'Amount', 'Created Date', 'Last Stage Change'
    ];
    sheet.getRow(nonApprovedStart + 1).font = { bold: true };
    sheet.getRow(nonApprovedStart + 1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFCDD2' }
    };

    const nonApprovedRecords = data.filter(d => d.StageName !== 'Approved');
    nonApprovedRecords.forEach(record => {
        const newRow = sheet.addRow([
            record.Id,
            record.Name,
            record.StageName,
            isLeadType ? record.Division : record.LeadType,
            record.Amount,
            record.Created_Date,
            record.LastStageChangeDate
        ]);
        newRow.getCell(5).numFmt = '$#,##0.00';
    });

    sheet.columns.forEach(column => {
        column.width = 15;
    });
    sheet.getColumn(2).width = 30;

    sheet.autoFilter = {
        from: 'A11',
        to: 'G11'
    };
}

module.exports = {
    generateExcelReport
};