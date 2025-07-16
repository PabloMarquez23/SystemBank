const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const PORT = 3000;

let pool;

async function initializePool() {
  const maxRetries = 5;
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

  const tryConnect = async (host, label) => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 Intentando conexión a ${label} (intento ${attempt}/${maxRetries})...`);
        const tempPool = new Pool({
          host,
          user: process.env.DB_USER || 'admin',
          password: process.env.DB_PASSWORD || 'admin123',
          database: process.env.DB_NAME || 'systembank',
          port: process.env.DB_PORT || 5432,
        });

        await tempPool.query('SELECT 1');
        console.log(`✅ Conexión exitosa a ${label}`);
        return tempPool;
      } catch (error) {
        console.error(`❌ Fallo al conectar con ${label}: ${error.message}`);
        await wait(1000 * attempt);
      }
    }
    return null;
  };

  pool = await tryConnect('postgres_primary', 'base de datos primaria');
  if (!pool) {
    console.warn('⚠️ No se pudo conectar a la base primaria. Probando con la secundaria...');
    pool = await tryConnect('postgres_secondary', 'base de datos secundaria');
  }

  if (!pool) {
    console.error('🛑 No se pudo conectar a ninguna base de datos. Abortando backend.');
    process.exit(1);
  }
}

app.use(cors());
app.use(express.json());

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

app.post('/api/transferencias', async (req, res) => {
  const { numero_origen, numero_destino, monto } = req.body;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const origenRes = await client.query('SELECT id, saldo FROM cuentas WHERE numero_cuenta = $1 FOR UPDATE', [numero_origen]);
    const destinoRes = await client.query('SELECT id FROM cuentas WHERE numero_cuenta = $1 FOR UPDATE', [numero_destino]);

    if (origenRes.rows.length === 0 || destinoRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Número de cuenta inválido' });
    }

    const origenId = origenRes.rows[0].id;
    const destinoId = destinoRes.rows[0].id;
    const saldoOrigen = origenRes.rows[0].saldo;

    if (saldoOrigen < monto) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Fondos insuficientes' });
    }

    await client.query('UPDATE cuentas SET saldo = saldo - $1 WHERE id = $2', [monto, origenId]);
    await client.query('UPDATE cuentas SET saldo = saldo + $1 WHERE id = $2', [monto, destinoId]);

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

app.post('/api/depositos', async (req, res) => {
  const { numero_cuenta, monto } = req.body;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const cuentaRes = await client.query('SELECT id FROM cuentas WHERE numero_cuenta = $1 FOR UPDATE', [numero_cuenta]);

    if (cuentaRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Cuenta no encontrada' });
    }

    const cuenta_id = cuentaRes.rows[0].id;

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

app.post('/api/retiros', async (req, res) => {
  const { numero_cuenta, monto } = req.body;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const cuentaRes = await client.query('SELECT id, saldo FROM cuentas WHERE numero_cuenta = $1 FOR UPDATE', [numero_cuenta]);

    if (cuentaRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Cuenta no encontrada' });
    }

    const cuenta_id = cuentaRes.rows[0].id;
    const saldoActual = cuentaRes.rows[0].saldo;

    if (saldoActual < monto) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Fondos insuficientes' });
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

app.get('/api/status', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.listen(PORT, '0.0.0.0', async () => {
  await initializePool();
  console.log(`🚀 Backend corriendo en http://localhost:${PORT}`);
});
