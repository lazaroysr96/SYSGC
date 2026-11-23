# Contrato del módulo: Registro TCP + Declaración Jurada

## 1. Objetivo

Que el usuario de SYSGC (PC/Electron) pueda:

1. Registrar, editar y eliminar **ingresos y gastos** por mes y día.
2. Registrar y actualizar **tributos y otros gastos deducibles** por mes.
3. Configurar cada tributo (incluido, auto-cálculo, porcentaje, deducible fijo y cuentas base).
4. Generar e imprimir la **Declaración Jurada (Registro TCP)** con los mismos datos y columnas que la app Android.

La meta no es "una pantalla parecida": es **paridad funcional y compatibilidad de datos** con `GCTCP/android`.

## 2. Criterios de aceptación

### 2.1 Registro de ingresos y gastos

- [ ] Alta con mes, día, importe, cuenta contable (opcional) y nota (opcional).
- [ ] Edición y borrado de movimientos existentes.
- [ ] Persistencia en el ledger local (SQLite/Electron) y en la nube.
- [ ] Recarga de la app, cambio de año y sync sin perder movimientos.
- [ ] Los totales mensuales y anuales se recalculan al instante.

### 2.2 Tributos

- [ ] Registrar los 13 conceptos de Android:
  `ventas`, `fuerza`, `sellos`, `anuncios`, `css20`, `css14`, `cssSubsidio`,
  `otros`, `restauracion`, `arrendamiento`, `exonerado`, `otrosMFP`, `cuotaMensual`.
- [ ] Separar visualmente `TRIBUTO` de `OTRO_DEDUCIBLE`.
- [ ] Configurar por concepto: `incluido`, `autocalcular`, `porcentaje`, `deducibleFijo` y cuentas base.
- [ ] Auto-cálculo con la misma fórmula de Android:
  - base imponible = suma de ingresos y gastos del mes cuyos asientos usan las cuentas base del tributo;
  - base gravable = `max(baseImponible - deducibleFijo, 0)`;
  - monto = `baseGravable * porcentaje / 100`, redondeado a 2 decimales;
  - si `incluido = false` → valor vacío;
  - si `autocalcular = false` → se conserva el valor manual.
- [ ] Recalcular los tributos automáticos al crear/editar/borrar un ingreso o gasto.
- [ ] Recalcular al cambiar la configuración de un tributo o sus cuentas base.
- [ ] Guardar por mes y conservar los valores manuales.

### 2.3 Declaración Jurada

- [ ] Acción "Generar DJ" desde el workspace activo (no desde una página suelta).
- [ ] Incluye: portada/generales + firma, sección INGRESOS, sección GASTOS y sección TRIBUTOS.
- [ ] Columnas de tributos idénticas a Android:
  - `b` ventas, `c` fuerza, `d` sellos, `e` anuncios, `f` css20,
  - `g` = css14 + cssSubsidio (calculado), `h` css14, `i` cssSubsidio, `j` otros,
  - `k` = b+c+d+e+f+g+j (subtotal calculado),
  - `l` restauración, `m` arrendamiento, `n` exonerado, `o` otros MFP, `p` cuota mensual.
- [ ] Fila "Total pagado" con la suma vertical de cada columna.
- [ ] Generación **offline** en PC (sin depender de créditos ni del servidor).

### 2.4 Calidad

- [ ] `npm run lint` y `npm run build` sin errores.
- [ ] Sin `any`; tipos explícitos para payloads, props y estado.
- [ ] Responsive y modo claro/oscuro.
- [ ] Prueba de ida y vuelta con un backup real de Android.

## 3. Fuentes de verdad

### Android (lógica de negocio)

- `data/model/RegistroTCP.kt` — `RegistroTCP`, `DayAmountRow`, `TributoRow`, `TcpPdfPayload`, `PdfGeneralData`, `TributoPdfRow`.
- `data/model/TributoConfig.kt` — `TributoConfig`, `TributoCuentaBase`, claves, categorías y valores por defecto.
- `data/model/WorkspaceProfile.kt` — `CloudWorkspaceEntry`, `CloudLedgerContainer`, `AccountingWorkspaceState`.
- `ui/main/screens/IngresosScreen.kt` y `GastosScreen.kt` — flujo de registro.
- `ui/main/screens/TributosScreen.kt` — edición mensual, configuración y guardado.
- `viewmodel/LedgerViewModel.kt` — `updateTributos` (línea 317), `actualizarTributoConfig` (línea 323).
- `data/repository/LedgerRepository.kt`:
  - `updateTributos` (2443), `updateTributoConfig` (1143),
  - `saveRegistroAplicandoTributos` (828), `applyAutoCalculatedTributos` (2940),
  - `filtrarPorAnio` (1251), construcción del payload PDF (3228).
