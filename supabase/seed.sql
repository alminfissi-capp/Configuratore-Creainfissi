-- Seed data for local development and testing
-- Run via: supabase db reset (applies migrations + seed)

-- Product mappings (sample window/door products)
insert into public.product_mappings
  (shopify_product_id, category_template, display_name, base_price_sqm, allowed_options_json)
values
  (
    'shopify-prod-001',
    'porte-finestre',
    'Porta Finestra Classica PVC',
    250.00,
    '{
      "colori": ["bianco", "grigio-antracite", "noce-tanganica", "rovere-oro"],
      "maniglie": ["maniglia-std", "maniglia-premium", "maniglia-minimal"],
      "vetri": ["vetro-base", "vetro-camera", "vetro-triplo"],
      "larghezza_min": 60,
      "larghezza_max": 350,
      "altezza_min": 60,
      "altezza_max": 280
    }'
  ),
  (
    'shopify-prod-002',
    'porte-finestre',
    'Porta Finestra Scorrevole ALU',
    320.00,
    '{
      "colori": ["bianco", "grigio-antracite", "antracite-opaco", "sabbia"],
      "maniglie": ["maniglia-std", "maniglia-comfort"],
      "vetri": ["vetro-camera", "vetro-triplo", "vetro-specchio"],
      "larghezza_min": 120,
      "larghezza_max": 600,
      "altezza_min": 120,
      "altezza_max": 300
    }'
  );

-- Pricing rules (modifiers applied on top of base_price_sqm × mq)
insert into public.pricing_rules
  (category_template, attribute_key, price_modifier, modifier_type)
values
  -- Color surcharges (percentage)
  ('porte-finestre', 'colore_grigio-antracite',    15.00, 'percentage'),
  ('porte-finestre', 'colore_noce-tanganica',       20.00, 'percentage'),
  ('porte-finestre', 'colore_rovere-oro',            18.00, 'percentage'),
  ('porte-finestre', 'colore_antracite-opaco',       15.00, 'percentage'),
  ('porte-finestre', 'colore_sabbia',                10.00, 'percentage'),
  -- Handle upgrades (fixed)
  ('porte-finestre', 'maniglia_maniglia-premium',    85.00, 'fixed'),
  ('porte-finestre', 'maniglia_maniglia-minimal',    65.00, 'fixed'),
  ('porte-finestre', 'maniglia_maniglia-comfort',    55.00, 'fixed'),
  -- Glass upgrades (fixed)
  ('porte-finestre', 'vetro_vetro-camera',          120.00, 'fixed'),
  ('porte-finestre', 'vetro_vetro-triplo',          240.00, 'fixed'),
  ('porte-finestre', 'vetro_vetro-specchio',        180.00, 'fixed');
