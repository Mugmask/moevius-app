# moevius-app: decisiones y gotchas

Lo que el código no cuenta. Para estructura (dónde está X, qué llama a Y): `graphify query`.

## Cupo y reservas

> 🔖 Sello: migración `20261007120000_capacity_counter` · 2026-10-07

- El cupo vive en `ticket_types.taken` (órdenes `pending` + `paid`). Lo mantiene un
  **trigger sobre `orders.status`**: cualquier transición (pago, vencimiento, cancelación,
  reembolso, borrado) lo ajusta sola. No sumar/restar `taken` a mano desde la app; si se
  desfasa, `select public.recount_taken()`.
- `create_order` es la excepción: suma el cupo él mismo (en el insert la orden aún no
  tiene items, el trigger no puede contarlos).
- Las reservas vencen por **pg_cron cada minuto** (`expire_reservations`). Hasta que corre,
  una `pending` con `expires_at` pasado sigue ocupando cupo (a propósito: si paga en ese
  minuto, entra sin re-chequear).
- Pago con la orden `expired`/`cancelled` → `fulfill_order` re-chequea el cupo. Si no entra,
  la orden queda `needs_refund` y la app reembolsa sola. Nunca emitir entradas sin pasar
  por `fulfill_order`.
- Orden de locks: siempre orden → lotes (por id). `create_order` no bloquea órdenes
  existentes. Mantener ese orden en funciones nuevas para no meter deadlocks.
- `create_order` tiene `lock_timeout = 3s`: el error `55P03` se muestra como "hay mucha
  gente, probá de nuevo".
- Un valor nuevo de enum va en **su propia migración**: Postgres no deja usarlo en la misma
  transacción que lo agrega (falla `55P04` al crear funciones SQL que lo mencionan).
- Probar migraciones en local antes del push: `npx supabase start -x studio,...` (Docker) y
  `npx supabase gen types typescript --local`.

## Mercado Pago (API de Orders)

> 🔖 Sello: migración `20261007130000_mp_orders` · 2026-10-07

- Checkout Pro va por **Orders** (`POST /v1/orders`, `type: online`, `processing_mode: manual`).
  Se redirige a `checkout_url` (no hay Wallet Brick). `external_reference` = `orders.id`.
- **No hay `notification_url` por orden** ("property not supported"): el webhook se configura
  en el panel de cada app de MP (evento "Order"). App de test → staging
  (`staging-moevius-app.vercel.app`, con `?x-vercel-protection-bypass=…` porque tiene
  protección de Vercel); app real → producción. `MP_WEBHOOK_SECRET` es el de esa app.
- `orders.mp_status` / `mp_payment_detail` guardan lo último que se vio en MP: la página lee
  de ahí si el pago está en revisión o rechazado (con el throttle, casi nunca consulta ella).
- `orders.mp_preference_id` quedó sin uso pero **no se borró** (el código deployado antes de
  Orders la lee). Borrarla en una migración nueva cuando staging y prod usen Orders.
- El body de la orden de MP se arma desde la orden en la DB (titular, precio congelado),
  nunca desde el form: un reenvío produce el mismo body y la idempotencia de MP devuelve la
  orden existente en vez de fallar.
- Por eso la página de la orden **también consulta a MP** (`syncOrderWithMp`, como mucho cada
  5 s por orden vía `claim_mp_sync`): la compra se completa en cualquier preview aunque el
  webhook no llegue ahí.
- `expiration_time` (`PT15M`) no corta el pago a tiempo (una orden `PT1M` seguía pagable a
  los 2 min): MP aprueba pagos con la reserva vencida. Lo cubre `needs_refund` + reembolso
  automático (`Order.refund`). Probado en sandbox de punta a punta.
- `config.online.retries.allowed: true`: sin eso el primer rechazo cierra la orden de MP.
- Límites que el SDK no valida: `items[].external_code` ≤ 30 caracteres (un UUID no entra).
  El SDK tira `MercadoPago API error` sin detalle: reproducir con `fetch` para ver el campo.
- SDK 3.6.1: `Order.create` pisa `config.options` con `requestOptions` → un `Order` nuevo por
  llamada. `WebhookSignatureValidator` no pasa el `data.id` a minúsculas: hacerlo antes.
- Sandbox: credenciales `APP_USR-` del vendedor de prueba; acepta mails de comprador reales.
  Tarjeta de prueba aprobada: titular `APRO`.
