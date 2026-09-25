import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from "react-email";

// Aproximaciones en hex de los tokens oklch de globals.css: los clientes de mail
// no entienden oklch.
const INK = "#1c1b18";
const PAPER = "#f4f3ee";
const BRAND = "#7cf25c";
const MUTED = "#6b6a63";

export type TicketEmailProps = {
  buyerName: string;
  day: string;
  month: string;
  time: string;
  venue: string;
  neighborhood: string;
  orderUrl: string;
  tickets: { code: string; ticketType: string; url: string; cid: string }[];
};

export function TicketEmail({
  buyerName,
  day,
  month,
  time,
  venue,
  neighborhood,
  orderUrl,
  tickets,
}: TicketEmailProps) {
  const ticketCountLabel = tickets.length === 1 ? "tu entrada" : `tus ${tickets.length} entradas`;

  return (
    <Html lang="es">
      <Head />
      <Preview>
        Acá tenés {ticketCountLabel} para Moevius {day} {month}
      </Preview>
      <Body
        style={{ backgroundColor: PAPER, color: INK, fontFamily: "Helvetica, Arial, sans-serif" }}
      >
        <Container style={{ maxWidth: 520, padding: "32px 20px" }}>
          <Text style={{ fontSize: 14, fontWeight: 700, letterSpacing: 1, margin: 0 }}>
            MOEVIUS
          </Text>
          <Heading
            style={{
              fontSize: 40,
              lineHeight: "40px",
              margin: "16px 0 0",
              textTransform: "uppercase",
            }}
          >
            {day} {month}
          </Heading>
          <Text style={{ fontSize: 16, fontWeight: 700, margin: "12px 0 0" }}>
            {venue} · {neighborhood}
          </Text>
          <Text style={{ fontSize: 14, color: MUTED, margin: "4px 0 0" }}>{time}</Text>

          <Text style={{ fontSize: 16, lineHeight: "24px", margin: "24px 0" }}>
            Hola {buyerName}, ya está: acá tenés {ticketCountLabel}. Cada QR deja pasar a una
            persona, una sola vez. Mostralo desde el celu en la puerta y llevá DNI, la fiesta es
            +18.
          </Text>

          {tickets.map((ticket, i) => (
            <Section
              key={ticket.code}
              style={{
                backgroundColor: "#ffffff",
                border: `2px solid ${INK}`,
                borderRadius: 16,
                marginBottom: 16,
                padding: 20,
                textAlign: "center",
              }}
            >
              <Text
                style={{ fontSize: 12, fontWeight: 700, margin: 0, textTransform: "uppercase" }}
              >
                Entrada {i + 1} de {tickets.length} · {ticket.ticketType}
              </Text>
              <Img
                src={`cid:${ticket.cid}`}
                alt="QR de la entrada"
                width={240}
                height={240}
                style={{ margin: "16px auto" }}
              />
              <Link href={ticket.url} style={{ color: INK, fontSize: 13, fontWeight: 700 }}>
                Abrir esta entrada en el navegador
              </Link>
            </Section>
          ))}

          <Section
            style={{
              backgroundColor: BRAND,
              border: `2px solid ${INK}`,
              borderRadius: 16,
              padding: 16,
            }}
          >
            <Text style={{ fontSize: 14, margin: 0 }}>
              ¿No ves los QR? Tenés todas las entradas en{" "}
              <Link href={orderUrl} style={{ color: INK, fontWeight: 700 }}>
                esta página
              </Link>
              .
            </Text>
          </Section>

          <Hr style={{ borderColor: INK, margin: "32px 0 16px" }} />
          <Text style={{ fontSize: 12, color: MUTED, margin: 0 }}>
            No compartas estos QR: el primero que lo escanea entra.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
