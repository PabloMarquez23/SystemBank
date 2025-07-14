const express = require('express');
const cors = require('cors');
const app = express();
const PORT = 3000;

const { Pool } = require('pg');

let pool;

async function initializePool() {
  try {
    // Intentar conexión al primario
    pool = new Pool({
      host: process.env.DB_HOST || 'postgres_primary',
      user: process.env.DB_USER || 'admin',
      password: process.env.DB_PASSWORD || 'admin123',
      database: process.env.DB_NAME || 'systembank',
      port: process.env.DB_PORT || 5432,
    });
    await pool.query('SELECT 1');
    console.log('Conectado a la base de datos primaria');
  } catch (error) {
    console.warn('Error con la base de datos primaria. Intentando secundaria...');
    // Intentar conexión al secundario
    pool = new Pool({
      host: 'postgres_secondary',
      user: process.env.DB_USER || 'admin',
      password: process.env.DB_PASSWORD || 'admin123',
      database: process.env.DB_NAME || 'systembank',
      port: process.env.DB_PORT || 5432,
    });
    try {
      await pool.query('SELECT 1');
      console.log('Conectado a la base de datos secundaria');
    } catch (err) {
      console.error('No se pudo conectar a ninguna base de datos');
      process.exit(1);
    }
  }
}

// Middlewares
app.use(cors());
app.use(express.json());

/**
 * CLIENTES
 */
app.get('/api/clientes', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM clientes');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener clientes' });
  }
});

app.post('/api/clientes', (req, res) => {
  const { cedula, nombre, apellido, correo, direccion } = req.body;
  const query = 'INSERT INTO clientes (cedula, nombre, apellido, correo, direccion) VALUES ($1, $2, $3, $4, $5)';
  pool.query(query, [cedula, nombre, apellido, correo, direccion], (err, result) => {
    if (err) {
      console.error(err);
      res.status(500).send('Error al crear cliente');
    } else {
      res.status(201).json({ message: 'Cliente creado correctamente' });
    }
  });
});

app.put('/api/clientes/:id', async (req, res) => {
  const { id } = req.params;
  const { cedula, nombre, apellido, correo, direccion } = req.body;

  try {
    await pool.query(
      'UPDATE clientes SET cedula=$1, nombre=$2, apellido=$3, correo=$4, direccion=$5 WHERE id=$6',
      [cedula, nombre, apellido, correo, direccion, id]
    );
    res.status(200).json({ message: 'Cliente actualizado' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al actualizar cliente' });
  }
});

app.delete('/api/clientes/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM clientes WHERE id = $1', [req.params.id]);
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al eliminar cliente' });
  }
});

app.get('/api/clientes/cedula/:cedula', (req, res) => {
  const cedula = req.params.cedula;
  const query = 'SELECT * FROM clientes WHERE cedula = $1';
  pool.query(query, [cedula], (err, result) => {
    if (err) {
      res.status(500).send('Error al buscar cliente por cédula');
    } else if (result.rows.length === 0) {
      res.status(404).send('Cliente no encontrado');
    } else {
      res.json(result.rows[0]);
    }
  });
});

/**
 * CUENTAS
 */
app.post('/api/cuentas', async (req, res) => {
  const { numero_cuenta, cliente_id, saldo } = req.body;

  try {
    const result = await pool.query(
      'INSERT INTO cuentas (numero_cuenta, cliente_id, saldo) VALUES ($1, $2, $3) RETURNING *',
      [numero_cuenta, cliente_id, saldo]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error al crear cuenta:', err);
    res.status(500).json({ error: 'Error al crear cuenta' });
  }
});

app.get('/api/cuentas/cedula/:cedula', async (req, res) => {
  const { cedula } = req.params;

  try {
    const cliente = await pool.query('SELECT id FROM clientes WHERE cedula = $1', [cedula]);

    if (cliente.rows.length === 0) {
      return res.status(404).json({ message: 'Cliente no encontrado' });
    }

    const cuenta = await pool.query(
      'SELECT * FROM cuentas WHERE cliente_id = $1',
      [cliente.rows[0].id]
    );

    if (cuenta.rows.length === 0) {
      return res.status(404).json({ message: 'Cuenta no encontrada' });
    }

    res.json(cuenta.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al buscar la cuenta' });
  }
});

/**
 * TRANSFERENCIAS
 */
app.post('/api/transferencias', async (req, res) => {
  const { numero_origen, numero_destino, monto } = req.body;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Obtener cuentas por número
    const origenRes = await client.query('SELECT id, saldo FROM cuentas WHERE numero_cuenta = $1 FOR UPDATE', [numero_origen]);
    const destinoRes = await client.query('SELECT id FROM cuentas WHERE numero_cuenta = $1 FOR UPDATE', [numero_destino]);

    if (origenRes.rows.length === 0 || destinoRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Número de cuenta inválido' });
    }

    const origenId = origenRes.rows[0].id;
    const destinoId = destinoRes.rows[0].id;
    const saldoOrigen = origenRes.rows[0].saldo;

    // Verificar fondos
    if (saldoOrigen < monto) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Fondos insuficientes' });
    }

    // Actualizar saldos
    await client.query('UPDATE cuentas SET saldo = saldo - $1 WHERE id = $2', [monto, origenId]);
    await client.query('UPDATE cuentas SET saldo = saldo + $1 WHERE id = $2', [monto, destinoId]);

    // Registrar transferencia
    const result = await client.query(
      'INSERT INTO transferencias (origen, destino, monto, fecha) VALUES ($1, $2, $3, NOW()) RETURNING *',
      [origenId, destinoId, monto]
    );

    await client.query('COMMIT');
    res.status(201).json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Error al realizar transferencia' });
  } finally {
    client.release();
  }
});

