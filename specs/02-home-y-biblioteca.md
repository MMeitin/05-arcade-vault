# SPEC 02 — Home (Inicio) y Biblioteca en ruta propia

> **Status:** Implementado
> **Depends on:** SPEC 01
> **Date:** 2026-10-06
> **Objective:** Añadir la landing "Inicio" en `/` portada de `references/templates/home-about/` y mover la Biblioteca a `/biblioteca`.

## Por qué existe esta spec

Hoy `/` abre directamente la Biblioteca. El prototipo `references/templates/home-about/` define una landing (`home.jsx`) como pantalla de entrada y deja la Biblioteca como pestaña aparte. Hay que portar la landing y reubicar la Biblioteca, actualizando todos los enlaces que apuntaban a `/` como "biblioteca". La pestaña "Acerca de" (`about.jsx`) queda fuera: va en otra spec.

## Alcance

**Dentro:**

- Pantalla Home en `/`, con las secciones de `home.jsx`:
  - Hero: eyebrow "INSERTA UNA MONEDA\_", título en 3 líneas, subtítulo, CTAs EXPLORAR JUEGOS (→ `/biblioteca`) y CREAR CUENTA (→ `/auth`), indicador "DESLIZA", 8 siluetas pixel flotantes.
  - `// 01` ¿POR QUÉ ARCADE VAULT?: 4 feature cards con icono pixel (GAMEPAD, FREE, TROPHY, ROCKET).
  - `// 02` JUEGOS DISPONIBLES AHORA: rail de 6 mini-cards (`GAMES.slice(0, 6)`) → `/juegos/[id]`, botón VER TODOS LOS JUEGOS → `/biblioteca`.
  - Stats: 3 bloques (12+ JUEGOS, MILES DE PARTIDAS, GLOBAL RANKING).
  - `// 03` ACTIVIDAD EN VIVO: ticker de 7 últimas puntuaciones + top 5 jugadores del día con barras; link VER SALÓN → `/salon`.
  - `// 04` PRECIOS: plan único $0, lista de 6 ventajas, EMPEZAR GRATIS → `/auth`, 3 FAQ.
  - CTA final INSERTAR MONEDA → `/biblioteca`.
- Animación `reveal` al entrar en viewport (IntersectionObserver), respetando `prefers-reduced-motion`.
- Mover la Biblioteca (hero, búsqueda, chips, grid) a `/biblioteca`, sin cambios de comportamiento.
- Nav: añadir "Inicio" (→ `/`); "Biblioteca" pasa a `/biblioteca`; logo sigue yendo a `/`. Aplica a desktop y panel móvil.
- Actualizar enlaces que usaban `/` como Biblioteca: botón VOLVER AL VAULT del Detalle, VOLVER AL VAULT del Reproductor, VOLVER A LA BIBLIOTECA del Salón.
- Portar a `app/globals.css` las clases de la landing que falten (`home-*`, `reveal`, `silo`, `feature-*`, `mini-*`, `stat-*`, `activity-*`, `tick-*`, `top-*`, `pricing-*`, `price-*`, `faq-*`, `final-*`) desde `references/templates/home-about/styles.css`.
- Datos mock de Home tipados en `lib/data.ts`.

**Fuera de alcance (specs futuras):**

- Pestaña / ruta "Acerca de" y su enlace en el Nav (el Nav no muestra "Acerca de" hasta esa spec).
- Datos reales o en vivo en ticker, top jugadores y stats (son constantes mock).
- Autenticación real, base de datos, API.
- Cambios en Detalle, Reproductor, Auth o Salón más allá de los enlaces indicados.
- Tests automatizados (no hay runner configurado).

## Modelo de datos

Tipos en `lib/types.ts`; constantes en `lib/data.ts` (copiadas de `home.jsx`).

