import { qrSvg } from "@/lib/qr";
import { cn } from "@/lib/utils";

/** QR de una entrada real. El SVG sale de la librería `qrcode`, no de input del usuario. */
export async function RealQr({ code, className }: { code: string; className?: string }) {
  const svg = await qrSvg(code);

  return (
    <div
      role="img"
      aria-label="Código QR de la entrada"
      className={cn(
        "border-foreground shrink-0 rounded-md border-2 bg-white p-2 [&_svg]:size-full",
        className,
      )}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
