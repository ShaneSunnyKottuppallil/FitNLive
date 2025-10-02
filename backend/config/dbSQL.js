const mysql = require('mysql2');

const sqlConnection = mysql.createConnection({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE
});

sqlConnection.connect((err) => {
    if (err) {
        console.error(' MySQL Connection Error:', err.message);
        process.exit(1);
    }
    console.log('MySQL Connected');
});

module.exports = sqlConnection;
