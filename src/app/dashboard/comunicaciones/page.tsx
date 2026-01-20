export default function ComunicacionesPage() {
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-indigo-500/70">
          Comunicaciones
        </p>
        <h2 className="text-3xl font-semibold text-slate-900">Comunicaciones</h2>
      </header>

      <section className="rounded-[2.5rem] border border-slate-100 bg-white p-8 shadow-[0_24px_80px_rgba(15,23,42,0.12)]">
        <p className="text-sm text-slate-500">
          Envia comunicados internos a los empleados de tu empresa.
        </p>

        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-semibold text-slate-700">Titulo</label>
            <input
              type="text"
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              placeholder="Escribe un titulo"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Centros de trabajo</label>
            <select className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200">
              <option>Seleccionar...</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Departamentos</label>
            <select className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200">
              <option>Seleccionar...</option>
            </select>
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-semibold text-slate-700">Descripcion</label>
            <textarea
              rows={4}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              placeholder="Escribe tu mensaje"
            />
          </div>
        </div>

        <button
          type="button"
          className="mt-6 w-full rounded-full bg-gradient-to-r from-purple-500 via-indigo-500 to-indigo-600 py-4 text-sm font-semibold text-white shadow-xl shadow-indigo-200/70 transition hover:brightness-110"
        >
          Enviar comunicado
        </button>
      </section>
    </div>
  );
}
