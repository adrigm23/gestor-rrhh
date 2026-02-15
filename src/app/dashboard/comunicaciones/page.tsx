export default function ComunicacionesPage() {
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-sky-500/70">
          Comunicaciones
        </p>
        <h2 className="text-3xl font-semibold text-slate-900">Comunicaciones</h2>
      </header>

      <section className="rounded-[2.5rem] border border-slate-100 bg-white p-8 shadow-[0_24px_80px_rgba(15,23,42,0.12)]">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
          El modulo de comunicaciones aun no esta implementado en backend.
          <br />
          De momento no se envian mensajes ni se guardan borradores.
        </div>
      </section>
    </div>
  );
}

