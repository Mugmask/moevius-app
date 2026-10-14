/**
 * El fondo de las pantallas de la noche: la luz violeta de la home con grano, quieta
 * (sin animar, para que el scroll no repinte). Lo usan la entrada, la compra y el staff.
 */
export function AuraBackdrop() {
  return (
    <div aria-hidden className="grain pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="glow text-aura absolute top-0 left-1/2 -z-20 size-[120vw] max-w-[56rem] -translate-x-1/2 rounded-full opacity-35" />
    </div>
  );
}
