"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { actualizarSolicitud } from "../../actions/solicitudes-actions";

export type SolicitudPendiente = {
  id: string;
  tipo: "VACACIONES" | "AUSENCIA";
  inicio: string;
  fin: string | null;
  motivo: string | null;
  ausenciaTipo: "FALTA" | "AVISO" | null;
  justificanteNombre: string | null;
  justificanteRuta: string | null;
  usuarioNombre: string;
  usuarioEmail: string;
};

export type SolicitudHistorial = {
  id: string;
  tipo: "VACACIONES" | "AUSENCIA";
  inicio: string;
  fin: string | null;
  motivo: string | null;
  ausenciaTipo: "FALTA" | "AVISO" | null;
  estado: "APROBADA" | "RECHAZADA" | "PENDIENTE";
  usuarioNombre: string;
  usuarioEmail: string;
};

type SolicitudesPanelProps = {
  solicitudes: SolicitudPendiente[];
  historico: SolicitudHistorial[];
};

const formatRange = (inicio: string, fin: string | null) => {
  const start = new Date(inicio);
  const end = fin ? new Date(fin) : null;
  const formatter = new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
  });
  const startLabel = formatter.format(start);
  const endLabel = end ? formatter.format(end) : startLabel;
  return startLabel === endLabel ? startLabel : `${startLabel} - ${endLabel}`;
};

const resolveTipoLabel = (item: { tipo: "VACACIONES" | "AUSENCIA"; ausenciaTipo: "FALTA" | "AVISO" | null }) => {
  if (item.tipo === "VACACIONES") return "Vacaciones";
  return item.ausenciaTipo === "FALTA" ? "Falta" : "Aviso";
};

const statusBadge = (estado: string) => {
  if (estado === "APROBADA") return "bg-emerald-100 text-emerald-700";
  if (estado === "RECHAZADA") return "bg-rose-100 text-rose-700";
  return "bg-amber-100 text-amber-700";
};

export default function SolicitudesPanel({
  solicitudes,
  historico,
}: SolicitudesPanelProps) {
  const [search, setSearch] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const normalized = search.trim().toLowerCase();
  const filterBySearch = (nombre: string, email: string) =>
    !normalized ||
    nombre.toLowerCase().includes(normalized) ||
    email.toLowerCase().includes(normalized);

  const pendientesFiltradas = useMemo(
    () =>
      solicitudes.filter((item) =>
        filterBySearch(item.usuarioNombre, item.usuarioEmail),
      ),
    [solicitudes, normalized],
  );

  const historicoFiltrado = useMemo(
    () =>
      historico.filter((item) =>
        filterBySearch(item.usuarioNombre, item.usuarioEmail),
      ),
    [historico, normalized],
  );

  const handleDecision = (id: string, estado: "APROBADA" | "RECHAZADA") => {
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

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-sky-500/70">
            Gestion
          </p>
          <h2 className="text-3xl font-semibold text-[color:var(--text-primary)]">
            Gestion de ausencias
          </h2>
          <p className="text-sm text-[color:var(--text-muted)]">
            Revisa y gestiona las solicitudes de tu equipo.
          </p>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-[color:var(--card-border)] bg-[color:var(--surface)] px-4 py-2 text-sm text-[color:var(--text-muted)]">
          <Search size={18} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar empleado..."
            className="bg-transparent outline-none"
          />
        </div>
      </header>

      <section className="rounded-[2.5rem] border border-[color:var(--card-border)] bg-[color:var(--card)] p-8 shadow-[var(--shadow-card)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold text-[color:var(--text-primary)]">
              Solicitudes pendientes
            </h3>
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
              {pendientesFiltradas.length}
            </span>
          </div>
        </div>

        {message && (
          <div className="mt-4 rounded-2xl border border-[color:var(--card-border)] bg-[color:var(--surface-muted)] px-4 py-3 text-sm text-[color:var(--text-secondary)]">
            {message}
          </div>
        )}

        <div className="mt-6 overflow-hidden rounded-2xl border border-[color:var(--card-border)]">
          <table className="min-w-full text-sm">
            <thead className="bg-[color:var(--surface-muted)] text-xs uppercase tracking-wider text-[color:var(--text-muted)]">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Empleado</th>
                <th className="px-4 py-3 text-left font-semibold">Tipo</th>
                <th className="px-4 py-3 text-left font-semibold">Fechas</th>
                <th className="px-4 py-3 text-left font-semibold">Motivo</th>
                <th className="px-4 py-3 text-right font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[color:var(--card-border)]">
              {pendientesFiltradas.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-6 text-center text-[color:var(--text-muted)]"
                  >
                    No hay solicitudes pendientes.
                  </td>
                </tr>
              ) : (
                pendientesFiltradas.map((item) => (
                  <tr key={item.id} className="text-[color:var(--text-secondary)]">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-[color:var(--text-primary)]">
                        {item.usuarioNombre}
                      </p>
                      <p className="text-xs text-[color:var(--text-muted)]">
                        {item.usuarioEmail}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-600">
                        {resolveTipoLabel(item)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {formatRange(item.inicio, item.fin)}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {item.motivo || "Sin motivo"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleDecision(item.id, "RECHAZADA")}
                          disabled={isPending && pendingId === item.id}
                          className="rounded-full border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 disabled:opacity-60"
                        >
                          Rechazar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDecision(item.id, "APROBADA")}
                          disabled={isPending && pendingId === item.id}
                          className="rounded-full bg-emerald-500 px-3 py-2 text-xs font-semibold text-white shadow-sm shadow-emerald-200/60 transition hover:bg-emerald-600 disabled:opacity-60"
                        >
                          Aprobar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section
        id="historico"
        className="rounded-[2.5rem] border border-[color:var(--card-border)] bg-[color:var(--card)] p-8 shadow-[var(--shadow-card)]"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-[color:var(--text-primary)]">
            Historico reciente
          </h3>
          <a href="#historico" className="text-xs text-sky-500">
            Ver todo el historico
          </a>
        </div>
        <div className="mt-6 overflow-hidden rounded-2xl border border-[color:var(--card-border)]">
          <table className="min-w-full text-sm">
            <thead className="bg-[color:var(--surface-muted)] text-xs uppercase tracking-wider text-[color:var(--text-muted)]">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Empleado</th>
                <th className="px-4 py-3 text-left font-semibold">Estado</th>
                <th className="px-4 py-3 text-left font-semibold">Fechas</th>
                <th className="px-4 py-3 text-left font-semibold">Motivo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[color:var(--card-border)]">
              {historicoFiltrado.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-6 text-center text-[color:var(--text-muted)]"
                  >
                    No hay solicitudes recientes.
                  </td>
                </tr>
              ) : (
                historicoFiltrado.map((item) => (
                  <tr key={item.id} className="text-[color:var(--text-secondary)]">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-[color:var(--text-primary)]">
                        {item.usuarioNombre}
                      </p>
                      <p className="text-xs text-[color:var(--text-muted)]">
                        {item.usuarioEmail}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusBadge(item.estado)}`}>
                        {item.estado === "APROBADA" ? "Aprobado" : "Rechazado"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {formatRange(item.inicio, item.fin)}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {item.motivo || "Sin motivo"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
