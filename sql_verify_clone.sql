-- Verificación solo-lectura de clonación (no modifica datos)
-- Instrucciones: reemplaza los dos UUIDs y ejecuta todo el script.
-- Fuente (admin) y destino (nuevo usuario)
\set SOURCE_UUID 'REEMPLAZA_SOURCE_UUID'
\set TARGET_UUID 'REEMPLAZA_TARGET_UUID'

-- 1) Resumen rápido por usuario (folders, notes, decks, cards)
SELECT 'source' AS who, get_user_content_stats(:'SOURCE_UUID');
SELECT 'target' AS who, get_user_content_stats(:'TARGET_UUID');

-- 2) Nota -> Deck -> #Cards (target)
SELECT 
  n.title AS note_title,
  d.name AS deck_name,
  COUNT(c.id) AS cards_in_deck
FROM public.notes n
JOIN public.note_deck_links ndl ON ndl.note_id = n.id
JOIN public.decks d ON d.id = ndl.deck_id
LEFT JOIN public.cards c ON c.deck_id = d.id
WHERE n.owner_id = :'TARGET_UUID'
GROUP BY n.title, d.name
ORDER BY n.title, d.name;

-- 3) Orphans: decks del target que no están vinculados a ninguna nota (debería ser 0)
SELECT d.id, d.name
FROM public.decks d
LEFT JOIN public.note_deck_links ndl ON ndl.deck_id = d.id
LEFT JOIN public.notes n ON n.id = ndl.note_id
WHERE d.owner_id = :'TARGET_UUID'
GROUP BY d.id, d.name
HAVING COUNT(n.id) = 0
ORDER BY d.created_at;

-- 4) Cards sin deck asociado a notas del target (debería ser 0)
SELECT c.id, c.created_at
FROM public.cards c
JOIN public.decks d ON d.id = c.deck_id
LEFT JOIN public.note_deck_links ndl ON ndl.deck_id = d.id
LEFT JOIN public.notes n ON n.id = ndl.note_id
WHERE d.owner_id = :'TARGET_UUID'
GROUP BY c.id, c.created_at
HAVING COUNT(n.id) = 0
ORDER BY c.created_at;

-- 5) Imágenes de flashcards (target): conteos generales
SELECT 
  (SELECT COUNT(*) FROM public.flashcard_images fi
   JOIN public.cards c ON c.id = fi.card_id
   JOIN public.decks d ON d.id = c.deck_id
   WHERE d.owner_id = :'TARGET_UUID') AS images_total,
  (SELECT COUNT(*) FROM public.cards c
   JOIN public.decks d ON d.id = c.deck_id
   WHERE d.owner_id = :'TARGET_UUID' AND (c.front_image_url IS NOT NULL OR c.back_image_url IS NOT NULL)) AS cards_with_img_fields;

-- 6) Chequeo de integridad rápida (target): cada deck vinculado a alguna nota tiene al menos 1 card
SELECT d.id AS deck_id, d.name, COUNT(c.id) AS cards
FROM public.decks d
JOIN public.note_deck_links ndl ON ndl.deck_id = d.id
JOIN public.notes n ON n.id = ndl.note_id
LEFT JOIN public.cards c ON c.deck_id = d.id
WHERE n.owner_id = :'TARGET_UUID'
GROUP BY d.id, d.name
ORDER BY d.name;
