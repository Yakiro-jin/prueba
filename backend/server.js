require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuración de la Base de Datos
const pool = new Pool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
});

// Test de Conexión
pool.connect((err, client, release) => {
    if (err) {
        console.error('❌ ERROR FATAL DB:', err.message);
    } else {
        console.log('✅ DB CONECTADA EXITOSAMENTE');
        release();
    }
});

// Middlewares
app.use(cors());
app.use(express.json());

// Middleware de Logging (Muestra cada petición)
app.use((req, res, next) => {
    console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
    if (Object.keys(req.body).length > 0) {
        console.log('📦 Body:', JSON.stringify(req.body, null, 2));
    }
    next();
});

// API Endpoints
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date() });
});

// 1. OBTENER CATEGORÍAS
app.get('/api/categorias', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM categorias ORDER BY nombre');
        console.log(`📂 Categorías enviadas: ${result.rows.length}`);
        res.json(result.rows);
    } catch (err) {
        console.error('❌ Error /api/categorias:', err.message);
        res.status(500).json({ error: 'Error al obtener categorías' });
    }
});

// 2. OBTENER PRODUCTOS (Con filtros y búsqueda)
app.get('/api/productos', async (req, res) => {
    try {
        const { search, category, sort } = req.query;
        let query = `
            SELECT p.*, c.nombre AS categoria_nombre 
            FROM productos p 
            LEFT JOIN categorias c ON p.categoria = c.id
        `;
        const values = [];
        const conditions = [];

        if (search) {
            values.push(`%${search.toLowerCase()}%`);
            conditions.push(`(LOWER(p.nombre) LIKE $${values.length} OR LOWER(p.sku) LIKE $${values.length})`);
        }

        if (category) {
            values.push(category);
            conditions.push(`p.categoria = $${values.length}`);
        }

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        // Ordenamiento
        const sortOptions = {
            nombre: 'p.nombre ASC',
            price_asc: 'p.precio ASC',
            price_desc: 'p.precio DESC',
            stock_asc: 'p.stock ASC',
            stock_desc: 'p.stock DESC'
        };
        query += ` ORDER BY ${sortOptions[sort] || 'p.nombre ASC'}`;

        const result = await pool.query(query, values);
        console.log(`📦 Productos enviados: ${result.rows.length} (Filtros: ${JSON.stringify(req.query)})`);
        res.json(result.rows);
    } catch (err) {
        console.error('❌ Error /api/productos:', err.message);
        res.status(500).json({ error: 'Error al obtener productos' });
    }
});

// 3. ESTADÍSTICAS / RESUMEN
app.get('/api/stats/resumen', async (req, res) => {
    try {
        const query = `
            SELECT 
                COUNT(*)::int AS total_productos, 
                COALESCE(SUM(stock), 0)::int AS total_stock, 
                COALESCE(SUM(precio * stock), 0)::numeric(12,2) AS valor_inventario, 
                COUNT(*) FILTER (WHERE stock = 0)::int AS sin_stock, 
                COUNT(*) FILTER (WHERE stock <= 5 AND stock > 0)::int AS stock_bajo 
            FROM productos
        `;
        const result = await pool.query(query);
        res.json(result.rows[0]);
    } catch (err) {
        console.error('❌ Error /api/stats/resumen:', err.message);
        res.status(500).json({ error: 'Error al obtener resumen' });
    }
});

// 4. ESTADÍSTICAS POR CATEGORÍA
app.get('/api/stats/por-categoria', async (req, res) => {
    try {
        const query = `
            SELECT c.id, c.nombre, COUNT(p.id)::int AS total 
            FROM categorias c 
            LEFT JOIN productos p ON p.categoria = c.id 
            GROUP BY c.id, c.nombre
        `;
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (err) {
        console.error('❌ Error /api/stats/por-categoria:', err.message);
        res.status(500).json({ error: 'Error al obtener estadísticas por categoría' });
    }
});

// 5. AGREGAR PRODUCTO
app.post('/api/productos', async (req, res) => {
    try {
        const { nombre, descripcion, categoria, precio, stock, sku, unidad } = req.body;
        const query = `
            INSERT INTO productos (nombre, descripcion, categoria, precio, stock, sku, unidad) 
            VALUES ($1, $2, $3, $4, $5, $6, $7) 
            RETURNING *
        `;
        const result = await pool.query(query, [
            nombre, descripcion, categoria, precio, stock, sku.toUpperCase(), unidad || 'unidad'
        ]);
        console.log('✅ Producto creado:', result.rows[0].nombre);
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('❌ Error POST /api/productos:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// 5. ACTUALIZAR PRODUCTO
app.put('/api/productos/:id', async (req, res) => {
    try {
        const { nombre, descripcion, categoria, precio, stock, sku, unidad } = req.body;
        const query = `
            UPDATE productos 
            SET nombre=$1, descripcion=$2, categoria=$3, precio=$4, stock=$5, sku=$6, unidad=$7, actualizado_en=NOW() 
            WHERE id=$8 
            RETURNING *
        `;
        const result = await pool.query(query, [
            nombre, descripcion, categoria, precio, stock, sku.toUpperCase(), unidad, req.params.id
        ]);
        console.log('✅ Producto actualizado ID:', req.params.id);
        res.json(result.rows[0]);
    } catch (err) {
        console.error(`❌ Error PUT /api/productos/${req.params.id}:`, err.message);
        res.status(500).json({ error: err.message });
    }
});

// 6. ELIMINAR PRODUCTO
app.delete('/api/productos/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM productos WHERE id=$1', [req.params.id]);
        console.log('🗑️ Producto eliminado ID:', req.params.id);
        res.json({ success: true, message: `Producto ${req.params.id} eliminado` });
    } catch (err) {
        console.error(`❌ Error DELETE /api/productos/${req.params.id}:`, err.message);
        res.status(500).json({ error: 'Error al eliminar producto' });
    }
});

app.listen(PORT, () => {
    console.log('--------------------------------------------------');
    console.log(`🚀 SERVIDOR INICIADO EN PUERTO ${PORT}`);
    console.log('--------------------------------------------------');
});
