# SPEC 04 — Configuración base de Supabase

> **Status:** Aprobado
> **Depends on:** SPEC 03
> **Date:** 2026-10-07
> **Objective:** Instalar el SDK de Supabase y dejar listos los clientes de navegador y servidor y el `proxy.ts` que refresca la sesión, sin cambiar ninguna pantalla.

## Por qué existe esta spec

El proyecto es un scaffold sin backend: auth, puntuaciones y ranking viven en `localStorage` (SPEC 01) o son mock (SPEC 02). Antes de migrar nada a Supabase hace falta la infraestructura común. Esta spec solo la deja instalada y verificada; el uso real va en specs posteriores.

Dos desvíos respecto al snippet oficial de Supabase:

- Next 16 renombró `middleware.ts` a `proxy.ts`; se usa la convención nueva.
- El helper del snippet nunca refresca la sesión (no llama a `getClaims`). Aquí sí.

## Alcance

**Dentro:**

- Dependencias `@supabase/supabase-js` y `@supabase/ssr`.
- Variables de entorno `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` en `.env.local` (valores reales) y `.env.example` (placeholders, sin valores).
- `lib/supabase/client.ts`: cliente de navegador (`createBrowserClient`).
- `lib/supabase/server.ts`: cliente de servidor (`createServerClient` + `cookies()` de `next/headers`).
- `lib/supabase/proxy.ts`: helper `updateSession(request)` que crea el cliente con cookies de request/response y refresca la sesión con `supabase.auth.getClaims()`.
- `proxy.ts` en la raíz: llama a `updateSession`, con `matcher` que excluye `_next/static`, `_next/image`, `favicon.ico` e imágenes estáticas.
- Verificación de conexión puntual (sin código en la app) con la CLI/MCP de Supabase.

**Fuera de alcance (specs futuras):**

- Página demo `page.tsx` del snippet (lee una tabla `todos` inexistente y pisaría la Home).
- Migrar Auth (`av_user`) a Supabase Auth, protección de rutas o redirects por sesión.
- Tablas, migraciones, RLS, tipos generados; migrar `av_scores` o el Salón a base de datos.
- Instalar `npx skills add supabase/agent-skills` (herramienta del agente, opcional, no del producto).
- Cambios en cualquier pantalla existente.
- Tests automatizados (no hay runner configurado).

## Modelo de datos

Sin datos nuevos. No se crean tablas ni se toca la persistencia local.

Variables de entorno (con prefijo `NEXT_PUBLIC_` porque el cliente de navegador las necesita; la publishable key es pública por diseño y la seguridad recae en RLS):

| Variable                               | Uso                                 |
| -------------------------------------- | ----------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | URL del proyecto Supabase           |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable key (`sb_publishable_`) |

Superficie de código nueva:

```ts
// lib/supabase/client.ts
export const createClient: () => SupabaseClient;
// lib/supabase/server.ts
export const createClient: (
  cookieStore: ReadonlyRequestCookies,
) => SupabaseClient;
// lib/supabase/proxy.ts
export const updateSession: (request: NextRequest) => Promise<NextResponse>;
```

## Plan de implementación

1. Instalar dependencias: `npm install @supabase/supabase-js @supabase/ssr`. Verificar: `npm ls @supabase/supabase-js @supabase/ssr`.
2. Añadir las 2 variables a `.env.local` (valores reales, ignorado por git) y a `.env.example` (placeholders, comentario "público por diseño, la seguridad se hace con RLS"). Verificar: `.env.example` en `git status`, `.env.local` no; `RESEND_*` intactas.
3. Crear `lib/supabase/client.ts` y `lib/supabase/server.ts`. Verificar: `npx tsc --noEmit` pasa.
4. Crear `lib/supabase/proxy.ts` (`updateSession`) y `proxy.ts` raíz con `matcher`. Verificar: `npm run dev` arranca sin warning de middleware deprecado y `/`, `/biblioteca`, `/acerca` responden 200.
5. Verificar conexión: `mcp__supabase__get_project_url` coincide con `NEXT_PUBLIC_SUPABASE_URL`; una llamada puntual a `auth.getClaims()` desde el servidor no lanza error con sesión ausente. Verificar: `npm run lint` y `npm run build` pasan.

