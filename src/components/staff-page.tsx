/** Título de pantalla del staff: condensado y grande, como los títulos del ticket. */
export function StaffTitle({ label, children }: { label?: string; children: React.ReactNode }) {
  return (
    <div>
      {label && <p className="label-mono text-muted-foreground">{label}</p>}
      <h1 className="font-display font-stretch-condensed mt-2 text-[clamp(3rem,13vw,5.5rem)] leading-[0.85] font-extrabold uppercase">
        {children}
      </h1>
    </div>
  );
}
