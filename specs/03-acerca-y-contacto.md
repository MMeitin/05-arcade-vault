# SPEC 03 — Acerca de y formulario de contacto con Resend

> **Status:** Aprobado
> **Depends on:** SPEC 01, SPEC 02
> **Date:** 2026-10-06
> **Objective:** Añadir la página "Acerca de" en `/acerca` portada de `references/templates/home-about/about.jsx`, con un formulario de contacto que envía el mensaje por correo mediante Resend.

## Por qué existe esta spec

SPEC 02 portó la Home y dejó fuera la pestaña "Acerca de" (`about.jsx`), que combina misión del proyecto y un formulario de contacto. En el prototipo el envío es simulado (solo muestra la terminal de éxito). Aquí el envío es real: el mensaje llega por correo al equipo usando Resend.

## Alcance

**Dentro:**

- Pantalla en `/acerca` con las secciones de `about.jsx`:
  - Hero `▸ ACERCA DE`: título "ACERCA DE ARCADE VAULT", párrafo de misión, 3 highlights con icono pixel (HEART, BROWSER, PLANT).
  - Divisor decorativo con 24 píxeles animados.
  - Contacto `▸ CONTACTO`: título "CONTÁCTANOS", texto, 3 tips (RESPUESTA EN 24-48H, SUGERENCIAS BIENVENIDAS, SIN SPAM, JAMÁS) y formulario.
- Formulario: NOMBRE, CORREO ELECTRÓNICO, MENSAJE, botón ▶ ENVIAR MENSAJE.
- Estados del formulario: reposo, ENVIANDO…, éxito (terminal `VAULT-OS // TERMINAL` con "GRACIAS, {NOMBRE}" y botón ENVIAR OTRO MENSAJE), error de validación (shake + mensajes por campo), error de envío (mensaje inline, datos conservados).
- Envío por **Server Action** (`"use server"`) con Resend, validado en servidor con `zod`.
- Honeypot oculto anti-bots.
- Variables de entorno: `RESEND_API_KEY`, `CONTACT_TO_EMAIL`, `CONTACT_FROM_EMAIL`; archivo `.env.example` documentado.
- Nav: añadir "Acerca de" (→ `/acerca`) en desktop y panel móvil, activo solo en `/acerca`.
- Reutilizar `Reveal` (SPEC 02) para las animaciones `reveal`.
- Portar a `app/globals.css` las clases `about-*`, `highlight*`, `hl-*`, `div-*`, `contact-*`, `tip*`, `terminal-success`/`term-*`, `shake`, `caret` que falten desde `references/templates/home-about/styles.css`.

**Fuera de alcance (specs futuras):**

- Correo de confirmación al visitante (requiere dominio verificado).
- Rate limit, captcha o cualquier servicio externo anti-spam.
- Guardar mensajes en base de datos o panel de administración.
- Plantillas HTML con React Email (el correo es texto plano).
- Cambios en Home, Biblioteca, Detalle, Reproductor, Auth o Salón.
- Tests automatizados (no hay runner configurado).

## Modelo de datos

Sin persistencia nueva: el mensaje no se guarda, solo se envía. Tipos en `lib/types.ts`:

```ts
export interface ContactInput {
  name: string; // 1–60 chars, trim
  email: string; // email válido, máx 120
  message: string; // 1–2000 chars, trim
}
export type ContactField = keyof ContactInput;
export type ContactState =
  | { status: "idle" }
  | { status: "success"; name: string }
  | {
      status: "error";
      fieldErrors?: Partial<Record<ContactField, string>>;
      formError?: string;
      values: ContactInput; // para repoblar el form
    };
```

Variables de entorno (solo servidor, nunca `NEXT_PUBLIC_`):

| Variable             | Uso                                                                       |
| -------------------- | ------------------------------------------------------------------------- |
| `RESEND_API_KEY`     | API key de Resend (la aporta el usuario después)                          |
| `CONTACT_TO_EMAIL`   | Destinatario del equipo                                                   |
| `CONTACT_FROM_EMAIL` | Remitente; para pruebas `onboarding@resend.dev`, luego dominio verificado |

