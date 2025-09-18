const sql = require('mssql');

const config = {
    user: process.env.DB_USER || 'claude2',
    password: process.env.DB_PASSWORD || 'Roofsquad$2025',
    server: process.env.DB_SERVER || 'sfdc-backup.database.windows.net',
    database: process.env.DB_DATABASE || 'Commission',
    options: {
        encrypt: true,
        trustServerCertificate: false,
        enableArithAbort: true
    }
};

const divisionSummaryQuery = `
WITH Base AS (
    SELECT
        Id,
        Created_Date,
        LastStageChangeDate,
        StageName,
        LeadType,
        Division,
        Amount,
        RecordTypeId,
        JNID,
        CASE
            WHEN StageName IN ('Approved', 'Lost')
            THEN YEAR(ISNULL(LastStageChangeDate, Created_Date))
            ELSE YEAR(Created_Date)
        END as YearValue
    FROM [dbo].[Opportunity] o
    WHERE (o.JNID IS NULL OR (o.JNID IS NOT NULL AND o.Amount <> 0))
      AND o.RecordTypeId IN ('0123t000000JD7jAAG','0123t000000JD7eAAG')
)
SELECT
    ISNULL(CAST(YearValue AS VARCHAR), 'TOTAL') as Year,
    ISNULL(Division, 'TOTAL') as Division,
    FORMAT(COUNT(*), 'N0') as TotalOpp,
    FORMAT(SUM(CASE WHEN StageName = 'Approved' THEN 1 ELSE 0 END), 'N0') as Approved,
    FORMAT(SUM(CASE WHEN StageName = 'Lost' THEN 1 ELSE 0 END), 'N0') as Lost,
    FORMAT(COUNT(*) - SUM(CASE WHEN StageName IN ('Approved', 'Lost') THEN 1 ELSE 0 END), 'N0') as OpenOpp,
    CAST(ROUND(
        CASE
            WHEN COUNT(*) > 0
            THEN (CAST(SUM(CASE WHEN StageName = 'Approved' THEN 1 ELSE 0 END) AS FLOAT) / COUNT(*)) * 100
            ELSE 0
        END, 2) AS VARCHAR) + '%' as CloseRate_Std,
    CAST(ROUND(
        CASE
            WHEN SUM(CASE WHEN StageName IN ('Approved', 'Lost') THEN 1 ELSE 0 END) > 0
            THEN (CAST(SUM(CASE WHEN StageName = 'Approved' THEN 1 ELSE 0 END) AS FLOAT) /
                  SUM(CASE WHEN StageName IN ('Approved', 'Lost') THEN 1 ELSE 0 END)) * 100
            ELSE 0
        END, 2) AS VARCHAR) + '%' as CloseRate_ExcludeOpen,
    FORMAT(
        CASE
            WHEN SUM(CASE WHEN StageName = 'Approved' THEN 1 ELSE 0 END) > 0
            THEN SUM(CASE WHEN StageName = 'Approved' THEN Amount ELSE 0 END) /
                 SUM(CASE WHEN StageName = 'Approved' THEN 1 ELSE 0 END)
            ELSE 0
        END, 'C2') as AverageTicket,
    FORMAT(SUM(CASE WHEN StageName = 'Approved' THEN Amount ELSE 0 END), 'C0') as Revenue,
    FORMAT(SUM(CASE WHEN StageName = 'Lost' THEN Amount ELSE 0 END), 'C0') as LostRevenue,
    FORMAT(SUM(CASE WHEN StageName NOT IN ('Approved', 'Lost') THEN Amount ELSE 0 END), 'C0') as OpenRevenue
FROM Base
GROUP BY ROLLUP(YearValue, Division)
ORDER BY
    CASE WHEN YearValue IS NULL THEN 1 ELSE 0 END,
    YearValue DESC,
    CASE WHEN Division IS NULL THEN 1 ELSE 0 END,
    Division
`;

module.exports = async function (context, req) {
    context.log('Division Summary function triggered');

    try {
        await sql.connect(config);
        const result = await sql.query(divisionSummaryQuery);

        context.res = {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: {
                success: true,
                count: result.recordset.length,
                data: result.recordset
            }
        };
    } catch (error) {
        context.log.error('Error in division-summary:', error);
        context.res = {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: {
                success: false,
                error: error.message
            }
        };
    } finally {
        await sql.close();
    }
};