# SPEC 05 — Juego ROCAS (Asteroids) integrado en el reproductor

> **Status:** Aprobado
> **Depends on:** SPEC 01, SPEC 02
> **Date:** 2026-10-07
> **Objective:** Portar el Asteroids de `references/templates/started-games/02-asteroids` a un motor TypeScript con canvas en React y montarlo en `/juegos/rocas/jugar` como primer juego real, con puntuación, vidas y nivel reflejados en el HUD de la plataforma y el fin de partida conectado al modal de guardado existente.

## Por qué existe esta spec

El reproductor (`components/game-player.tsx`, SPEC 01) es una simulación: suma puntos aleatorios sobre una arena falsa. El catálogo ya incluye "ROCAS" (`id: "rocas"`, SPEC 02) y existe una implementación real de Asteroids en JavaScript plano (`game.js`, 510 líneas, globals y `document.getElementById`). Esta spec convierte ese juego en el primero que realmente se juega en la plataforma y deja el patrón para los siguientes (Tetris, Arkanoid).

## Alcance

**Dentro:**

- Motor del juego en `lib/games/asteroids/engine.ts`: port a TypeScript de `game.js` sin globals ni acceso al DOM salvo el `canvas` recibido. Clases `Bullet`, `Asteroid`, `PowerUp`, `Ship`, `Particle` y la lógica de `update`/`draw`, con las mismas constantes de física, puntos (20/50/100), 3 vidas, invencibilidad de 3 s al reaparecer, power-up 3x (disparo triple, 5 s, 15 % de drop o garantizado a la 5.ª destrucción), niveles (`3 + level` asteroides) y colisiones (nave con `radius * 0.82`).
- API del motor: `createAsteroids(canvas, callbacks) → { setPaused(paused), destroy() }`. Callbacks: `onScore(score)`, `onLives(lives)`, `onLevel(level)`, `onGameOver(score)`, `onAutoPause()`. Emite los valores iniciales al arrancar.
- Componente cliente `components/games/asteroids-canvas.tsx`: monta el canvas, crea/destruye el motor en `useEffect`, propaga `paused`.
- Registro `components/games/registry.ts`: `GAME_CANVASES: Record<string, ComponentType<GameCanvasProps>>` con una sola entrada `rocas`.
- `components/game-player.tsx`: si `GAME_CANVASES[game.id]` existe, renderiza ese canvas en `.crt-screen` en lugar de la arena falsa, apaga el ticker de puntos aleatorios y toma `score`, `lives` y `level` del motor. Los otros 6 juegos mantienen exactamente el comportamiento actual.
- HUD de la plataforma como única fuente de verdad (Jugador, Puntuación, Vidas, Nivel, PAUSA/REANUDAR, FIN, SALIR). Se eliminan del canvas los textos `SCORE`, `NIVEL` y los iconos de vida; se conserva en canvas el contador del power-up (`3x 4.2s`).
- Fin de partida: al llegar a 0 vidas el motor llama `onGameOver(score)` y se abre el modal FIN DEL JUEGO existente (guardar en `av_scores`, JUGAR DE NUEVO, VOLVER AL VAULT). Se elimina el overlay `GAME OVER / ESPACIO PARA REINICIAR` del canvas. El botón FIN termina la partida con la puntuación actual. JUGAR DE NUEVO remonta el canvas (`key`) con estado limpio.
- Estilo neón con la paleta de la plataforma: trazos vectoriales con `shadowBlur`; nave `--cyan`, asteroides `--ink`, balas `--ink`, power-up `--yellow`, partículas `--magenta`, llama del propulsor `--yellow`. Los colores se leen con `getComputedStyle(canvas)` al crear el motor, con fallback hex. Fondo transparente (`clearRect`) sobre el `#000` de `.crt-screen`.
- Tamaño: lógica fija 800×600 (física intacta), canvas con `width/height: 100%` dentro de `.crt-screen` (4:3) y buffer escalado por `devicePixelRatio` para nitidez.
- Entrada solo teclado: `←` `→` rotar, `↑` propulsar, `Espacio` disparar. `preventDefault` solo sobre esas teclas mientras la partida corre y el foco no está en un campo editable (el modal tiene un `input`). Listeners retirados en `destroy()`.
- Auto-pausa al perder foco (`window.blur`, `document.visibilitychange` oculto): el motor llama `onAutoPause()` y el reproductor pone `paused = true`.
- Accesibilidad mínima: `aria-label="Juego ROCAS"` en el canvas.
- `lib/data.ts`: corregir la descripción larga de ROCAS (quitar la frase de OVNIs, que no existe en el juego) y mencionar el módulo 3x.
- Tipo `GameCanvasProps` en `lib/types.ts`.

