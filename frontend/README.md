# CashSpring Frontend

Frontend de la aplicación CashSpring - Sistema de gestión de préstamos con mapas interactivos.

## 🚀 Tecnologías

- **React 18** - Librería UI
- **Vite** - Build tool rápido
- **React Router** - Navegación
- **Axios** - HTTP client
- **React Leaflet** - Mapas interactivos (OpenStreetMap)
- **Leaflet** - Librería de mapas

## 📦 Instalación

```bash
npm install
```

## ▶️ Ejecutar en Desarrollo

```bash
npm run dev
```

La aplicación se abrirá automáticamente en http://localhost:5173

## 🏗️ Build para Producción

```bash
npm run build
```

## ⚙️ Configuración

### Conexión con el Backend

Edita `src/services/api.js` para cambiar:
- **baseURL**: URL del backend (por defecto: http://localhost:8080)
- **auth**: Credenciales de autenticación

```javascript
auth: {
  username: 'tu_usuario',
  password: 'tu_password'
}
```

### CORS

Asegúrate de que el backend tenga CORS configurado para aceptar peticiones desde:
- http://localhost:5173 (desarrollo)
- Tu dominio de producción

## 📱 Características

- ✅ Lista de clientes con búsqueda
- ✅ Crear/Editar/Eliminar clientes
- ✅ Mapa interactivo para seleccionar ubicación
- ✅ Links automáticos a Google Maps, Waze, WhatsApp
- ✅ Vista de detalles con mapa
- ✅ Responsive (funciona en móvil, tablet, desktop)
- ✅ Geolocalización (obtener ubicación actual del navegador)

## 📂 Estructura del Proyecto

```
src/
├── components/         # Componentes reutilizables
│   ├── ClienteCard.jsx
│   ├── ClienteForm.jsx
│   └── MapPicker.jsx
├── pages/              # Páginas principales
│   ├── ClientesPage.jsx
│   ├── ClienteFormPage.jsx
│   └── ClienteDetailPage.jsx
├── services/           # Servicios de API
│   └── api.js
├── App.jsx             # Componente principal con rutas
├── main.jsx            # Punto de entrada
└── index.css           # Estilos globales
```

## 🗺️ Uso del Mapa

1. En el formulario de cliente, haz click en el mapa para seleccionar la ubicación
2. O usa el botón "📍 Mi ubicación" para obtener tu ubicación actual
3. Las coordenadas se guardan automáticamente
4. Los links de navegación se generan en el backend

## 🛠️ Desarrollo

### Agregar Nuevas Páginas

1. Crea el componente en `src/pages/`
2. Agrega la ruta en `src/App.jsx`

### Agregar Nuevos Endpoints

1. Edita `src/services/api.js`
2. Agrega el nuevo método en el objeto exportado

## 📝 Notas

- El mapa usa OpenStreetMap (gratis, sin API key necesaria)
- Las coordenadas predeterminadas están en San José, Costa Rica (9.9281, -84.0907)
- Puedes cambiar el centro del mapa en `src/components/MapPicker.jsx`

## 🐛 Solución de Problemas

### Error: "Cannot connect to backend"
- Verifica que el backend esté corriendo en http://localhost:8080
- Verifica las credenciales en `src/services/api.js`

### Error: "Network Error"
- Verifica que CORS esté configurado en el backend
- Verifica la consola del navegador para más detalles

### Mapa no se muestra
- Verifica que `leaflet` y `react-leaflet` estén instalados
- Verifica que `@import 'leaflet/dist/leaflet.css'` esté en `index.css`
