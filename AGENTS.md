# AGENTS.md - Reglas para IA (Frontend)

Este archivo define el estándar obligatorio para cualquier IA que modifique `client/react-frontend`.

## 1) Red y servidor

- Usa siempre `@/lib/api` para llamadas HTTP.
- No uses `fetch` ni instancias de `axios` creadas ad hoc en componentes/hooks.
- Centraliza headers, baseURL, auth y manejo de errores en la capa API.

Excepción:
- Solo se permite otra estrategia si existe una limitación técnica real. Debe quedar documentada en el PR/comentario técnico.

## 2) TypeScript

- `any` está prohibido.
- Define tipos e interfaces para props, respuestas de API, estado y callbacks.
- Prefiere `unknown` + validación/transformación antes que perder tipado.
- Evita castings inseguros (`as`) sin justificación.

## 3) UI y UX

- Todo componente debe ser responsive (móvil, tablet y escritorio).
- Todo componente debe funcionar en modo claro y oscuro.
- Evita que el contenido se rompa en móvil:
  - Texto largo: wrap.
  - Tablas/código/bloques anchos: `overflow-x-auto` en el elemento interno, no en toda la tarjeta/contenedor.

## 4) React y arquitectura

- Mantén componentes pequeños y reutilizables.
- Extrae lógica compleja a hooks/utilidades.
- Evita duplicación; crea componentes compartidos cuando haya 2+ usos reales.
- Mantén consistencia con aliases del proyecto (`@/...`).

## 5) Calidad mínima antes de cerrar cambios

Ejecuta, cuando aplique:

- `npm run lint`
- `npm run build`

Si no puedes ejecutar alguno, indícalo explícitamente y explica por qué.

## 6) Regla de oro

Si una decisión mejora velocidad pero rompe tipado, consistencia o UX móvil, **no se acepta**.

## 7) Relación con los otros proyectos (GC-TCP)

Este repositorio (SYSGC) es la **versión de escritorio (PC/Electron)** del ecosistema GC-TCP.

- **Versión Android** (`/home/yunior/Documentos/GitHub/GCTCP/`): es la **fuente de verdad de la lógica de negocio**. Este proyecto debe mantenerse **compatible con su base de datos** (mismo esquema de ledger/workspaces); ningún cambio aquí puede romper esa compatibilidad.
- **Versión web** (`/home/yunior/Documentos/GitHub/SYSGD/client/src/gctcp/`): es el **origen del código de la UI de trabajo**. La versión web y la de PC **comparten la misma UI de trabajo**; solo difieren en la persistencia:
  - PC: guarda en **nube y en local** (SQLite vía Electron).
  - Web: guarda en **nube o en storage local del navegador**.
- **Cualquier cambio en lógica de negocio o UI se aplica primero en la versión web** y luego se porta aquí. La **lógica de inicio de sesión sí difiere** entre versiones (cada una tiene su propio flujo de entrada).
- La versión PC debe tener **las mismas capacidades que la web y más** (offline total, respaldo local, vínculo por LAN, sincronización), nunca menos.