**Fuera de alcance (specs futuras):**

- Controles táctiles / móvil (el canvas escala a 375 px pero solo se juega con teclado).
- OVNIs, hiperespacio, sonido, música, high score persistente dentro del juego.
- Migrar los demás juegos del catálogo (Tetris, Arkanoid, etc.).
- Guardar puntuaciones en Supabase o alimentar `best`/`plays` del catálogo con datos reales (siguen mock).
- Cambios en Nav, Home, Biblioteca, Detalle, Salón, Auth o Acerca.
- Que el Salón lea `av_scores` (hoy usa solo datos mock; va en una spec propia).
- Tests automatizados (no hay runner configurado).

## Modelo de datos

Sin persistencia nueva: se reutiliza `saveScore({ game: "rocas", score, name })` y la clave `av_scores` de SPEC 01. El motor no guarda nada.

Tipos nuevos en `lib/types.ts`:

```ts
export interface GameCanvasProps {
  paused: boolean; // el reproductor manda; el motor se congela si true
  onScore: (score: number) => void;
  onLives: (lives: number) => void;
  onLevel: (level: number) => void;
  onGameOver: (finalScore: number) => void; // una sola vez por partida
  onAutoPause: () => void; // pérdida de foco / pestaña oculta
}
```

Superficie del motor (`lib/games/asteroids/engine.ts`):

```ts
export type AsteroidsCallbacks = Omit<GameCanvasProps, "paused">;
export interface AsteroidsHandle {
  setPaused: (paused: boolean) => void;
  destroy: () => void;
}
export const createAsteroids: (
  canvas: HTMLCanvasElement,
  callbacks: AsteroidsCallbacks,
) => AsteroidsHandle;
```

Máquina de estados interna (igual que el original): `playing → dead (2 s) → playing`, o `playing → gameover`. En `gameover` el motor deja de aceptar entrada, sigue animando partículas y no reinicia solo.

## Rutas resultantes

| Ruta                  | Pantalla          | Cambio                                             |
| --------------------- | ----------------- | -------------------------------------------------- |
| `/juegos/rocas/jugar` | Reproductor ROCAS | juego real; el resto de `/juegos/[id]/jugar` igual |

## Plan de implementación

