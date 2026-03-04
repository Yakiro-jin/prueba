import { useState, useEffect, useCallback } from 'react';
import './App.css';

// ─── CONFIG ─────────────────────────────────────────
// En desarrollo (npm start) el proxy de package.json redirige /api → http://localhost:3001
// En producción (Docker) el frontend llama directamente al backend
const API_BASE = process.env.REACT_APP_API_URL || '/api';

// ─── CATEGORÍAS (visual, sincronizadas con la DB) ────
const CAT_META = {
  electronics: { icon: '💻', color: '#a78bfa' },
  clothing: { icon: '👕', color: '#f59e0b' },
  food: { icon: '🍎', color: '#22c55e' },
  tools: { icon: '🔧', color: '#f75555' },
  others: { icon: '🗂️', color: '#8b949e' },
};

const ALL_CAT = { id: 'all', nombre: 'Todos', icono: '📦', color: '#4f8ef7' };
const UNITS = ['unidad', 'caja', 'bolsa', 'botella', 'kg', 'litro', 'metro', 'par', 'rollo'];
const EMPTY_PRODUCT = { nombre: '', descripcion: '', categoria: 'others', precio: '', stock: '', sku: '', unidad: 'unidad' };

// ─── HELPERS ─────────────────────────────────────────
function getCatIcon(cat) { return CAT_META[cat]?.icon || '🗂️'; }
function getCatColor(cat) { return CAT_META[cat]?.color || '#8b949e'; }
function getStockClass(s) { return s === 0 ? 'stock-out' : s <= 5 ? 'stock-low' : 'stock-ok'; }
function getStockLabel(s) { return s === 0 ? '⚫ Sin stock' : s <= 5 ? '🟡 Bajo' : '🟢 OK'; }
function formatPrice(p) { return `$${Number(p).toFixed(2)}`; }

// ─── FETCH HELPERS ────────────────────────────────────
async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
  return data;
}

// ─── TOAST ───────────────────────────────────────────
function Toast({ toasts }) {
  return (
    <div className="toast-wrap">
      {toasts.map(t => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          <span>{t.type === 'success' ? '✅' : t.type === 'error' ? '❌' : 'ℹ️'}</span>
          {t.message}
        </div>
      ))}
    </div>
  );
}

