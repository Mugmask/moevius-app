import { ScanLine } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { StaffHeader } from "@/components/staff-header";
import { AuraBackdrop } from "@/components/aura-backdrop";
import { StaffTitle } from "@/components/staff-page";
import { TEST_MODE } from "@/lib/environment";
import { formatEventDates } from "@/lib/events";
import { requireStaff } from "@/lib/staff";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Puerta · Moevius", robots: { index: false } };

export default async function DoorPage() {
  const staff = await requireStaff();
  const supabase = await createClient();

  // Fechas que todavía no terminaron: la de esta noche queda primera.
  const { data: events, error } = await supabase
    .from("events")
    .select("*")
    .eq("status", "published")
    .eq("is_test", TEST_MODE)
    .gt("ends_at", new Date().toISOString())
    .order("starts_at")
    .limit(5);
  if (error) throw error;

  return (
    <>
      <StaffHeader email={staff.user.email} role={staff.role} current="puerta" />
      <main className="relative isolate mx-auto w-full max-w-md flex-1 px-4 pt-10 pb-16 sm:px-6">
        <AuraBackdrop />
        <StaffTitle label="Staff">Puerta</StaffTitle>
        <p className="text-muted-foreground mt-4 font-medium">¿Qué fecha estás controlando?</p>

        <ul className="mt-8 flex flex-col gap-4">
          {events.map((event) => {
            const { day, month, time } = formatEventDates(event);
            return (
              <li key={event.id}>
                {/* Cada fecha, un talón de papel: toca y abre el escáner. */}
                <Link
                  href={`/door/${event.slug}`}
                  className="group bg-paper paper-crumple text-ink focus-visible:ring-primary/50 flex items-center justify-between gap-4 px-5 py-4 shadow-[0_18px_30px_oklch(0_0_0/0.5)] transition-transform outline-none hover:-translate-y-0.5 focus-visible:ring-4"
                >
                  <span className="min-w-0">
                    <span className="font-display font-stretch-condensed block text-4xl leading-[0.9] font-extrabold uppercase">
                      <span className="bg-highlighter/80 px-1">
                        {day} {month.slice(0, 3)}
                      </span>
                    </span>
                    <span className="mt-2 block font-mono text-xs font-bold tracking-[0.1em] uppercase">
                      {event.venue} · {time.replace(" — ", " → ")}
                    </span>
                  </span>
                  <ScanLine aria-hidden className="size-7 shrink-0" />
                </Link>
              </li>
            );
          })}
          {events.length === 0 && (
            <li className="label-mono text-muted-foreground">No hay fechas próximas.</li>
          )}
        </ul>
      </main>
    </>
  );
}
