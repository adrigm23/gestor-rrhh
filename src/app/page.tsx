// src/app/page.tsx
import { redirect } from "next/navigation";

export default function Home() {
  // Redirigimos automáticamente al login
  redirect("/login");
}
