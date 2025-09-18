const sql = require('mssql');

const config = {
    user: 'claude2',
    password: 'Roofsquad$2025',
    server: 'sfdc-backup.database.windows.net',
    database: 'Commission',
    options: {
        encrypt: true,
        trustServerCertificate: false,
        enableArithAbort: true
    },
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
    }
};

let pool = null;

async function getConnection() {
    try {
        if (!pool) {
            pool = await sql.connect(config);
            console.log('Connected to Azure SQL Database');
        }
        return pool;
    } catch (err) {
        console.error('Database connection failed:', err);
        throw err;
    }
}

module.exports = {
    getConnection,
    sql
};