import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { formatEventDates } from "@/lib/events";
import { requireStaff } from "@/lib/staff";
import { TEST_MODE } from "@/lib/environment";
import { createClient } from "@/lib/supabase/server";

import { checkIn } from "./actions";
import { DoorScanner } from "./door-scanner";

export const metadata: Metadata = { title: "Puerta · Moevius", robots: { index: false } };

/** El escáner de una fecha: barra chica arriba (volver y la fecha) y la cámara. */
export default async function DoorEventPage({ params }: PageProps<"/door/[slug]">) {
  await requireStaff();
  const { slug } = await params;

  const supabase = await createClient();
  const { data: event, error } = await supabase
    .from("events")
    .select("*")
    .eq("slug", slug)
    .eq("is_test", TEST_MODE)
    .maybeSingle();
  if (error) throw error;
  if (!event) notFound();

  const { day, month } = formatEventDates(event);

  return (
    <main className="flex flex-1 flex-col">
      <header className="border-border flex items-center justify-between gap-3 border-b px-4 py-2">
        <Link
          href="/door"
          className="label-mono text-muted-foreground hover:text-foreground inline-flex min-h-11 items-center gap-2 transition-colors"
        >
          <ArrowLeft aria-hidden className="size-4" />
          Fechas
        </Link>
        <p className="font-display font-stretch-condensed text-2xl leading-none font-extrabold uppercase">
          <span className="bg-highlighter text-ink px-1">
            {day} {month.slice(0, 3)}
          </span>
        </p>
      </header>
      <DoorScanner action={checkIn.bind(null, event.id)} />
    </main>
  );
}
