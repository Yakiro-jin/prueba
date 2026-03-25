require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const multer = require('multer');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

const pool = new Pool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
});

console.log('--------------------------------------------------');
console.log('📡 Intentando conectar a PostgreSQL en:');
console.log(`   Host: ${process.env.DB_HOST}`);
console.log(`   Puerto: ${process.env.DB_PORT || 5432}`);
console.log(`   Base de Datos: ${process.env.DB_NAME}`);
console.log(`   Usuario: ${process.env.DB_USER}`);
console.log('--------------------------------------------------');

pool.connect((err, client, release) => {
    if (err) {
        console.error('❌ ERROR FATAL DB:', err.message);
    } else {
        console.log('✅ DB CONECTADA EXITOSAMENTE');
        release();
        // Crear tabla de órdenes si no existe
        pool.query(`
            CREATE TABLE IF NOT EXISTS ordenes (
                id SERIAL PRIMARY KEY,
                numero_orden TEXT UNIQUE NOT NULL,
                cliente_nombre TEXT NOT NULL,
                cliente_telefono TEXT NOT NULL,
                estado TEXT NOT NULL DEFAULT 'pendiente',
                items JSONB NOT NULL,
                total NUMERIC(12,2) NOT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        `).then(() => console.log('✅ Tabla ordenes lista'))
          .catch(e => console.error('❌ Error creando tabla ordenes:', e.message));
    }
});

// Middlewares
app.use(cors());
app.use(express.json());
app.use('/asset', express.static(path.join(__dirname, 'asset')));

// Multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'asset/'),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage });

// Logging
app.use((req, res, next) => {
    console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
    next();
});

// ─── HEALTH ──────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date() }));

app.get('/api/db-status', async (req, res) => {
    try {
        const r = await pool.query('SELECT NOW() as now, version() as version');
        res.json({ status: 'connected', time_on_db: r.rows[0].now, version: r.rows[0].version });
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message });
    }
});

// ─── CATEGORÍAS ───────────────────────────────────────
app.get('/api/categorias', (req, res) => res.json([{ id: 'productos', nombre: 'Productos' }]));

// ─── PRODUCTOS ────────────────────────────────────────
app.get('/api/productos', async (req, res) => {
    try {
        const { search, sort } = req.query;
        let query = `SELECT p.*, 'Productos' AS categoria_nombre FROM productos p`;
        const values = [];
        if (search) {
            values.push(`%${search.toLowerCase()}%`);
            query += ` WHERE (LOWER(p.nombre) LIKE $1 OR LOWER(p.sku) LIKE $1)`;
        }
        const sortOptions = { nombre: 'p.nombre ASC', price_asc: 'p.precio ASC', price_desc: 'p.precio DESC' };
        query += ` ORDER BY ${sortOptions[sort] || 'p.nombre ASC'}`;
        const result = await pool.query(query, values);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Error al obtener productos' });
    }
});

