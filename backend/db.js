// backend/db.js
const { Pool } = require('pg');

const maxRetries = 5;
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

async function connectWithRetry() {
  let retries = 0;

  while (retries < maxRetries) {
    try {
      const pool = new Pool({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
      });

      await pool.query('SELECT 1'); // prueba de conexión
      console.log('Conexión exitosa a la base de datos');
      return pool;
    } catch (err) {
      retries++;
      console.error(`Error al conectar (${retries}/${maxRetries}): ${err.message}`);
      if (retries >= maxRetries) throw err;
      await wait(2000 * retries); // espera progresiva
    }
  }
}

module.exports = { connectWithRetry };
