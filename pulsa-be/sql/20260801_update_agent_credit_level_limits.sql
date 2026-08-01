-- Update PulsaKilat agent credit levels to the cumulative paid-total model.
-- The money limit stops at Rp 2.000.000; Kilat Elite is a prestige level with the same max limit.

INSERT INTO public.agent_credit_rank
  (code, name, description, limit_amount, min_on_time_payments, max_late_payments, sort_order, active)
VALUES
  ('start', 'Kilat Start', 'Limit awal untuk agent baru.', 500000, 0, 0, 10, TRUE),
  ('plus', 'Kilat Plus', 'Naik setelah total pinjaman lunas tepat waktu mencapai Rp 1.000.000.', 1000000, 0, 0, 20, TRUE),
  ('pro', 'Kilat Pro', 'Naik setelah total pinjaman lunas tepat waktu mencapai Rp 1.500.000.', 1500000, 0, 0, 30, TRUE),
  ('max', 'Kilat Max', 'Limit maksimal setelah total pinjaman lunas tepat waktu mencapai Rp 2.000.000.', 2000000, 0, 0, 40, TRUE),
  ('elite', 'Kilat Elite', 'Level prestise untuk agent terbaik. Limit tetap maksimal Rp 2.000.000.', 2000000, 0, 0, 50, TRUE)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  limit_amount = EXCLUDED.limit_amount,
  min_on_time_payments = EXCLUDED.min_on_time_payments,
  max_late_payments = EXCLUDED.max_late_payments,
  sort_order = EXCLUDED.sort_order,
  active = EXCLUDED.active,
  updated_at = now();

UPDATE public.agent_credit_rank
SET active = FALSE, updated_at = now()
WHERE code IN ('starter', 'silver', 'gold', 'platinum');
