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