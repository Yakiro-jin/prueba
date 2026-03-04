import { useState, useCallback } from 'react';
import './App.css';

// ─── SAMPLE DATA ────────────────────────────────────
const CATEGORIES = [
  { id: 'all', name: 'Todos', icon: '📦', color: '#4f8ef7' },
  { id: 'electronics', name: 'Electrónica', icon: '💻', color: '#a78bfa' },
  { id: 'clothing', name: 'Ropa', icon: '👕', color: '#f59e0b' },
  { id: 'food', name: 'Alimentos', icon: '🍎', color: '#22c55e' },
  { id: 'tools', name: 'Herramientas', icon: '🔧', color: '#f75555' },
  { id: 'others', name: 'Otros', icon: '🗂️', color: '#8b949e' },
];

const INITIAL_PRODUCTS = [
  { id: 1, name: 'Laptop Dell Inspiron', description: 'Intel Core i7, 16GB RAM, 512GB SSD', category: 'electronics', price: 1299.99, stock: 12, sku: 'LPT-001', unit: 'unidad' },
  { id: 2, name: 'Monitor LG 27"', description: 'Full HD IPS, 75Hz, HDMI', category: 'electronics', price: 329.50, stock: 8, sku: 'MON-002', unit: 'unidad' },
  { id: 3, name: 'Camisa Polo', description: '100% algodón, tallas S a XL', category: 'clothing', price: 24.99, stock: 45, sku: 'RPA-003', unit: 'unidad' },
  { id: 4, name: 'Arroz Premium 5kg', description: 'Arroz blanco extra largo grano', category: 'food', price: 8.75, stock: 120, sku: 'ALM-004', unit: 'bolsa' },
  { id: 5, name: 'Taladro Bosch 850W', description: 'Percutor con maletín, 13mm', category: 'tools', price: 145.00, stock: 3, sku: 'HRR-005', unit: 'unidad' },
  { id: 6, name: 'Auriculares Sony', description: 'Bluetooth 5.0, cancelación de ruido', category: 'electronics', price: 199.99, stock: 0, sku: 'AUD-006', unit: 'unidad' },
  { id: 7, name: 'Pantalón Jeans', description: 'Denim clásico, corte recto', category: 'clothing', price: 39.99, stock: 28, sku: 'RPA-007', unit: 'unidad' },
  { id: 8, name: 'Aceite de Oliva 1L', description: 'Extra virgen, prensado en frío', category: 'food', price: 12.50, stock: 60, sku: 'ALM-008', unit: 'botella' },
];

const EMPTY_PRODUCT = { name: '', description: '', category: 'others', price: '', stock: '', sku: '', unit: 'unidad' };
const UNITS = ['unidad', 'caja', 'bolsa', 'botella', 'kg', 'litro', 'metro', 'par', 'rollo'];

// ─── HELPERS ────────────────────────────────────────
function getCategoryInfo(id) {
  return CATEGORIES.find(c => c.id === id) || CATEGORIES[CATEGORIES.length - 1];
}

function getStockClass(stock) {
  if (stock === 0) return 'stock-out';
  if (stock <= 5) return 'stock-low';
  return 'stock-ok';
}

function getStockLabel(stock) {
  if (stock === 0) return '⚫ Sin stock';
  if (stock <= 5) return '🟡 Bajo';
  return '🟢 OK';
}

function formatPrice(price) {
  return `$${Number(price).toFixed(2)}`;
}

let nextId = INITIAL_PRODUCTS.length + 1;

// ─── TOAST COMPONENT ────────────────────────────────
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

