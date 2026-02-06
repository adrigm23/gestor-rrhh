"use server";

import { createHmac } from "crypto";

const normalizeNfcUid = (value: string) =>
  value.replace(/[\s-]/g, "").trim();

const getNfcSecret = () =>
  process.env.NFC_SECRET || process.env.AUTH_SECRET || "insecure-nfc-secret";

export const hashNfcUid = (value: string) => {
  const normalized = normalizeNfcUid(value);
  if (!normalized) {
    return "";
  }
  return createHmac("sha256", getNfcSecret()).update(normalized).digest("hex");
};

export const sanitizeNfcUid = (value: string) => normalizeNfcUid(value);
