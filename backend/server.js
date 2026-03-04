require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

const pool = new Pool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
});

pool.connect((err) => {
    if (err) console.error('❌ Error DB:', err.message);
    else console.log('✅ DB Conectada');
});

app.use(cors());
app.use(express.json());

// API Endpoints
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.get('/api/categorias', async (req, res) => {
    const r = await pool.query('SELECT * FROM categorias ORDER BY nombre');
    res.json(r.rows);
});

app.get('/api/productos', async (req, res) => {
    const { search = '', category = '', sort = 'nombre' } = req.query;
    const sortMap = { nombre: 'nombre ASC', price_asc: 'precio ASC', price_desc: 'precio DESC', stock_asc: 'stock ASC', stock_desc: 'stock DESC' };
    let query = `SELECT p.*, c.nombre AS categoria_nombre FROM productos p LEFT JOIN categorias c ON p.categoria = c.id`;
    const vals = [];
    if (search || category) {
        query += ' WHERE ';
        const conds = [];
        if (search) { vals.push(`%${search.toLowerCase()}%`); conds.push(`(LOWER(p.nombre) LIKE $${vals.length} OR LOWER(p.sku) LIKE $${vals.length})`); }
        if (category) { vals.push(category); conds.push(`p.categoria = $${vals.length}`); }
        query += conds.join(' AND ');
    }
    query += ` ORDER BY ${sortMap[sort] || 'nombre ASC'}`;
    const r = await pool.query(query, vals);
    res.json(r.rows);
});

app.get('/api/stats/resumen', async (req, res) => {
    const r = await pool.query(`SELECT COUNT(*)::int AS total_productos, COALESCE(SUM(stock), 0)::int AS total_stock, COALESCE(SUM(precio * stock), 0)::numeric(12,2) AS valor_inventario, COUNT(*) FILTER (WHERE stock = 0)::int AS sin_stock, COUNT(*) FILTER (WHERE stock <= 5 AND stock > 0)::int AS stock_bajo FROM productos`);
    res.json(r.rows[0]);
});

app.get('/api/stats/por-categoria', async (req, res) => {
    const r = await pool.query(`SELECT c.id, COUNT(p.id)::int AS total FROM categorias c LEFT JOIN productos p ON p.categoria = c.id GROUP BY c.id`);
    res.json(r.rows);
});

app.post('/api/productos', async (req, res) => {
    const { nombre, descripcion, categoria, precio, stock, sku, unidad } = req.body;
    const r = await pool.query(`INSERT INTO productos (nombre, descripcion, categoria, precio, stock, sku, unidad) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`, [nombre, descripcion, categoria, precio, stock, sku.toUpperCase(), unidad]);
    res.status(201).json(r.rows[0]);
});

app.put('/api/productos/:id', async (req, res) => {
    const { nombre, descripcion, categoria, precio, stock, sku, unidad } = req.body;
    const r = await pool.query(`UPDATE productos SET nombre=$1, descripcion=$2, categoria=$3, precio=$4, stock=$5, sku=$6, unidad=$7 WHERE id=$8 RETURNING *`, [nombre, descripcion, categoria, precio, stock, sku.toUpperCase(), unidad, req.params.id]);
    res.json(r.rows[0]);
});

app.delete('/api/productos/:id', async (req, res) => {
    await pool.query('DELETE FROM productos WHERE id=$1', [req.params.id]);
    res.json({ success: true });
});

app.listen(PORT, () => console.log(`🚀 API en puerto ${PORT}`));
