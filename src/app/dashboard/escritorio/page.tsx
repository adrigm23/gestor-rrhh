export default function EscritorioPage() {
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-sky-500/70">
          Escritorio
        </p>
        <h2 className="text-3xl font-semibold text-slate-900">Escritorio</h2>
      </header>

      <section className="rounded-[2.5rem] border border-slate-100 bg-white p-8 shadow-[0_24px_80px_rgba(15,23,42,0.12)]">
        <h3 className="text-xl font-semibold text-slate-900">Bienvenido</h3>
        <p className="mt-2 text-sm text-slate-500">
          Consulta el periodo que deseas revisar.
        </p>

        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Fecha de inicio</label>
            <input
              type="date"
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Fecha de fin</label>
            <input
              type="date"
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200"
            />
          </div>
        </div>

        <button
          type="button"
          className="mt-6 w-full rounded-full bg-gradient-to-r from-teal-500 via-sky-500 to-sky-600 py-4 text-sm font-semibold text-white shadow-xl shadow-sky-200/70 transition hover:brightness-110"
        >
          Buscar
        </button>
      </section>
    </div>
  );
}

