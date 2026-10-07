"use client";

import { useActionState, useState } from "react";
import { sendContact } from "@/app/acerca/actions";
import type { ContactState } from "@/lib/types";

const initialState: ContactState = { status: "idle" };

export function ContactForm() {
  const [state, formAction, pending] = useActionState(sendContact, initialState);

  // Derivado durante el render: cada respuesta nueva rearma shake / terminal.
  const [seen, setSeen] = useState(state);
  const [shake, setShake] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  if (state !== seen) {
    setSeen(state);
    setDismissed(false);
    setShake(state.status === "error" && !!state.fieldErrors);
  }

  const error = state.status === "error" ? state : null;
  const fieldErrors = error?.fieldErrors ?? {};
  const values = error?.values;

  return (
    <form
      className={"contact-form" + (shake ? " shake" : "")}
      action={formAction}
      noValidate
      onAnimationEnd={() => setShake(false)}
    >
      {state.status === "success" && !dismissed ? (
        <div className="terminal-success" role="status">
          <div className="term-bar">
            <span className="dot r"></span>
            <span className="dot y"></span>
            <span className="dot g"></span>
            <span className="term-title">VAULT-OS // TERMINAL</span>
          </div>
          <div className="term-body">
            <div className="line">
              <span className="prompt">vault@arcade:~$</span> ./send_message --to=team
            </div>
            <div className="line dim">[OK] Conectando con servidor…</div>
            <div className="line dim">[OK] Validando contenido…</div>
            <div className="line dim">[OK] Transmitiendo paquete…</div>
            <div className="line success">
              &gt; MENSAJE RECIBIDO. TE RESPONDEREMOS PRONTO. GRACIAS,{" "}
              {state.name.toUpperCase()}.<span className="caret">_</span>
            </div>
            <div style={{ marginTop: 18 }}>
              <button
                className="btn ghost"
                type="button"
                onClick={() => setDismissed(true)}
              >
                ENVIAR OTRO MENSAJE
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className={"field" + (fieldErrors.name ? " invalid" : "")}>
            <label htmlFor="contact-name">NOMBRE</label>
            <input
              id="contact-name"
              name="name"
              defaultValue={values?.name ?? ""}
              placeholder="px_kai"
              autoComplete="name"
              aria-invalid={!!fieldErrors.name}
              aria-describedby={fieldErrors.name ? "contact-name-err" : undefined}
            />
            {fieldErrors.name && (
              <p className="field-error" id="contact-name-err">
                {fieldErrors.name}
              </p>
            )}
          </div>
          <div className={"field" + (fieldErrors.email ? " invalid" : "")}>
            <label htmlFor="contact-email">CORREO ELECTRÓNICO</label>
            <input
              id="contact-email"
              name="email"
              type="email"
              defaultValue={values?.email ?? ""}
              placeholder="jugador@vault.gg"
              autoComplete="email"
              aria-invalid={!!fieldErrors.email}
              aria-describedby={fieldErrors.email ? "contact-email-err" : undefined}
            />
            {fieldErrors.email && (
              <p className="field-error" id="contact-email-err">
                {fieldErrors.email}
              </p>
            )}
          </div>
          <div className={"field" + (fieldErrors.message ? " invalid" : "")}>
            <label htmlFor="contact-message">MENSAJE</label>
            <textarea
              id="contact-message"
              name="message"
              rows={5}
              defaultValue={values?.message ?? ""}
              placeholder="Cuéntanos qué tienes en mente…"
              aria-invalid={!!fieldErrors.message}
              aria-describedby={fieldErrors.message ? "contact-message-err" : undefined}
            ></textarea>
            {fieldErrors.message && (
              <p className="field-error" id="contact-message-err">
                {fieldErrors.message}
              </p>
            )}
          </div>

          {/* Honeypot: invisible para personas, los bots lo rellenan. */}
          <div className="hp-field" aria-hidden="true">
            <label htmlFor="contact-website">Website</label>
            <input
              id="contact-website"
              name="website"
              type="text"
              tabIndex={-1}
              autoComplete="off"
              defaultValue=""
            />
          </div>

          {error?.formError && (
            <p className="form-error" role="alert">
              {error.formError}
            </p>
          )}

          <button
            className="btn xl press"
            type="submit"
            style={{ width: "100%" }}
            disabled={pending}
          >
            {pending ? "ENVIANDO…" : "▶  ENVIAR MENSAJE"}
          </button>
        </>
      )}
    </form>
  );
}
