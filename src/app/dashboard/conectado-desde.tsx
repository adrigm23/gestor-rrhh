"use client";

import { useEffect, useState } from "react";

type ConectadoDesdeProps = {
  startIso?: string | null;
  fallback?: string;
  prefix?: string;
  locale?: string;
};

const formatTime = (iso: string, locale: string) =>
  new Date(iso).toLocaleTimeString(locale, {
    hour: "2-digit",
    minute: "2-digit",
  });

export default function ConectadoDesde({
  startIso,
  fallback = "Sin jornada activa",
  prefix = "Conectado desde",
  locale = "es-ES",
}: ConectadoDesdeProps) {
  const [label, setLabel] = useState(fallback);

  useEffect(() => {
    if (!startIso) {
      setLabel(fallback);
      return;
    }

    setLabel(`${prefix} ${formatTime(startIso, locale)}`);
  }, [fallback, locale, prefix, startIso]);

  return <span suppressHydrationWarning>{label}</span>;
}
