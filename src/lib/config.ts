/**
 * Reglas del negocio en un solo lugar. Las que aplica la DB (`create_order`) se le
 * pasan como parámetro desde acá, así la UI y la base nunca dicen cosas distintas.
 */

/** Cuánto se guarda una reserva sin pagar. También es lo que dura la orden de MP. */
export const RESERVATION_MINUTES = 15;

/**
 * Reservas sin pagar vigentes permitidas por IP y fecha, contra el acaparamiento de
 * cupo. Alto a propósito: con datos móviles (CGNAT) o el wifi de un lugar, mucha gente
 * comparte IP justo en el pico de venta. Contra bots está Turnstile.
 */
export const MAX_PENDING_RESERVATIONS_PER_IP = 15;

/** Por debajo de esta fracción del cupo, la fecha se muestra como "Últimas entradas". */
export const FEW_LEFT_THRESHOLD = 0.15;
