"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Re-renderiza la página cada tanto, para esperar que llegue el webhook de MP. */
export function AutoRefresh({
  everyMs = 4000,
  maxTimes = 20,
}: {
  everyMs?: number;
  maxTimes?: number;
}) {
  const router = useRouter();

  useEffect(() => {
    let count = 0;
    const id = setInterval(() => {
      count += 1;
      if (count > maxTimes) return clearInterval(id);
      router.refresh();
    }, everyMs);
    return () => clearInterval(id);
  }, [router, everyMs, maxTimes]);

  return null;
}