```ts
export interface Feature {
  icon: "GAMEPAD" | "FREE" | "TROPHY" | "ROCKET";
  title: string;
  desc: string;
  color: Accent;
}
export interface HomeStat {
  n: string;
  unit: string;
  sub: string;
}
export interface RecentScore {
  player: string;
  game: string;
  score: number;
  when: string; // "hace 2 min"
  color: Accent;
}
export interface TopPlayer {
  rank: number;
  player: string;
  score: number;
}
export interface FaqItem {
  q: string;
  a: string;
}
```

Exports nuevos de `lib/data.ts`: `FEATURES` (4), `HOME_STATS` (3), `RECENT_SCORES` (7), `TOP_PLAYERS` (5), `PRICING_PERKS` (6 strings), `FAQ` (3).

Persistencia: no cambia (`av_user`, `av_scores` igual que en SPEC 01).

## Rutas resultantes

| Ruta                 | Pantalla         | Cambio                       |
| -------------------- | ---------------- | ---------------------------- |
| `/`                  | Home (nueva)     | antes: Biblioteca            |
| `/biblioteca`        | Biblioteca       | nueva ruta                   |
| `/juegos/[id]`       | Detalle          | solo enlace de vuelta        |
| `/juegos/[id]/jugar` | Reproductor      | solo enlace de vuelta        |
| `/salon`             | Salón de la Fama | solo enlace de vuelta        |
| `/auth`              | Auth             | sin cambios (redirige a `/`) |

## Plan de implementación

1. Crear `app/biblioteca/page.tsx` con `<Library />` y metadata propia; cambiar `app/page.tsx` a un placeholder mínimo temporal. Verificar: `/biblioteca` muestra la Biblioteca y filtra igual que antes.
2. Actualizar `components/nav.tsx`: añadir "Inicio" (`/`) en desktop y panel móvil; "Biblioteca" → `/biblioteca`. Activo: Inicio solo en `pathname === "/"`; Biblioteca en `/biblioteca` y `/juegos*`. Verificar: link activo correcto en cada ruta.
3. Actualizar enlaces de vuelta a `/biblioteca` en `app/juegos/[id]/page.tsx`, `components/game-player.tsx` y `components/hall-of-fame.tsx`. Verificar: los tres botones llevan a `/biblioteca`.
4. Añadir tipos y constantes de Home en `lib/types.ts` y `lib/data.ts`. Verificar: `npx tsc --noEmit` pasa.
5. Portar a `app/globals.css` las clases de landing que falten (comparar con `references/templates/home-about/styles.css`). Verificar: no hay clases `home-*`/`reveal` sin definir.
6. Crear `components/home/reveal.tsx` (client: wrapper que añade `.in` vía IntersectionObserver; sin JS o con `prefers-reduced-motion` el contenido es visible), `components/home/silhouettes.tsx` y `components/home/feature-icon.tsx` (server, SVG). Verificar: siluetas e iconos renderizan.
7. Crear `components/home/mini-card.tsx` (server, `Link` a `/juegos/[id]`) y `components/home/home-page.tsx` (server) con todas las secciones, usando `Link` en lugar de `navigate`. Reemplazar `app/page.tsx`. Verificar: `/` renderiza las 6 secciones y todos los CTAs navegan.
8. Revisar responsive a 375 px (rails, grids, pricing). Verificar: sin scroll horizontal; `npm run lint` y `npm run build` pasan.

Antes de escribir código de cada paso: leer la guía relevante en `node_modules/next/dist/docs/`. UI con skill `/frontend-design`.

## Criterios de aceptación