- `data/pdf/TcpPdfBuilder.kt` — `generateOfflineTcpPdf` (50) y sección de tributos (359).

### Web (primera implementación de UI)

- `/home/yunior/Documentos/GitHub/SYSGD/client/src/gctcp/`
- `/home/yunior/Documentos/GitHub/SYSGD/client/src/accounting/core/types/accountingTypes.ts`

### PC (estado actual)

- `src/gctcp/GC_TCP.tsx`, `src/gctcp/views.tsx`, `src/gctcp/hooks/useEntryRegistry.ts`,
  `src/gctcp/EntryFormDialog.tsx`, `src/gctcp/accountingMath.ts`.
- `src/accounting/core/types/accountingTypes.ts`.
- `src/lib/pdfService.ts` (`generateTcpPdf`, línea 344).
- `src/pages/TcpIncomeExpenseRegisterPage.tsx` (página legada `/tcp-registro2`).

## 4. Estado actual en PC

| Capacidad | Estado | Evidencia |
|---|---|---|
| Alta/edición/borrado de ingresos y gastos | Implementado | `useEntryRegistry.ts`, `EntryFormDialog.tsx`, `GC_TCP.tsx:1103` |
| Persistencia y sync del ledger | Implementado | `SyncManager.ts`, `LocalLedgerRepository.ts`, `RemoteLedgerRepository.ts` |
| Tributos editables por mes | **Falta** | `views.tsx:407` solo muestra totales |
| Configuración de tributos | **Falta** | tipos existen en `accountingTypes.ts:62`, sin uso |
| Auto-cálculo de tributos | **Falta** | no hay equivalente a `applyAutoCalculatedTributos` |
| DJ desde el workspace | **Falta** | no hay acción en `/gctcp`; `generateTcpPdf` está desconectado |
| Multi-año | **Con bug** | `useEntryRegistry` escribe en el año raíz y no actualiza `registrosPorAnio` |
| Página legada `/tcp-registro2` | Existe pero aislada | `TcpIncomeExpenseRegisterPage.tsx` |

## 5. Mapeo de datos Android ↔ TypeScript/JSON

| Android | TypeScript actual | Acción |
|---|---|---|
| `RegistroTCP.generales` | `GeneralesData` | OK; agregar firma opcional para la DJ |
| `RegistroTCP.ingresos/gastos: Map<String, List<DayAmountRow>>` | `MonthEntries` | OK |
| `DayAmountRow.id/dia/importe` | `DayAmountRow` | OK |
| `DayAmountRow.anio` | **No existe** | Agregar o documentar la estrategia de año |
| `RegistroTCP.tributos: List<TributoRow>` | `TributoRow[]` | OK |
| `TributoRow.cssSubsidio` | **No existe** | Agregar (afecta PDF) |
| `TributoConfig.deducibleFijo` | **No existe** | Agregar |
| `TributoKey.cssSubsidio` | **No existe** | Agregar |
| `AccountingWorkspaceState.tributoConfigs` | Existe | OK |
| `AccountingWorkspaceState.tributoCuentaBases` | Existe | OK |
| `TcpPdfPayload` / `PdfGeneralData` | Existen | OK; mapear `TributoRow` → columnas b..p |

### Estrategia de año (decisión pendiente)

Android persiste **mapas planos** y distingue el año con `DayAmountRow.anio` + `filtrarPorAnio`.
PC introdujo `registro.registrosPorAnio` (`accountingTypes.ts:366`), que Android **no conoce**.

Riesgo: Android lee el JSON ignorando `registrosPorAnio` y, al guardar, lo descarta; además
`useEntryRegistry` no actualiza `registrosPorAnio` al agregar un movimiento. Esto puede
provocar pérdida de datos al sincronizar PC ↔ nube ↔ Android.

Recomendación: adoptar el esquema de Android como canónico (mapas planos + `DayAmountRow.anio`).
Si se conserva `registrosPorAnio`, debe ser **derivado y reconstruible**, nunca la única fuente.

## 6. Brechas concretas a resolver

1. **UI de tributos**: reemplazar `TributosView` de solo lectura por una vista editable con selector de mes, lista de conceptos, configuración y guardado.
2. **Hook de tributos**: crear `useTributoRegistry` (o extender `useEntryRegistry`) para:
   - leer/escribir `registro.tributos`;
   - leer/escribir `accounting.tributoConfigs` y `tributoCuentaBases`;
   - aplicar auto-cálculo tras cada cambio.
