"use client";

import { type IScannerError, Scanner } from "@yudiel/react-qr-scanner";
import { useRef, useState, useTransition } from "react";

import { Pill } from "@/components/brand";
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
      <div className="relative aspect-square w-full overflow-hidden bg-black sm:mx-auto sm:max-w-md">
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
          onError={(error) => setCameraError(cameraErrorMessage(error))}
        />
        {cameraError && (
          <p
            role="alert"
            className="bg-foreground text-background absolute inset-0 flex items-center justify-center p-8 text-center font-bold"
          >
            {cameraError}
          </p>
        )}
      </div>

      <div className="mx-auto flex w-full max-w-md flex-col gap-4 p-4">
        <p className="text-muted-foreground text-center text-sm font-bold">
          {pending ? "Validando…" : `Apuntá al QR · ${checkIns} ingresos en este celu`}
        </p>
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
            className="border-foreground bg-card h-12 min-w-0 flex-1 rounded-full border-2 px-4 text-base font-medium"
          />
          <button
            type="submit"
            className="bg-foreground text-background h-12 rounded-full px-5 text-base font-bold"
          >
            Validar
          </button>
        </form>
      </div>

      {result && (
        <button
          type="button"
          onClick={dismiss}
          className={cn(
            "fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 p-8 text-center",
            result.result === "ok"
              ? "bg-primary text-primary-foreground"
              : "bg-destructive text-white",
          )}
        >
          <span className="font-display text-6xl leading-none uppercase">
            {RESULT_MESSAGES[result.result]}
          </span>
          {result.buyer_name && (
            <span className="text-2xl font-bold">
              {result.buyer_name} · {result.ticket_type}
            </span>
          )}
          {result.result === "already_used" && result.checked_in_at && (
            <span className="text-lg font-bold">
              Escaneada a las {TIME_FORMAT.format(new Date(result.checked_in_at))}
            </span>
          )}
          <Pill tone="paper" render={<span />} nativeButton={false} className="mt-6">
            Siguiente
          </Pill>
        </button>
      )}
    </div>
  );
}
