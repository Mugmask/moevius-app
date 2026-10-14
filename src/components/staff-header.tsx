import Link from "next/link";

import { signOut } from "@/app/admin/actions";
import { Wordmark } from "@/components/brand";
import type { StaffRole } from "@/lib/staff";
import { cn } from "@/lib/utils";

const NAV_LINK =
  "label-mono hover:bg-foreground/10 inline-flex min-h-10 items-center rounded-full px-3 transition-colors";

/**
 * Barra del staff (admin y puerta): la M con "MOEVIUS" (en el celu solo la M), las
 * secciones y salir. `current`
 * marca la sección abierta en naranja.
 */
export function StaffHeader({
  email,
  role,
  current,
}: {
  email?: string;
  role: StaffRole;
  current?: "ventas" | "puerta";
}) {
  return (
    <header className="border-border bg-background/85 sticky top-0 z-30 border-b backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3 sm:gap-6">
          <Link href={role === "admin" ? "/admin" : "/door"} aria-label="Inicio del staff">
            <Wordmark className="[&>span]:hidden sm:[&>span]:inline" />
          </Link>
          <nav aria-label="Staff" className="flex gap-1">
            {role === "admin" && (
              <Link
                href="/admin"
                aria-current={current === "ventas" ? "page" : undefined}
                className={cn(NAV_LINK, current === "ventas" && "text-primary")}
              >
                Ventas
              </Link>
            )}
            <Link
              href="/door"
              aria-current={current === "puerta" ? "page" : undefined}
              className={cn(NAV_LINK, current === "puerta" && "text-primary")}
            >
              Puerta
            </Link>
          </nav>
        </div>
        <form action={signOut} className="flex items-center gap-3">
          <span className="label-mono text-muted-foreground hidden lg:inline">{email}</span>
          <button
            type="submit"
            className="label-mono border-foreground/30 hover:border-foreground inline-flex min-h-10 items-center rounded-full border-2 px-3 transition-colors"
          >
            Salir
          </button>
        </form>
      </div>
    </header>
  );
}
