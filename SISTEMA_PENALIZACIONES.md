# 🚨 SISTEMA DE PENALIZACIONES POR ATRASO

## 📋 RESUMEN

Sistema automático de penalización por pagos atrasados implementado en CashSpring. Cobra **₡5,000 por día** de retraso después de 1 día de gracia.

---

## ⚙️ FUNCIONAMIENTO

### 📅 Línea de Tiempo de Penalización

```
Ejemplo: Préstamo inicia el 10 de enero

Día 0:   10 ENE - Inicio del préstamo
Día 15:  25 ENE - Vencimiento de primera cuota ⏰
Día 16:  26 ENE - DÍA DE GRACIA ⚠️ (Estado: ATRASADO, Penalización: ₡0)
Día 17:  27 ENE - Día 1 de penalización 💰 (₡5,000)
Día 18:  28 ENE - Día 2 de penalización 💰 (₡10,000)
Día 19:  29 ENE - Día 3 de penalización 💰 (₡15,000)
...      Y así sucesivamente
```

### 🔢 CONSTANTES

- **PENALIZACION_DIARIA**: `₡5,000`
- **DIAS_GRACIA**: `1 día`
- **Sin límite máximo**: La penalización crece indefinidamente

---

## 🎯 CARACTERÍSTICAS

### 1. Penalización GLOBAL del Préstamo
- **NO es por cuota individual**, es UNA penalización para todo el préstamo
- Se calcula desde la **primera cuota PENDIENTE vencida**
- Continúa acumulando hasta que se pague

### 2. Aplica a TODOS los Tipos de Acuerdo
- ✅ PENALIZACION_POR_DIA
- ✅ PAGO_EN_MES  
- ✅ QUINCENAS_DOBLES

### 3. Orden de Aplicación de Pagos
```
💵 Pago recibido → 
    1º Aplicar a CUOTAS (lógica existente)
    2º Si sobra dinero → Aplicar a PENALIZACIÓN
```

**Ejemplo:**
```
Deuda: ₡100,000 (cuota) + ₡30,000 (penalización)
Pago: ₡80,000

Resultado:
- Cuota: ₡20,000 restantes
- Penalización: ₡30,000 (sin cambio)

Pago: ₡120,000

Resultado:
- Cuota: ₡0 (cubierta)
- Penalización: ₡10,000 restantes
```

### 4. Estado del Préstamo
- **Día de vencimiento**: Estado permanece ACTIVO
- **Día de gracia** (día 16): Estado cambia a **ATRASADO** (sin penalización aún)
- **Día 17 en adelante**: Estado ATRASADO + penalización de ₡5,000/día
- **Al pagar todo**: Estado vuelve a ACTIVO o PAGADO

---

## 🤖 ACTUALIZACIÓN AUTOMÁTICA

### Job Programado
- **Horario**: Todos los días a las **00:30 AM**
- **Acción**: Recalcula penalizaciones de todos los préstamos ACTIVOS y ATRASADOS
- **Implementación**: `@Scheduled(cron = "0 30 0 * * *")`

### Cálculo en Tiempo Real
- Cada vez que se consulta un préstamo, se recalcula su penalización
- El frontend siempre muestra la penalización actualizada

---

## 🛠️ IMPLEMENTACIÓN TÉCNICA

### Backend

#### 1. Entidad PrestamoEntity
```java
@Column(name = "penalizacion_acumulada", nullable = false)
private Long penalizacionAcumulada = 0L;
```

#### 2. PenalizacionService
- `calcularPenalizacion(prestamo)`: Calcula penalización actual
- `actualizarEstadoPrestamo(prestamo)`: Actualiza estado ACTIVO/ATRASADO/PAGADO
- `actualizarPenalizacionesDiarias()`: Job que se ejecuta diariamente

#### 3. PagoService
- Modificado para aplicar pagos primero a cuotas, luego a penalización
- Usa `PenalizacionService` para actualizar estado después de cada pago

### Frontend

#### 1. PrestamoDetailPage.jsx
- Muestra penalización acumulada con advertencia visual
- Incluye penalización en el saldo pendiente
- Formulario de pago considera penalización en el máximo permitido

#### 2. PrestamoCard.jsx
- Indicador visual de penalización en la tarjeta de préstamo
- Resaltado en rojo para préstamos con penalización

---

## 📡 ENDPOINTS API

### GET `/api/penalizaciones/{prestamoId}`
Consulta la penalización actual de un préstamo

**Response:**
```json
{
  "prestamoId": 123,
  "penalizacionActual": 25000,
  "penalizacionAlmacenada": 20000,
  "estado": "ATRASADO",
  "informacion": "₡25,000 (5 días × ₡5,000)",
  "constantes": {
    "penalizacionDiaria": 5000,
    "diasGracia": 1
  }
}
```

