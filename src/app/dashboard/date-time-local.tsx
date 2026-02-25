"use client";

import { useEffect, useState } from "react";

type DateTimeLocalProps = {
  value?: string | null;
  fallback?: string;
  locale?: string;
};

export default function DateTimeLocal({
  value,
  fallback = "Sin dato",
  locale = "es-ES",
}: DateTimeLocalProps) {
  const [label, setLabel] = useState(fallback);

  useEffect(() => {
    if (!value) {
      setLabel(fallback);
      return;
    }

    const date = new Date(value);
    setLabel(Number.isNaN(date.getTime()) ? fallback : date.toLocaleString(locale));
  }, [fallback, locale, value]);

  return <span suppressHydrationWarning>{label}</span>;
}
