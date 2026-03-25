# InvenPro Premium 🚀

Sistema de gestión de inventario y ventas con una vista pública para clientes y un panel administrativo privado.

---

## ✨ Funcionalidades

| Módulo | Descripción |
|---|---|
| 🏪 **Catálogo Público** | Landing page con búsqueda, badges de disponibilidad y carrito de compras |
| 🛒 **Pedidos de Clientes** | Flujo de checkout con nombre y teléfono → genera número de orden |
| 📦 **Inventario Admin** | CRUD de productos con imágenes, grilla 4 columnas |
| 🛍️ **Órdenes Admin** | Recibe pedidos de la landing, confirma venta (descuenta stock) o cancela |
| 💰 **Ingresos** | Resumen de ingresos agrupados por día |
| 📜 **Reportes** | Historial detallado de todas las ventas |
| ⚙️ **Opciones** | Limpieza y descarga en PDF de órdenes, reportes e ingresos |
| 🌙 **Tema Claro/Oscuro** | Persistido en localStorage |

---

## 🏗️ Stack Tecnológico

- **Frontend**: React 18, React Router v6, CSS (Glassmorphism)
- **Backend**: Node.js 18 + Express, Multer (uploads)
- **Base de Datos**: PostgreSQL
- **Servidor**: Nginx (producción)
- **Contenedores**: Docker + Docker Compose

---

## 🐳 Despliegue con Docker

### Pre-requisitos
- Docker y Docker Compose instalados
- Base de datos PostgreSQL accesible (local o remota)

### 1. Configurar variables de entorno

Crea o edita `backend/.env`:

```env
DB_HOST=192.168.100.100   # IP de tu servidor PostgreSQL
DB_PORT=5432
DB_NAME=pruebas
DB_USER=postgres
DB_PASSWORD=tu_contraseña
PORT=3001
```

O pásalas directamente al docker-compose.yml editando la sección `environment`.

### 2. Construir y levantar

```bash
docker compose up -d --build
```

### 3. Verificar

```bash
docker compose ps           # Ver estado de los contenedores
docker compose logs backend # Logs del backend
```

La aplicación quedará disponible en:
- **Frontend**: `http://tu-ip:8080`
- **API Backend**: `http://tu-ip:3001/api/health`

### 4. Detener

```bash
docker compose down
```

---

## 💻 Desarrollo Local

### Backend

```bash
cd backend
npm install
node server.js      # Puerto 3001
```

### Frontend

```bash
npm install
npm start           # Puerto 3000 (proxy → 3001)
```

Abre `http://localhost:3000` para la landing pública.  
Abre `http://localhost:3000/#/admin` para el panel administrativo.

---

## 📁 Estructura del Proyecto

```
prueba/
├── backend/
│   ├── asset/          # Imágenes de productos (persistir como volumen)
│   ├── server.js       # API REST + lógica de negocio
│   ├── init_db.js      # Script de inicialización de tablas
│   ├── Dockerfile
│   └── .env
├── public/
│   ├── index.html
│   └── LOGO.png        # Ícono de la app
├── src/
│   ├── App.js          # Componente principal (vistas pública y admin)
│   ├── App.css         # Estilos (design system glassmorphism)
│   └── index.js
├── Dockerfile          # Build del frontend
├── docker-compose.yml  # Orquestación de servicios
├── nginx.conf          # Configuración de Nginx (proxy API + SPA)
└── README.md
```

---

## 🔑 Rutas

| Ruta | Vista |
|---|---|
| `/` | Landing pública (catálogo + carrito) |
| `/#/admin` | Panel administrativo |

---

## 🖼️ Imágenes de Productos

Las imágenes se guardan en `backend/asset/`. En Docker, este directorio está montado como volumen:

```yaml
volumes:
  - ./backend/asset:/app/asset
```

Esto asegura que las imágenes **persistan** entre reinicios o actualizaciones del contenedor.

---

## 🗄️ Base de Datos

Las tablas se crean automáticamente al iniciar el servidor. Para crearlas manualmente ejecuta:

```bash
cd backend && node init_db.js
```

Tablas principales: `productos`, `ventas`, `venta_items`, `ordenes`.
