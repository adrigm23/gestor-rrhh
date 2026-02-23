"use client";

import { useRef, useState } from "react";
import { LogOut } from "lucide-react";
import { toggleFichaje } from "../actions/fichaje-actions";

type FichajeGeoFormProps = {
  disabled?: boolean;
  accionLabel: string;
  accionHelper: string;
};

const GEO_OPTIONS: PositionOptions = {
  enableHighAccuracy: false,
  timeout: 8000,
  maximumAge: 60_000,
};

export default function FichajeGeoForm({
  disabled = false,
  accionLabel,
  accionHelper,
}: FichajeGeoFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const latRef = useRef<HTMLInputElement>(null);
  const lonRef = useRef<HTMLInputElement>(null);
  const skipRef = useRef(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const submitForm = () => {
    skipRef.current = true;
    const form = formRef.current;
    if (!form) return;
    if (typeof form.requestSubmit === "function") {
      form.requestSubmit();
      return;
    }
    form.submit();
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    if (skipRef.current) {
      skipRef.current = false;
      return;
    }

    if (disabled) {
      event.preventDefault();
      return;
    }

    event.preventDefault();
    setGeoError(null);
    setIsLoading(true);

    if (!("geolocation" in navigator)) {
      setGeoError("Tu navegador no permite geolocalizacion. Se registrara sin ubicacion.");
      submitForm();
      setIsLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (latRef.current) {
          latRef.current.value = String(pos.coords.latitude);
        }
        if (lonRef.current) {
          lonRef.current.value = String(pos.coords.longitude);
        }
        submitForm();
        setIsLoading(false);
      },
      () => {
        setGeoError("No se pudo obtener tu ubicacion. Se registrara sin ubicacion.");
        submitForm();
        setIsLoading(false);
      },
      GEO_OPTIONS,
    );
  };

  return (
    <form ref={formRef} action={toggleFichaje} onSubmit={handleSubmit}>
      <input ref={latRef} type="hidden" name="latitud" />
      <input ref={lonRef} type="hidden" name="longitud" />
      <button
        type="submit"
        disabled={disabled || isLoading}
        className="w-full rounded-2xl border border-[color:var(--card-border)] bg-[color:var(--surface)] p-6 text-center shadow-[0_14px_30px_rgba(15,23,42,0.08)] transition hover:border-sky-200 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
          <LogOut size={20} />
        </div>
        <p className="mt-4 text-sm font-semibold text-[color:var(--text-primary)]">
          {accionLabel}
        </p>
        <p className="text-xs text-[color:var(--text-muted)]">{accionHelper}</p>
      </button>
      <p className="mt-3 text-[11px] text-[color:var(--text-muted)]">
        Se solicitara tu ubicacion al registrar entrada o salida.
      </p>
      {geoError && (
        <p className="mt-2 text-xs text-amber-600">{geoError}</p>
      )}
    </form>
  );
}
