import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { HashRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import './App.css';

const API_BASE = process.env.REACT_APP_API_URL || '/api';
const UNITS = ['unidad', 'caja', 'bolsa', 'botella', 'kg', 'litro', 'metro', 'par', 'rollo'];
const EMPTY_PRODUCT = { nombre: '', descripcion: '', categoria: 'productos', precio: '', stock: '', sku: '', unidad: 'unidad', imagen: null };

function getStockClass(s) { return s === 0 ? 'stock-out' : s <= 5 ? 'stock-low' : 'stock-ok'; }
function formatPrice(p) { return `USD ${Number(p).toLocaleString('en-US', { minimumFractionDigits: 2 })}`; }
function fmtDate(d) { return new Date(d).toLocaleString('es-VE', { dateStyle: 'short', timeStyle: 'short' }); }

async function apiFetch(path, options = {}) {
  const isFormData = options.body instanceof FormData;
  const headers = { ...options.headers };
  if (!isFormData && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
  return data;
}

/* ─── PDF HELPER ────────────────────────────────────────────── */
function openPrintWindow(title, html) {
  const win = window.open('', '_blank', 'width=900,height=700');
  win.document.write(`<!DOCTYPE html><html>
  <head><meta charset="UTF-8"><title>${title}</title>
  <style>
    body{font-family:Arial,sans-serif;padding:24px;color:#111}
    h1{font-size:20px;margin-bottom:4px}p{color:#666;font-size:12px;margin-bottom:16px}
    table{width:100%;border-collapse:collapse}
    th{background:#1a1a2e;color:#fff;padding:10px 14px;text-align:left;font-size:12px;text-transform:uppercase;letter-spacing:1px}
    td{padding:10px 14px;border-bottom:1px solid #eee;font-size:13px}
    tr:nth-child(even) td{background:#f8f8f8}
    .total{font-weight:bold;color:#4169e1}
    @media print{button{display:none}}
  </style></head><body>
  <h1>${title}</h1>
  <p>Generado: ${new Date().toLocaleString('es-VE')} | InvenPro Premium</p>
  <button onclick="window.print()" style="margin-bottom:16px;padding:8px 20px;background:#4169e1;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:13px">🖨️ Imprimir / Guardar PDF</button>
  ${html}
  </body></html>`);
  win.document.close();
}

/* ─── TOAST ──────────────────────────────────────────────────── */
function Toast({ toasts }) {
  return (
    <div className="toast-wrap">
      {toasts.map(t => (
        <div key={t.id} className={`toast toast-${t.type} glass`}>
          <span className="icon">{t.type === 'success' ? '✨' : t.type === 'error' ? '🚫' : '🔔'}</span>
          <span className="msg">{t.message}</span>
        </div>
      ))}
    </div>
  );
}

/* ─── HERO ───────────────────────────────────────────────────── */
function Hero() {
  return (
    <div className="hero-section glass-dark">
      <div className="hero-content fade-in">
        <h1 className="hero-title">Impresiones <span className="gradient-text">Yanet</span></h1>
        <p className="hero-subtitle">utiles escolares y oficina</p>
        <div className="hero-features">
          {['Copias', 'Impresiones', 'papeleria'].map(t => <span key={t} className="hero-tag">{t}</span>)}
        </div>
      </div>
    </div>
  );
}

/* ─── PRODUCT MODAL ──────────────────────────────────────────── */
function ProductModal({ product, onSave, onDelete, onClose }) {
  const [form, setForm] = useState(product ? { ...product } : { ...EMPTY_PRODUCT });
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(product?.imagen ? `${API_BASE}/../asset/${product.imagen}` : null);
  const [loading, setLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const submit = async () => {
    setLoading(true);
    const fd = new FormData();
    Object.keys(form).forEach(k => { if (k !== 'imagen' && k !== 'id') fd.append(k, form[k]); });
    if (file) fd.append('imagen', file);
    await onSave(fd, form.id);
    setLoading(false);
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal glass-light slide-up">
        <div className="modal-header">
          <h3>{product ? '📦 Detalles del Artículo' : '✨ Nuevo Ingreso'}</h3>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body compact-form">
          <div className="form-row">
            <div className="form-group flex-2">
              <label>Nombre Comercial</label>
              <input value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} placeholder="Ej: Laptop XPS 13" />
            </div>
            <div className="form-group flex-1">
              <label>SKU</label>
              <input value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value.toUpperCase() })} placeholder="ABS-123" />
            </div>
          </div>
          <div className="form-group">
            <label>Descripción</label>
            <textarea value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} rows="2" placeholder="Detalles clave..." />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Precio</label>
              <input type="number" value={form.precio} onChange={e => setForm({ ...form, precio: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Existencias</label>
              <input type="number" value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Presentación</label>
              <select value={form.unidad} onChange={e => setForm({ ...form, unidad: e.target.value })}>
                {UNITS.map(u => <option key={u}>{u}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label>Fotografía {product?.imagen && !file && <span className="img-preserved-tag">✓ conservada</span>}</label>
            <div className="img-dropzone glass" onClick={() => document.getElementById('modal-img-input').click()}>
              {preview ? <img src={preview} alt="preview" /> : <div className="drop-placeholder"><span>📸 Clic para cargar</span></div>}
              <input id="modal-img-input" type="file" onChange={e => { const f = e.target.files[0]; if (f) { setFile(f); setPreview(URL.createObjectURL(f)); } }} hidden />
            </div>
          </div>
        </div>
        <div className="modal-footer-polish">
          {product && !confirmDelete && (
            <button className="btn btn-danger-link" onClick={e => { e.stopPropagation(); setConfirmDelete(true); }}>🗑️ Eliminar</button>
          )}
          {confirmDelete ? (
            <div className="confirm-delete-alert fade-in">
              <span className="alert-text">¿Confirmar eliminación?</span>
              <div className="alert-btns">
                <button className="btn btn-danger-solid" onClick={() => onDelete(product)}>Sí, Borrar</button>
                <button className="btn btn-ghost" onClick={() => setConfirmDelete(false)}>Volver</button>
              </div>
            </div>
          ) : (
            <div className="footer-actions-right">
              <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
              <button className="btn btn-primary" onClick={submit} disabled={loading}>{loading ? '...' : 'Confirmar'}</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── CHECKOUT FORM ──────────────────────────────────────────── */
function CheckoutForm({ cart, onSuccess, onBack, addToast }) {
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [loading, setLoading] = useState(false);
  const total = cart.reduce((a, i) => a + i.precio * i.cantidad, 0);
  const canSubmit = nombre.trim().length >= 2 && telefono.trim().length >= 6;

  const submit = async () => {
    setLoading(true);
    try {
      const order = await apiFetch('/ordenes', {
        method: 'POST',
        body: JSON.stringify({ cliente_nombre: nombre, cliente_telefono: telefono, items: cart.map(i => ({ id: i.id, cantidad: i.cantidad })) })
      });
      onSuccess(order);
    } catch (e) { addToast(e.message, 'error'); }
    finally { setLoading(false); }
  };

  return (
    <div className="checkout-form-wrap fade-in">
      <div className="checkout-summary glass">
        {cart.map(i => (
          <div key={i.id} className="checkout-item-row">
            <span>{i.nombre} <span className="qty-tag">×{i.cantidad}</span></span>
            <span>{formatPrice(i.precio * i.cantidad)}</span>
          </div>
        ))}
        <div className="checkout-total-row"><span>Total</span><span className="bold-total">{formatPrice(total)}</span></div>
      </div>
      <div className="checkout-fields">
        <div className="form-group"><label>Tu nombre completo</label><input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej: María González" /></div>
        <div className="form-group"><label>Número de teléfono</label><input type="tel" value={telefono} onChange={e => setTelefono(e.target.value)} placeholder="Ej: 0412-5551234" /></div>
      </div>
      <div className="checkout-actions">
        <button className="btn btn-ghost" onClick={onBack}>← Volver</button>
        <button className="btn btn-primary premium-shadow full" onClick={submit} disabled={!canSubmit || loading}>{loading ? 'Enviando...' : '📨 Enviar Pedido'}</button>
      </div>
    </div>
  );
}

/* ─── ORDER SUCCESS ──────────────────────────────────────────── */
function OrderSuccessScreen({ order, onClose }) {
  return (
    <div className="order-success-screen fade-in">
      <div className="success-icon">🎉</div>
      <h3>¡Pedido Enviado!</h3>
      <p>Tu número de orden es:</p>
      <div className="order-number-pill">{order.numero_orden}</div>
      <p className="success-note">Un representante confirmará tu pedido pronto. Guarda tu número de referencia.</p>
      <button className="btn btn-primary premium-shadow" onClick={onClose}>Listo</button>
    </div>
  );
}

/* ─── ADMIN ORDERS TAB ───────────────────────────────────────── */
function AdminOrdenesTab({ addToast, onRefreshStats }) {
  const [orders, setOrders] = useState([]);
  const [expanded, setExpanded] = useState({});
  const [loading, setLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try { setOrders(await apiFetch('/ordenes')); }
    catch (e) { addToast(e.message, 'error'); }
    finally { setLoading(false); }
  }, [addToast]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const confirmar = async (id) => {
    try { await apiFetch(`/ordenes/${id}/confirmar`, { method: 'PUT' }); addToast('✅ Venta confirmada'); fetchOrders(); onRefreshStats(); }
    catch (e) { addToast(e.message, 'error'); }
  };
  const cancelar = async (id) => {
    try { await apiFetch(`/ordenes/${id}`, { method: 'DELETE' }); addToast('Orden cancelada'); fetchOrders(); }
    catch (e) { addToast(e.message, 'error'); }
  };

  const statusColors = { pendiente: 'status-pending', confirmada: 'status-confirmed', cancelada: 'status-cancelled' };
  const statusLabels = { pendiente: '⏳ Pendiente', confirmada: '✅ Confirmada', cancelada: '❌ Cancelada' };
  const pending = orders.filter(o => o.estado === 'pendiente').length;

  if (loading) return <div className="loading-state">Cargando órdenes...</div>;
  return (
    <div className="orders-admin-layout fade-in">
      <div className="view-header">
        <h3>🛍️ Órdenes {pending > 0 && <span className="pending-badge">{pending} pendientes</span>}</h3>
        <button className="btn btn-ghost" onClick={fetchOrders}>↺ Actualizar</button>
      </div>
      {orders.length === 0 ? <div className="empty-state"><h3>Sin órdenes</h3><p>Las órdenes de clientes aparecerán aquí.</p></div> : (
        <div className="orders-grid">
          {orders.map(o => {
            const exp = expanded[o.id];
            return (
              <div key={o.id} className={`order-admin-card glass-light ${o.estado}`}>
                <div className="order-admin-head" onClick={() => setExpanded(p => ({ ...p, [o.id]: !p[o.id] }))}>
                  <div className="order-id-col"><span className="order-num">{o.numero_orden}</span><span className={`status-pill ${statusColors[o.estado]}`}>{statusLabels[o.estado]}</span></div>
                  <div className="order-client-col"><span className="client-name">👤 {o.cliente_nombre}</span><span className="client-phone">📞 {o.cliente_telefono}</span></div>
                  <div className="order-total-col"><span className="order-total-amount">{formatPrice(o.total)}</span><span className="order-date">{fmtDate(o.created_at)}</span></div>
                  <span className="order-toggle-arrow">{exp ? '▲' : '▼'}</span>
                </div>
                {exp && (
                  <div className="order-admin-body slide-down">
                    <table className="detail-pro-table">
                      <thead><tr><th>Artículo</th><th>Cant.</th><th>P/U</th><th>Subtotal</th></tr></thead>
                      <tbody>{o.items.map((item, idx) => <tr key={idx}><td>{item.nombre}</td><td>×{item.cantidad}</td><td>{formatPrice(item.precio_unitario)}</td><td>{formatPrice(item.subtotal)}</td></tr>)}</tbody>
                    </table>
                    {o.estado === 'pendiente' && (
                      <div className="order-admin-actions">
                        <button className="btn btn-danger-solid" onClick={() => cancelar(o.id)}>❌ Cancelar</button>
                        <button className="btn btn-success premium-shadow" onClick={() => confirmar(o.id)}>✅ Confirmar Venta</button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── OPCIONES TAB ───────────────────────────────────────────── */
function OpcionesTab({ addToast, onRefreshAll }) {
  const [confirm, setConfirm] = useState(null); // which action is being confirmed

  const clearAction = async (endpoint, label) => {
    try {
      await apiFetch(endpoint, { method: 'DELETE' });
      addToast(`${label} limpiados correctamente`);
      setConfirm(null);
      onRefreshAll();
    } catch (e) { addToast(e.message, 'error'); }
  };

  const downloadPDF = async (fetchPath, title, buildTable) => {
    try {
      addToast('Generando PDF...');
      const data = await apiFetch(fetchPath);
      const tableHtml = buildTable(data);
      openPrintWindow(title, tableHtml);
    } catch (e) { addToast(e.message, 'error'); }
  };

  const ordenesPDF = () => downloadPDF('/ordenes', 'Listado de Órdenes', data => {
    const rows = data.map(o => `<tr><td>${o.numero_orden}</td><td>${o.cliente_nombre}</td><td>${o.cliente_telefono}</td><td>${o.estado}</td><td class="total">${formatPrice(o.total)}</td><td>${fmtDate(o.created_at)}</td></tr>`).join('');
    return `<table><thead><tr><th>Orden</th><th>Cliente</th><th>Teléfono</th><th>Estado</th><th>Total</th><th>Fecha</th></tr></thead><tbody>${rows}</tbody></table>`;
  });

  const reportesPDF = () => downloadPDF('/reportes/ventas', 'Historial de Ventas', data => {
    const rows = data.map(v => `<tr><td>#${v.venta_id}</td><td>${fmtDate(v.fecha)}</td><td>${v.metodo_pago || '-'}</td><td class="total">${formatPrice(v.total)}</td></tr>`).join('');
    return `<table><thead><tr><th>ID</th><th>Fecha</th><th>Método</th><th>Total</th></tr></thead><tbody>${rows}</tbody></table>`;
  });

  const ingresosPDF = () => downloadPDF('/reportes/ingresos', 'Ingresos por Día', data => {
    const rows = data.map(i => `<tr><td>${i.dia}</td><td>${i.num_ventas}</td><td class="total">${formatPrice(i.total_dia)}</td></tr>`).join('');
    return `<table><thead><tr><th>Fecha</th><th>Transacciones</th><th>Total Neto</th></tr></thead><tbody>${rows}</tbody></table>`;
  });

  const sections = [
    {
      key: 'ordenes', icon: '🛍️', title: 'Órdenes de Clientes',
      desc: 'Historial de pedidos recibidos desde la landing.',
      clearEndpoint: '/ordenes/limpiar', clearLabel: 'Órdenes',
      downloadFn: ordenesPDF, downloadLabel: 'Descargar PDF Órdenes'
    },
    {
      key: 'reportes', icon: '📜', title: 'Reportes de Ventas',
      desc: 'Historial completo de transacciones registradas.',
      clearEndpoint: '/reportes/limpiar', clearLabel: 'Reportes',
      downloadFn: reportesPDF, downloadLabel: 'Descargar PDF Reportes'
    },
    {
      key: 'ingresos', icon: '💰', title: 'Ingresos Diarios',
      desc: 'Resumen de ingresos agrupados por día.',
      clearEndpoint: '/ingresos/limpiar', clearLabel: 'Ingresos',
      downloadFn: ingresosPDF, downloadLabel: 'Descargar PDF Ingresos'
    }
  ];

  return (
    <div className="opciones-layout fade-in">
      <div className="view-header"><h3>⚙️ Opciones del Sistema</h3></div>
      <div className="opciones-grid">
        {sections.map(sec => (
          <div key={sec.key} className="opcion-card glass-light">
            <div className="opcion-header">
              <span className="opcion-icon">{sec.icon}</span>
              <div>
                <div className="opcion-title">{sec.title}</div>
                <div className="opcion-desc">{sec.desc}</div>
              </div>
            </div>
            <div className="opcion-actions">
              <button className="btn btn-primary small premium-shadow" onClick={sec.downloadFn}>
                📥 {sec.downloadLabel}
              </button>
              {confirm === sec.key ? (
                <div className="mini-confirm fade-in">
                  <span>¿Limpiar todos los {sec.clearLabel.toLowerCase()}?</span>
                  <button className="btn btn-danger-solid" onClick={() => clearAction(sec.clearEndpoint, sec.clearLabel)}>Confirmar</button>
                  <button className="btn btn-ghost small" onClick={() => setConfirm(null)}>No</button>
                </div>
              ) : (
                <button className="btn btn-ghost small" onClick={() => setConfirm(sec.key)}>
                  🗑️ Limpiar {sec.clearLabel}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── MAIN APP ───────────────────────────────────────────────── */
function AppContent() {
  const location = useLocation();
  const isAdminPath = location.pathname.startsWith('/admin');

  const [products, setProducts] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('inventory');
  const [cart, setCart] = useState([]);
  const [showCart, setShowCart] = useState(false);
  const [cartStep, setCartStep] = useState('cart');
  const [completedOrder, setCompletedOrder] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [modal, setModal] = useState(null);
  const [sales, setSales] = useState([]);
  const [income, setIncome] = useState([]);
  const [expandedSales, setExpandedSales] = useState({});
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
  const [pendingOrders, setPendingOrders] = useState(0);
  const pollRef = useRef(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const addToast = useCallback((message, type = 'success') => {
    const id = Date.now();
    setToasts(t => [...t, { id, message, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const [p, s] = await Promise.all([apiFetch('/productos'), apiFetch('/stats/resumen')]);
      setProducts(p); setStats(s);
    } catch (e) { addToast(e.message, 'error'); }
    finally { setLoading(false); }
  }, [addToast]);

  const fetchReports = useCallback(async () => {
    try {
      const [sa, inc] = await Promise.all([apiFetch('/reportes/ventas'), apiFetch('/reportes/ingresos')]);
      setSales(sa); setIncome(inc);
    } catch (e) { addToast(e.message, 'error'); }
  }, [addToast]);

  // Poll pending orders count every 15s when on admin
  const pollPendingOrders = useCallback(async () => {
    if (!isAdminPath) return;
    try {
      const orders = await apiFetch('/ordenes');
      setPendingOrders(orders.filter(o => o.estado === 'pendiente').length);
    } catch (_) { }
  }, [isAdminPath]);

  useEffect(() => {
    fetchData();
    if (isAdminPath) {
      pollPendingOrders();
      pollRef.current = setInterval(pollPendingOrders, 15000);
    }
    return () => clearInterval(pollRef.current);
  }, [fetchData, isAdminPath, pollPendingOrders]);

  useEffect(() => {
    if (isAdminPath && (activeTab === 'reports' || activeTab === 'income')) fetchReports();
  }, [fetchReports, isAdminPath, activeTab]);

  const addToCart = (p) => {
    const existing = cart.find(i => i.id === p.id);
    if (p.stock <= 0 || (existing && existing.cantidad >= p.stock)) { addToast('Stock insuficiente', 'error'); return; }
    setCart(prev => {
      const match = prev.find(i => i.id === p.id);
      if (match) return prev.map(i => i.id === p.id ? { ...i, cantidad: i.cantidad + 1 } : i);
      return [...prev, { ...p, cantidad: 1 }];
    });
    addToast(`${p.nombre} añadido`);
  };

  const changeQty = (id, delta) => {
    setCart(prev => prev.reduce((acc, i) => {
      if (i.id !== id) return [...acc, i];
      const newQty = i.cantidad + delta;
      if (newQty <= 0) return acc; // remove
      if (newQty > i.stock) return [...acc, i]; // cap at stock
      return [...acc, { ...i, cantidad: newQty }];
    }, []));
  };

  const removeFromCart = (id) => setCart(prev => prev.filter(i => i.id !== id));

  const handleAdminSale = async () => {
    try {
      await apiFetch('/ventas', { method: 'POST', body: JSON.stringify({ items: cart.map(i => ({ id: i.id, cantidad: i.cantidad })) }) });
      addToast('Transacción registrada'); setCart([]); setShowCart(false); fetchData();
    } catch (e) { addToast(e.message, 'error'); }
  };

  const openCart = () => { setCartStep('cart'); setShowCart(true); };
  const closeCart = () => { setShowCart(false); setTimeout(() => setCartStep('cart'), 400); };

  const filteredProducts = useMemo(() =>
    products.filter(p => !search || p.nombre.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase())),
    [products, search]);

  const cartTotal = cart.reduce((acc, i) => acc + i.precio * i.cantidad, 0);

  const navItems = [
    { key: 'inventory', icon: '📦', label: 'Inventario' },
    { key: 'orders', icon: '🛍️', label: 'Órdenes', badge: pendingOrders },
    { key: 'income', icon: '💰', label: 'Ingresos' },
    { key: 'reports', icon: '📜', label: 'Reportes' },
    { key: 'options', icon: '⚙️', label: 'Opciones' },
  ];

  return (
    <div className={`app-container ${isAdminPath ? 'sidebar-mode' : 'public-mode'}`}>
      {isAdminPath && (
        <aside className="sidebar glass-dark">
          <h2 className="logo">Inven<span className="accent">Pro</span></h2>
          <nav className="sidebar-nav-list">
            {navItems.map(({ key, icon, label, badge }) => (
              <button key={key} className={`nav-link ${activeTab === key ? 'active' : ''}`} onClick={() => setActiveTab(key)}>
                <span className="nav-icon-wrap">
                  <span className="nav-icon">{icon}</span>
                  {badge > 0 && key === 'orders' && <span className="nav-notify-dot pulse">{badge}</span>}
                </span>
                <span className="nav-text">{label}</span>
                {badge > 0 && key === 'orders' && <span className="nav-badge-count">{badge}</span>}
              </button>
            ))}
          </nav>
          <div className="sidebar-footer-polish">
            <div className="stock-alert-box glass">
              <span className="label">Bajo Stock</span>
              <span className="count warning">{stats?.stock_bajo ?? 0}</span>
            </div>
            <Link to="/" className="btn-outline-nav">🏠 Landing</Link>
          </div>
        </aside>
      )}

      <main className="viewport-main">
        <header className="top-bar glass">
          <div className="top-bar-left">
            {!isAdminPath ? <h2 className="logo">Inven<span className="accent">Pro</span></h2> : <span className="dash-title gradient-text">Dashboard</span>}
          </div>
          <div className="top-bar-center search-container glass-light">
            <span className="search-icon">🔍</span>
            <input placeholder="Buscar por nombre o SKU..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="top-bar-right">
            <button className="theme-toggle-round" onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}>{theme === 'dark' ? '☀️' : '🌙'}</button>
            <button className="cart-trigger-pill" onClick={openCart}>🛒 <span className="cart-badge">{cart.length}</span></button>
          </div>
        </header>

        <div className="scroll-content-container">
          {!isAdminPath && !search && <Hero />}
          <div className="view-grid-padding">

            {(activeTab === 'inventory' || !isAdminPath) && (
              <>
                <div className="view-header">
                  <h3>{isAdminPath ? 'Control de Stock' : 'Nuestro Catálogo'}</h3>
                  {isAdminPath && <button className="btn btn-primary premium-shadow" onClick={() => setModal({ type: 'add' })}>✨ Registrar Artículo</button>}
                </div>
                <div className={`products-responsive-grid ${isAdminPath ? 'admin-grid' : 'public-grid'}`}>
                  {filteredProducts.map(p => (
                    <div key={p.id} className="modern-item-card glass-light hover-up">
                      <div className="media-container">
                        {p.imagen ? <img src={`${API_BASE}/../asset/${p.imagen}`} alt="" /> : <span className="no-img">📦</span>}
                        {isAdminPath
                          ? <span className={`badge-stock ${getStockClass(p.stock)}`}>{p.stock} {p.unidad}</span>
                          : <span className={`badge-stock ${p.stock > 0 ? 'stock-ok' : 'stock-out'}`}>{p.stock > 0 ? 'Disponible' : 'Agotado'}</span>
                        }
                      </div>
                      <div className="card-body">
                        <h4 className="item-title">{p.nombre}</h4>
                        <div className="item-price">{formatPrice(p.precio)}</div>
                        {!isAdminPath && <div className="item-bio">{p.descripcion || 'Calidad premium.'}</div>}
                        {isAdminPath && <div className="item-admin-meta glass"><span>SKU: {p.sku}</span><span className="meta-sep">|</span><span>Stock: {p.stock}</span></div>}
                        <div className="card-footer-flex">
                          {isAdminPath && <button className="btn-edit-action" onClick={() => setModal({ type: 'edit', product: p })}>Editar</button>}
                          <button className={`btn btn-primary ${isAdminPath ? 'small' : 'full'} premium-shadow`} onClick={() => addToCart(p)} disabled={p.stock <= 0}>
                            {p.stock > 0 ? (isAdminPath ? '🛒' : '🛒 Añadir') : '🚫 Sin Stock'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {isAdminPath && activeTab === 'orders' && <AdminOrdenesTab addToast={addToast} onRefreshStats={fetchData} />}

            {isAdminPath && activeTab === 'income' && (
              <div className="income-v-layout glass-light fade-in">
                <h3>💰 Ingresos por Día</h3>
                <div className="table-responsive-wrapper">
                  <table className="pro-table">
                    <thead><tr><th>Fecha</th><th>Transacciones</th><th>Total Neto</th></tr></thead>
                    <tbody>{income.map(i => <tr key={i.dia}><td>{i.dia}</td><td>{i.num_ventas}</td><td className="accent-text">{formatPrice(i.total_dia)}</td></tr>)}</tbody>
                  </table>
                </div>
              </div>
            )}

            {isAdminPath && activeTab === 'reports' && (
              <div className="reports-v-layout fade-in">
                <h3>📜 Historial de Ventas</h3>
                <div className="order-accordion-list">
                  {sales.map(s => {
                    const exp = expandedSales[s.venta_id];
                    return (
                      <div key={s.venta_id} className={`order-card glass-light ${exp ? 'expanded' : ''}`} onClick={() => setExpandedSales(p => ({ ...p, [s.venta_id]: !p[s.venta_id] }))}>
                        <div className="order-head">
                          <span className="id">#ORD-{s.venta_id}</span>
                          <span className="time">{new Date(s.fecha).toLocaleTimeString()}</span>
                          <span className="total">{formatPrice(s.total)}</span>
                          <span className="arrow">{exp ? '▲' : '▼'}</span>
                        </div>
                        {exp && (
                          <div className="order-details slide-down">
                            <table className="detail-pro-table">
                              <thead><tr><th>Artículo</th><th>Cant.</th><th>Subtotal</th></tr></thead>
                              <tbody>{s.items.map((item, idx) => <tr key={idx}><td>{item.nombre}</td><td>×{item.cantidad}</td><td>{formatPrice(item.subtotal)}</td></tr>)}</tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {isAdminPath && activeTab === 'options' && (
              <OpcionesTab addToast={addToast} onRefreshAll={() => { fetchData(); fetchReports(); }} />
            )}

          </div>
        </div>
      </main>

      {/* ── CART DRAWER ───────────────────────────────────────── */}
      {showCart && (
        <div className="side-drawer-overlay" onClick={closeCart}>
          <div className="side-drawer glass-light slide-right" onClick={e => e.stopPropagation()}>
            <div className="drawer-head-flex">
              <h3>{cartStep === 'checkout' ? '📋 Tus Datos' : cartStep === 'success' ? '✅ Confirmación' : '🛍️ Mi Carrito'}</h3>
              <button className="close-btn" onClick={closeCart}>✕</button>
            </div>

            {cartStep === 'cart' && (
              <>
                <div className="drawer-scroll-body modern-scroll">
                  {cart.length === 0 ? (
                    <div className="empty-state"><h3>Carrito Vacío</h3><p>Agrega productos del catálogo.</p></div>
                  ) : cart.map(i => (
                    <div key={i.id} className="drawer-item-row glass">
                      <div className="info">
                        <div className="name">{i.nombre}</div>
                        <div className="price">{formatPrice(i.precio * i.cantidad)}</div>
                      </div>
                      <div className="actions">
                        <div className="qty-controls">
                          <button className="qty-btn" onClick={() => changeQty(i.id, -1)}>−</button>
                          <span className="qty-num">{i.cantidad}</span>
                          <button className="qty-btn" onClick={() => changeQty(i.id, 1)} disabled={i.cantidad >= i.stock}>+</button>
                        </div>
                        <button className="btn-del" onClick={() => removeFromCart(i.id)}>🗑️</button>
                      </div>
                    </div>
                  ))}
                </div>
                {cart.length > 0 && (
                  <div className="drawer-footer-polish">
                    <div className="grand-total-box"><span>Total:</span><span className="amount">{formatPrice(cartTotal)}</span></div>
                    {isAdminPath
                      ? <button className="btn btn-primary full big-btn premium-shadow" onClick={handleAdminSale}>💸 Registrar Venta</button>
                      : <button className="btn btn-primary full big-btn premium-shadow" onClick={() => setCartStep('checkout')}>🛍️ Proceder al Pago</button>
                    }
                  </div>
                )}
              </>
            )}

            {cartStep === 'checkout' && (
              <CheckoutForm cart={cart} onSuccess={order => { setCompletedOrder(order); setCartStep('success'); }} onBack={() => setCartStep('cart')} addToast={addToast} />
            )}

            {cartStep === 'success' && completedOrder && (
              <OrderSuccessScreen order={completedOrder} onClose={() => { setCart([]); closeCart(); setCompletedOrder(null); pollPendingOrders(); }} />
            )}
          </div>
        </div>
      )}

      {/* ── MODAL ─────────────────────────────────────────────── */}
      {modal && (
        <ProductModal
          product={modal.product}
          onSave={async (fd, id) => {
            try {
              if (id) await apiFetch(`/productos/${id}`, { method: 'PUT', body: fd });
              else await apiFetch('/productos', { method: 'POST', body: fd });
              addToast('Guardado correctamente'); setModal(null); fetchData();
            } catch (e) { addToast(e.message, 'error'); }
          }}
          onDelete={async (p) => {
            try {
              await apiFetch(`/productos/${p.id}`, { method: 'DELETE' });
              addToast('Eliminado'); setModal(null); fetchData();
            } catch (e) { addToast(e.message, 'error'); }
          }}
          onClose={() => setModal(null)}
        />
      )}
      <Toast toasts={toasts} />
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/admin" element={<AppContent />} />
        <Route path="/" element={<AppContent />} />
      </Routes>
    </Router>
  );
}

export default App;
