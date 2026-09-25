import Link from "next/link";

import { signOut } from "@/app/admin/actions";
import { Wordmark } from "@/components/brand";
import type { StaffRole } from "@/lib/staff";

export function StaffHeader({ email, role }: { email?: string; role: StaffRole }) {
  return (
    <header className="border-foreground bg-card border-b-2">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-6">
        <div className="flex items-center gap-6">
          <Link href={role === "admin" ? "/admin" : "/door"}>
            <Wordmark />
          </Link>
          <nav className="flex gap-1 text-sm font-semibold">
            {role === "admin" && (
              <Link className="hover:bg-muted rounded-full px-3 py-1.5" href="/admin">
                Ventas
              </Link>
            )}
            <Link className="hover:bg-muted rounded-full px-3 py-1.5" href="/door">
              Puerta
            </Link>
          </nav>
        </div>
        <form action={signOut} className="flex items-center gap-3 text-sm">
          <span className="text-muted-foreground hidden font-medium sm:inline">{email}</span>
          <button type="submit" className="hover:bg-muted rounded-full px-3 py-1.5 font-bold">
            Salir
          </button>
        </form>
      </div>
    </header>
  );
}
