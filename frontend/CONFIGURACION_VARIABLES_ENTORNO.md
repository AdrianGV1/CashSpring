# Configuración de Variables de Entorno

## 🔧 Desarrollo Local

1. El archivo `.env.local` ya está creado con valores por defecto:
   ```
   VITE_API_URL=http://localhost:8080
   VITE_API_USERNAME=admin
   VITE_API_PASSWORD=admin123
   ```

2. Si necesitas cambiar los valores, edita `.env.local`

3. Reinicia el servidor de desarrollo después de modificar las variables:
   ```bash
   npm run dev
   ```

## 🚀 Configuración en Vercel (Producción)

Para que el frontend funcione correctamente en Vercel conectándose a tu backend en Koyeb:

### Paso 1: Configurar Variables de Entorno en Vercel

1. Ve a tu proyecto en Vercel Dashboard
2. Click en **Settings** (Configuración)
3. Click en **Environment Variables** (Variables de Entorno)
4. Agrega las siguientes variables:

| Variable | Valor | Ejemplo |
|----------|-------|---------|
| `VITE_API_URL` | URL de tu backend en Koyeb | `https://tu-app-nombre.koyeb.app` |
| `VITE_API_USERNAME` | Usuario de autenticación | `admin` |
| `VITE_API_PASSWORD` | Contraseña de autenticación | `admin123` |

5. Selecciona **Production**, **Preview** y **Development** para cada variable
6. Click en **Save**

### Paso 2: Redeploy

Después de agregar las variables, haz un nuevo deploy:
- Ve a **Deployments**
- Click en los tres puntos (•••) del último deployment
- Click en **Redeploy**

## ⚙️ Configuración del Backend en Koyeb

Tu backend necesita estas variables de entorno en Koyeb:

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `SPRING_DATASOURCE_URL` | URL de conexión a Neon | `jdbc:postgresql://ep-xxx.neon.tech/cashspring?sslmode=require` |
| `SPRING_DATASOURCE_USERNAME` | Usuario de Neon | Tu usuario de Neon |
| `SPRING_DATASOURCE_PASSWORD` | Contraseña de Neon | Tu contraseña de Neon |
| `SPRING_SECURITY_USER_NAME` | Usuario para Basic Auth | `admin` |
| `SPRING_SECURITY_USER_PASSWORD` | Contraseña para Basic Auth | `tu_password_segura` |
| `PORT` | Puerto del servidor | `8080` (Koyeb lo  asigna automáticamente) |

## 🔍 Verificar que funciona

1. Abre la consola del navegador (F12)
2. Ve a la pestaña **Network**
3. Intenta crear un cliente
4. Verifica que la petición se haga a tu URL de Koyeb y no a localhost

## ⚠️ Solución de Problemas Comunes

### Error: "Network Error" o "Failed to fetch"
- ✅ Verifica que `VITE_API_URL` en Vercel apunte a tu app de Koyeb
- ✅ Asegúrate de no incluir `/` al final de la URL

### Error: "401 Unauthorized"
- ✅ Verifica que `VITE_API_USERNAME` y `VITE_API_PASSWORD` coincidan con las credenciales del backend

### Error: "CORS Error"
- ✅ El backend ya tiene configurado CORS para `*.vercel.app`
- ✅ Si cambias el dominio, actualiza `SecurityConfig.java`

### Los cambios no se reflejan
- ✅ Limpia caché del navegador
- ✅ Haz un hard refresh (Ctrl + Shift + R)
- ✅ Verifica que hayas redployado después de cambiar las variables

## 📝 Notas Importantes

- ⚠️ **Nunca** commitees `.env.local` al repositorio
- ⚠️ Las variables deben empezar con `VITE_` para ser accesibles en el frontend
- ⚠️ Los cambios en variables de entorno requieren rebuild/redeploy
