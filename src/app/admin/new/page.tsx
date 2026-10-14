import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { StaffHeader } from "@/components/staff-header";
import { AuraBackdrop } from "@/components/aura-backdrop";
import { StaffTitle } from "@/components/staff-page";
import { requireStaff } from "@/lib/staff";

import { EventForm } from "../event-form";

export const metadata: Metadata = { title: "Nueva fecha · Moevius", robots: { index: false } };

export default async function NewEventPage() {
  const staff = await requireStaff(["admin"]);

  return (
    <>
      <StaffHeader email={staff.user.email} role={staff.role} current="ventas" />
      <main className="relative isolate mx-auto w-full max-w-3xl flex-1 px-4 pt-6 pb-16 sm:px-6">
        <AuraBackdrop />
        <Link
          href="/admin"
          className="label-mono text-muted-foreground hover:text-foreground mb-4 inline-flex min-h-11 items-center gap-2 transition-colors"
        >
          <ArrowLeft aria-hidden className="size-4" />
          Ventas
        </Link>
        <StaffTitle label="Admin">Nueva fecha</StaffTitle>
        <EventForm
          isNew
          initial={{
            title: "",
            slug: "",
            startsAt: "",
            endsAt: "",
            venue: "",
            neighborhood: "",
            address: "",
            description: "",
            sets: [],
            tiers: [
              {
                taken: 0,
                name: "General",
                price: "",
                capacity: "",
                maxPerOrder: "6",
                salesStart: "",
                salesEnd: "",
                active: true,
              },
            ],
          }}
        />
      </main>
    </>
  );
}
