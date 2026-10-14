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

## Fechas de prueba y base compartida

> 🔖 Sello: migración `20261007140000_test_events` · 2026-10-07

- Staging y producción usan **el mismo Supabase**. `events.is_test` separa: producción solo fechas
  reales, todo lo demás solo de prueba (`TEST_MODE` en `src/lib/environment.ts`, por `VERCEL_ENV`).
- Además del filtro en la app, `create_order(p_test_mode)` rechaza (`event_unavailable`) una fecha
  del otro modo: una compra de staging nunca ocupa cupo real. Toda query nueva sobre `events` que
  liste o venda tiene que filtrar por `is_test = TEST_MODE`.
- Queda el `create_order` viejo (sin `p_test_mode`) para el código deployado antes; borrarlo junto
  con `orders.mp_preference_id` cuando producción use Orders.
- Supabase local en puertos **544xx** (`supabase/config.toml`): otro proyecto (cashlist) usa 543xx.

## Una sola fiesta en la home

> 🔖 Sello: migración `20261013120000_event_content` · 2026-10-14

- No hay grilla de fechas: la home (`getFeaturedEvent`) es la próxima fecha publicada,
  presentada como un ticket que sale de una máquina al scrollear. La compra se llena en el
  talón (`ticket-checkout.tsx`, un solo paso: datos, lote y cantidad → reserva → botón a
  MP). `/#tickets` es el ancla del talón y `/events/[slug]` redirige ahí. `getEventBySlug`
  sigue: lo usa `startCheckout` para validar lote y precio.
- Turnstile en el talón va `compact` + `interaction-only`: el widget normal (300px) no entra
  en el ticket en el celu.
- Contenido de la edición: `events.description`, `address` y el lineup en `event_sets`. Todo
  opcional: la página esconde lo que falta.
- `events.lineup` (text[]) quedó sin uso pero **no se borró**: el código deployado lo lee.
  Borrarlo junto con `mp_preference_id` y el `create_order` viejo cuando prod esté al día.

## El tirón del ticket (`TicketPull`)

> 🔖 Sello: 2026-10-14

- La máquina queda `sticky` mientras sale el ticket. El tramo fijo es un **espaciador**
  después del sticky (no `padding-bottom`: el sticky solo se desplaza dentro del contenido
  de su contenedor): largo del tirón + una pausa al final (`HOLD_VIEWPORTS`).
- **El papel lo mueve el navegador**, 1:1 con el scroll: una scroll-driven animation
  (`ticket-pull-driven` en `globals.css`) que corre en el hilo del scroll. `TicketPull`
  solo mide (con `ResizeObserver`) y escribe los keyframes en px y el `animation-range`.
  Sin soporte (iOS < 26, Firefox) hace lo mismo desde JS, también 1:1.
- Detección del camino nativo: `"ScrollTimeline" in window`, **no** `CSS.supports("animation-timeline", …)`:
  Chrome 155 aplica la propiedad en las hojas de estilo pero ahí devuelve false (hasta con
  `auto`), y el ticket caía al respaldo de JS sin que se notara.
- La seña "Bajá para sacar tu ticket" (`PullHint`) va fija abajo en el hueco de la primera
  pantalla y la apagan dos IntersectionObserver (el borde del papel llega a la franja de abajo,
  o ya no estás en la primera pantalla). Nada por scroll.
- La "vida" del papel también es del navegador: `ticket-sway` (se mece < 1° atado al
  mismo tramo del scroll, gira desde la ranura; solo con soporte nativo) y `ticket-drop`
  (caída al cargar, cuando cargan las fuentes; no con el ancla). Nada de movimiento por
  frame desde JS.
- **No volver a mover el papel desde JS con resorte, ni frenar o imantar el scroll**: en
  el celu (120Hz) el papel iba un paso atrás del dedo y se sentía trabado; frenar el
  envión se peleaba con el scroll del sistema; y un `scroll-snap` de proximidad tiraba la
  página para atrás desde casi 700px, en pleno formulario del talón.
- La animación actualiza el papel recién en el próximo frame: justo después de un
  `scrollTo`, el `getBoundingClientRect` de algo del ticket es el viejo (ver el ancla
  `/#tickets`, que descuenta el desplazamiento actual).
- La barra del navegador del celu dispara `resize` al scrollear: la pausa se calcula con el
  alto de pantalla del arranque y solo cambia si cambia el ancho.
- Medidas atadas entre `Machine` (home), `TicketPull` y `Ticket` (están en el comentario de
  `Machine`): el papel nace 3.5px adentro de la rendija (`-mt-[50px]`; justo en el borde se
  ve una línea blanca) y tiene que ser más angosto que la rendija (si no, sobresale). Las
  estrellas van adentro del papel por lo mismo.
- Pensado para la GPU del celu: la sombra del papel es un `box-shadow` en un elemento
  aparte (un `filter: drop-shadow` sobre el ticket se recalculaba en cada frame), y las
  luces del fondo de la home son degradados quietos en una capa fija con el grano (blur
  animado y luces en movimiento recomponían la pantalla entera en cada frame).
- `PageLoader` tapa la home hasta `document.fonts.ready` (las fuentes cambian el alto del
  ticket), con tope de 3 s. Sin JS no aparece (`@media (scripting: enabled)`).
- Probar la fluidez en el celu con el build (`pnpm build` + `pnpm start`), no con `pnpm dev`:
  el modo desarrollo es mucho más pesado en el teléfono.
- Dev: si una clase nueva de Tailwind no aparece en el navegador, el watcher de `next dev`
  quedó trabado: reiniciarlo.

## Design system (noche)

> 🔖 Sello: 2026-10-14

- La web es **siempre oscura** (no hay tema claro): tokens en `:root` de `globals.css`. Lima
  (`--primary`) solo para lo que se toca; rojo (`--accent`) para las manchas del fondo, las
  notas a mano del ticket y los avisos. Bordes: línea fina `border-border`, nunca
  `border-foreground` grueso.
- Titulares: Archivo variable con eje de ancho (`font-display font-stretch-expanded`).
  Etiquetas técnicas: utilidad `label-mono` (Geist Mono). Notas a mano: Permanent Marker
  (`doodles.tsx`).
- La máquina y el papel son CSS puro (`chassis`, `slot-*`, `paper-crumple`, `torn-edge`,
  `ticket-notch-*` en `globals.css`): no suman imágenes a la carga en el celu.
- `body` y las secciones usan `overflow-clip` y no `hidden`: `hidden` las vuelve
  contenedores de scroll y rompe los `sticky` (la máquina).
- `BRAND` en `lib/brand-colors.ts` replica los tokens en hex para manifest, íconos y
  `theme-color`: si cambia un token, cambiarlo ahí también.
- Inputs con `text-base` (16px): con menos, iOS hace zoom al enfocar.
- Los mails (`src/emails/`) siguen con la estética vieja: no leen los tokens.

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

## Legal (términos, privacidad, arrepentimiento)

> 🔖 Sello: 2026-10-14

- Los datos del organizador (nombre, mail y, opcionales, CUIT y domicilio) viven en `src/lib/legal.ts`
  y los usan el footer, `/terminos`, `/privacidad` y `/arrepentimiento`. Tienen placeholders:
  **completarlos antes de vender en producción**.
- El Botón de arrepentimiento (Res. SCI 424/2020) tiene que estar a mano desde la home: va en
  el footer. El pedido **no se guarda en la base**: manda un mail a `LEGAL.email` y la
  constancia con el código `ARR-…` al comprador. La devolución y la anulación son a mano.
- El footer lleva el link a la Ventanilla Única de Defensa del Consumidor.