// ─── STATS ────────────────────────────────────────────
app.get('/api/stats/resumen', async (req, res) => {
    try {
        const r = await pool.query(`
            SELECT COUNT(*)::int AS total_productos,
                   COALESCE(SUM(stock),0)::int AS total_stock,
                   COALESCE(SUM(precio*stock),0)::numeric(12,2) AS valor_inventario,
                   COUNT(*) FILTER (WHERE stock=0)::int AS sin_stock,
                   COUNT(*) FILTER (WHERE stock<=5 AND stock>0)::int AS stock_bajo
            FROM productos
        `);
        res.json(r.rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Error al obtener resumen' });
    }
});

// ─── CREAR PRODUCTO ───────────────────────────────────
app.post('/api/productos', upload.single('imagen'), async (req, res) => {
    try {
        const { nombre, descripcion, categoria, precio, stock, sku, unidad } = req.body;
        const imagen = req.file ? req.file.filename : null;
        const r = await pool.query(
            `INSERT INTO productos (nombre,descripcion,categoria,precio,stock,sku,unidad,imagen)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
            [nombre, descripcion, categoria || 'productos', precio, stock, sku.toUpperCase(), unidad || 'unidad', imagen]
        );
        res.status(201).json(r.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── ACTUALIZAR PRODUCTO (FIX: image preserved if no new file) ────────────
app.put('/api/productos/:id', upload.single('imagen'), async (req, res) => {
    try {
        const { nombre, descripcion, categoria, precio, stock, sku, unidad } = req.body;

        // If no new file uploaded, fetch the existing image from DB
        let imagen;
        if (req.file) {
            imagen = req.file.filename;
        } else {
            const existing = await pool.query('SELECT imagen FROM productos WHERE id=$1', [req.params.id]);
            imagen = existing.rows[0]?.imagen || null;
        }

        const r = await pool.query(
            `UPDATE productos SET nombre=$1,descripcion=$2,categoria=$3,precio=$4,stock=$5,
             sku=$6,unidad=$7,imagen=$8,actualizado_en=NOW() WHERE id=$9 RETURNING *`,
            [nombre, descripcion, categoria || 'productos', precio, stock, sku.toUpperCase(), unidad, imagen, req.params.id]
        );
        res.json(r.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── ELIMINAR PRODUCTO ────────────────────────────────
app.delete('/api/productos/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM productos WHERE id=$1', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Error al eliminar producto' });
    }
});

// ─── VENTAS (Admin directo) ───────────────────────────
app.post('/api/ventas', async (req, res) => {
    const client = await pool.connect();
    try {
        const { items, metodo_pago } = req.body;
        if (!items || !Array.isArray(items) || items.length === 0)
            return res.status(400).json({ error: 'No hay items en la venta' });

        await client.query('BEGIN');
        let total = 0;
        const itemsConPrecio = [];

        for (const item of items) {
            const rp = await client.query('SELECT stock,nombre,precio FROM productos WHERE id=$1 FOR UPDATE', [item.id]);
            if (!rp.rows.length) throw new Error(`Producto ID ${item.id} no existe`);
            const p = rp.rows[0];
            if (p.stock < item.cantidad) throw new Error(`Stock insuficiente para "${p.nombre}"`);
            total += item.cantidad * p.precio;
            itemsConPrecio.push({ ...item, precio_unitario: p.precio });
            await client.query('UPDATE productos SET stock=stock-$1,actualizado_en=NOW() WHERE id=$2', [item.cantidad, item.id]);
        }

        const rv = await client.query('INSERT INTO ventas (total,metodo_pago) VALUES ($1,$2) RETURNING id', [total, metodo_pago || 'efectivo']);
        const ventaId = rv.rows[0].id;

        for (const item of itemsConPrecio) {
            await client.query(
                'INSERT INTO venta_items (venta_id,producto_id,cantidad,precio_unitario) VALUES ($1,$2,$3,$4)',
                [ventaId, item.id, item.cantidad, item.precio_unitario]
            );
        }

        await client.query('COMMIT');
        res.json({ success: true, ventaId, total });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(400).json({ error: err.message });
    } finally {
        client.release();
    }
});

// ─── ÓRDENES (Clientes desde landing) ────────────────

// Crear orden pendiente
app.post('/api/ordenes', async (req, res) => {
    try {
        const { cliente_nombre, cliente_telefono, items } = req.body;
        if (!cliente_nombre || !cliente_telefono || !items?.length)
            return res.status(400).json({ error: 'Faltan datos de la orden' });

        // Calcular total con precios actuales
        let total = 0;
        const itemsEnriquecidos = [];
        for (const item of items) {
            const r = await pool.query('SELECT nombre,precio FROM productos WHERE id=$1', [item.id]);
            if (!r.rows.length) return res.status(400).json({ error: `Producto ${item.id} no existe` });
            const precio = Number(r.rows[0].precio);
            total += precio * item.cantidad;
            itemsEnriquecidos.push({ id: item.id, nombre: r.rows[0].nombre, cantidad: item.cantidad, precio_unitario: precio, subtotal: precio * item.cantidad });
        }

        // Generar número de orden único
        const numero_orden = 'ORD-' + Date.now().toString().slice(-6);

        const r = await pool.query(
            `INSERT INTO ordenes (numero_orden,cliente_nombre,cliente_telefono,estado,items,total)
             VALUES ($1,$2,$3,'pendiente',$4,$5) RETURNING *`,
            [numero_orden, cliente_nombre.trim(), cliente_telefono.trim(), JSON.stringify(itemsEnriquecidos), total]
        );
        res.status(201).json(r.rows[0]);
    } catch (err) {
        console.error('❌ POST /api/ordenes:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// Obtener todas las órdenes
app.get('/api/ordenes', async (req, res) => {
    try {
        const r = await pool.query(`SELECT * FROM ordenes ORDER BY created_at DESC`);
        res.json(r.rows);
    } catch (err) {
        res.status(500).json({ error: 'Error al obtener órdenes' });
    }
});

// Confirmar orden → ejecuta la venta real y descuenta stock
app.put('/api/ordenes/:id/confirmar', async (req, res) => {
    const client = await pool.connect();
    try {
        // Obtener orden
        const ro = await client.query('SELECT * FROM ordenes WHERE id=$1', [req.params.id]);
        if (!ro.rows.length) return res.status(404).json({ error: 'Orden no encontrada' });
        const orden = ro.rows[0];
        if (orden.estado !== 'pendiente') return res.status(400).json({ error: 'Esta orden ya fue procesada' });

        const items = orden.items;

        await client.query('BEGIN');
        let totalVenta = 0;
        const itemsConPrecio = [];

        for (const item of items) {
            const rp = await client.query('SELECT stock,nombre,precio FROM productos WHERE id=$1 FOR UPDATE', [item.id]);
            if (!rp.rows.length) throw new Error(`Producto ${item.id} no existe`);
            const p = rp.rows[0];
            if (p.stock < item.cantidad) throw new Error(`Stock insuficiente para "${p.nombre}". Disponible: ${p.stock}`);
            totalVenta += item.cantidad * p.precio;
            itemsConPrecio.push({ ...item, precio_unitario: p.precio });
            await client.query('UPDATE productos SET stock=stock-$1,actualizado_en=NOW() WHERE id=$2', [item.cantidad, item.id]);
        }

        // Insertar venta real
        const rv = await client.query(
            `INSERT INTO ventas (total,metodo_pago) VALUES ($1,'orden_cliente') RETURNING id`,
            [totalVenta]
        );
        const ventaId = rv.rows[0].id;
        for (const item of itemsConPrecio) {
            await client.query(
                'INSERT INTO venta_items (venta_id,producto_id,cantidad,precio_unitario) VALUES ($1,$2,$3,$4)',
                [ventaId, item.id, item.cantidad, item.precio_unitario]
            );
        }

        // Marcar orden como confirmada
        await client.query(`UPDATE ordenes SET estado='confirmada' WHERE id=$1`, [req.params.id]);

        await client.query('COMMIT');
        res.json({ success: true, ventaId, total: totalVenta });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(400).json({ error: err.message });
    } finally {
        client.release();
    }
});

// Limpiar todas las órdenes de clientes (DEBE ir ANTES de /:id)
app.delete('/api/ordenes/limpiar', async (req, res) => {
    try {
        await pool.query('DELETE FROM ordenes');
        res.json({ success: true, message: 'Órdenes eliminadas' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Cancelar/rechazar orden individual
app.delete('/api/ordenes/:id', async (req, res) => {
    try {
        await pool.query(`UPDATE ordenes SET estado='cancelada' WHERE id=$1`, [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Error al cancelar orden' });
    }
});


// Limpiar historial de ventas (reportes)
app.delete('/api/reportes/limpiar', async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await client.query('DELETE FROM venta_items');
        await client.query('DELETE FROM ventas');
        await client.query('COMMIT');
        res.json({ success: true, message: 'Historial de ventas eliminado' });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

// Ingresos vienen de ventas (misma tabla) — alias
app.delete('/api/ingresos/limpiar', async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await client.query('DELETE FROM venta_items');
        await client.query('DELETE FROM ventas');
        await client.query('COMMIT');
        res.json({ success: true, message: 'Ingresos eliminados' });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

// ─── REPORTES ─────────────────────────────────────────
app.get('/api/reportes/ventas', async (req, res) => {
    try {
        const r = await pool.query(`
            SELECT v.id as venta_id, v.fecha, v.total, v.metodo_pago,
                   json_agg(json_build_object(
                       'nombre', p.nombre, 'cantidad', vi.cantidad,
                       'precio_unitario', vi.precio_unitario, 'subtotal', vi.subtotal
                   )) as items
            FROM ventas v
            JOIN venta_items vi ON v.id=vi.venta_id
            JOIN productos p ON vi.producto_id=p.id
            GROUP BY v.id ORDER BY v.fecha DESC
        `);
        res.json(r.rows);
    } catch (err) {
        res.status(500).json({ error: 'Error al obtener reporte de ventas' });
    }
});

app.get('/api/reportes/ingresos', async (req, res) => {
    try {
        const r = await pool.query(`
            SELECT TO_CHAR(fecha,'YYYY-MM-DD') as dia, SUM(total) as total_dia, COUNT(id) as num_ventas
            FROM ventas GROUP BY dia ORDER BY dia DESC LIMIT 30
        `);
        res.json(r.rows);
    } catch (err) {
        res.status(500).json({ error: 'Error al obtener ingresos' });
    }
});

app.listen(PORT, () => {
    console.log('--------------------------------------------------');
    console.log(`🚀 SERVIDOR INICIADO EN PUERTO ${PORT}`);
    console.log('--------------------------------------------------');
});
