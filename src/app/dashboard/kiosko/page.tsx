import { auth } from "../../api/auth/auth";
import { redirect } from "next/navigation";
import KioskoForm from "./kiosko-form";

export default async function KioskoPage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  if (session.user?.role === "EMPLEADO") {
    redirect("/dashboard");
  }

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-sky-500/70">
          Kiosko
        </p>
        <h2 className="text-3xl font-semibold text-slate-900">Lectura NFC</h2>
        <p className="text-sm text-slate-500">
          Uso recomendado para el puesto de control. Al pasar la tarjeta se
          registra automaticamente la entrada o salida del empleado.
        </p>
      </header>

      <KioskoForm />
    </div>
  );
}
