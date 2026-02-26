# SISTEMA DE CONTROL DE PENALIZACIONES

## Resumen de la Implementación

Se implementó un sistema completo de control de penalizaciones que permite **PAUSAR** y **NEGOCIAR** las penalizaciones de los préstamos.

---

## 🎯 Funcionalidades Implementadas

### 1. **PAUSAR Penalización** ⏸️
- **Descripción**: Congela la penalización en el monto actual, evitando que continúe incrementándose.
- **Comportamiento**: 
  - La penalización se mantiene en el valor actual sin aumentar
  - Se desactiva **automáticamente** cuando se paga una cuota atrasada
  - Registra la fecha en que se pausó
- **Uso**: Útil cuando el cliente va a pagar pronto pero necesita unos días adicionales

### 2. **NEGOCIAR Penalización** 💼
- **Descripción**: Establece un monto fijo acordado para la penalización, independiente del cálculo automático.
- **Comportamiento**:
  - Reemplaza completamente el cálculo automático (₡5,000/día)
  - Permanece hasta que se pague, resetee o renegocie
  - Registra la fecha de negociación
- **Uso**: Útil cuando se llega a un acuerdo de pago específico con el cliente

### 3. **REANUDAR Penalización** ▶️
- **Descripción**: Quita la pausa y vuelve al cálculo normal de penalización.
- **Comportamiento**:
  - Recalcula la penalización basándose en los días reales de atraso
  - Actualiza el monto acumulado
- **Uso**: Cuando se decide volver al cálculo automático después de una pausa

### 4. **RESETEAR Control** 🔄
- **Descripción**: Elimina cualquier control activo (pausa o negociación) y vuelve al cálculo normal.
- **Comportamiento**:
  - Limpia todos los controles
  - Recalcula la penalización normal
- **Uso**: Para volver al estado predeterminado del sistema

---

## 🔧 Cambios Técnicos Realizados

### Backend (Java/Spring Boot)

#### 1. **PrestamoEntity.java**
Se agregaron 5 nuevos campos:
```java
private Boolean penalizacionPausada;          // Indica si está pausada
private LocalDate fechaPausaPenalizacion;     // Fecha de pausa
private Boolean penalizacionNegociada;        // Indica si está negociada
private Long montoNegociado;                  // Monto acordado
private LocalDate fechaNegociacion;           // Fecha del acuerdo
```

#### 2. **PenalizacionService.java**
Se modificó el método `calcularPenalizacion()` con nueva lógica de prioridad:
1. **Si está negociada** → devuelve `montoNegociado` (fijo)
2. **Si está pausada** → devuelve `penalizacionAcumulada` actual (congelado)
3. **Si está pagado/liquidado** → devuelve 0
4. **Si no** → calcula normal (días × ₡5,000)

#### 3. **PagoService.java**
Se agregó lógica de **auto-unpause**:
```java
// Si la penalización estaba pausada Y se pagó alguna cuota atrasada
// → desactivar automáticamente la pausa
if (penalizacionPausada && seCubrioAlgunaAtrasada) {
    prestamo.setPenalizacionPausada(false);
    prestamo.setFechaPausaPenalizacion(null);
}
```

#### 4. **PrestamoService.java**
Se agregaron 4 nuevos métodos transaccionales:
- `pausarPenalizacion(prestamoId)` - Activa la pausa
- `reanudarPenalizacion(prestamoId)` - Desactiva la pausa y recalcula
- `negociarPenalizacion(prestamoId, montoNegociado)` - Establece monto fijo
- `resetearPenalizacion(prestamoId)` - Limpia controles y recalcula

#### 5. **PrestamoController.java**
Se crearon 4 nuevos endpoints:
```
POST /api/prestamos/{id}/pausar-penalizacion
POST /api/prestamos/{id}/reanudar-penalizacion
POST /api/prestamos/{id}/negociar-penalizacion (body: {montoNegociado: 15000})
POST /api/prestamos/{id}/resetear-penalizacion
```

