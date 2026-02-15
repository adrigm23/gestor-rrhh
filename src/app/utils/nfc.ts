import "server-only";
import { createHmac } from "crypto";

const normalizeNfcUid = (value: string) =>
  value.replace(/[\s-]/g, "").trim();

const getNfcSecret = () => {
  const secret = process.env.NFC_SECRET || process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("NFC_SECRET o AUTH_SECRET no configurado.");
  }
  return secret;
};

export const hashNfcUid = (value: string) => {
  const normalized = normalizeNfcUid(value);
  if (!normalized) {
    return "";
  }
  return createHmac("sha256", getNfcSecret()).update(normalized).digest("hex");
};

export const sanitizeNfcUid = (value: string) => normalizeNfcUid(value);
