import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AvailabilityBadge, Pill } from "@/components/brand";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { RESERVATION_MINUTES } from "@/lib/config";
import { getEventBySlug } from "@/lib/events";

import { startCheckout } from "./actions";
import { CheckoutForm } from "./checkout-form";

export async function generateMetadata({ params }: PageProps<"/events/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  return { title: event ? `Entradas · Moevius ${event.day} ${event.month}` : "Moevius" };
}

export default async function EventPage({ params }: PageProps<"/events/[slug]">) {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event) notFound();

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-16">
        <div className="grid gap-12 lg:grid-cols-[1fr_28rem] lg:gap-20">
          <section>
            <AvailabilityBadge availability={event.availability} />
            <h1 className="font-display mt-6 text-6xl leading-[0.9] tracking-tight uppercase sm:text-7xl">
              {event.day}
              <br />
              <span className="highlight">{event.month}</span>
            </h1>
            <p className="mt-6 text-lg font-bold">
              {event.venue} · {event.neighborhood}
            </p>
            <p className="text-muted-foreground mt-1 font-medium">{event.time}</p>
            <p className="mt-6 font-medium">{event.lineup.join(" · ")}</p>

            <ul className="text-muted-foreground mt-10 space-y-2 text-sm font-medium">
              <li>· Pagás con Mercado Pago: tarjeta, dinero en cuenta o transferencia.</li>
              <li>· Las entradas te llegan al mail apenas se acredita el pago.</li>
              <li>· Te reservamos las entradas {RESERVATION_MINUTES} minutos mientras pagás.</li>
              <li>· La fiesta es +18: en la puerta te piden DNI.</li>
            </ul>
          </section>

          <section className="border-foreground bg-card shadow-hard self-start rounded-3xl border-2 p-6 sm:p-8">
            {event.availability === "sold-out" ? (
              <div className="text-center">
                <h2 className="font-display text-4xl uppercase">Agotado</h2>
                <p className="mt-3 font-medium">No quedan entradas para esta fecha.</p>
                <Pill
                  tone="paper"
                  className="mt-6"
                  nativeButton={false}
                  render={<Link href="/#events" />}
                >
                  Ver otras fechas
                </Pill>
              </div>
            ) : (
              <CheckoutForm tiers={event.tiers} action={startCheckout.bind(null, event.slug)} />
            )}
          </section>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
