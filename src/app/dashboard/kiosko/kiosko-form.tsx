"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  registrarNfcKiosko,
  type KioskoState,
} from "../../actions/kiosko-actions";
import { CreditCard } from "lucide-react";

const initialState: KioskoState = { status: "idle" };

export default function KioskoForm() {
  const [state, action, pending] = useActionState(
    registrarNfcKiosko,
    initialState,
  );
  const [uid, setUid] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const debounceRef = useRef<number | null>(null);
  const lastSubmitRef = useRef<{ uid: string; ts: number } | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (state.status === "success") {
      setUid("");
      inputRef.current?.focus();
    }
  }, [state.status]);

  useEffect(() => {
    if (pending || uid.trim().length < 4) {
      return;
    }
    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
    }
    debounceRef.current = window.setTimeout(() => {
      submitUid(uid);
    }, 300);
  }, [uid, pending]);

  const submitUid = (value: string) => {
    const normalized = value.trim();
    if (!normalized || pending) {
      return;
    }
    const now = Date.now();
    if (
      lastSubmitRef.current &&
      lastSubmitRef.current.uid === normalized &&
      now - lastSubmitRef.current.ts < 1500
    ) {
      return;
    }
    lastSubmitRef.current = { uid: normalized, ts: now };
    formRef.current?.requestSubmit();
  };

  const statusStyle =
    state.status === "error"
      ? "border-rose-200 bg-rose-50 text-rose-700"
      : state.status === "success"
        ? "border-emerald-100 bg-emerald-50 text-emerald-700"
        : "border-slate-200 bg-slate-50 text-slate-500";

  return (
    <section className="rounded-[2.5rem] border border-slate-100 bg-white p-8 shadow-[0_24px_80px_rgba(15,23,42,0.12)]">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Kiosko NFC</h3>
          <p className="mt-1 text-sm text-slate-500">
            Mantén esta pantalla abierta y acerca la tarjeta al lector.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white">
          <CreditCard size={14} />
          Listo para leer
        </div>
      </div>

      <div className={`mt-6 rounded-2xl border px-4 py-3 text-sm ${statusStyle}`}>
        {state.message ?? "Esperando tarjeta..."}
      </div>

      <form ref={formRef} action={action} className="mt-6 space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700">
            UID de tarjeta
          </label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              ref={inputRef}
              name="uid"
              type="text"
              value={uid}
              onChange={(event) => setUid(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  if (debounceRef.current) {
                    window.clearTimeout(debounceRef.current);
                  }
                  submitUid(event.currentTarget.value);
                }
              }}
              onBlur={() => {
                setTimeout(() => inputRef.current?.focus(), 100);
              }}
              inputMode="numeric"
              autoComplete="off"
              placeholder="Pasa la tarjeta por el lector"
              className="w-full flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200"
            />
            <button
              type="button"
              onClick={() => inputRef.current?.focus()}
              className="rounded-full border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
            >
              Activar lector
            </button>
          </div>
        </div>
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-full bg-gradient-to-r from-teal-500 via-sky-500 to-sky-600 py-3 text-sm font-semibold text-white shadow-xl shadow-sky-200/70 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {pending ? "Registrando..." : "Registrar lectura"}
        </button>
      </form>
    </section>
  );
}