- [ ] `npm run lint` y `npm run build` terminan sin errores.
- [ ] `/` muestra la Home y `/biblioteca` la Biblioteca; recargar cualquiera conserva la pantalla.
- [ ] La Home contiene las secciones: hero, `// 01`, `// 02`, stats, `// 03`, `// 04` y CTA final, en ese orden.
- [ ] El hero muestra 8 siluetas flotantes y el título en 3 líneas (EL ARCADE / CLÁSICO ESTÁ / DE VUELTA).
- [ ] Hay 4 feature cards, 6 mini-cards (los 6 primeros de `GAMES`), 7 filas en el ticker y 5 en el top de jugadores.
- [ ] Las 3 primeras filas del top tienen clases `top1`, `top2`, `top3`; las puntuaciones usan `toLocaleString("es-ES")`.
- [ ] EXPLORAR JUEGOS, VER TODOS LOS JUEGOS e INSERTAR MONEDA llevan a `/biblioteca`; CREAR CUENTA y EMPEZAR GRATIS a `/auth`; VER SALÓN a `/salon`; cada mini-card a `/juegos/[id]`.
- [ ] Las secciones con `reveal` reciben la clase `in` al entrar en viewport; con `prefers-reduced-motion` son visibles sin animación.
- [ ] El Nav (desktop y móvil) muestra Inicio, Biblioteca y Salón de la Fama, y **no** muestra "Acerca de".
- [ ] "Inicio" está activo solo en `/`; "Biblioteca" en `/biblioteca`, `/juegos/[id]` y `/juegos/[id]/jugar`; el logo lleva a `/`.
- [ ] VOLVER AL VAULT (Detalle y Reproductor) y VOLVER A LA BIBLIOTECA (Salón) llevan a `/biblioteca`.
- [ ] La Biblioteca en `/biblioteca` conserva búsqueda, chips y estado "NO HAY RESULTADOS" de SPEC 01.
- [ ] Sin errores de hidratación ni de consola en `/` y `/biblioteca`.
- [ ] A 375 px de ancho no hay scroll horizontal en `/`.
- [ ] No existe la ruta `/about` (404).

## Decisiones

- **Sí:** Biblioteca en `/biblioteca`. Ruta en español, coherente con `/salon` y `/juegos`.
- **No:** `/juegos` como índice. Se confundiría con `/juegos/[id]`.
- **Sí:** Home en `/`. Es la landing de entrada, como en el prototipo.
- **Sí:** omitir el link "Acerca de" del Nav hasta su spec. Evita enlaces rotos o inertes.
- **Sí:** constantes mock en `lib/data.ts` copiadas del prototipo. Fidelidad visual sin lógica nueva.
- **No:** derivar ticker/top/stats de `GAMES`/`PLAYERS`. Se desvía del prototipo y añade lógica sin valor.
- **Sí:** Home como server component; `"use client"` solo en el wrapper `Reveal`. Menos JS al cliente.
- **Sí:** `Link` de Next en lugar de `navigate({ name })` del prototipo (rutas reales, ver SPEC 01).
- **Sí:** el redirect de Auth tras login/invitado sigue siendo `/` (ahora Home). Se acepta; revisable si se prefiere `/biblioteca`.
- **Sí:** reutilizar clases CSS del template en `globals.css`, igual que en SPEC 01.

## Riesgos

| Riesgo                                                          | Mitigación                                                                        |
| --------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Enlaces a `/` olvidados que debían ir a Biblioteca              | Paso 3 + `grep` de `href="/"` y `push("/")` antes de cerrar; criterios lo cubren. |
| `reveal` deja contenido invisible si falla el observer / sin JS | Wrapper cliente solo oculta tras montar; `prefers-reduced-motion` muestra todo.   |
| Colisión de clases `home-*` / `.top1` con las existentes        | Paso 5: comparar con `globals.css` antes de portar; no duplicar reglas.           |
| Inconsistencia de nombres de Nav (Inicio vs logo)               | Ambos a `/`; criterio de link activo explícito.                                   |
| `styles.css` de home-about difiere del actual en otras clases   | Portar solo las de landing; no sobrescribir las de SPEC 01.                       |

## Qué **no** está en esta spec

- Pestaña / ruta "Acerca de".
- Datos reales en Home (actividad, rankings, stats).
- Auth real, base de datos o API.
- Juegos jugables reales.
- Tests automatizados.

Cada uno, si llega, va en su propia spec.
