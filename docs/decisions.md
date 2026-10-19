# Decisiones técnicas duraderas

## ADR-001 — GitHub como memoria compartida
**Fecha:** 2026-10-18. **Estado:** adoptada.

**Decisión:** los Issues describen tareas; los PR contienen diff, pruebas, revisiones y traspaso; los commits fijan la versión. Los chats no comparten automáticamente memoria.

## ADR-002 — Experiencia principal: ChatGPT Chat + Claude Chat
**Fecha:** 2026-10-18. **Estado:** adoptada.

**Decisión:** `AGENTS.md` conserva reglas comunes que se consultan bajo demanda. `CHATGPT.md` y `CLAUDE.md` documentan cómo iniciar el trabajo en cada chat. El usuario **no necesita Codex CLI**. No asumir que los archivos del repositorio se cargan solos en las conversaciones web.

## ADR-003 — Revisión cruzada controlada
**Fecha:** 2026-10-18. **Estado:** adoptada.

**Decisión:** ChatGPT propone/implementa con los permisos GitHub disponibles, Claude Chat revisa de forma independiente al aportarle el diff y contexto. CI confirma pruebas; la persona propietaria autoriza la integración. El intercambio entre los dos chats no es automático.

## ADR-004 — Skills portables, sin instalaciones implícitas
**Fecha:** 2026-10-18. **Estado:** adoptada.

**Decisión:** se conserva una skill opcional `coordinating-chatgpt-claude` para entornos capaces de descubrirla. No se requiere ni se ejecuta un instalador de Codex. Los plugins de ChatGPT y la integración GitHub de Claude necesitan acciones de conexión por separado.

## ADR-005 — Calculadora primero y tipografías propias
**Fecha:** 2026-10-18. **Estado:** adoptada (V2.11), sustituye el orden de V2.5.

**Contexto:** con el monitor primero, la primera pantalla mostraba casi siempre datos escasos o desactualizados (respuestas 403, horas sin muestras) y el resultado de la calculadora quedaba a más de dos pantallas en móvil.

**Decisión:** la calculadora es la primera sección y el `h1`; el monitor conserva una franja de estado visible sobre ella y su tarjeta completa después. Las tipografías se sirven desde `fonts/` (SIL OFL 1.1) para no transferir la IP del visitante a Google Fonts ni depender de un tercero en la carga.

**Consecuencias:** se actualizan las pruebas de orden; la franja nunca afirma disponibilidad sin corroboración y reutiliza los mismos estados del monitor.