3. **Auto-cálculo compartido**: extraer una función pura (por ejemplo `applyAutoCalculatedTributos`) reutilizable por web y PC.
4. **Recálculo al editar ingresos/gastos**: `useEntryRegistry.persist` debe recalcular tributos automáticos antes de guardar.
5. **Año**: corregir la escritura para que use el año seleccionado y mantener `registrosPorAnio` sincronizado (o migrar al esquema Android).
6. **DJ**: agregar acción en `ResumenView`/`TributosView` que construya `TcpPdfPayload` desde el workspace activo y llame a `generateTcpPdf` (o al generador offline que se decida).
7. **Firma**: `GeneralesData` no tiene `firmaDia/Mes/Anio`; la DJ los necesita. Agregarlos como opcionales persistidos o capturarlos en el diálogo de generación.
8. **Página legada**: no construir sobre `/tcp-registro2`; dejar `/gctcp` como única UI de trabajo y deprecar la página cuando la DJ esté integrada.

## 7. Plan de implementación

### Fase 0 — Contrato y pruebas de compatibilidad

- [x] Documento de contrato (este archivo).
- [ ] Backup de Android de prueba y script de comparación de `registro` (incluyendo `cssSubsidio` y `anio`).
- [ ] Definir el esquema canónico de año.

### Fase 1 — Web (obligatorio por AGENTS.md)

1. Alinear tipos en `client/src/accounting/core/types/accountingTypes.ts`.
2. Implementar `useTributoRegistry` + utilidad de auto-cálculo.
3. Hacer editable `TributosView` y agregar diálogo de configuración.
4. Integrar recálculo en el registro de ingresos/gastos.
5. Integrar generación de DJ desde el workspace.
6. Corregir la escritura por año.

### Fase 2 — Portar a PC

- Copiar los archivos compartidos de `src/gctcp` y `src/accounting/core`.
- Adaptar persistencia Electron/SQLite si aplica.
- Verificar que el JSON guardado sea idéntico al de Android.

### Fase 3 — Verificación

- Pruebas unitarias de la fórmula de auto-cálculo.
- Pruebas de integración de alta/edición/borrado + recarga.
- Prueba de ida y vuelta PC → Android → PC.
- Comparación visual de la DJ con el PDF de Android.

## 8. Casos de prueba mínimos

1. **Ventas 10%**: un ingreso de 1 000 CUP vinculado a la cuenta de ventas → tributo `ventas` = 100.00.
2. **Fuerza 5%**: gasto de 2 000 CUP vinculado a la cuenta base → `fuerza` = 100.00.
3. **CSS 20% / 12.5% / 1.5%**: verificar cada porcentaje por separado.
4. **Cuota mensual 5% con deducible fijo 3260**: base 10 000 → base gravable 6 740 → monto 337.00.
5. **Manual**: `autocalcular = false` conserva el valor escrito.
6. **No incluido**: el valor queda vacío aunque haya base.
7. **Edición de ingreso**: cambia el monto y el tributo automático se recalcula.
8. **Borrado de ingreso**: el tributo automático vuelve a 0 o se vacía.
9. **Cambio de año**: los movimientos del año A no aparecen en el año B y viceversa.
10. **Sync**: PC → nube → Android → nube → PC sin pérdida de `cssSubsidio`, `anio` ni valores manuales.
11. **DJ**: los totales del PDF coinciden con los de la UI.

## 9. Decisiones abiertas

1. **Esquema de año**: ¿adoptar mapas planos + `DayAmountRow.anio` (recomendado) o mantener `registrosPorAnio` con migración y riesgo de compatibilidad?
2. **Web-first**: ¿se implementa primero en SYSGD y se porta, o se autoriza una excepción para PC?
3. **Firma de la DJ**: ¿persistir `firmaDia/Mes/Anio` en `GeneralesData` o capturarlos solo al generar el PDF?
4. **Generación de PDF**: ¿reutilizar `generateTcpPdf` (pdfmake) o portar `TcpPdfBuilder` (iText) para paridad exacta?
5. **Créditos**: la DJ en PC debe ser offline; confirmar que no se usará el endpoint con billing.

## 10. Definición de "terminado"

El módulo se considera terminado cuando:

- los criterios de la sección 2 están todos marcados;
- la prueba de ida y vuelta con Android pasa sin diferencias;
- la DJ generada en PC coincide en campos y totales con la de Android;
- `npm run lint` y `npm run build` pasan;
- no se agregó una tercera implementación del registro.
