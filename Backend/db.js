require("dotenv").config();

const mysql = require("mysql2");

const db = mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || "defaultdb",

    ssl: {
        rejectUnauthorized: false
    },

    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Test an actual query
db.query("SELECT 1 AS test", (err, results) => {
    if (err) {
        console.error("MySQL query test failed:", err.message);
    } else {
        console.log("MySQL query test successful:", results);
    }
});

module.exports = db;