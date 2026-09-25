import type { Metadata } from "next";
import Link from "next/link";

import { StaffHeader } from "@/components/staff-header";
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
    .gt("ends_at", new Date().toISOString())
    .order("starts_at")
    .limit(5);
  if (error) throw error;

  return (
    <>
      <StaffHeader email={staff.user.email} role={staff.role} />
      <main className="mx-auto w-full max-w-md flex-1 px-6 py-12">
        <h1 className="font-display text-5xl tracking-tight uppercase">Puerta</h1>
        <p className="text-muted-foreground mt-2 font-medium">¿Qué fecha estás controlando?</p>

        <ul className="mt-8 flex flex-col gap-3">
          {events.map((event) => {
            const { day, month, time } = formatEventDates(event);
            return (
              <li key={event.id}>
                <Link
                  href={`/door/${event.slug}`}
                  className="border-foreground bg-card shadow-hard-sm hover:bg-primary block rounded-2xl border-2 p-5"
                >
                  <p className="font-display text-3xl tracking-tight uppercase">
                    {day} {month}
                  </p>
                  <p className="text-sm font-bold">
                    {event.venue} · {time}
                  </p>
                </Link>
              </li>
            );
          })}
          {events.length === 0 && (
            <li className="text-muted-foreground font-medium">No hay fechas próximas.</li>
          )}
        </ul>
      </main>
    </>
  );
}
