"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, PlaneTakeoff } from "lucide-react";
import {
  actualizarSolicitud,
  eliminarJustificante,
  obtenerUrlJustificante,
} from "../../actions/solicitudes-actions";

export type SolicitudPendiente = {
  id: string;
  tipo: "VACACIONES" | "AUSENCIA";
  inicio: string;
  fin: string | null;
  motivo: string | null;
  justificanteNombre: string | null;
  justificanteRuta: string | null;
  usuarioNombre: string;
  usuarioEmail: string;
};

type SolicitudesPanelProps = {
  solicitudes: SolicitudPendiente[];
};

const formatRange = (item: SolicitudPendiente) => {
  const start = new Date(item.inicio);
  const end = item.fin ? new Date(item.fin) : null;
  const formatter = new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const startLabel = formatter.format(start);
  const endLabel = end ? formatter.format(end) : startLabel;
  return startLabel === endLabel ? startLabel : `${startLabel} - ${endLabel}`;
};

export default function SolicitudesPanel({
  solicitudes,
}: SolicitudesPanelProps) {
  const [tab, setTab] = useState<"VACACIONES" | "AUSENCIA">("VACACIONES");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const filtradas = useMemo(
    () => solicitudes.filter((item) => item.tipo === tab),
    [solicitudes, tab],
  );

  const handleDecision = (
    id: string,
    estado: "APROBADA" | "RECHAZADA",
  ) => {
    const formData = new FormData();
    formData.set("id", id);
    formData.set("estado", estado);
    setPendingId(id);
    setMessage(null);

    startTransition(async () => {
      try {
        await actualizarSolicitud(formData);
        setMessage("Solicitud actualizada.");
        router.refresh();
      } catch (error) {
        console.error("Error al actualizar solicitud:", error);
        setMessage("No se pudo actualizar la solicitud.");
      } finally {
        setPendingId(null);
      }
    });
  };

  const handleView = (id: string) => {
    const formData = new FormData();
    formData.set("id", id);
    setViewingId(id);
    setMessage(null);

    startTransition(async () => {
      try {
        const result = await obtenerUrlJustificante(formData);
        if (result?.url) {
          window.open(result.url, "_blank", "noopener,noreferrer");
        } else {
          setMessage("No se pudo obtener el justificante.");
        }
      } catch (error) {
        console.error("Error al abrir justificante:", error);
        setMessage("No se pudo abrir el justificante.");
      } finally {
        setViewingId(null);
      }
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm("Quieres eliminar el justificante adjunto?")) {
      return;
    }

    const formData = new FormData();
    formData.set("id", id);
    setDeletingId(id);
    setMessage(null);

    startTransition(async () => {
      try {
        await eliminarJustificante(formData);
        setMessage("Justificante eliminado.");
        router.refresh();
      } catch (error) {
        console.error("Error al eliminar justificante:", error);
        setMessage("No se pudo eliminar el justificante.");
      } finally {
        setDeletingId(null);
      }
    });
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-indigo-500/70">
            Validacion
          </p>
          <h2 className="text-3xl font-semibold text-slate-900">
            Vacaciones y Ausencias
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setTab("VACACIONES")}
            className={`flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold transition ${
              tab === "VACACIONES"
                ? "bg-purple-600 text-white shadow-lg shadow-purple-200/70"
                : "border border-purple-400 text-purple-600"
            }`}
          >
            <CalendarDays size={16} />
            Vacaciones
          </button>
          <button
            type="button"
            onClick={() => setTab("AUSENCIA")}
            className={`flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold transition ${
              tab === "AUSENCIA"
                ? "bg-purple-600 text-white shadow-lg shadow-purple-200/70"
                : "border border-purple-400 text-purple-600"
            }`}
          >
            <PlaneTakeoff size={16} />
            Ausencias
          </button>
        </div>
      </header>

      <section className="rounded-[2.5rem] border border-slate-100 bg-white p-8 shadow-[0_24px_80px_rgba(15,23,42,0.12)]">
        {message && (
          <div className="mb-4 rounded-2xl border border-slate-100 bg-slate-50/60 px-4 py-3 text-sm text-slate-600">
            {message}
          </div>
        )}
        {filtradas.length === 0 ? (
          <div className="text-sm text-slate-500">
            No hay rangos pendientes de revision.
          </div>
        ) : (
          <div className="space-y-4">
            {filtradas.map((item) => (
              <div
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-slate-50/60 px-5 py-4 text-sm text-slate-600"
              >
                <div>
                  <p className="font-semibold text-slate-900">
                    {item.usuarioNombre}
                  </p>
                  <p className="text-xs text-slate-500">
                    {item.usuarioEmail}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-slate-400">
                    Rango
                  </p>
                  <p className="font-semibold text-slate-800">
                    {formatRange(item)}
                  </p>
                </div>
                <div className="min-w-[160px]">
                  <p className="text-xs uppercase tracking-wider text-slate-400">
                    Motivo
                  </p>
                  <p className="text-sm text-slate-700">
                    {item.motivo || "Sin motivo"}
                  </p>
                  {item.justificanteNombre && (
                    <p className="mt-1 text-xs text-slate-500">
                      Adj: {item.justificanteNombre}
                    </p>
                  )}
                  {item.justificanteRuta && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleView(item.id)}
                        disabled={isPending && viewingId === item.id}
                        className="inline-flex rounded-full border border-indigo-200 px-3 py-1 text-xs font-semibold text-indigo-600 transition hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Ver justificante
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(item.id)}
                        disabled={isPending && deletingId === item.id}
                        className="inline-flex rounded-full border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Eliminar
                      </button>
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                    Pendiente
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleDecision(item.id, "APROBADA")}
                      disabled={isPending && pendingId === item.id}
                      className="rounded-full bg-emerald-500 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-emerald-200/70 transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Aprobar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDecision(item.id, "RECHAZADA")}
                      disabled={isPending && pendingId === item.id}
                      className="rounded-full border border-rose-300 px-4 py-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Rechazar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
