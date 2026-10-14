"use client";

import { type IScannerError, Scanner } from "@yudiel/react-qr-scanner";
import { Check, X } from "lucide-react";
import { useRef, useState, useTransition } from "react";

import { TIME_FORMAT } from "@/lib/format";
import { cn } from "@/lib/utils";

import type { CheckInResult } from "./actions";

const RESULT_MESSAGES: Record<CheckInResult["result"], string> = {
  ok: "Adelante",
  already_used: "Ya entró",
  wrong_event: "Es de otra fecha",
  void: "Entrada anulada",
  not_found: "QR inválido",
  error: "Error, probá de nuevo",
};

/** Sin cámara el staff ve un cuadro negro: le decimos por qué y que use la carga manual. */
function cameraErrorMessage(error: IScannerError) {
  switch (error.kind) {
    case "permission-denied":
    case "security":
      return "No hay permiso para usar la cámara. Habilitalo en los ajustes del navegador y recargá.";
    case "no-camera":
      return "Este dispositivo no tiene cámara.";
    case "in-use":
      return "Otra app está usando la cámara. Cerrala y recargá.";
    case "insecure-context":
      return "La cámara solo funciona con https.";
    default:
      return "No se pudo abrir la cámara. Recargá la página.";
  }
}

/** Cuánto queda en pantalla el resultado antes de volver a escanear. */
const RESULT_DISPLAY_MS = 2500;

export function DoorScanner({ action }: { action: (scanned: string) => Promise<CheckInResult> }) {
  const [result, setResult] = useState<CheckInResult | null>(null);
  const [pending, startTransition] = useTransition();
  const [manualCode, setManualCode] = useState("");
  const timeout = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [checkIns, setCheckIns] = useState(0);
  const [cameraError, setCameraError] = useState<string | null>(null);

  function validate(value: string) {
    if (pending || result) return;
    startTransition(async () => {
      const response = await action(value);
      setResult(response);
      if (response.result === "ok") {
        setCheckIns((n) => n + 1);
        navigator.vibrate?.(80);
      } else {
        navigator.vibrate?.([80, 60, 80]);
      }
      clearTimeout(timeout.current);
      timeout.current = setTimeout(() => setResult(null), RESULT_DISPLAY_MS);
    });
  }

  function dismiss() {
    clearTimeout(timeout.current);
    setResult(null);
  }

  return (
    <div className="relative flex flex-1 flex-col">
      <div className="mx-auto w-full max-w-md px-4 pt-4">
        <div className="relative aspect-square w-full overflow-hidden rounded-3xl bg-black">
          <Scanner
            onScan={(codes) => codes[0] && validate(codes[0].rawValue)}
            formats={["qr_code"]}
            // Sin esto, el mismo QR no dispara dos veces seguidas: si la primera vez
            // falló la red, no se podría reintentar. Mientras hay resultado está pausado.
            allowMultiple
            scanDelay={RESULT_DISPLAY_MS}
            paused={Boolean(result) || pending}
            sound={false}
            constraints={{ facingMode: "environment" }}
            // El marco lo dibujamos nosotros; la linterna sí (adentro de un boliche ayuda).
            components={{ finder: false, torch: true }}
            onError={(error) => setCameraError(cameraErrorMessage(error))}
          />
          {/* Marco de apuntar: cuatro esquinas naranjas; laten mientras valida. */}
          <div
            aria-hidden
            className={cn("pointer-events-none absolute inset-[14%]", pending && "animate-pulse")}
          >
            {[
              "top-0 left-0 border-t-4 border-l-4 rounded-tl-2xl",
              "top-0 right-0 border-t-4 border-r-4 rounded-tr-2xl",
              "bottom-0 left-0 border-b-4 border-l-4 rounded-bl-2xl",
              "bottom-0 right-0 border-b-4 border-r-4 rounded-br-2xl",
            ].map((corner) => (
              <span key={corner} className={cn("border-primary absolute size-12", corner)} />
            ))}
          </div>
          {cameraError && (
            <p
              role="alert"
              className="bg-paper text-ink absolute inset-0 flex items-center justify-center p-8 text-center font-semibold"
            >
              {cameraError}
            </p>
          )}
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-md flex-col gap-4 p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="label-mono text-muted-foreground" aria-live="polite">
            {pending ? "Validando…" : "Apuntá al QR"}
          </p>
          <p className="label-mono border-foreground/20 rounded-full border-2 px-3 py-1">
            <span className="text-foreground font-bold tabular-nums">{checkIns}</span>{" "}
            <span className="text-muted-foreground">
              {checkIns === 1 ? "ingreso" : "ingresos"} en este celu
            </span>
          </p>
        </div>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (manualCode.trim()) validate(manualCode);
            setManualCode("");
          }}
        >
          <input
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            placeholder="O pegá el código"
            aria-label="Código de la entrada"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="go"
            // 16px: con menos, iOS hace zoom al tocar el input.
            className="border-input bg-foreground/5 text-foreground placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-primary/30 h-12 min-w-0 flex-1 rounded-full border px-4 text-base font-medium outline-none focus-visible:ring-4"
          />
          <button
            type="submit"
            className="label-mono border-foreground/30 hover:border-foreground h-12 rounded-full border-2 px-5 font-bold transition-colors"
          >
            Validar
          </button>
        </form>
      </div>

      {/* El resultado tapa todo: verde si entra, rojo si no. Se lee de lejos y a oscuras. */}
      {result && (
        <button
          type="button"
          onClick={dismiss}
          className={cn(
            "fixed inset-0 z-50 flex flex-col items-center justify-center gap-5 p-8 text-center",
            result.result === "ok" ? "bg-go text-go-foreground" : "bg-destructive text-white",
          )}
        >
          <span className="grid size-24 place-items-center rounded-full border-[6px] border-current">
            {result.result === "ok" ? (
              <Check aria-hidden className="size-14" strokeWidth={3} />
            ) : (
              <X aria-hidden className="size-14" strokeWidth={3} />
            )}
          </span>
          <span className="font-display font-stretch-condensed text-[clamp(3.5rem,20vw,8rem)] leading-[0.85] font-extrabold text-balance uppercase">
            {RESULT_MESSAGES[result.result]}
          </span>
          {result.buyer_name && (
            <span className="font-display font-stretch-condensed text-3xl leading-tight font-extrabold">
              {result.buyer_name}
              <span className="block font-mono text-base font-bold tracking-[0.15em] uppercase opacity-80">
                {result.ticket_type}
              </span>
            </span>
          )}
          {result.result === "already_used" && result.checked_in_at && (
            <span className="font-mono text-lg font-bold tracking-[0.1em] uppercase">
              Escaneada a las {TIME_FORMAT.format(new Date(result.checked_in_at))}
            </span>
          )}
          <span className="label-mono mt-4 inline-flex min-h-12 items-center rounded-full border-2 border-current px-6 font-bold">
            Siguiente
          </span>
        </button>
      )}
    </div>
  );
}
