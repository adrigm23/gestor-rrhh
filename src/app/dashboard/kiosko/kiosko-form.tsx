"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  registrarNfcKiosko,
  type KioskoState,
} from "../../actions/kiosko-actions";
import { Radio, Wifi } from "lucide-react";

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
        : "border-[color:var(--card-border)] bg-[color:var(--surface-muted)] text-[color:var(--text-muted)]";

  return (
    <div className="space-y-6">
      <div className="rounded-[2.5rem] border border-[color:var(--card-border)] bg-[color:var(--surface)] p-8 text-center shadow-[var(--shadow-soft)]">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-teal-50 text-teal-500">
          <Radio size={32} />
        </div>
        <h3 className="mt-6 text-2xl font-semibold text-[color:var(--text-primary)]">
          Tap your card
        </h3>
        <p className="mt-2 text-sm text-[color:var(--text-muted)]">
          Esperando la senal NFC para registrar el fichaje.
        </p>
        <div className={`mt-6 rounded-2xl border px-4 py-3 text-sm ${statusStyle}`}>
          {state.message ?? "Escuchando lector..."}
        </div>
      </div>

      <form ref={formRef} action={action} className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-semibold text-[color:var(--text-secondary)]">
            UID / Card stream
          </label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--text-muted)]">
                <Wifi size={16} />
              </span>
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
                placeholder="Listening..."
                className="w-full rounded-2xl border border-[color:var(--card-border)] bg-transparent px-10 py-3 text-sm text-[color:var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-sky-200"
              />
            </div>
            <button
              type="button"
              onClick={() => inputRef.current?.focus()}
              className="rounded-full border border-[color:var(--card-border)] px-4 py-3 text-sm font-semibold text-[color:var(--text-secondary)] transition hover:text-[color:var(--text-primary)]"
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
    </div>
  );
}