Correo enviado: `from` = `Arcade Vault <CONTACT_FROM_EMAIL>`, `to` = `CONTACT_TO_EMAIL`, `replyTo` = email del visitante, asunto `[Arcade Vault] Mensaje de {name}`, cuerpo en texto plano (nombre, correo, mensaje).

## Rutas resultantes

| Ruta      | Pantalla          | Cambio                           |
| --------- | ----------------- | -------------------------------- |
| `/acerca` | Acerca de (nueva) | nueva ruta                       |
| `/about`  | —                 | no existe (404), como en SPEC 02 |

## Plan de implementación

1. Instalar dependencias `resend` y `zod`. Añadir `.env.example` (sin secretos) con las 3 variables y excepción `!.env.example` en `.gitignore` (hoy ignora `.env*`). Crear `.env.local` (ignorado por git) con la API key que el usuario ya tiene y los valores de prueba: `CONTACT_FROM_EMAIL=onboarding@resend.dev`, `CONTACT_TO_EMAIL=delivered@resend.dev`. Verificar: `npm ls resend zod`; `.env.example` aparece en `git status` y `.env.local` no.
2. Añadir tipos de contacto en `lib/types.ts`. Verificar: `npx tsc --noEmit` pasa.
3. Portar a `app/globals.css` las clases de About/Contacto que falten (comparar con `references/templates/home-about/styles.css`, no duplicar). Verificar: no hay clases `about-*`/`contact-*`/`term-*` sin definir.
4. Crear `app/acerca/actions.ts` (`"use server"`): `sendContact(prev, formData)` que (a) descarta en silencio si el honeypot trae valor (responde éxito falso), (b) valida con zod, (c) comprueba que existan las env vars, (d) envía con Resend y (e) devuelve `ContactState`. Sin `RESEND_API_KEY` o ante error de Resend devuelve `formError` genérico y registra el detalle solo en el servidor. Verificar: con la key real llega el correo; sin key, error inline.
5. Crear `components/about/highlight-icon.tsx` (server, SVG) y `components/about/contact-form.tsx` (client, `useActionState`, honeypot, shake, terminal de éxito, ENVIAR OTRO MENSAJE). Verificar: estados reposo/enviando/éxito/error.
6. Crear `components/about/about-page.tsx` (server) con hero, divisor y contacto, usando `Reveal`; crear `app/acerca/page.tsx` con metadata propia. Verificar: `/acerca` renderiza igual al prototipo.
7. Actualizar `components/nav.tsx`: "Acerca de" en desktop y panel móvil, activo en `/acerca`. Verificar: link activo correcto en cada ruta.
8. Revisar responsive a 375 px y flujo completo. Verificar: sin scroll horizontal; `npm run lint` y `npm run build` pasan.

Antes de escribir código de cada paso: leer la guía relevante en `node_modules/next/dist/docs/` (Server Actions / forms, variables de entorno, metadata). UI con skill `/frontend-design`.

## Criterios de aceptación

- [ ] `npm run lint` y `npm run build` terminan sin errores.
- [ ] `/acerca` responde y se ve igual al prototipo; recargar conserva la pantalla; `/about` da 404.
- [ ] La página contiene en orden: hero Acerca de (3 highlights), divisor (24 píxeles) y sección Contacto (3 tips + formulario).
- [ ] El Nav (desktop y móvil) muestra "Acerca de", activo solo en `/acerca`.
- [ ] Enviar con algún campo vacío o con email inválido no envía correo: aplica shake y muestra el error bajo el campo; los valores se conservan.
- [ ] Mensaje > 2000 caracteres o nombre > 60 caracteres es rechazado en servidor.
- [ ] Con datos válidos y `RESEND_API_KEY` configurada, el botón muestra ENVIANDO… y deshabilitado durante el envío, y llega un correo a `CONTACT_TO_EMAIL` con `replyTo` = email del visitante.
- [ ] Tras el envío exitoso aparece la terminal con "GRACIAS, {NOMBRE EN MAYÚSCULAS}"; ENVIAR OTRO MENSAJE vuelve al formulario vacío.
- [ ] Prueba sin bandeja real: con `CONTACT_TO_EMAIL=delivered@resend.dev` el envío se confirma y el correo aparece en Resend → Emails con estado Delivered.
- [ ] Prueba de fallo: con `CONTACT_TO_EMAIL=bounced@resend.dev` el correo figura como Bounced en el panel (la action ya respondió éxito; el rebote es asíncrono). El caso de error inline se prueba quitando `RESEND_API_KEY` o con una key inválida.
- [ ] Si Resend falla o faltan env vars, se muestra un error inline genérico, el formulario conserva los datos y no se muestra la terminal de éxito.
- [ ] Con el honeypot relleno no se envía correo.
- [ ] `RESEND_API_KEY` no aparece en el bundle del cliente ni en la respuesta HTTP (verificar en Network / `.next/static`).
- [ ] `.env.local` no se versiona; `.env.example` sí.
- [ ] Sin errores de hidratación ni de consola en `/acerca`.
- [ ] A 375 px de ancho no hay scroll horizontal en `/acerca`.

