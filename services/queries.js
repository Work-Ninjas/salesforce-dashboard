const { getConnection, sql } = process.env.NODE_ENV === 'production'
    ? require('../config/database-prod')
    : require('../config/database');

const divisionSummaryQuery = `
WITH Base AS (
    SELECT
        Id,
        Created_Date,
        LastStageChangeDate,
        StageName,
        LeadType,
        Amount,
        Division,
        RecordTypeId,
        YEAR(
            CASE
                WHEN StageName IN ('Approved','Lost') AND LastStageChangeDate IS NOT NULL
                    THEN LastStageChangeDate
                ELSE Created_Date
            END
        ) AS YearValue
    FROM Opportunity
    WHERE (JNID IS NULL OR (JNID IS NOT NULL AND Amount <> 0))
      AND RecordTypeId in ('0123t000000JD7jAAG','0123t000000JD7eAAG')
)
SELECT
    YearValue AS Year,
    CASE WHEN GROUPING(Division) = 1 THEN 'TOTAL' ELSE Division END AS Division,
    COUNT(Id) AS TotalOpp,
    SUM(CASE WHEN StageName = 'Approved' THEN 1 ELSE 0 END) AS Approved,
    SUM(CASE WHEN StageName = 'Lost' THEN 1 ELSE 0 END) AS Lost,
    SUM(CASE WHEN StageName NOT IN ('Approved','Lost') THEN 1 ELSE 0 END) AS OpenOpp,
    FORMAT(CAST(SUM(CASE WHEN StageName = 'Approved' THEN 1 ELSE 0 END) AS FLOAT)
        / NULLIF(COUNT(Id),0) * 100, 'N2') AS CloseRate_Std,
    FORMAT(CAST(SUM(CASE WHEN StageName = 'Approved' THEN 1 ELSE 0 END) AS FLOAT)
        / NULLIF(SUM(CASE WHEN StageName IN ('Approved','Lost') THEN 1 ELSE 0 END),0) * 100, 'N2') AS CloseRate_ExcludeOpen,
    FORMAT(CASE
        WHEN SUM(CASE WHEN StageName = 'Approved' THEN 1 ELSE 0 END) > 0
        THEN SUM(CASE WHEN StageName = 'Approved' THEN Amount ELSE 0 END)
             / SUM(CASE WHEN StageName = 'Approved' THEN 1 ELSE 0 END)
        ELSE 0
    END, 'C', 'en-US') AS AverageTicket,
    FORMAT(SUM(CASE WHEN StageName = 'Approved' THEN Amount ELSE 0 END), 'C', 'en-US') AS Revenue,
    FORMAT(SUM(CASE WHEN StageName = 'Lost' THEN Amount ELSE 0 END), 'C', 'en-US') AS LostRevenue,
    FORMAT(SUM(CASE WHEN StageName NOT IN ('Approved','Lost') THEN Amount ELSE 0 END), 'C', 'en-US') AS OpenRevenue
FROM Base
GROUP BY YearValue, ROLLUP(Division)
ORDER BY YearValue DESC, CASE WHEN GROUPING(Division) = 1 THEN 1 ELSE 0 END, Division`;

const leadSummaryQuery = `
WITH Base AS (
    SELECT
        Id,
        Created_Date,
        LastStageChangeDate,
        StageName,
        LeadType,
        Amount,
        Division,
        RecordTypeId,
        YEAR(
            CASE
                WHEN StageName IN ('Approved','Lost') AND LastStageChangeDate IS NOT NULL
                    THEN LastStageChangeDate
                ELSE Created_Date
            END
        ) AS YearValue
    FROM Opportunity
    WHERE (JNID IS NULL OR (JNID IS NOT NULL AND Amount <> 0))
      AND RecordTypeId in ('0123t000000JD7jAAG','0123t000000JD7eAAG')
)
SELECT
    YearValue AS Year,
    CASE WHEN GROUPING(LeadType) = 1 THEN 'TOTAL' ELSE LeadType END AS LeadType,
    COUNT(Id) AS TotalOpp,
    SUM(CASE WHEN StageName = 'Approved' THEN 1 ELSE 0 END) AS Approved,
    SUM(CASE WHEN StageName = 'Lost' THEN 1 ELSE 0 END) AS Lost,
    SUM(CASE WHEN StageName NOT IN ('Approved','Lost') THEN 1 ELSE 0 END) AS OpenOpp,
    FORMAT(CAST(SUM(CASE WHEN StageName = 'Approved' THEN 1 ELSE 0 END) AS FLOAT)
        / NULLIF(COUNT(Id),0) * 100, 'N2') AS CloseRate_Std,
    FORMAT(CAST(SUM(CASE WHEN StageName = 'Approved' THEN 1 ELSE 0 END) AS FLOAT)
        / NULLIF(SUM(CASE WHEN StageName IN ('Approved','Lost') THEN 1 ELSE 0 END),0) * 100, 'N2') AS CloseRate_ExcludeOpen,
    FORMAT(CASE
        WHEN SUM(CASE WHEN StageName = 'Approved' THEN 1 ELSE 0 END) > 0
        THEN SUM(CASE WHEN StageName = 'Approved' THEN Amount ELSE 0 END)
             / SUM(CASE WHEN StageName = 'Approved' THEN 1 ELSE 0 END)
        ELSE 0
    END, 'C', 'en-US') AS AverageTicket,
    FORMAT(SUM(CASE WHEN StageName = 'Approved' THEN Amount ELSE 0 END), 'C', 'en-US') AS Revenue,
    FORMAT(SUM(CASE WHEN StageName = 'Lost' THEN Amount ELSE 0 END), 'C', 'en-US') AS LostRevenue,
    FORMAT(SUM(CASE WHEN StageName NOT IN ('Approved','Lost') THEN Amount ELSE 0 END), 'C', 'en-US') AS OpenRevenue
FROM Base
GROUP BY YearValue, ROLLUP(LeadType)
ORDER BY YearValue DESC, CASE WHEN GROUPING(LeadType) = 1 THEN 1 ELSE 0 END, LeadType`;

