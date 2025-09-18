const express = require('express');
const cors = require('cors');
const path = require('path');
const { getDivisionSummary, getLeadSummary, getOpportunityDetail } = require('./services/queries');
const { generateDivisionExcel, generateLeadExcel, generateDetailExcel } = require('./services/excelExportSimple');

const app = express();
const PORT = process.env.PORT || process.env.WEBSITES_PORT || 3000;

app.use(cors());
app.use(express.json());

// Serve static files from public directory (dashboard)
app.use(express.static(path.join(__dirname, 'public')));

// Serve dashboard HTML at root
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API info endpoint
app.get('/api', (req, res) => {
    res.json({
        message: 'Salesforce Opportunity Dashboard API',
        endpoints: [
            'GET /api/division-summary',
            'GET /api/lead-summary',
            'GET /api/opportunity-detail',
            'GET /api/excel-report'
        ]
    });
});

app.get('/api/division-summary', async (req, res) => {
    try {
        const data = await getDivisionSummary();
        res.json({
            success: true,
            count: data.length,
            data: data
        });
    } catch (error) {
        console.error('Error in /api/division-summary:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

app.get('/api/lead-summary', async (req, res) => {
    try {
        const data = await getLeadSummary();
        res.json({
            success: true,
            count: data.length,
            data: data
        });
    } catch (error) {
        console.error('Error in /api/lead-summary:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

app.get('/api/opportunity-detail', async (req, res) => {
    try {
        const filters = {
            year: req.query.year,
            division: req.query.division,
            stage: req.query.stage,
            leadType: req.query.leadType,
            excludeStages: req.query.excludeStages
        };

        const data = await getOpportunityDetail(filters);
        res.json({
            success: true,
            count: data.length,
            filters: filters,
            data: data
        });
    } catch (error) {
        console.error('Error in /api/opportunity-detail:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

app.get('/api/excel-report', async (req, res) => {
    try {
        const type = req.query.type || 'division';
        const filters = {
            year: req.query.year,
            division: req.query.division,
            stage: req.query.stage,
            leadType: req.query.leadType,
            excludeStages: req.query.excludeStages
        };

        console.log(`Generating Excel report for type: ${type}`);

        let workbook;
        let filename;

        if (type === 'division') {
            workbook = await generateDivisionExcel();
            filename = `Division_Summary_${new Date().toISOString().split('T')[0]}.xlsx`;
        } else if (type === 'lead') {
            workbook = await generateLeadExcel();
            filename = `Lead_Summary_${new Date().toISOString().split('T')[0]}.xlsx`;
        } else if (type === 'detail') {
            // Remove undefined filters
            const cleanFilters = {};
            Object.keys(filters).forEach(key => {
                if (filters[key] !== undefined) {
                    cleanFilters[key] = filters[key];
                }
            });
            workbook = await generateDetailExcel(cleanFilters);
            filename = `Opportunity_Detail_${new Date().toISOString().split('T')[0]}.xlsx`;
        } else {
            throw new Error('Invalid report type');
        }

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        console.error('Error generating Excel report:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        error: 'Something went wrong!'
    });
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log('Available endpoints:');
    console.log(`  - GET http://localhost:${PORT}/api/division-summary`);
    console.log(`  - GET http://localhost:${PORT}/api/lead-summary`);
    console.log(`  - GET http://localhost:${PORT}/api/opportunity-detail`);
    console.log(`  - GET http://localhost:${PORT}/api/excel-report`);
});