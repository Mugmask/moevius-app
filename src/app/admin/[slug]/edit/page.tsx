import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { StaffHeader } from "@/components/staff-header";
import { AuraBackdrop } from "@/components/aura-backdrop";
import { StaffTitle } from "@/components/staff-page";
import { isoToArgentina } from "@/lib/event-admin";
import { TEST_MODE } from "@/lib/environment";
import { TIME_FORMAT } from "@/lib/format";
import { requireStaff } from "@/lib/staff";
import { createAdminClient } from "@/lib/supabase/admin";

import { EventForm } from "../../event-form";
import { StatusControls } from "./status-controls";

export const metadata: Metadata = { title: "Editar fecha · Moevius", robots: { index: false } };

export default async function EditEventPage({
  params,
  searchParams,
}: PageProps<"/admin/[slug]/edit">) {
  const staff = await requireStaff(["admin"]);
  const { slug } = await params;
  const { saved } = await searchParams;

  const { data: event, error } = await createAdminClient()
    .from("events")
    .select("*, ticket_types(*), event_sets(*)")
    .eq("slug", slug)
    .eq("is_test", TEST_MODE)
    .maybeSingle();
  if (error) throw error;
  if (!event) notFound();

  const tiers = [...event.ticket_types].sort((a, b) => a.sort_order - b.sort_order);
  const sets = [...event.event_sets].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <>
      <StaffHeader email={staff.user.email} role={staff.role} current="ventas" />
      <main className="relative isolate mx-auto w-full max-w-3xl flex-1 px-4 pt-6 pb-16 sm:px-6">
        <AuraBackdrop />
        <Link
          href={`/admin/${event.slug}`}
          className="label-mono text-muted-foreground hover:text-foreground mb-4 inline-flex min-h-11 items-center gap-2 transition-colors"
        >
          <ArrowLeft aria-hidden className="size-4" />
          Órdenes de esta fecha
        </Link>
        <StaffTitle label={`Editar · ${event.slug}`}>{event.title}</StaffTitle>

        <StatusControls eventId={event.id} status={event.status} />

        <EventForm
          isNew={false}
          // `saved` cambia en cada guardado: remonta el form con lo que quedó en la base.
          key={`${event.id}-${saved ?? ""}`}
          justSaved={Boolean(saved)}
          initial={{
            id: event.id,
            title: event.title,
            slug: event.slug,
            startsAt: isoToArgentina(event.starts_at),
            endsAt: isoToArgentina(event.ends_at),
            venue: event.venue,
            neighborhood: event.neighborhood,
            address: event.address ?? "",
            description: event.description ?? "",
            sets: sets.map((set) => ({
              artist: set.artist,
              time: set.starts_at ? TIME_FORMAT.format(new Date(set.starts_at)) : "",
            })),
            tiers: tiers.map((tier) => ({
              id: tier.id,
              taken: tier.taken,
              name: tier.name,
              price: String(tier.price),
              capacity: String(tier.capacity),
              maxPerOrder: String(tier.max_per_order),
              salesStart: tier.sales_start ? isoToArgentina(tier.sales_start) : "",
              salesEnd: tier.sales_end ? isoToArgentina(tier.sales_end) : "",
              active: tier.active,
            })),
          }}
        />
      </main>
    </>
  );
}