const opportunityDetailQuery = `
WITH Base AS (
    SELECT
        o.Id,
        o.Name,
        o.StageName,
        o.Division,
        o.LeadType,
        o.Amount,
        o.Created_Date,
        o.LastStageChangeDate,
        o.RecordTypeId,
        YEAR(
            CASE
                WHEN o.StageName IN ('Approved','Lost') AND o.LastStageChangeDate IS NOT NULL
                    THEN o.LastStageChangeDate
                ELSE o.Created_Date
            END
        ) AS YearValue
    FROM Opportunity o
    WHERE (o.JNID IS NULL OR (o.JNID IS NOT NULL AND o.Amount <> 0))
      AND o.RecordTypeId IN ('0123t000000JD7jAAG','0123t000000JD7eAAG')
)
SELECT *
FROM Base
WHERE 1=1`;

async function getDivisionSummary() {
    try {
        const pool = await getConnection();
        const result = await pool.request().query(divisionSummaryQuery);
        return result.recordset;
    } catch (err) {
        console.error('Error executing division summary query:', err);
        throw err;
    }
}

async function getLeadSummary() {
    try {
        const pool = await getConnection();
        const result = await pool.request().query(leadSummaryQuery);
        return result.recordset;
    } catch (err) {
        console.error('Error executing lead summary query:', err);
        throw err;
    }
}

async function getOpportunityDetail(filters = {}) {
    try {
        const pool = await getConnection();
        let query = opportunityDetailQuery;
        const request = pool.request();

        const conditions = [];

        if (filters.year) {
            conditions.push('YearValue = @year');
            request.input('year', sql.Int, parseInt(filters.year));
        }

        if (filters.division) {
            conditions.push('Division = @division');
            request.input('division', sql.NVarChar, filters.division);
        }

        if (filters.stage) {
            conditions.push('StageName = @stage');
            request.input('stage', sql.NVarChar, filters.stage);
        }

        if (filters.leadType) {
            conditions.push('LeadType = @leadType');
            request.input('leadType', sql.NVarChar, filters.leadType);
        }

        // Special filter for excluding stages (used for "Open" opportunities)
        if (filters.excludeStages) {
            console.log('DEBUG: excludeStages filter:', filters.excludeStages);
            const stages = filters.excludeStages.split(',').map(s => s.trim());
            console.log('DEBUG: stages to exclude:', stages);
            const stageParams = stages.map((_, index) => `@excludeStage${index}`).join(',');
            conditions.push(`StageName NOT IN (${stageParams})`);

            // Add parameters for each stage
            stages.forEach((stage, index) => {
                request.input(`excludeStage${index}`, sql.NVarChar, stage);
                console.log(`DEBUG: Adding parameter excludeStage${index} = ${stage}`);
            });
        }

        if (conditions.length > 0) {
            query += ' AND ' + conditions.join(' AND ');
        }

        query += ' ORDER BY YearValue DESC, Division, StageName, Created_Date';

        console.log('DEBUG: Final query:', query.substring(query.indexOf('WHERE')));
        const result = await request.query(query);
        return result.recordset;
    } catch (err) {
        console.error('Error executing opportunity detail query:', err);
        throw err;
    }
}

module.exports = {
    getDivisionSummary,
    getLeadSummary,
    getOpportunityDetail
};