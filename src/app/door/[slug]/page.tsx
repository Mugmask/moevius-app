import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { formatEventDates } from "@/lib/events";
import { requireStaff } from "@/lib/staff";
import { createClient } from "@/lib/supabase/server";

import { checkIn } from "./actions";
import { DoorScanner } from "./door-scanner";

export const metadata: Metadata = { title: "Puerta · Moevius", robots: { index: false } };

export default async function DoorEventPage({ params }: PageProps<"/door/[slug]">) {
  await requireStaff();
  const { slug } = await params;

  const supabase = await createClient();
  const { data: event, error } = await supabase
    .from("events")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  if (!event) notFound();

  const { day, month } = formatEventDates(event);

  return (
    <main className="flex flex-1 flex-col">
      <header className="border-foreground bg-card flex items-center justify-between border-b-2 px-4 py-3">
        <Link href="/door" className="text-sm font-bold">
          ← Fechas
        </Link>
        <p className="font-display tracking-tight uppercase">
          {day} {month}
        </p>
      </header>
      <DoorScanner action={checkIn.bind(null, event.id)} />
    </main>
  );
}