// ─── MODAL PRODUCTO ───────────────────────────────────
function ProductModal({ product, categories, onSave, onClose }) {
  const [form, setForm] = useState(
    product
      ? { ...product, precio: product.precio, stock: product.stock }
      : { ...EMPTY_PRODUCT }
  );
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const e = {};
    if (!form.nombre?.trim()) e.nombre = 'Requerido';
    if (!form.precio || isNaN(form.precio) || Number(form.precio) < 0) e.precio = 'Precio inválido';
    if (form.stock === '' || isNaN(form.stock) || Number(form.stock) < 0) e.stock = 'Stock inválido';
    if (!form.sku?.trim()) e.sku = 'Requerido';
    return e;
  };

  const handleChange = (field, value) => {
    setForm(f => ({ ...f, [field]: value }));
    if (errors[field]) setErrors(e => ({ ...e, [field]: undefined }));
  };

  const handleSubmit = async () => {
    const e = validate();
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    setLoading(true);
    await onSave({
      ...form,
      precio: Number(form.precio),
      stock: Number(form.stock),
    });
    setLoading(false);
  };

  const isEdit = Boolean(product?.id);

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">{isEdit ? '✏️ Editar Producto' : '➕ Nuevo Producto'}</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="form-grid">
            <div className="form-group full">
              <label className="form-label">Nombre del producto *</label>
              <input className="form-input" value={form.nombre} onChange={e => handleChange('nombre', e.target.value)} placeholder="Ej: Resma de papel A4" />
              {errors.nombre && <span style={{ color: 'var(--danger)', fontSize: '0.75rem' }}>{errors.nombre}</span>}
            </div>
            <div className="form-group full">
              <label className="form-label">Descripción</label>
              <textarea className="form-textarea" value={form.descripcion} onChange={e => handleChange('descripcion', e.target.value)} placeholder="Descripción breve..." />
            </div>
            <div className="form-group">
              <label className="form-label">Categoría</label>
              <select className="form-select" value={form.categoria} onChange={e => handleChange('categoria', e.target.value)}>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{getCatIcon(c.id)} {c.nombre}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">SKU / Código *</label>
              <input className="form-input" value={form.sku} onChange={e => handleChange('sku', e.target.value.toUpperCase())} placeholder="Ej: PAP-001" />
              {errors.sku && <span style={{ color: 'var(--danger)', fontSize: '0.75rem' }}>{errors.sku}</span>}
            </div>
            <div className="form-group">
              <label className="form-label">Precio ($) *</label>
              <input className="form-input" type="number" min="0" step="0.01" value={form.precio} onChange={e => handleChange('precio', e.target.value)} placeholder="0.00" />
              {errors.precio && <span style={{ color: 'var(--danger)', fontSize: '0.75rem' }}>{errors.precio}</span>}
            </div>
            <div className="form-group">
              <label className="form-label">Stock *</label>
              <input className="form-input" type="number" min="0" value={form.stock} onChange={e => handleChange('stock', e.target.value)} placeholder="0" />
              {errors.stock && <span style={{ color: 'var(--danger)', fontSize: '0.75rem' }}>{errors.stock}</span>}
            </div>
            <div className="form-group">
              <label className="form-label">Unidad</label>
              <select className="form-select" value={form.unidad} onChange={e => handleChange('unidad', e.target.value)}>
                {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose} disabled={loading}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
            {loading ? '⏳ Guardando...' : isEdit ? 'Guardar cambios' : 'Agregar producto'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── CONFIRM DIALOG ───────────────────────────────────
function ConfirmDialog({ message, onConfirm, onCancel, loading }) {
  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onCancel()}>
      <div className="modal confirm-modal">
        <div className="confirm-body">
          <div className="confirm-icon">🗑️</div>
          <div className="modal-title" style={{ marginBottom: 10 }}>¿Confirmar eliminación?</div>
          <p className="confirm-text">{message}</p>
        </div>
        <div className="modal-footer" style={{ justifyContent: 'center' }}>
          <button className="btn btn-secondary" onClick={onCancel} disabled={loading}>Cancelar</button>
          <button className="btn btn-danger" onClick={onConfirm} disabled={loading}>
            {loading ? '⏳ Eliminando...' : 'Sí, eliminar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────
function App() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [stats, setStats] = useState(null);
  const [catStats, setCatStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState(null);

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('nombre');
  const [view, setView] = useState('table');

  const [modal, setModal] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [toasts, setToasts] = useState([]);

  // ── Toasts
  const addToast = useCallback((message, type = 'success') => {
    const id = Date.now();
    setToasts(t => [...t, { id, message, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
  }, []);

  // ── Cargar datos del backend
  const fetchAll = useCallback(async () => {
    try {
      setApiError(null);
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (selectedCategory !== 'all') params.set('category', selectedCategory);
      params.set('sort', sortBy);

      const [prods, cats, st, catSt] = await Promise.all([
        apiFetch(`/productos?${params}`),
        apiFetch('/categorias'),
        apiFetch('/stats/resumen'),
        apiFetch('/stats/por-categoria'),
      ]);

      setProducts(prods);
      setCategories(cats);
      setStats(st);
      // Convertir array de catStats a objeto { id: total }
      const map = {};
      catSt.forEach(c => { map[c.id] = c.total; });
      setCatStats(map);
    } catch (err) {
      setApiError(err.message);
      addToast('No se pudo conectar con el servidor', 'error');
    } finally {
      setLoading(false);
    }
  }, [search, selectedCategory, sortBy, addToast]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // ── CRUD
  const handleSave = async (formData) => {
    try {
      if (formData.id) {
        await apiFetch(`/productos/${formData.id}`, {
          method: 'PUT',
          body: JSON.stringify(formData),
        });
        addToast(`"${formData.nombre}" actualizado correctamente`);
      } else {
        await apiFetch('/productos', {
          method: 'POST',
          body: JSON.stringify(formData),
        });
        addToast(`"${formData.nombre}" agregado al inventario`);
      }
      setModal(null);
      fetchAll();
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const handleDelete = async (product) => {
    setDeleteLoading(true);
    try {
      await apiFetch(`/productos/${product.id}`, { method: 'DELETE' });
      addToast(`"${product.nombre}" eliminado`, 'info');
      setConfirmDelete(null);
      fetchAll();
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  // ── Categorías para sidebar (incluye "Todos")
  const allCategories = [
    ALL_CAT,
    ...categories.map(c => ({ ...c, icon: getCatIcon(c.id), color: getCatColor(c.id) })),
  ];

  // ── Render de error de API
  if (apiError && products.length === 0 && !loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', flexDirection: 'column', gap: 16, padding: 24 }}>
        <div style={{ fontSize: '3rem' }}>🔌</div>
        <h2 style={{ color: 'var(--text-primary)', margin: 0 }}>Sin conexión al backend</h2>
        <p style={{ color: 'var(--text-muted)', textAlign: 'center', maxWidth: 400 }}>
          No se pudo conectar con el servidor en <code style={{ color: 'var(--accent)' }}>http://localhost:3001</code>.<br />
          Asegúrate de que el backend esté corriendo con <code style={{ color: 'var(--accent)' }}>npm start</code> dentro de la carpeta <code style={{ color: 'var(--accent)' }}>backend/</code>.
        </p>
        <button className="btn btn-primary" onClick={() => { setLoading(true); fetchAll(); }}>🔄 Reintentar</button>
      </div>
    );
  }

  return (
    <div className="app-layout">
      {/* ── SIDEBAR */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <h1>📦 InvenPro</h1>
          <p>Sistema de Inventario</p>
        </div>

        <div className="sidebar-section">
          <div className="sidebar-section-title">Categorías</div>
          {allCategories.map(cat => (
            <button
              key={cat.id}
              className={`sidebar-btn ${selectedCategory === cat.id ? 'active' : ''}`}
              onClick={() => setSelectedCategory(cat.id)}
            >
              <span className="icon">{cat.icono || cat.icon}</span>
              <span style={{ flex: 1 }}>{cat.nombre}</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                {cat.id === 'all' ? (stats?.total_productos ?? 0) : (catStats[cat.id] ?? 0)}
              </span>
            </button>
          ))}
        </div>

        <div className="sidebar-footer">
          <div className="stats-mini">
            <div className="stat-mini-item">
              <span className="stat-mini-label">🟡 Stock bajo</span>
              <span className="stat-mini-value" style={{ color: 'var(--warning)' }}>{stats?.stock_bajo ?? '—'}</span>
            </div>
            <div className="stat-mini-item">
              <span className="stat-mini-label">⚫ Sin stock</span>
              <span className="stat-mini-value" style={{ color: 'var(--danger)' }}>{stats?.sin_stock ?? '—'}</span>
            </div>
            <div className="stat-mini-item">
              <span className="stat-mini-label">💰 Valor total</span>
              <span className="stat-mini-value" style={{ color: 'var(--success)' }}>
                {stats ? formatPrice(stats.valor_inventario) : '—'}
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* ── MAIN */}
      <div className="main-content">
        {/* ── TOPBAR */}
        <header className="topbar">
          <span className="topbar-title">Inventario</span>
          <div className="search-wrap">
            <span className="search-icon">🔍</span>
            <input
              className="search-input"
              placeholder="Buscar por nombre, descripción o SKU..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="topbar-actions">
            <div className="view-toggle">
              <button className={`view-toggle-btn ${view === 'table' ? 'active' : ''}`} onClick={() => setView('table')} title="Vista tabla">☰</button>
              <button className={`view-toggle-btn ${view === 'cards' ? 'active' : ''}`} onClick={() => setView('cards')} title="Vista tarjetas">⊞</button>
            </div>
            <button className="btn btn-primary" onClick={() => setModal({ mode: 'add', product: null })}>
              ＋ Agregar Producto
            </button>
          </div>
        </header>

        {/* ── CONTENT */}
        <div className="content-area">
          {/* Stats */}
          <div className="stats-grid">
            <div className="stat-card stat-blue">
              <div className="stat-card-icon">📦</div>
              <div className="stat-card-label">Productos</div>
              <div className="stat-card-value">{stats?.total_productos ?? '—'}</div>
              <div className="stat-card-sub">en catálogo</div>
            </div>
            <div className="stat-card stat-green">
              <div className="stat-card-icon">📊</div>
              <div className="stat-card-label">Unidades</div>
              <div className="stat-card-value">{stats ? Number(stats.total_stock).toLocaleString() : '—'}</div>
              <div className="stat-card-sub">en stock total</div>
            </div>
            <div className="stat-card stat-yellow">
              <div className="stat-card-icon">💰</div>
              <div className="stat-card-label">Valor inventario</div>
              <div className="stat-card-value">{stats ? formatPrice(stats.valor_inventario) : '—'}</div>
              <div className="stat-card-sub">costo estimado</div>
            </div>
            <div className="stat-card stat-red">
              <div className="stat-card-icon">⚠️</div>
              <div className="stat-card-label">Alertas stock</div>
              <div className="stat-card-value">
                {stats ? (Number(stats.sin_stock) + Number(stats.stock_bajo)) : '—'}
              </div>
              <div className="stat-card-sub">{stats?.sin_stock ?? 0} sin stock</div>
            </div>
          </div>

          {/* Section header */}
          <div className="section-header">
            <div>
              <div className="section-title">
                {allCategories.find(c => c.id === selectedCategory)?.icono || '📦'}{' '}
                {allCategories.find(c => c.id === selectedCategory)?.nombre || 'Todos'}
              </div>
              <div className="section-sub">{products.length} producto{products.length !== 1 ? 's' : ''} encontrado{products.length !== 1 ? 's' : ''}</div>
            </div>
          </div>

          {/* Filter bar */}
          <div className="filter-bar">
            <select className="filter-select" value={sortBy} onChange={e => setSortBy(e.target.value)}>
              <option value="nombre">Ordenar: Nombre A-Z</option>
              <option value="price_asc">Precio: Menor a mayor</option>
              <option value="price_desc">Precio: Mayor a menor</option>
              <option value="stock_asc">Stock: Menor a mayor</option>
              <option value="stock_desc">Stock: Mayor a menor</option>
            </select>
          </div>

          {/* Loading */}
          {loading ? (
            <div className="table-wrap">
              <div className="empty-state">
                <div className="empty-icon">⏳</div>
                <h3>Cargando inventario...</h3>
                <p>Conectando con la base de datos</p>
              </div>
            </div>
          ) : products.length === 0 ? (
            <div className="table-wrap">
              <div className="empty-state">
                <div className="empty-icon">🔍</div>
                <h3>No se encontraron productos</h3>
                <p>Intenta cambiar el filtro o el término de búsqueda</p>
              </div>
            </div>
          ) : view === 'table' ? (
            <div className="table-wrap">
              <table className="product-table">
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>SKU</th>
                    <th>Categoría</th>
                    <th>Precio</th>
                    <th>Stock</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map(p => (
                    <tr key={p.id}>
                      <td>
                        <div className="product-name-cell">
                          <div className="product-avatar" style={{ background: getCatColor(p.categoria) + '20' }}>
                            {getCatIcon(p.categoria)}
                          </div>
                          <div>
                            <div className="product-name">{p.nombre}</div>
                            <div className="product-desc">{p.descripcion}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontFamily: 'monospace', fontSize: '0.82rem' }}>{p.sku}</td>
                      <td>
                        <span className="badge badge-category">
                          {getCatIcon(p.categoria)} {p.categoria_nombre || p.categoria}
                        </span>
                      </td>
                      <td className="price-cell">{formatPrice(p.precio)}</td>
                      <td>
                        <span className={`stock-badge ${getStockClass(p.stock)}`}>
                          {p.stock} {p.unidad}
                        </span>
                      </td>
                      <td>
                        <span className={`stock-badge ${getStockClass(p.stock)}`}>
                          {getStockLabel(p.stock)}
                        </span>
                      </td>
                      <td>
                        <div className="actions-cell">
                          <button className="btn-table btn-table-edit" onClick={() => setModal({ mode: 'edit', product: p })}>✏️ Editar</button>
                          <button className="btn-table btn-table-delete" onClick={() => setConfirmDelete(p)}>🗑️</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="cards-grid">
              {products.map(p => (
                <div key={p.id} className="product-card">
                  <div className="product-card-header">
                    <div className="product-card-avatar" style={{ background: getCatColor(p.categoria) + '20' }}>
                      {getCatIcon(p.categoria)}
                    </div>
                    <div>
                      <div className="product-card-name">{p.nombre}</div>
                      <div className="product-card-cat">{p.categoria_nombre || p.categoria}</div>
                    </div>
                  </div>
                  <div className="product-card-price">{formatPrice(p.precio)}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 4 }}>SKU: {p.sku}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 4, lineHeight: 1.5 }}>{p.descripcion}</div>
                  <div className="product-card-footer">
                    <span className={`stock-badge ${getStockClass(p.stock)}`}>{p.stock} {p.unidad}</span>
                    <div className="product-card-actions">
                      <button className="btn-table btn-table-edit" onClick={() => setModal({ mode: 'edit', product: p })}>✏️</button>
                      <button className="btn-table btn-table-delete" onClick={() => setConfirmDelete(p)}>🗑️</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── MODALS */}
      {modal && (
        <ProductModal
          product={modal.mode === 'edit' ? modal.product : null}
          categories={categories}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}

      {confirmDelete && (
        <ConfirmDialog
          message={`¿Deseas eliminar "${confirmDelete.nombre}"? Esta acción no se puede deshacer.`}
          onConfirm={() => handleDelete(confirmDelete)}
          onCancel={() => setConfirmDelete(null)}
          loading={deleteLoading}
        />
      )}

      <Toast toasts={toasts} />
    </div>
  );
}

export default App;
