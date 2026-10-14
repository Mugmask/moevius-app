/**
 * Quién vende las entradas: lo piden la Ley de Defensa del Consumidor (identificar al
 * proveedor) y la de Datos Personales (el responsable de la base). Lo usan los términos,
 * la política de privacidad y el Botón de arrepentimiento.
 *
 * `cuit` y `address` son opcionales: si están en null, las páginas no los muestran.
 * ⚠️ Completar `holder` y `email` antes de vender en producción.
 */
export const LEGAL: {
  /** Nombre y apellido (o razón social) de quien vende: el titular de la cuenta de MP. */
  holder: string;
  cuit: string | null;
  /** Domicilio legal, completo. */
  address: string | null;
  /** Mail de contacto: llegan acá los pedidos del Botón de arrepentimiento. */
  email: string;
  instagram: string;
  /** Última actualización de los términos y la política de privacidad. */
  updatedAt: string;
} = {
  holder: "Moevius",
  cuit: null,
  address: null,
  email: "moevius.entradas@gmail.com",
  instagram: "https://www.instagram.com/moevius_",
  updatedAt: "14 de octubre de 2026",
};

/** "Fulano, CUIT 20-…, con domicilio en …": solo lo que esté cargado. */
export function legalIdentity() {
  return [LEGAL.cuit && `CUIT ${LEGAL.cuit}`, LEGAL.address && `con domicilio en ${LEGAL.address}`]
    .filter(Boolean)
    .map((part) => `, ${part}`)
    .join("");
}

/** Formulario de reclamos de la Ventanilla Única Federal de Defensa del Consumidor. */
export const CONSUMER_DEFENSE_URL =
  "https://www.argentina.gob.ar/produccion/defensadelconsumidor/formulario";

/** Plazo para arrepentirse de una compra online (art. 34 Ley 24.240, art. 1110 CCyC). */
export const WITHDRAWAL_DAYS = 10;
