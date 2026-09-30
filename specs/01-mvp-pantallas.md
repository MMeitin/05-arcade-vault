# SPEC 01 — MVP visual: pantallas de Arcade Vault

> **Status:** Approved
> **Depends on:** —
> **Date:** 2026-09-30
> **Objective:** Portar a Next.js las 5 pantallas del prototipo en `references/templates/` (solo UI, datos mock, sin juegos reales).

## Por qué existe esta spec

El prototipo (`references/templates/`) es React + Babel con hash-routing y estado local. Hay que llevarlo a Next.js 16 (App Router, TypeScript, Tailwind v4) manteniendo fidelidad visual. `app/globals.css` ya contiene el tema y las clases `av-*` portadas de `styles.css`, y `app/layout.tsx` ya carga las fuentes y los fondos `av-bg` / `av-noise`.

## Alcance

**Dentro:**

- Pantalla Biblioteca en `/`: hero, búsqueda por título, chips de categoría, grid de tarjetas con tilt 3D, estado vacío "NO HAY RESULTADOS".
- Pantalla Detalle en `/juegos/[id]`: portada, tags, descripción, stats, botones JUGAR AHORA / VOLVER AL VAULT, top 10 de puntuaciones.
- Pantalla Reproductor en `/juegos/[id]/jugar`: HUD (jugador, puntuación, vidas, nivel), PAUSA/REANUDAR, FIN, SALIR, marco CRT con arena decorativa, modal de fin de juego con guardado de puntuación y JUGAR DE NUEVO.
- Pantalla Auth en `/auth`: tabs iniciar sesión / crear cuenta, JUGAR COMO INVITADO, botones Google/GitHub inertes.
- Pantalla Salón de la Fama en `/salon`: tabs por juego, podio top 3, tabla de 12 filas, fila "tu mejor marca" si hay sesión.
- Layout compartido: `Nav` (desktop + panel móvil con hamburguesa), contador "CRÉDITOS · 03" estático y footer.
- Sesión y puntuaciones mock en `localStorage`.
- Datos mock tipados en `lib/data.ts`.
- Reutilizar `app/globals.css`; añadir solo las clases que falten.

**Fuera de alcance (specs futuras):**

- Lógica real de cualquier juego (la arena es decorativa, el puntaje es simulado).
- Autenticación real, OAuth, cookies, server actions.
- Base de datos o API; rankings reales.
- Tests automatizados (no hay runner configurado).
- Internacionalización (solo español).

## Modelo de datos

Tipos en `lib/types.ts`; datos mock en `lib/data.ts` (copiados de `references/templates/data.jsx`).

```ts
export type Category = "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";
export type Accent = "cyan" | "magenta" | "yellow" | "green";

export interface Game {
  id: string; // slug: "bloque-buster", "caida", ...
  title: string;
  short: string;
  long: string;
  cat: Category;
  cover: string; // clase CSS: "cover-bricks", "cover-tetro", ...
  color: Accent;
  best: number;
  plays: string; // "12.4K"
}

export interface ScoreRow {
  rank: number;
  name: string;
  score: number;
  date: string;
} // date "DD/MM/2026"
export interface SessionUser {
  name: string;
} // máx 10 chars, mayúsculas
export interface SavedScore {
  game: string;
  score: number;
  name: string;
  at: number;
}
```

Exports de `lib/data.ts`: `GAMES`, `CATS = ["TODOS", ...Category]`, `PLAYERS`, `seededScores(seed, count)`.

Claves de `localStorage`:

- `av_user`: `SessionUser` serializado o ausente.
- `av_scores`: `SavedScore[]` serializado.

Convenciones:

- Números con `toLocaleString("es-ES")`.
- Leaderboards deterministas: Detalle usa `seededScores(id.length * 17 + 3, 10)`; Salón usa `seededScores(id.length * 23 + 7, 12)`.

## Plan de implementación

1. Crear `lib/types.ts` y `lib/data.ts` con los datos mock. Verificar: `npx tsc --noEmit` pasa.
2. Crear `components/session-provider.tsx` (client, context `useSession`: `user`, `login`, `logout`, `saveScore`). Lee `localStorage` en `useEffect` para evitar mismatch de hidratación.
3. Crear `components/nav.tsx` (client) y `components/footer.tsx`. Integrarlos en `app/layout.tsx` dentro de `SessionProvider`, con `<main className="av-main">`. Verificar: nav visible en `/`, hamburguesa funciona en móvil, link activo correcto.
4. Crear `components/game-card.tsx` (client, tilt 3D) y `components/library.tsx` (client, filtros). Reemplazar `app/page.tsx`. Verificar: búsqueda y chips filtran, estado vacío aparece.
5. Crear `app/juegos/[id]/page.tsx` (Detalle, server component, `notFound()` si el id no existe). Verificar: `/juegos/caida` renderiza, `/juegos/xyz` da 404.
6. Crear `app/auth/page.tsx` + `components/auth-form.tsx` (client). Verificar: login guarda `av_user`, invitado limpia sesión, ambos redirigen a `/`.
7. Crear `app/salon/page.tsx` + `components/hall-of-fame.tsx` (client, tabs). Verificar: cambiar tab cambia podio y tabla; fila "tu mejor marca" solo con sesión.
8. Crear `app/juegos/[id]/jugar/page.tsx` + `components/game-player.tsx` (client). Verificar: puntaje sube, pausa lo detiene, FIN abre modal, guardar escribe `av_scores`.
9. Revisar clases faltantes en `app/globals.css` y ajustar responsive. Verificar: `npm run lint` y `npm run build` pasan.

