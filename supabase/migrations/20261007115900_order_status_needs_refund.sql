-- Va en su propia migración: Postgres no deja usar un valor de enum nuevo en la
-- misma transacción que lo agrega, y la siguiente migración lo usa.
-- needs_refund: pagó con la reserva vencida y el cupo ya no alcanzaba; no tiene
-- entradas y hay que devolverle la plata.
alter type public.order_status add value if not exists 'needs_refund';