// ─── MODAL COMPONENT ────────────────────────────────
function ProductModal({ product, onSave, onClose }) {
  const [form, setForm] = useState({ ...EMPTY_PRODUCT, ...product });
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Requerido';
    if (!form.price || isNaN(form.price) || Number(form.price) < 0) e.price = 'Precio inválido';
    if (form.stock === '' || isNaN(form.stock) || Number(form.stock) < 0) e.stock = 'Stock inválido';
    if (!form.sku.trim()) e.sku = 'Requerido';
    return e;
  };

  const handleChange = (field, value) => {
    setForm(f => ({ ...f, [field]: value }));
    if (errors[field]) setErrors(e => ({ ...e, [field]: undefined }));
  };

  const handleSubmit = () => {
    const e = validate();
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    onSave({ ...form, price: Number(form.price), stock: Number(form.stock) });
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
              <input className="form-input" value={form.name} onChange={e => handleChange('name', e.target.value)} placeholder="Ej: Laptop Dell Inspiron" />
              {errors.name && <span style={{ color: 'var(--danger)', fontSize: '0.75rem' }}>{errors.name}</span>}
            </div>
            <div className="form-group full">
              <label className="form-label">Descripción</label>
              <textarea className="form-textarea" value={form.description} onChange={e => handleChange('description', e.target.value)} placeholder="Descripción breve del producto..." />
            </div>
            <div className="form-group">
              <label className="form-label">Categoría</label>
              <select className="form-select" value={form.category} onChange={e => handleChange('category', e.target.value)}>
                {CATEGORIES.filter(c => c.id !== 'all').map(c => (
                  <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">SKU / Código *</label>
              <input className="form-input" value={form.sku} onChange={e => handleChange('sku', e.target.value.toUpperCase())} placeholder="Ej: LPT-001" />
              {errors.sku && <span style={{ color: 'var(--danger)', fontSize: '0.75rem' }}>{errors.sku}</span>}
            </div>
            <div className="form-group">
              <label className="form-label">Precio ($) *</label>
              <input className="form-input" type="number" min="0" step="0.01" value={form.price} onChange={e => handleChange('price', e.target.value)} placeholder="0.00" />
              {errors.price && <span style={{ color: 'var(--danger)', fontSize: '0.75rem' }}>{errors.price}</span>}
            </div>
            <div className="form-group">
              <label className="form-label">Stock *</label>
              <input className="form-input" type="number" min="0" value={form.stock} onChange={e => handleChange('stock', e.target.value)} placeholder="0" />
              {errors.stock && <span style={{ color: 'var(--danger)', fontSize: '0.75rem' }}>{errors.stock}</span>}
            </div>
            <div className="form-group">
              <label className="form-label">Unidad</label>
              <select className="form-select" value={form.unit} onChange={e => handleChange('unit', e.target.value)}>
                {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleSubmit}>{isEdit ? 'Guardar cambios' : 'Agregar producto'}</button>
        </div>
      </div>
    </div>
  );
}

// ─── CONFIRM DIALOG ──────────────────────────────────
function ConfirmDialog({ message, onConfirm, onCancel }) {
  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onCancel()}>
      <div className="modal confirm-modal">
        <div className="confirm-body">
          <div className="confirm-icon">🗑️</div>
          <div className="modal-title" style={{ marginBottom: 10 }}>¿Confirmar eliminación?</div>
          <p className="confirm-text">{message}</p>
        </div>
        <div className="modal-footer" style={{ justifyContent: 'center' }}>
          <button className="btn btn-secondary" onClick={onCancel}>Cancelar</button>
          <button className="btn btn-danger" onClick={onConfirm}>Sí, eliminar</button>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN APP ────────────────────────────────────────
function App() {
  const [products, setProducts] = useState(INITIAL_PRODUCTS);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [view, setView] = useState('table'); // 'table' | 'cards'
  const [modal, setModal] = useState(null); // null | { mode: 'add'|'edit', product }
  const [confirmDelete, setConfirmDelete] = useState(null); // product to delete
  const [toasts, setToasts] = useState([]);

  // ── Toast helpers
  const addToast = useCallback((message, type = 'success') => {
    const id = Date.now();
    setToasts(t => [...t, { id, message, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3000);
  }, []);

  // ── Filtered & sorted products
  const filtered = products
    .filter(p => {
      const matchCat = selectedCategory === 'all' || p.category === selectedCategory;
      const q = search.toLowerCase();
      const matchSearch = !q || p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
      return matchCat && matchSearch;
    })
    .sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'price_asc') return a.price - b.price;
      if (sortBy === 'price_desc') return b.price - a.price;
      if (sortBy === 'stock_asc') return a.stock - b.stock;
      if (sortBy === 'stock_desc') return b.stock - a.stock;
      return 0;
    });

  // ── Stats
  const totalProducts = products.length;
  const totalStock = products.reduce((s, p) => s + p.stock, 0);
  const totalValue = products.reduce((s, p) => s + p.price * p.stock, 0);
  const lowStockCount = products.filter(p => p.stock > 0 && p.stock <= 5).length;
  const outOfStockCount = products.filter(p => p.stock === 0).length;

  // ── CRUD handlers
  const handleSave = (formData) => {
    if (formData.id) {
      setProducts(ps => ps.map(p => p.id === formData.id ? formData : p));
      addToast(`"${formData.name}" actualizado correctamente`);
    } else {
      const newProd = { ...formData, id: nextId++ };
      setProducts(ps => [...ps, newProd]);
      addToast(`"${formData.name}" agregado al inventario`);
    }
    setModal(null);
  };

  const handleDelete = (product) => {
    setProducts(ps => ps.filter(p => p.id !== product.id));
    addToast(`"${product.name}" eliminado`, 'info');
    setConfirmDelete(null);
  };

  // ── Category stats for sidebar
  const categoryCounts = CATEGORIES.reduce((acc, cat) => {
    acc[cat.id] = cat.id === 'all' ? products.length : products.filter(p => p.category === cat.id).length;
    return acc;
  }, {});

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
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              className={`sidebar-btn ${selectedCategory === cat.id ? 'active' : ''}`}
              onClick={() => setSelectedCategory(cat.id)}
            >
              <span className="icon">{cat.icon}</span>
              <span style={{ flex: 1 }}>{cat.name}</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                {categoryCounts[cat.id] || 0}
              </span>
            </button>
          ))}
        </div>

        <div className="sidebar-footer">
          <div className="stats-mini">
            <div className="stat-mini-item">
              <span className="stat-mini-label">🟡 Stock bajo</span>
              <span className="stat-mini-value" style={{ color: 'var(--warning)' }}>{lowStockCount}</span>
            </div>
            <div className="stat-mini-item">
              <span className="stat-mini-label">⚫ Sin stock</span>
              <span className="stat-mini-value" style={{ color: 'var(--danger)' }}>{outOfStockCount}</span>
            </div>
            <div className="stat-mini-item">
              <span className="stat-mini-label">💰 Valor total</span>
              <span className="stat-mini-value" style={{ color: 'var(--success)' }}>{formatPrice(totalValue)}</span>
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
              <div className="stat-card-value">{totalProducts}</div>
              <div className="stat-card-sub">en catálogo</div>
            </div>
            <div className="stat-card stat-green">
              <div className="stat-card-icon">📊</div>
              <div className="stat-card-label">Unidades</div>
              <div className="stat-card-value">{totalStock.toLocaleString()}</div>
              <div className="stat-card-sub">en stock total</div>
            </div>
            <div className="stat-card stat-yellow">
              <div className="stat-card-icon">💰</div>
              <div className="stat-card-label">Valor inventario</div>
              <div className="stat-card-value">{formatPrice(totalValue)}</div>
              <div className="stat-card-sub">costo estimado</div>
            </div>
            <div className="stat-card stat-red">
              <div className="stat-card-icon">⚠️</div>
              <div className="stat-card-label">Alertas stock</div>
              <div className="stat-card-value">{lowStockCount + outOfStockCount}</div>
              <div className="stat-card-sub">{outOfStockCount} sin stock</div>
            </div>
          </div>

          {/* Section header */}
          <div className="section-header">
            <div>
              <div className="section-title">
                {getCategoryInfo(selectedCategory).icon} {getCategoryInfo(selectedCategory).name}
              </div>
              <div className="section-sub">{filtered.length} producto{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}</div>
            </div>
          </div>

          {/* Filter bar */}
          <div className="filter-bar">
            <select className="filter-select" value={sortBy} onChange={e => setSortBy(e.target.value)}>
              <option value="name">Ordenar: Nombre A-Z</option>
              <option value="price_asc">Precio: Menor a mayor</option>
              <option value="price_desc">Precio: Mayor a menor</option>
              <option value="stock_asc">Stock: Menor a mayor</option>
              <option value="stock_desc">Stock: Mayor a menor</option>
            </select>
          </div>

          {/* Products */}
          {filtered.length === 0 ? (
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
                  {filtered.map(p => {
                    const cat = getCategoryInfo(p.category);
                    return (
                      <tr key={p.id}>
                        <td>
                          <div className="product-name-cell">
                            <div className="product-avatar" style={{ background: cat.color + '20' }}>
                              {cat.icon}
                            </div>
                            <div>
                              <div className="product-name">{p.name}</div>
                              <div className="product-desc">{p.description}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ color: 'var(--text-muted)', fontFamily: 'monospace', fontSize: '0.82rem' }}>{p.sku}</td>
                        <td>
                          <span className="badge badge-category">{cat.icon} {cat.name}</span>
                        </td>
                        <td className="price-cell">{formatPrice(p.price)}</td>
                        <td>
                          <span className={`stock-badge ${getStockClass(p.stock)}`}>
                            {p.stock} {p.unit}
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
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="cards-grid">
              {filtered.map(p => {
                const cat = getCategoryInfo(p.category);
                return (
                  <div key={p.id} className="product-card">
                    <div className="product-card-header">
                      <div className="product-card-avatar" style={{ background: cat.color + '20' }}>{cat.icon}</div>
                      <div>
                        <div className="product-card-name">{p.name}</div>
                        <div className="product-card-cat">{cat.name}</div>
                      </div>
                    </div>
                    <div className="product-card-price">{formatPrice(p.price)}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 4 }}>SKU: {p.sku}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 4, lineHeight: 1.5 }}>{p.description}</div>
                    <div className="product-card-footer">
                      <span className={`stock-badge ${getStockClass(p.stock)}`}>{p.stock} {p.unit}</span>
                      <div className="product-card-actions">
                        <button className="btn-table btn-table-edit" onClick={() => setModal({ mode: 'edit', product: p })}>✏️</button>
                        <button className="btn-table btn-table-delete" onClick={() => setConfirmDelete(p)}>🗑️</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── MODALS */}
      {modal && (
        <ProductModal
          product={modal.mode === 'edit' ? modal.product : null}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}

      {confirmDelete && (
        <ConfirmDialog
          message={`¿Deseas eliminar "${confirmDelete.name}"? Esta acción no se puede deshacer.`}
          onConfirm={() => handleDelete(confirmDelete)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

      {/* ── TOASTS */}
      <Toast toasts={toasts} />
    </div>
  );
}

export default App;