1. Crear `lib/games/asteroids/engine.ts`: port a TS estricto de `game.js` (clases, constantes, `update`, colisiones, spawn, niveles) con `createAsteroids(canvas, callbacks)`, entrada con listeners propios (`keys`/`justPressed` en cierre), bucle `requestAnimationFrame` con `dt` máx. 50 ms, `setPaused`, `destroy` (cancela rAF y retira listeners) y los callbacks. Sin HUD de texto salvo el contador 3x. Verificar: `npx tsc --noEmit` pasa; sin referencias a `document`/`window` fuera de `createAsteroids`.
2. Añadir estilo neón al `draw`: lectura de variables CSS con fallback, `shadowBlur`, `clearRect`, escalado por `devicePixelRatio` (setear `canvas.width/height` y `ctx.setTransform`). Verificar: `tsc` pasa.
3. Añadir `GameCanvasProps` a `lib/types.ts` y crear `components/games/asteroids-canvas.tsx` (cliente: ref al canvas, `useEffect` que crea y destruye el motor con callbacks estables vía ref, segundo efecto para `paused`) y `components/games/registry.ts`. Verificar: `tsc` y `npm run lint` pasan; el montaje doble de React StrictMode no deja dos bucles.
4. Modificar `components/game-player.tsx`: elegir `Canvas = GAME_CANVASES[game.id]`; con canvas real, `score/lives/level` provienen de los callbacks, el ticker aleatorio no corre, la arena falsa no se renderiza, `onGameOver` abre el modal, `onAutoPause` pausa, `paused || over` se pasa al canvas y `restart` incrementa un `runId` usado como `key`. Sin canvas real, comportamiento idéntico al actual. Verificar: `/juegos/caida/jugar` sigue mostrando la simulación; `/juegos/rocas/jugar` muestra el canvas.
5. Actualizar `lib/data.ts` (descripción larga de ROCAS). Verificar: el detalle `/juegos/rocas` muestra el texto nuevo.
6. Verificación manual en navegador (Playwright MCP o a mano): jugar, pausar, perder foco, FIN, perder las 3 vidas, guardar puntuación, JUGAR DE NUEVO. Verificar: criterios de aceptación.
7. Revisar responsive a 375 px, consola y `npm run lint` + `npm run build`. Verificar: sin scroll horizontal, sin errores.

Antes de escribir código de cada paso: leer en `node_modules/next/dist/docs/` la guía de Client Components y la de `next/dynamic`/lazy loading si se usa. UI con skill `/frontend-design` (el paso 2 y los ajustes del reproductor).

## Criterios de aceptación

- [ ] `npm run lint` y `npm run build` terminan sin errores.
- [ ] Existen `lib/games/asteroids/engine.ts`, `components/games/asteroids-canvas.tsx` y `components/games/registry.ts`; no hay `game.js` ni `index.html` copiados a `app/` o `public/`.
- [ ] `/juegos/rocas/jugar` muestra un canvas funcional dentro del CRT, sin la arena falsa ni puntos aleatorios.
- [ ] `←` `→` rotan, `↑` propulsa con inercia, `Espacio` dispara (cadencia 0,2 s); los bordes envuelven (toroidal); la página no hace scroll al pulsar `↑`/`Espacio`.
- [ ] Destruir asteroides grande/mediano/pequeño suma 20/50/100 y los parte en dos de tamaño menor (los pequeños no se parten); la Puntuación del HUD se actualiza.
- [ ] Chocar con un asteroide resta una vida (Vidas del HUD), reaparece a los 2 s en el centro con 3 s de invencibilidad parpadeante.
- [ ] Al limpiar todos los asteroides sube el Nivel del HUD y aparecen `3 + nivel` asteroides.
- [ ] El módulo 3x aparece, se recoge, activa disparo triple 5 s y el canvas muestra el contador `3x N.Ns`.
- [ ] PAUSA congela el juego sin perder estado y REANUDAR continúa; cambiar de pestaña o perder el foco pausa automáticamente.
- [ ] Con 0 vidas se abre el modal FIN DEL JUEGO con la puntuación final; GUARDAR PUNTUACIÓN la escribe en `av_scores` con `game: "rocas"`.
- [ ] El botón FIN abre el modal con la puntuación actual y detiene el juego; JUGAR DE NUEVO arranca una partida limpia (puntos 0, vidas 3, nivel 1) sin bucles duplicados.
- [ ] Escribir en el input del modal (incluida la barra espaciadora) no dispara ni es bloqueado por el juego.
- [ ] Colores neón de la plataforma (nave cian, power-up amarillo, partículas magenta) sobre fondo negro del CRT.
- [ ] Tras salir (SALIR) o desmontar, no quedan listeners ni `requestAnimationFrame` activos (sin errores ni fugas al navegar de ida y vuelta).
- [ ] Los otros juegos (`/juegos/caida/jugar`, etc.) se comportan exactamente como antes.
- [ ] La descripción de ROCAS ya no menciona OVNIs.
- [ ] A 375 px no hay scroll horizontal y el canvas escala conservando 4:3.
- [ ] Sin errores de hidratación ni de consola en `/juegos/rocas/jugar`.

