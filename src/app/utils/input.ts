import "server-only";

type SanitizeStringOptions = {
  trim?: boolean;
  collapseWhitespace?: boolean;
  allowNewlines?: boolean;
  maxLength?: number;
};

const CONTROL_CHARS = /[\u0000-\u001f\u007f]/g;
const CONTROL_CHARS_WITH_NEWLINES = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g;
const DEFAULT_MAX_LENGTH = 4096;

const toStringValue = (value: unknown) => (typeof value === "string" ? value : "");

export const sanitizeString = (
  value: unknown,
  options: SanitizeStringOptions = {},
) => {
  const {
    trim = true,
    collapseWhitespace = false,
    allowNewlines = false,
    maxLength = DEFAULT_MAX_LENGTH,
  } = options;

  let sanitized = toStringValue(value).normalize("NFKC");
  sanitized = sanitized.replace(
    allowNewlines ? CONTROL_CHARS_WITH_NEWLINES : CONTROL_CHARS,
    "",
  );

  if (collapseWhitespace) {
    sanitized = sanitized.replace(/[^\S\r\n]+/g, " ");
  }

  if (trim) {
    sanitized = sanitized.trim();
  }

  if (maxLength > 0 && sanitized.length > maxLength) {
    sanitized = sanitized.slice(0, maxLength);
  }

  return sanitized;
};

export const sanitizeEmail = (value: unknown) =>
  sanitizeString(value, { maxLength: 254 }).toLowerCase();

export const sanitizeId = (value: unknown) =>
  sanitizeString(value, { maxLength: 128 }).replace(/[^a-zA-Z0-9_-]/g, "");

export const sanitizeFormDataString = (
  formData: FormData,
  key: string,
  options?: SanitizeStringOptions,
) => sanitizeString(formData.get(key), options);

export const sanitizeFormDataEmail = (formData: FormData, key: string) =>
  sanitizeEmail(formData.get(key));

export const sanitizeFormDataId = (formData: FormData, key: string) =>
  sanitizeId(formData.get(key));

export const sanitizeParam = (
  value: string | string[] | undefined,
  options?: SanitizeStringOptions,
) => sanitizeString(Array.isArray(value) ? value[0] : value, options);

export const sanitizeUrlSearchParam = (
  searchParams: URLSearchParams,
  key: string,
  options?: SanitizeStringOptions,
) => sanitizeString(searchParams.get(key), options);