// ========================
// DEPÓSITOS
// ========================
app.post('/api/depositos', async (req, res) => {
  const { numero_cuenta, monto } = req.body;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Buscar la cuenta por su número
    const cuentaRes = await client.query('SELECT id FROM cuentas WHERE numero_cuenta = $1 FOR UPDATE', [numero_cuenta]);

    if (cuentaRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Cuenta no encontrada' });
    }

    const cuenta_id = cuentaRes.rows[0].id;

    // Actualizar saldo
    await client.query('UPDATE cuentas SET saldo = saldo + $1 WHERE id = $2', [monto, cuenta_id]);

    // Registrar depósito
    const result = await client.query(
      'INSERT INTO depositos (cuenta_id, monto) VALUES ($1, $2) RETURNING *',
      [cuenta_id, monto]
    );

    await client.query('COMMIT');
    res.status(201).json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Error al realizar depósito' });
  } finally {
    client.release();
  }
});

// ========================
// RETIROS
// ========================
app.post('/api/retiros', async (req, res) => {
  const { numero_cuenta, monto } = req.body;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Buscar la cuenta por su número
    const cuentaRes = await client.query('SELECT id, saldo FROM cuentas WHERE numero_cuenta = $1 FOR UPDATE', [numero_cuenta]);

    if (cuentaRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Cuenta no encontrada' });
    }

    const cuenta_id = cuentaRes.rows[0].id;
    const saldoActual = cuentaRes.rows[0].saldo;

    // Verificar si hay saldo suficiente
    if (saldoActual < monto) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Fondos insuficientes' });
    }

    // Actualizar saldo
    await client.query('UPDATE cuentas SET saldo = saldo - $1 WHERE id = $2', [monto, cuenta_id]);

    // Registrar retiro
    const result = await client.query(
      'INSERT INTO retiros (cuenta_id, monto) VALUES ($1, $2) RETURNING *',
      [cuenta_id, monto]
    );

    await client.query('COMMIT');
    res.status(201).json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Error al realizar retiro' });
  } finally {
    client.release();
  }
});

// ========================
// HISTORIAL TRANSFERENCIAS
// ========================
app.get('/api/transferencias', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        t.id,
        c1.numero_cuenta AS cuenta_origen,
        cli1.nombre AS cliente_origen,
        c2.numero_cuenta AS cuenta_destino,
        cli2.nombre AS cliente_destino,
        t.monto,
        t.fecha
      FROM transferencias t
      JOIN cuentas c1 ON t.origen = c1.id
      JOIN clientes cli1 ON c1.cliente_id = cli1.id
      JOIN cuentas c2 ON t.destino = c2.id
      JOIN clientes cli2 ON c2.cliente_id = cli2.id
      ORDER BY t.fecha DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener transferencias' });
  }
});

// ========================
// HISTORIAL DEPÓSITOS
// ========================
app.get('/api/depositos', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        d.id,
        c.numero_cuenta,
        cli.nombre AS cliente,
        d.monto,
        d.fecha
      FROM depositos d
      JOIN cuentas c ON d.cuenta_id = c.id
      JOIN clientes cli ON c.cliente_id = cli.id
      ORDER BY d.fecha DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener depósitos' });
  }
});

// ========================
// HISTORIAL RETIROS
// ========================
app.get('/api/retiros', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        r.id,
        c.numero_cuenta,
        cli.nombre AS cliente,
        r.monto,
        r.fecha
      FROM retiros r
      JOIN cuentas c ON r.cuenta_id = c.id
      JOIN clientes cli ON c.cliente_id = cli.id
      ORDER BY r.fecha DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener retiros' });
  }
});


app.listen(PORT, '0.0.0.0', async () => {
  await initializePool();
  console.log(`Servidor backend corriendo en puerto ${PORT}`);
});