## Decisiones

- **Sí:** motor TS puro + componente canvas. Separa lógica de React, se destruye limpio y es reutilizable como patrón para el siguiente juego.
- **No:** un único componente con `game.js` pegado. Mezcla 500 líneas de lógica con React y deja globals en el módulo.
- **No:** `<iframe>` al `index.html` original. No integra puntuación, pausa ni modal; no es "adaptar a Next.js".
- **Sí:** HUD de la plataforma como única fuente de verdad. Evita dos puntuaciones y reutiliza el diseño de SPEC 01.
- **Sí:** reutilizar el modal FIN DEL JUEGO y `av_scores`. Sin lógica duplicada; el Salón recibe las partidas reales.
- **Sí:** estilo neón con la paleta de la plataforma y `shadowBlur`. Coherencia visual con el CRT; la geometría y la física no cambian.
- **No:** blanco sobre negro fiel al original. Quedaría desentonando con el resto del Vault.
- **Sí:** lógica 800×600 fija + escalado CSS y `devicePixelRatio`. Conserva la sensación de juego y funciona en pantallas pequeñas.
- **Sí:** registro `id → componente` con una entrada. Coste mínimo ahora, el próximo juego es una línea; los 6 juegos mock siguen intactos.
- **No:** tocar `best`/`plays` del catálogo. Son datos mock hasta que exista backend de puntuaciones.
- **Sí:** corregir solo la descripción larga de ROCAS. El texto prometía OVNIs inexistentes.
- **Sí:** solo teclado y auto-pausa al perder foco. Los controles táctiles van en su propia spec.
- **Sí:** dos colores de partículas/llama distintos del original. Cambio solo estético; no altera mecánicas.

## Riesgos

| Riesgo                                                                | Mitigación                                                                                           |
| --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| React StrictMode monta dos veces y duplica el bucle                   | `destroy()` cancela rAF y retira listeners; criterio y verificación en el paso 3.                    |
| `keydown` global bloquea la escritura del input del modal             | Ignorar y no hacer `preventDefault` si el objetivo es editable o el juego está pausado/terminado.    |
| Callbacks al estado de React en cada frame provocan renders excesivos | Emitir solo cuando el valor cambia; el motor no depende del estado de React.                         |
| Closures obsoletas de callbacks en el motor                           | Pasar callbacks vía ref y leerlos al invocar.                                                        |
| `getComputedStyle` en SSR                                             | El motor solo se crea en `useEffect` (cliente), con fallback hex si la variable falta.               |
| Canvas borroso o mal escalado en pantallas HiDPI                      | Buffer × `devicePixelRatio` y `ctx.setTransform`; verificar a 375 px y en pantalla de alta densidad. |
| `dt` enorme al volver de pestaña inactiva                             | Se mantiene el tope de 50 ms y la auto-pausa por foco.                                               |
| Refactor de `game-player.tsx` rompe los 6 juegos mock                 | Rama condicional por `GAME_CANVASES[game.id]`; criterio de regresión explícito.                      |
| Reglas ESLint de hooks (efectos con estado) fallan el lint            | Verificar `npm run lint` en cada paso; callbacks por ref en lugar de `setState` síncrono en efecto.  |

## Qué **no** está en esta spec

- Controles táctiles o gamepad.
- OVNIs, hiperespacio, sonido o música.
- Migración de Tetris, Arkanoid u otros juegos.
- Puntuaciones o ranking en base de datos; datos reales de `best`/`plays`.
- Cambios de Auth, Nav, Home, Biblioteca, Salón o Acerca.
- Tests automatizados.

Cada uno, si llega, va en su propia spec.
