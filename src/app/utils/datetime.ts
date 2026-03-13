const APP_LOCALE = "es-ES";
const APP_TIME_ZONE = "Europe/Madrid";

type DateValue = Date | string | number;

const toDate = (value: DateValue) =>
  value instanceof Date ? value : new Date(value);

const isValidDate = (value: Date) => !Number.isNaN(value.getTime());

const formatWithOptions = (
  value: DateValue,
  options: Intl.DateTimeFormatOptions,
  fallback = "Sin dato",
) => {
  const date = toDate(value);
  if (!isValidDate(date)) return fallback;

  return new Intl.DateTimeFormat(APP_LOCALE, {
    timeZone: APP_TIME_ZONE,
    ...options,
  }).format(date);
};

export const getAppHour = (value: DateValue) => {
  const date = toDate(value);
  if (!isValidDate(date)) return 0;

  return Number.parseInt(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: APP_TIME_ZONE,
      hour: "2-digit",
      hourCycle: "h23",
    }).format(date),
    10,
  );
};

export const formatAppDate = (
  value: DateValue,
  options: Intl.DateTimeFormatOptions = {},
  fallback = "Sin dato",
) =>
  formatWithOptions(
    value,
    { year: "numeric", month: "numeric", day: "numeric", ...options },
    fallback,
  );

export const formatAppTime = (
  value: DateValue,
  options: Intl.DateTimeFormatOptions = {},
  fallback = "Sin dato",
) =>
  formatWithOptions(
    value,
    { hour: "2-digit", minute: "2-digit", ...options },
    fallback,
  );

export const formatAppDateTime = (
  value: DateValue,
  options: Intl.DateTimeFormatOptions = {},
  fallback = "Sin dato",
) =>
  formatWithOptions(
    value,
    {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      ...options,
    },
    fallback,
  );

export const formatAppLongDate = (
  value: DateValue,
  options: Intl.DateTimeFormatOptions = {},
  fallback = "Sin dato",
) =>
  formatWithOptions(
    value,
    {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      ...options,
    },
    fallback,
  );

export { APP_LOCALE, APP_TIME_ZONE };
