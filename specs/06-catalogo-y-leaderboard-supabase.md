# SPEC 06 — Catálogo de juegos y Leaderboard en Supabase

> **Status:** Implementado
> **Depends on:** SPEC 01, SPEC 02, SPEC 04, SPEC 05
> **Date:** 2026-10-07
> **Objective:** Mover el catálogo de juegos (`GAMES`) y las puntuaciones a tablas de Supabase, de modo que el Salón de la Fama muestre el ranking real por juego y la Biblioteca, la Home y el Detalle lean el catálogo y sus `best`/`plays` de la base de datos.

## Por qué existe esta spec

Tras SPEC 04 el proyecto tiene clientes de Supabase pero ninguna tabla (`list_tables` → vacío). El catálogo vive en `lib/data.ts` (mock), el Salón usa `seededScores` (aleatorio determinista) y las partidas terminadas se guardan solo en `localStorage` (`av_scores`), donde nadie las lee. Esta spec crea las tablas, hace que el modal FIN DEL JUEGO escriba en Supabase y que el Salón y el catálogo lean de ahí.

## Alcance

**Dentro:**

- Migración SQL con:
  - Tabla `games` (catálogo) sembrada con los 8 juegos actuales de `GAMES`.
  - Tabla `scores` (puntuaciones).
  - Vista `game_stats` con `best` (máx. puntuación) y `plays` (nº de partidas) por juego.
  - RLS en ambas tablas.
- Seguridad de escritura anónima por RLS + `CHECK`: `INSERT` público en `scores`; sin `UPDATE`/`DELETE`; `games` solo lectura pública.
- Capa de datos de servidor `lib/games-repo.ts`: `getGames()`, `getGame(id)`, `getLeaderboard(gameId, limit)`. Usa `lib/supabase/server.ts`.
- Escritura desde el cliente: el modal FIN DEL JUEGO inserta en `scores` con `lib/supabase/client.ts`. Estado de error visible y reintentable.
- Salón `/salon`: pestañas por juego (del catálogo en BD) y top 12 real de `scores`; podio con los 3 primeros; estado vacío "SIN PUNTUACIONES AÚN".
- Biblioteca, Home (mini-cards), Detalle y Reproductor: leen los juegos de `getGames()`/`getGame()` en lugar de `GAMES`. `best` y `plays` se calculan desde `game_stats`.
- Eliminar `av_scores` y `saveScore` de `SessionProvider`; borrar la clave huérfana de `localStorage` al montar.
- Detalle `/juegos/[id]`: el top 10 "MEJORES PUNTUACIONES" lee `getLeaderboard(id, 10)` (ranking real) con estado vacío "SIN PUNTUACIONES AÚN".
- Eliminar `GAMES`, `seededScores` y `PLAYERS` de `lib/data.ts`.
- Eliminar del Salón la fila mock "TU MEJOR MARCA".
- Corrección menor (detectada durante la revisión manual): el indicador "DESLIZA" del hero de la Home pasa a flujo normal (`.hero-scroll`) para no solaparse con los botones CTA.

**Fuera de alcance (specs futuras):**

- Supabase Auth: la identidad sigue siendo el nombre libre del modal (`av_user` en `localStorage`). Cualquiera puede escribir cualquier nombre.
- Validación de la partida en servidor / anti-trampas más allá de los `CHECK` (Server Action, límites por IP).
- Ranking real en el ticker/top del día de la Home (siguen mock) y "tu mejor marca" por usuario.
- Paginación, filtros por fecha (día / semana / histórico) o búsqueda en el Salón.
- Realtime / actualización en vivo del ranking.
- Tablas de categorías, tipos generados con CLI en CI, y migrar `av_user` (SPEC 04 ya lo dejó fuera).
- Nuevos juegos reales (solo ROCAS lo es; los otros 7 siguen siendo la simulación de SPEC 01).
- Tests automatizados (no hay runner configurado).

## Modelo de datos

Migración `supabase/migrations/20261007000000_games_and_scores.sql` aplicada con `mcp__supabase__apply_migration`.

