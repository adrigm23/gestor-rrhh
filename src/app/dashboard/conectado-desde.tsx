"use client";

import { useEffect, useState } from "react";
import { formatAppTime } from "../utils/datetime";

type ConectadoDesdeProps = {
  startIso?: string | null;
  fallback?: string;
  prefix?: string;
  locale?: string;
};

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

    setLabel(`${prefix} ${formatAppTime(startIso)}`);
  }, [fallback, locale, prefix, startIso]);

  return <span suppressHydrationWarning>{label}</span>;
}