#### 6. **PrestamoResponse.java (DTO)**
Se agregaron 5 campos para enviar al frontend:
```java
private Boolean penalizacionPausada;
private LocalDate fechaPausaPenalizacion;
private Boolean penalizacionNegociada;
private Long montoNegociado;
private LocalDate fechaNegociacion;
```

---

### Frontend (React/Vite)

#### 1. **PrestamoDetailPage.jsx**
Se agregaron:
- **4 estados nuevos** para manejar modal y loading
- **4 funciones handler** para cada acción (pausar, reanudar, negociar, resetear)
- **Botones de control** visibles solo para Admin/Supervisor:
  - Pausar (⏸️) - aparece si NO está pausada ni negociada
  - Reanudar (▶️) - aparece si ESTÁ pausada
  - Negociar (💼) - siempre disponible
  - Resetear (🔄) - aparece si hay control activo
- **Indicadores visuales** en la sección de penalización:
  - 💼 Monto negociado (verde) si está negociada
  - ⏸️ Pausada (amarillo) si está pausada
  - Normal si ningún control está activo
- **Modal de negociación** con input numérico para ingresar el monto acordado

#### 2. **prestamoApi.js**
Se agregaron 4 métodos:
```javascript
pausarPenalizacion(id)
reanudarPenalizacion(id)
negociarPenalizacion(id, montoNegociado)
resetearPenalizacion(id)
```

---

## 🗄️ Migración de Base de Datos

### Script SQL: `migration_control_penalizacion.sql`

Para aplicar en **Neon** (PostgreSQL en la nube):

1. Abrir el **SQL Editor** en Neon
2. Ejecutar el contenido del archivo `migration_control_penalizacion.sql`
3. Verificar que las 5 columnas se agreguen correctamente

**Columnas agregadas:**
```sql
ALTER TABLE prestamo ADD COLUMN penalizacion_pausada BOOLEAN DEFAULT FALSE;
ALTER TABLE prestamo ADD COLUMN fecha_pausa_penalizacion DATE;
ALTER TABLE prestamo ADD COLUMN penalizacion_negociada BOOLEAN DEFAULT FALSE;
ALTER TABLE prestamo ADD COLUMN monto_negociado BIGINT;
ALTER TABLE prestamo ADD COLUMN fecha_negociacion DATE;
```

---

## 📋 Flujo de Uso

### Ejemplo 1: Pausar Penalización
1. Cliente tiene ₡25,000 de penalización acumulada
2. Admin hace clic en **"⏸️ Pausar"**
3. La penalización se congela en ₡25,000 (no aumenta más)
4. Cuando el cliente paga una cuota atrasada → **despausa automáticamente**
5. Si no paga, la penalización permanece en ₡25,000 hasta que se reanude

### Ejemplo 2: Negociar Penalización
1. Cliente debe ₡40,000 de penalización
2. Se llega a un acuerdo de pagar solo ₡20,000
3. Admin hace clic en **"💼 Negociar"**
4. Ingresa ₡20,000 en el modal
5. La penalización se fija en ₡20,000 (ignorando cálculo automático)
6. Cuando el cliente paga, el sistema deduce de los ₡20,000

### Ejemplo 3: Pago con Pausa Activa
1. Penalización pausada en ₡15,000
2. Cliente paga una cuota atrasada
3. Sistema **despausa automáticamente** la penalización
4. Vuelve al cálculo normal basado en días de atraso

---

## ✅ Validaciones Implementadas

- ✅ No se puede pausar si ya está pausada
- ✅ No se puede reanudar si no está pausada
- ✅ Monto negociado debe ser ≥ 0
- ✅ Solo Admin/Supervisor pueden controlar penalizaciones
- ✅ Auto-unpause al pagar cuota atrasada
- ✅ Resetear requiere confirmación del usuario

