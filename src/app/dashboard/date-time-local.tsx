"use client";

import { useEffect, useState } from "react";
import { formatAppDateTime } from "../utils/datetime";

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

    setLabel(formatAppDateTime(value, {}, fallback));
  }, [fallback, locale, value]);

  return <span suppressHydrationWarning>{label}</span>;
}
