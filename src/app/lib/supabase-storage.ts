"use server";

import crypto from "crypto";

const SUPABASE_URL = process.env.SUPABASE_URL ?? "";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET ?? "justificantes";
const EXPORT_BUCKET = process.env.SUPABASE_EXPORT_BUCKET ?? STORAGE_BUCKET;
const STORAGE_BASE_URL = SUPABASE_URL.replace(/\/storage\/v1\/?$/, "");

const requireConfig = () => {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    throw new Error("Supabase storage no configurado");
  }
};

const allowedMimeTypes = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
]);

const signatureMatches = (bytes: Uint8Array, signature: number[]) =>
  signature.every((value, index) => bytes[index] === value);

const sniffMime = (bytes: Uint8Array) => {
  if (signatureMatches(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d])) {
    return "application/pdf";
  }
  if (signatureMatches(bytes, [0xff, 0xd8, 0xff])) {
    return "image/jpeg";
  }
  if (
    signatureMatches(bytes, [
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    ])
  ) {
    return "image/png";
  }
  return null;
};

const readFileHeader = async (file: File, length = 12) => {
  const buffer = await file.slice(0, length).arrayBuffer();
  return new Uint8Array(buffer);
};

const sanitizeFilename = (value: string) =>
  value.replace(/[^a-zA-Z0-9._-]/g, "_");

export type UploadResult = {
  ruta: string;
  nombre: string;
  mime: string;
  size: number;
};

export const uploadJustificante = async (
  file: File,
  userId: string,
): Promise<UploadResult> => {
  requireConfig();

  const headerBytes = await readFileHeader(file);
  const detectedMime = sniffMime(headerBytes);

  if (!detectedMime || !allowedMimeTypes.has(detectedMime)) {
    throw new Error("Tipo de archivo no permitido");
  }

  if (
    file.type &&
    file.type !== detectedMime &&
    file.type !== "application/octet-stream"
  ) {
    throw new Error("Tipo de archivo no permitido");
  }

  const maxSize = 5 * 1024 * 1024;
  if (file.size > maxSize) {
    throw new Error("Archivo demasiado grande");
  }

  const safeName = sanitizeFilename(file.name || "justificante");
  const unique = crypto.randomUUID();
  const ruta = `justificantes/${userId}/${unique}-${safeName}`;

  const arrayBuffer = await file.arrayBuffer();
  const response = await fetch(
    `${STORAGE_BASE_URL}/storage/v1/object/${STORAGE_BUCKET}/${ruta}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        apikey: SERVICE_ROLE_KEY,
        "Content-Type": detectedMime,
        "x-upsert": "false",
      },
      body: Buffer.from(arrayBuffer),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Error subiendo archivo: ${errorText}`);
  }

  return {
    ruta,
    nombre: file.name,
    mime: detectedMime,
    size: file.size,
  };
};

export const createSignedUrl = async (
  ruta: string,
  seconds: number,
  bucket: string = STORAGE_BUCKET,
) => {
  requireConfig();

  const response = await fetch(
    `${STORAGE_BASE_URL}/storage/v1/object/sign/${bucket}/${ruta}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        apikey: SERVICE_ROLE_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ expiresIn: seconds }),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Error generando URL: ${errorText}`);
  }

  const payload = (await response.json()) as { signedURL?: string };
  if (!payload.signedURL) {
    throw new Error("No se genero URL");
  }

  const signedPath = payload.signedURL.startsWith("/")
    ? payload.signedURL
    : `/${payload.signedURL}`;
  const fullPath = signedPath.startsWith("/storage/v1/")
    ? signedPath
    : `/storage/v1${signedPath}`;
  return `${STORAGE_BASE_URL}${fullPath}`;
};

export const deleteJustificante = async (ruta: string) => {
  requireConfig();

  const response = await fetch(
    `${STORAGE_BASE_URL}/storage/v1/object/${STORAGE_BUCKET}/${ruta}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        apikey: SERVICE_ROLE_KEY,
      },
    },
  );

  if (!response.ok && response.status !== 404) {
    const errorText = await response.text();
    throw new Error(`Error eliminando archivo: ${errorText}`);
  }
};

export const uploadExportCsv = async (content: string, ruta: string) => {
  requireConfig();

  const response = await fetch(
    `${STORAGE_BASE_URL}/storage/v1/object/${EXPORT_BUCKET}/${ruta}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        apikey: SERVICE_ROLE_KEY,
        "Content-Type": "text/csv",
        "x-upsert": "true",
      },
      body: Buffer.from(content),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Error subiendo exportacion: ${errorText}. ` +
        `Revisa los tipos MIME permitidos en el bucket "${EXPORT_BUCKET}" (debe permitir text/csv).`,
    );
  }

  return ruta;
};