```sql
create table public.games (
  id        text primary key,                 -- slug: "rocas", "caida", ...
  title     text not null,
  short     text not null,
  long      text not null,
  cat       text not null check (cat in ('ARCADE','PUZZLE','SHOOTER','VERSUS')),
  cover     text not null,                    -- clase CSS "cover-bricks", ...
  color     text not null check (color in ('cyan','magenta','yellow','green')),
  sort      int  not null default 0           -- orden estable (el de GAMES)
);

create table public.scores (
  id         uuid primary key default gen_random_uuid(),
  game_id    text not null references public.games(id),
  name       text not null check (char_length(name) between 1 and 10),
  score      int  not null check (score >= 0 and score <= 10000000),
  created_at timestamptz not null default now()
);
create index scores_game_score_idx on public.scores (game_id, score desc, created_at);

create view public.game_stats with (security_invoker = true) as
  select g.id as game_id,
         coalesce(max(s.score), 0) as best,
         count(s.id)               as plays
  from public.games g left join public.scores s on s.game_id = g.id
  group by g.id;
```

RLS (además, `REVOKE` de `insert`/`update`/`delete`/`truncate` en `games` y de `update`/`delete`/`truncate` en `scores` para `anon` y `authenticated`: así `update`/`delete` fallan con error de permisos en vez de afectar 0 filas):

| Tabla    | Política                                                                 |
| -------- | ------------------------------------------------------------------------ |
| `games`  | `select` para `anon` y `authenticated`                                   |
| `scores` | `select` e `insert` para `anon` y `authenticated`; sin `update`/`delete` (se revocan los privilegios) |

Tipos en `lib/types.ts`:

```ts
// Game se mantiene; best/plays vienen de game_stats
export interface Game {
  /* ...igual que hoy... */ best: number;
  plays: string;
}
export interface ScoreRow {
  rank: number;
  name: string;
  score: number;
  date: string;
} // igual que hoy
```

`plays` se formatea a "12.4K" en TS al leer (`plays: number` en BD → `string` en `Game`). `ScoreRow.date` se formatea `DD/MM/AAAA` desde `created_at`.

Superficie nueva:

```ts
// lib/games-repo.ts (server only)
export const getGames: () => Promise<Game[]>;
export const getGame: (id: string) => Promise<Game | null>;
export const getLeaderboard: (
  gameId: string,
  limit?: number,
) => Promise<ScoreRow[]>;
// components/session-provider.tsx: saveScore se elimina
// lib/scores.ts (client): submitScore({ game, score, name }) → Promise<{ ok: true } | { ok: false; error: string }>
```

Datos iniciales: `games` sembrada con los 8 juegos (descripción larga de ROCAS ya corregida en SPEC 05). `scores` arranca vacía: `best = 0` y `plays = "0"` hasta que haya partidas reales.

## Rutas resultantes

| Ruta                 | Pantalla         | Cambio                                      |
| -------------------- | ---------------- | ------------------------------------------- |
| `/biblioteca`        | Biblioteca       | juegos y `best`/`plays` desde BD            |
| `/`                  | Home             | mini-cards desde BD; resto sigue mock       |
| `/juegos/[id]`       | Detalle          | ficha y top 10 desde BD                      |
| `/juegos/[id]/jugar` | Reproductor      | juego desde BD; el modal guarda en Supabase |
| `/salon`             | Salón de la Fama | ranking real por juego                      |

## Plan de implementación

