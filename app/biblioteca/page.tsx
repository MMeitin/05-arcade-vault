import type { Metadata } from "next";
import { Library } from "@/components/library";

export const metadata: Metadata = {
  title: "Biblioteca · Arcade Vault",
  description: "Explora la biblioteca de juegos de Arcade Vault.",
};

export default function BibliotecaPage() {
  return <Library />;
}
