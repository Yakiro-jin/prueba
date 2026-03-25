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
        console.log('Initializing local database tables...');
        
        // Categorias table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS categorias (
                id TEXT PRIMARY KEY,
                nombre TEXT NOT NULL
            );
        `);

        // Insert default category if empty
        await pool.query(`
            INSERT INTO categorias (id, nombre) 
            VALUES ('productos', 'Productos')
            ON CONFLICT (id) DO NOTHING;
        `);

        // Productos table
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
                creado_en TIMESTAMP DEFAULT NOW(),
                actualizado_en TIMESTAMP DEFAULT NOW()
            );
        `);

        console.log('Database initialization complete.');
    } catch (err) {
        console.error('Initialization failed:', err.message);
    } finally {
        await pool.end();
    }
}

initDb();
