"use server";

import { Resend } from "resend";
import { z } from "zod";
import type { ContactField, ContactInput, ContactState } from "@/lib/types";

const contactSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Escribe tu nombre")
    .max(60, "Máximo 60 caracteres"),
  email: z
    .string()
    .trim()
    .max(120, "Máximo 120 caracteres")
    .pipe(z.email("Correo electrónico no válido")),
  message: z
    .string()
    .trim()
    .min(1, "Escribe tu mensaje")
    .max(2000, "Máximo 2000 caracteres"),
});

const GENERIC_ERROR =
  "No pudimos enviar tu mensaje. Inténtalo de nuevo en unos minutos.";

const field = (formData: FormData, key: string) => {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
};

export async function sendContact(
  _prev: ContactState,
  formData: FormData,
): Promise<ContactState> {
  const values: ContactInput = {
    name: field(formData, "name"),
    email: field(formData, "email"),
    message: field(formData, "message"),
  };

  // Honeypot: los bots lo rellenan; fingimos éxito sin enviar nada.
  if (field(formData, "website") !== "") {
    return { status: "success", name: values.name.trim() || "VISITANTE" };
  }

  const parsed = contactSchema.safeParse(values);
  if (!parsed.success) {
    const fieldErrors: Partial<Record<ContactField, string>> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as ContactField;
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { status: "error", fieldErrors, values };
  }

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_TO_EMAIL;
  const from = process.env.CONTACT_FROM_EMAIL;
  if (!apiKey || !to || !from) {
    console.error("[contact] Faltan variables de entorno de Resend");
    return { status: "error", formError: GENERIC_ERROR, values };
  }

  const { name, email, message } = parsed.data;
  const subjectName = name.replace(/[\r\n]+/g, " ");

  try {
    const { error } = await new Resend(apiKey).emails.send({
      from: `Arcade Vault <${from}>`,
      to,
      replyTo: email,
      subject: `[Arcade Vault] Mensaje de ${subjectName}`,
      text: `Nombre: ${name}\nCorreo: ${email}\n\n${message}`,
    });
    if (error) {
      console.error("[contact] Resend devolvió error:", error);
      return { status: "error", formError: GENERIC_ERROR, values };
    }
  } catch (err) {
    console.error("[contact] Fallo al enviar con Resend:", err);
    return { status: "error", formError: GENERIC_ERROR, values };
  }

  return { status: "success", name };
}
