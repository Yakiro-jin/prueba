require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
});

async function initDb() {
    try {
        console.log('🔧 Inicializando tablas de la base de datos...');

        await pool.query(`
            CREATE TABLE IF NOT EXISTS categorias (
                id TEXT PRIMARY KEY,
                nombre TEXT NOT NULL
            );
        `);
        await pool.query(`
            INSERT INTO categorias (id, nombre) VALUES ('productos', 'Productos')
            ON CONFLICT (id) DO NOTHING;
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS productos (
                id SERIAL PRIMARY KEY,
                nombre TEXT NOT NULL,
                descripcion TEXT,
                categoria TEXT REFERENCES categorias(id),
                precio NUMERIC(12,2) DEFAULT 0,
                stock INT DEFAULT 0,
                sku TEXT UNIQUE,
                unidad TEXT DEFAULT 'unidad',
                imagen TEXT,
                creado_en TIMESTAMPTZ DEFAULT NOW(),
                actualizado_en TIMESTAMPTZ DEFAULT NOW()
            );
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS ventas (
                id SERIAL PRIMARY KEY,
                fecha TIMESTAMPTZ DEFAULT NOW(),
                total NUMERIC(12,2) NOT NULL,
                metodo_pago TEXT DEFAULT 'efectivo'
            );
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS venta_items (
                id SERIAL PRIMARY KEY,
                venta_id INT REFERENCES ventas(id) ON DELETE CASCADE,
                producto_id INT REFERENCES productos(id),
                cantidad INT NOT NULL,
                precio_unitario NUMERIC(12,2) NOT NULL,
                subtotal NUMERIC(12,2) GENERATED ALWAYS AS (cantidad * precio_unitario) STORED
            );
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS ordenes (
                id SERIAL PRIMARY KEY,
                numero_orden TEXT UNIQUE NOT NULL,
                cliente_nombre TEXT NOT NULL,
                cliente_telefono TEXT NOT NULL,
                estado TEXT NOT NULL DEFAULT 'pendiente',
                items JSONB NOT NULL,
                total NUMERIC(12,2) NOT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
        `);

        console.log('✅ Todas las tablas están listas.');
    } catch (err) {
        console.error('❌ Error en inicialización:', err.message);
    } finally {
        await pool.end();
    }
}

initDb();
