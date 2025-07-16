DROP TABLE IF EXISTS clientes;

CREATE TABLE clientes (
    id SERIAL PRIMARY KEY,
    cedula VARCHAR(20) UNIQUE NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    correo VARCHAR(100) NOT NULL,
    direccion TEXT NOT NULL
);

DROP TABLE IF EXISTS cuentas;

CREATE TABLE cuentas (
  id SERIAL PRIMARY KEY,
  numero_cuenta VARCHAR(20) NOT NULL,
  cliente_id INTEGER NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  saldo NUMERIC(12, 2) NOT NULL DEFAULT 0
);


CREATE TABLE IF NOT EXISTS transferencias (
  id SERIAL PRIMARY KEY,
  origen INTEGER REFERENCES cuentas(id),
  destino INTEGER REFERENCES cuentas(id),
  monto NUMERIC NOT NULL,
  fecha TIMESTAMP DEFAULT NOW()
);

-- Tabla de depósitos
CREATE TABLE IF NOT EXISTS depositos (
  id SERIAL PRIMARY KEY,
  cuenta_id INTEGER REFERENCES cuentas(id),
  monto NUMERIC NOT NULL,
  fecha TIMESTAMP DEFAULT NOW()
);

-- Tabla de retiros
CREATE TABLE IF NOT EXISTS retiros (
  id SERIAL PRIMARY KEY,
  cuenta_id INTEGER REFERENCES cuentas(id),
  monto NUMERIC NOT NULL,
  fecha TIMESTAMP DEFAULT NOW()
);