1. Aplicar la migración (tablas, índice, vista, RLS, seed de los 8 juegos). Verificar: `list_tables` muestra `games` y `scores`; `select * from game_stats` devuelve 8 filas con `best=0`; `get_advisors` (security) sin avisos de RLS desactivado.
2. Probar RLS con `execute_sql` como `anon`: `insert` válido pasa; nombre vacío o de 11 chars, `score < 0`, `score > 10000000` y `game_id` inexistente fallan; `update` y `delete` fallan. Borrar las filas de prueba. Verificar: `scores` vuelve a 0 filas.
3. Crear `lib/games-repo.ts` (`getGames`, `getGame`, `getLeaderboard`), mapeo fila → `Game`/`ScoreRow` (formato "12.4K", fecha `DD/MM/AAAA`). Verificar: `npx tsc --noEmit` pasa.
4. Migrar lecturas del catálogo: `app/biblioteca/page.tsx` → `Library` recibe `games` por props; `components/home/home-page.tsx` usa `getGames()`; `app/juegos/[id]/page.tsx` usa `getGame(id)` y `getLeaderboard(id, 10)` (con estado vacío) y `app/juegos/[id]/jugar/page.tsx` usa `getGame(id)` (`notFound()` si es `null`). Verificar: las 4 rutas renderizan igual que antes con `best=0`/`plays=0`; un id inexistente da 404.
5. Crear `lib/scores.ts` (`submitScore`) y conectar el modal en `components/game-player.tsx`: GUARDAR PUNTUACIÓN inserta en `scores`, muestra estado "GUARDANDO…", y en error muestra mensaje con reintento sin cerrar el modal. Quitar `saveScore` de `SessionProvider` y limpiar `av_scores`. Verificar: jugar ROCAS, terminar, guardar → fila en `scores` (`execute_sql`).
6. Migrar el Salón: `app/salon/page.tsx` (server) carga juegos y el top 12 del juego activo; `components/hall-of-fame.tsx` recibe datos por props, cambia de pestaña vía `?juego=<id>` (searchParams) y muestra podio, tabla y estado vacío; se quita la fila "TU MEJOR MARCA". Verificar: la puntuación guardada en el paso 5 aparece en `/salon?juego=rocas` como #1.
7. Limpiar `lib/data.ts` (`GAMES`, `seededScores` y `PLAYERS`). Verificar: `grep GAMES` y `grep seededScores` no encuentran código.
8. Revisión manual en navegador (Playwright MCP): jugar, guardar, ver Salón, error de red simulado, 375 px. Verificar: criterios de aceptación; `npm run lint` y `npm run build` pasan.

Antes de escribir código de cada paso: leer en `node_modules/next/dist/docs/` las guías de Server Components, data fetching, caching/revalidación (`cacheComponents`/`use cache` si aplica) y `searchParams` de Next 16. UI del Salón (estado vacío, error del modal) con skill `/frontend-design`.

## Criterios de aceptación

- [ ] `npm run lint` y `npm run build` terminan sin errores.
- [ ] Existen en Supabase las tablas `games` y `scores` y la vista `game_stats`, con RLS activado en las dos tablas; `get_advisors` no reporta tablas sin RLS.
- [ ] `games` tiene 8 filas con los mismos `id`, título, categoría, color y `cover` que el `GAMES` original.
- [ ] Como `anon`: insertar una puntuación válida funciona; nombre vacío o >10 chars, score negativo o >10 000 000 y `game_id` inexistente son rechazados; `update` y `delete` son rechazados.
- [ ] Terminar una partida de ROCAS y pulsar GUARDAR PUNTUACIÓN crea una fila en `scores` con `game_id = 'rocas'`, el nombre y la puntuación finales.
- [ ] Si el insert falla, el modal sigue abierto, muestra un error y permite reintentar; no se pierde la puntuación.
- [ ] La puntuación guardada aparece en `/salon?juego=rocas` en la posición correcta (ordenada por score desc, empate por fecha asc), con fecha `DD/MM/AAAA`.
- [ ] El Salón muestra una pestaña por juego del catálogo en BD y cambiar de pestaña actualiza el ranking y la URL; recargar conserva la pestaña.
- [ ] Un juego sin puntuaciones muestra "SIN PUNTUACIONES AÚN" y no rompe el podio.
- [ ] El podio muestra los 3 primeros; con menos de 3 filas los huecos se renderizan vacíos sin error.
- [ ] El top 10 del Detalle muestra las puntuaciones reales del juego (orden score desc, empate por fecha asc) y "SIN PUNTUACIONES AÚN" si no hay ninguna.
- [ ] `best` y `plays` mostrados en Biblioteca, Home y Detalle coinciden con `game_stats` (tras guardar una partida de ROCAS, `plays` pasa a "1" y `best` a la puntuación).
- [ ] Biblioteca conserva búsqueda, chips y "NO HAY RESULTADOS".
- [ ] `/juegos/inexistente` y `/juegos/inexistente/jugar` devuelven 404.
- [ ] `SessionProvider` ya no expone `saveScore` y la clave `av_scores` no se escribe ni se lee (se elimina al montar).
- [ ] El Salón ya no muestra la fila "TU MEJOR MARCA".
- [ ] La clave publishable no aparece en la spec ni en archivos versionados distintos de `.env.example` (sin valor).
- [ ] En la Home, "DESLIZA" no se solapa con los botones del hero en ningún ancho (1280, 768 y 375 px).
- [ ] Sin errores de hidratación ni de consola en `/`, `/biblioteca`, `/salon`, `/juegos/rocas` y `/juegos/rocas/jugar`; a 375 px no hay scroll horizontal en el Salón.

