"use client";

import { Scanner } from "@yudiel/react-qr-scanner";
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

/** Cuánto queda en pantalla el resultado antes de volver a escanear. */
const RESULT_DISPLAY_MS = 2500;

export function DoorScanner({ action }: { action: (scanned: string) => Promise<CheckInResult> }) {
  const [result, setResult] = useState<CheckInResult | null>(null);
  const [pending, startTransition] = useTransition();
  const [manualCode, setManualCode] = useState("");
  const timeout = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [checkIns, setCheckIns] = useState(0);

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
        />
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
            className="border-foreground bg-card h-11 min-w-0 flex-1 rounded-full border-2 px-4 text-sm font-medium"
          />
          <button
            type="submit"
            className="bg-foreground text-background rounded-full px-5 text-sm font-bold"
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
            result.result === "ok" ? "bg-primary text-primary-foreground" : "bg-red-600 text-white",
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