Antes de escribir código de cada paso: leer `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md` (firma, `matcher`) y la guía de variables de entorno.

## Criterios de aceptación

- [ ] `package.json` lista `@supabase/supabase-js` y `@supabase/ssr`.
- [ ] `.env.local` define las 2 variables Supabase y no está versionado; `.env.example` las lista sin valores y sí está versionado.
- [ ] Existen `lib/supabase/client.ts`, `lib/supabase/server.ts`, `lib/supabase/proxy.ts` y `proxy.ts` en la raíz; no existe `middleware.ts` ni `utils/supabase/`.
- [ ] `proxy.ts` excluye `_next/static`, `_next/image`, `favicon.ico` e imágenes del `matcher`.
- [ ] `updateSession` llama a `supabase.auth.getClaims()` y devuelve la respuesta con las cookies actualizadas.
- [ ] `app/page.tsx` y el resto de pantallas no cambian (`git diff` sin cambios en `app/` ni `components/`).
- [ ] `npm run dev` no muestra warning de `middleware` deprecado.
- [ ] `/`, `/biblioteca`, `/acerca`, `/salon` responden 200 con el proxy activo y sin errores de consola.
- [ ] La URL de `NEXT_PUBLIC_SUPABASE_URL` coincide con la del proyecto devuelta por el MCP de Supabase.
- [ ] La publishable key no aparece en la spec ni en `.env.example`.
- [ ] `npm run lint` y `npm run build` terminan sin errores.

## Decisiones

- **Sí:** `proxy.ts` en la raíz. Es la convención de Next 16; `middleware.ts` está deprecado.
- **No:** `middleware.ts`. Funciona pero emite aviso de deprecación.
- **Sí:** `getClaims()` en `updateSession`. Sin una llamada de auth el token no se refresca y el helper sería código muerto.
- **Sí:** `lib/supabase/` en vez de `utils/supabase/`. Coherente con `lib/types.ts` y `lib/data.ts`; evita una segunda carpeta de helpers.
- **No:** la página demo `todos`. Depende de una tabla inexistente y sobrescribiría la Home de SPEC 02.
- **Sí:** nombres `createClient` por archivo (como el snippet). Cada módulo se importa desde su contexto (navegador / servidor) y no coexisten.
- **Sí:** publishable key en `.env.local` y `.env.example` solo con placeholder. Es pública por diseño, pero los valores reales no se versionan.
- **No:** instalar `supabase/agent-skills` aquí. Es tooling del agente, opcional; no es parte del producto.
- **Sí:** esta spec no toca Auth ni datos. Migrar `av_user`/`av_scores` es otra decisión con impacto en UX; va en su propia spec.

## Riesgos

| Riesgo                                                               | Mitigación                                                                                      |
| -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| API de `proxy.ts` / `cookies()` cambió en Next 16                    | Leer `proxy.md` antes del paso 4; `cookies()` es async (`await`) en `server.ts` del consumidor. |
| `proxy.ts` corre en cada request y añade latencia                    | `matcher` excluye estáticos; `getClaims` valida el JWT localmente cuando es posible.            |
| Variables ausentes y `!` oculta el fallo                             | Mensaje de error claro de `@supabase/ssr` al arrancar; se verifica en el paso 5.                |
| Sobrescribir `.env.local` y perder `RESEND_*`                        | Paso 2 solo añade líneas; criterio de verificación.                                             |
| Cookies de sesión mal propagadas en el `NextResponse` del proxy      | Devolver siempre el `supabaseResponse` creado en `setAll`, sin recrear la respuesta fuera.      |
| La publishable key sin RLS expone datos al crear tablas en el futuro | Fuera de alcance aquí; toda tabla futura exige RLS en su propia spec.                           |

## Qué **no** está en esta spec

- Página demo `todos` ni cambios en la Home.
- Supabase Auth, protección de rutas.
- Tablas, migraciones, RLS, tipos generados.
- Migración de puntuaciones o ranking a base de datos.
- Instalación de `supabase/agent-skills`.
- Tests automatizados.

Cada uno, si llega, va en su propia spec.
