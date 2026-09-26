export const TIMEZONE = "America/Argentina/Buenos_Aires";

export const PRICE_FORMAT = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

/** "20:08", en hora de Argentina. */
export const TIME_FORMAT = new Intl.DateTimeFormat("es-AR", {
  timeZone: TIMEZONE,
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/** "25/09, 20:08", en hora de Argentina. */
export const DATE_TIME_FORMAT = new Intl.DateTimeFormat("es-AR", {
  timeZone: TIMEZONE,
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});