## Decisiones

- **Sí:** catálogo y puntuaciones en Supabase en una sola spec, en pasos incrementales. El ranking necesita `games` para la FK y para las pestañas del Salón.
- **No:** dividir en dos specs (06 catálogo / 07 leaderboard). Se descartó porque el catálogo en BD no aporta valor sin el ranking.
- **Sí:** nombre libre sin Supabase Auth. Coherente con `av_user`; auth va en su propia spec. Se acepta que cualquiera puede suplantar un nombre.
- **Sí:** todos los juegos guardan al terminar, incluidos los 5 simulados. Mismo flujo para todos; los datos de la simulación son datos de prueba hasta que cada juego sea real.
- **Sí:** `INSERT` anónimo protegido por RLS + `CHECK` (nombre 1–10, score 0–10 000 000, FK a `games`). Sin validación de partida en servidor: se acepta que un cliente malicioso pueda inflar su marca hasta el tope.
- **No:** Server Action con validación / límites por IP. Más robusto pero más código; revisable en una spec de anti-trampas.
- **Sí:** `best` y `plays` calculados en la vista `game_stats`. Una sola fuente de verdad; sin desincronización.
- **No:** columnas `best`/`plays` en `games` actualizadas por trigger o por cliente. Riesgo de desincronización.
- **Sí:** `plays` y `best` empiezan en 0 (sin sembrar puntuaciones falsas). Datos reales; el estado vacío es un caso explícito de diseño.
- **Sí:** pestaña activa del Salón vía `?juego=`. Permite renderizar en servidor y compartir enlaces; evita un fetch cliente por pestaña.
- **Sí:** el top 10 del Detalle se incorpora a esta spec (ampliación pedida durante la implementación, 2026-10-07): reutiliza `getLeaderboard` y evita mostrar un ranking falso junto a `best`/`plays` reales.
- **Sí:** ticker/top de la Home y "tu mejor marca" siguen fuera; se registran como siguientes specs.
- **No:** mantener la fila mock "TU MEJOR MARCA". Muestra un dato inventado junto a datos reales; vuelve cuando haya identidad real.
- **Sí:** eliminar `av_scores`. Nadie lo lee; evita dos fuentes de verdad.

## Riesgos

| Riesgo                                                                     | Mitigación                                                                                                |
| -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `INSERT` anónimo permite spam o puntuaciones falsas                        | `CHECK` en columnas y tope; spam/anti-trampas fuera de alcance, anotado en Decisiones.                    |
| La vista `game_stats` sin `security_invoker` salta RLS                     | Creada con `security_invoker = true`; verificada con `get_advisors` en el paso 1.                         |
| Cachés de Next 16 sirven el Salón/`best` obsoletos tras guardar            | Leer guía de caching; renderizado dinámico o revalidación corta; criterio de aceptación explícito.        |
| Supabase caído o variables ausentes rompe todas las pantallas del catálogo | Mensaje de error claro en las páginas del servidor (`error.tsx`); sin fallback al mock (una sola fuente). |
| Perder la puntuación si falla la red al guardar                            | El modal permanece abierto con reintento (paso 5, criterio).                                              |
| Mapeo `plays` a "12.4K" inconsistente con el mock anterior                 | Función de formato única en `games-repo.ts`; `0`, `999`, `1.2K`, `12.4K`, `1.5M` cubiertos a mano.        |
| Pérdida de las partidas locales antiguas (`av_scores`)                     | Aceptado: nunca se mostraron en ninguna pantalla.                                                         |
| Refactor a `getGames()` rompe Home/Detalle/Reproductor                     | Paso 4 verifica las 4 rutas antes de tocar el guardado; el id inexistente da 404.                         |
| Tipos de columna `int` insuficientes para scores futuros                   | Tope 10 000 000 < 2 147 483 647; revisable al añadir juegos con puntuaciones mayores.                     |

## Qué **no** está en esta spec

- Supabase Auth, perfiles o "tu mejor marca" por usuario.
- Anti-trampas, Server Actions de validación o límites por IP.
- Ranking real en el ticker / top del día de la Home.
- Filtros por periodo, paginación o realtime en el Salón.
- Juegos reales nuevos (Tetris, Arkanoid…).
- Tests automatizados.

Cada uno, si llega, va en su propia spec.