---

## 🚀 Despliegue

### Backend
1. Ya está compilado y listo ✅ (sin errores)
2. Al hacer `mvn spring-boot:run` los cambios estarán disponibles
3. Endpoints listos en: `http://localhost:8080/api/prestamos/{id}`

### Frontend
1. Ya está listo ✅ (sin errores)
2. Al hacer `npm run dev` los botones aparecerán en la página de detalle del préstamo
3. Modal de negociación accesible desde botón "💼 Negociar"

### Base de Datos Neon
1. Ejecutar `migration_control_penalizacion.sql` en el SQL Editor
2. Verificar con: `SELECT * FROM prestamo LIMIT 1;` que las columnas existan
3. Las columnas tendrán `NULL` o `FALSE` por defecto para préstamos existentes

---

## 🎨 Interfaz de Usuario

### Vista del Usuario (Cliente)
- No tiene acceso a los controles
- Ve únicamente el monto de penalización
- Ve indicadores de estado (pausada/negociada) pero no puede cambiarlos

### Vista de Admin/Supervisor
- **Sección de penalización** con botones de control
- **Indicadores de estado**:
  - 💼 Verde: Negociada (muestra fecha)
  - ⏸️ Amarillo: Pausada (muestra fecha)
  - Normal: Sin controles activos
- **Botones disponibles según estado**:
  - Pausar: Solo si no hay control activo
  - Reanudar: Solo si está pausada
  - Negociar: Siempre disponible
  - Resetear: Solo si hay pausa o negociación activa

---

## 📊 Prioridad de Cálculo

El sistema ahora sigue esta jerarquía:

1. **Negociada** → Monto fijo (ignora todo lo demás)
2. **Pausada** → Monto congelado (no aumenta)
3. **Pagado/Liquidado** → ₡0
4. **Normal** → Días atrasados × ₡5,000

---

## ⚠️ Importante

- **Auto-unpause es automático**: No requiere acción manual cuando se paga una cuota atrasada
- **Negociación persiste**: Permanece hasta pago completo, reseteo o renegociación
- **Pausa NO persiste**: Se auto-desactiva al pagar cuota atrasada
- **Resetear vuelve al normal**: Elimina TODOS los controles activos

---

## 🧪 Pruebas Recomendadas

1. **Pausar penalización** → Verificar que no aumente con el tiempo
2. **Pagar cuota atrasada con pausa activa** → Verificar auto-unpause
3. **Negociar penalización** → Verificar que el monto se fije
4. **Pagar con negociación** → Verificar que deduzca del monto negociado
5. **Resetear después de negociar** → Verificar recalculación normal
6. **Refrescar página** → Verificar persistencia de controles

---

## 📝 Archivos Modificados/Creados

### Backend
- ✏️ `PrestamoEntity.java` - 5 campos nuevos
- ✏️ `PenalizacionService.java` - Lógica de cálculo con prioridad
- ✏️ `PagoService.java` - Auto-unpause logic
- ✏️ `PrestamoService.java` - 4 métodos nuevos
- ✏️ `PrestamoController.java` - 4 endpoints nuevos
- ✏️ `PrestamoResponse.java` - 5 campos en DTO

### Frontend
- ✏️ `PrestamoDetailPage.jsx` - UI de control + modal
- ✏️ `prestamoApi.js` - 4 métodos API

### Base de Datos
- 🆕 `migration_control_penalizacion.sql` - Script de migración

### Documentación
- 🆕 `SISTEMA_CONTROL_PENALIZACIONES.md` - Este archivo

---

## 📞 Soporte

Sistema implementado completamente y listo para usar.
Todos los archivos han sido actualizados sin errores de compilación.

Para activar en Neon:
1. Ejecutar `migration_control_penalizacion.sql`
2. Reiniciar backend si estaba corriendo
3. Refrescar frontend

¡La funcionalidad está lista! 🎉