### POST `/api/penalizaciones/{prestamoId}/actualizar`
Fuerza la actualización de penalización de un préstamo

### POST `/api/penalizaciones/actualizar-todos`
Ejecuta manualmente el job de actualización de todas las penalizaciones

---

## 🧪 CASOS DE PRUEBA

### Caso 1: Préstamo Nuevo (Sin Penalización)
```
Estado: ACTIVO
Días desde vencimiento: 0
Penalización: ₡0
```

### Caso 2: Día de Gracia
```
Estado: ATRASADO
Días desde vencimiento: 1 (día de gracia)
Penalización: ₡0
```

### Caso 3: 5 Días de Atraso
```
Estado: ATRASADO
Días desde vencimiento: 6
Días de penalización: 5 (6 - 1 día de gracia)
Penalización: ₡25,000 (5 × ₡5,000)
```

### Caso 4: Pago Parcial
```
Deuda inicial: ₡100,000 cuota + ₡15,000 penalización
Pago: ₡80,000

Después del pago:
- Cuota: ₡20,000 restantes
- Penalización: ₡15,000 (sin cambio, aún sigue creciendo)
```

### Caso 5: Pago Total + Penalización
```
Deuda inicial: ₡50,000 cuota + ₡30,000 penalización
Pago: ₡80,000

Después del pago:
- Cuota: ₡0 ✅
- Penalización: ₡0 ✅
- Estado: ACTIVO (o PAGADO si no hay más cuotas)
```

---

## 🔧 BASE DE DATOS

### Migración Automática
Hibernate (con `ddl-auto=update`) creará automáticamente la columna:

```sql
ALTER TABLE prestamos 
ADD COLUMN penalizacion_acumulada BIGINT NOT NULL DEFAULT 0;
```

### Actualización Manual (si es necesario)
```sql
UPDATE prestamos 
SET penalizacion_acumulada = 0 
WHERE penalizacion_acumulada IS NULL;
```

---

## 📊 EJEMPLO COMPLETO: Préstamo con 2 Cuotas

```
Inicio: 1 febrero
Cuota 1: ₡50,000 (vence 16 febrero)
Cuota 2: ₡50,000 (vence 3 marzo)

LÍNEA DE TIEMPO:
══════════════════════════════════════════════════

16 FEB: Vence cuota 1
  ↳ Estado: ACTIVO | Penalización: ₡0

17 FEB: Día de gracia
  ↳ Estado: ATRASADO ⚠️ | Penalización: ₡0

18 FEB: Día 1 de penalización
  ↳ Estado: ATRASADO | Penalización: ₡5,000
  
20 FEB: Día 3 de penalización
  ↳ Estado: ATRASADO | Penalización: ₡15,000

25 FEB: Día 8 de penalización
  ↳ Estado: ATRASADO | Penalización: ₡40,000
  
3 MAR: Vence cuota 2 (penalización sigue)
  ↳ Estado: ATRASADO
  ↳ Deuda: ₡50,000 (cuota 1) + ₡50,000 (cuota 2) + ₡75,000 (15 días)
  ↳ Total: ₡175,000

10 MAR: PAGA ₡80,000
  ↳ Cuota 1: ₡50,000 cubierta ✅
  ↳ Cuota 2: ₡30,000 de ₡50,000
  ↳ Penalización: ₡110,000 (sigue creciendo ₡5k/día)
  ↳ Estado: ATRASADO

15 MAR: PAGA ₡140,000
  ↳ Cuota 2: ₡20,000 cubierta ✅
  ↳ Penalización: ₡120,000 cubierta ✅
  ↳ Estado: PAGADO ✅
```

---

## ⚡ NOTAS IMPORTANTES

1. **La penalización NO tiene límite**: Puede crecer indefinidamente
2. **Job automático**: Se ejecuta a las 00:30 AM, pero el cálculo es en tiempo real
3. **Primer día de penalización**: Día 17 (día de vencimiento + 1 día de gracia + 1)
4. **Las cuotas se pagan ANTES que la penalización**: Estrategia para priorizar el capital
5. **La penalización es del PRÉSTAMO, no de cada cuota**: Global y acumulativa

---

## 🎓 FÓRMULA

```
diasDesdeVencimiento = HOY - fechaVencimientoPrimeraCuotaPendiente
diasRetraso = diasDesdeVencimiento - DIAS_GRACIA (1)

SI diasRetraso > 0:
    penalizacion = diasRetraso × PENALIZACION_DIARIA (₡5,000)
    estado = ATRASADO
SINO:
    penalizacion = ₡0
```

---

✅ Sistema implementado y probado correctamente.