## Decisiones

- **Sí:** ruta `/acerca`. Español, coherente con `/salon` y `/biblioteca`; el prototipo usa "about" solo como nombre interno.
- **Sí:** Server Action en vez de Route Handler. Sin endpoint público extra, la API key queda en servidor, integra con `useActionState`.
- **No:** `POST /api/contacto`. Solo se justifica si algo externo consume el endpoint.
- **Sí:** correo solo al equipo, `replyTo` = visitante. Permite responder directo; la confirmación al visitante exige dominio verificado.
- **No:** correo de confirmación al visitante. Fuera de alcance (ver arriba).
- **Sí:** `zod` para validar en servidor. Esquema único y errores por campo; el cliente no es de fiar.
- **Sí:** honeypot como único anti-spam. Gratis y sin servicios externos; suficiente para un MVP.
- **No:** rate limit/captcha ahora. Requiere servicio externo; spec aparte si hay abuso.
- **Sí:** éxito solo tras confirmación real de Resend. El prototipo mostraba éxito siempre; con envío real sería engañoso.
- **Sí:** correo en texto plano. Sin dependencia extra de plantillas.
- **Sí:** `from` de pruebas `onboarding@resend.dev` hasta tener dominio. Resend solo permite enviar a la cuenta propietaria con ese remitente.
- **Sí:** la API key la aporta el usuario después; el código funciona y falla de forma controlada sin ella.
- **Sí:** esta spec revierte la decisión de SPEC 02 de omitir "Acerca de" en el Nav; ahora existe la ruta.

## Riesgos

| Riesgo                                                           | Mitigación                                                                                      |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `.gitignore` ignora `.env*` y `.env.example` no se versiona      | Paso 1: excepción `!.env.example`.                                                              |
| API key pegada en chat/spec/commit                               | Nunca va en la spec ni en `.env.example`; solo en `.env.local`. Rotarla en Resend si se expuso. |
| Fuga de `RESEND_API_KEY` al cliente                              | Solo se lee en `actions.ts` (servidor); sin prefijo `NEXT_PUBLIC_`; criterio de verificación.   |
| Remitente `onboarding@resend.dev` solo entrega a la cuenta dueña | Documentarlo en `.env.example`; `CONTACT_TO_EMAIL` = correo de la cuenta Resend en pruebas.     |
| Inyección de cabeceras / contenido en asunto                     | zod limita longitud y formato; el asunto se arma sin saltos de línea (strip `\r\n`).            |
| Spam por bots                                                    | Honeypot; rate limit queda para otra spec si hace falta.                                        |
| Server Action sin JS no repuebla el form                         | `ContactState.values` devuelve los datos; el form usa `defaultValue`.                           |
| API de Server Actions / `useActionState` cambió en Next 16       | Leer `node_modules/next/dist/docs/` antes del paso 4 y 5.                                       |
| Clases `about-*`/`.shake` chocan con las existentes              | Paso 3: comparar con `globals.css` antes de portar.                                             |

## Qué **no** está en esta spec

- Correo de confirmación al visitante.
- Rate limit, captcha o anti-spam externo.
- Base de datos de mensajes o panel de administración.
- Plantillas HTML de correo.
- Tests automatizados.

Cada uno, si llega, va en su propia spec.
