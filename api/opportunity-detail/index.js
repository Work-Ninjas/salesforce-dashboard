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

module.exports = async function (context, req) {
    context.log('Opportunity Detail function triggered');

    const year = req.query.year || req.body?.year;
    const division = req.query.division || req.body?.division;
    const stage = req.query.stage || req.body?.stage;
    const leadType = req.query.leadType || req.body?.leadType;
    const excludeStages = req.query.excludeStages || req.body?.excludeStages;

    try {
        await sql.connect(config);

        let query = `
        WITH Base AS (
            SELECT
                Id,
                Name,
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
        SELECT TOP 1000
            Id,
            Name,
            FORMAT(Created_Date, 'yyyy-MM-dd') as Created_Date,
            FORMAT(LastStageChangeDate, 'yyyy-MM-dd') as LastStageChangeDate,
            StageName,
            LeadType,
            Division,
            FORMAT(Amount, 'C0') as Amount,
            YearValue as Year
        FROM Base
        WHERE 1=1`;

        const params = [];

        if (year) {
            query += ` AND YearValue = @year`;
            params.push({ name: 'year', type: sql.Int, value: parseInt(year) });
        }

        if (division) {
            query += ` AND Division = @division`;
            params.push({ name: 'division', type: sql.VarChar(100), value: division });
        }

        if (stage) {
            query += ` AND StageName = @stage`;
            params.push({ name: 'stage', type: sql.VarChar(100), value: stage });
        }

        if (leadType) {
            query += ` AND LeadType = @leadType`;
            params.push({ name: 'leadType', type: sql.VarChar(100), value: leadType });
        }

        if (excludeStages) {
            const stagesToExclude = excludeStages.split(',');
            const stageConditions = stagesToExclude.map((_, index) => `@excludeStage${index}`).join(',');
            query += ` AND StageName NOT IN (${stageConditions})`;

            stagesToExclude.forEach((excludeStage, index) => {
                params.push({
                    name: `excludeStage${index}`,
                    type: sql.VarChar(100),
                    value: excludeStage.trim()
                });
            });
        }

        query += ` ORDER BY Created_Date DESC`;

        const request = new sql.Request();
        params.forEach(param => {
            request.input(param.name, param.type, param.value);
        });

        const result = await request.query(query);

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
        context.log.error('Error in opportunity-detail:', error);
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