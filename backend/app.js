const express = require('express');
const cors = require('cors');
const app = express();
const PORT = 3000;

const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'admin',
  password: process.env.DB_PASSWORD || 'admin123',
  database: process.env.DB_NAME || 'systembank',
  port: process.env.DB_PORT || 5432,
});

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
  const { origen, destino, monto } = req.body;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const origenCuenta = await client.query(
      'SELECT * FROM cuentas WHERE id = $1 FOR UPDATE',
      [origen]
    );
    const destinoCuenta = await client.query(
      'SELECT * FROM cuentas WHERE id = $1 FOR UPDATE',
      [destino]
    );

    if (origenCuenta.rows.length === 0 || destinoCuenta.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Cuentas inválidas' });
    }

    if (origenCuenta.rows[0].saldo < monto) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Fondos insuficientes' });
    }

    await client.query('UPDATE cuentas SET saldo = saldo - $1 WHERE id = $2', [monto, origen]);
    await client.query('UPDATE cuentas SET saldo = saldo + $1 WHERE id = $2', [monto, destino]);

    const result = await client.query(
      'INSERT INTO transferencias (origen, destino, monto, fecha) VALUES ($1, $2, $3, NOW()) RETURNING *',
      [origen, destino, monto]
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

app.get('/api/transferencias', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM transferencias ORDER BY fecha DESC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener transferencias' });
  }
});


// ========================
// DEPOSITOS
// ========================
app.post('/api/depositos', async (req, res) => {
  const { cuenta_id, monto } = req.body;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('UPDATE cuentas SET saldo = saldo + $1 WHERE id = $2', [monto, cuenta_id]);
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

app.get('/api/depositos', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM depositos ORDER BY fecha DESC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener depósitos' });
  }
});

// ========================
// RETIROS
// ========================
app.post('/api/retiros', async (req, res) => {
  const { cuenta_id, monto } = req.body;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const resultCuenta = await client.query('SELECT saldo FROM cuentas WHERE id = $1 FOR UPDATE', [cuenta_id]);
    if (resultCuenta.rows.length === 0 || resultCuenta.rows[0].saldo < monto) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Saldo insuficiente o cuenta inexistente' });
    }
    await client.query('UPDATE cuentas SET saldo = saldo - $1 WHERE id = $2', [monto, cuenta_id]);
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

app.get('/api/retiros', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM retiros ORDER BY fecha DESC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener retiros' });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor backend corriendo en puerto ${PORT}`);
});