Antes de escribir código de cada paso: leer la guía relevante en `node_modules/next/dist/docs/` (params async, `LayoutProps`, `PageProps`). UI con skill `/frontend-design`.

## Criterios de aceptación

- [ ] `npm run lint` y `npm run build` terminan sin errores.
- [ ] Las rutas `/`, `/juegos/caida`, `/juegos/caida/jugar`, `/auth` y `/salon` responden y se ven igual al prototipo.
- [ ] `/juegos/inexistente` y `/juegos/inexistente/jugar` muestran 404.
- [ ] Recargar cualquiera de las 5 rutas conserva la pantalla.
- [ ] Sin errores de hidratación ni de consola en ninguna de las 5 pantallas.
- [ ] En Biblioteca, escribir "caí" muestra solo CAÍDA; elegir chip SHOOTER muestra solo INVASORES y ROCAS; una búsqueda sin coincidencias muestra "NO HAY RESULTADOS".
- [ ] Clic en tarjeta o en JUGAR lleva a `/juegos/[id]`; JUGAR AHORA lleva a `/juegos/[id]/jugar`.
- [ ] El Detalle lista 10 filas de puntuación; las 3 primeras tienen clases `top1`, `top2`, `top3`.
- [ ] En el Reproductor el puntaje aumenta cada ~220 ms; PAUSA lo detiene y muestra "EN PAUSA"; REANUDAR lo retoma.
- [ ] FIN abre el modal; el nombre se fuerza a mayúsculas y máx 10 caracteres; GUARDAR PUNTUACIÓN añade una entrada a `av_scores` y muestra "PUNTUACIÓN GUARDADA"; JUGAR DE NUEVO reinicia puntaje, vidas y nivel.
- [ ] En Auth, enviar el formulario con usuario "kai" guarda `av_user = {"name":"KAI"}` y redirige a `/`; sin usuario guarda `PLAYER1`; JUGAR COMO INVITADO elimina `av_user`.
- [ ] Con sesión, el botón del Nav muestra el nombre y al clic cierra sesión; sin sesión muestra "Iniciar Sesión" y lleva a `/auth`.
- [ ] En Salón hay un tab por cada juego (8), el podio muestra 01/02/03 y la tabla 12 filas; la fila "TU MEJOR MARCA" solo aparece con sesión.
- [ ] A 375 px de ancho no hay scroll horizontal y el menú hamburguesa abre y cierra el panel.
- [ ] El link "Biblioteca" del Nav está activo en `/`, en `/juegos/[id]` y en `/juegos/[id]/jugar`.

## Decisiones

- **Sí:** rutas reales del App Router. URLs compartibles y recarga estable; el hash-routing del prototipo no es idiomático en Next.
- **No:** hash-routing del prototipo. Descartado por lo anterior.
- **Sí:** `localStorage` para sesión y puntuaciones (`av_user`, `av_scores`). Es lo que hace el prototipo y no requiere backend.
- **No:** cookies + server actions. Complejidad innecesaria para un MVP visual; irá en otra spec si hay auth real.
- **Sí:** reproductor con simulación del prototipo (puntaje con `setInterval`, pausa, modal). Permite validar el flujo completo de guardado de puntuación.
- **Sí:** reutilizar `app/globals.css` y clases `av-*`. Ya está portado y garantiza fidelidad visual.
- **No:** reescribir estilos como utilidades Tailwind. Más trabajo y riesgo de divergir del template.
- **Sí:** server components por defecto; `"use client"` solo en Nav, Library, GameCard, AuthForm, HallOfFame, GamePlayer y SessionProvider.
- **Sí:** fila "tu mejor marca" del Salón con datos mock derivados como en el prototipo, fecha fija `11/05/2026`.
- **Sí:** contador "CRÉDITOS · 03" estático.

## Riesgos

| Riesgo                                                     | Mitigación                                                                  |
| ---------------------------------------------------------- | --------------------------------------------------------------------------- |
| Mismatch de hidratación al leer `localStorage`             | Leer solo dentro de `useEffect`; render inicial igual a "sin sesión".       |
| `Math.random` en el reproductor rompe SSR                  | Solo se usa dentro de `setInterval` en efecto cliente, nunca en el render.  |
| Cambios de API en Next 16 (params async, tipos globales)   | Leer `node_modules/next/dist/docs/` antes de cada ruta dinámica.            |
| `localStorage` no disponible (modo privado)                | Envolver lecturas/escrituras en `try/catch`; la app funciona sin persistir. |
| Clases del `styles.css` original ausentes en `globals.css` | Paso 9: comparar ambos archivos y portar las que falten.                    |

## Qué **no** está en esta spec

- Juegos jugables reales.
- Autenticación, OAuth, base de datos o API.
- Rankings reales o multijugador.
- Tests automatizados.
- Otros idiomas además del español.

Cada uno, si llega, va en su propia spec.
