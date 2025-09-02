-- ===============================================
-- CORRECCIÓN CONSERVADORA - SOLO AGREGAR LO FALTANTE
-- ===============================================
-- Este script NO elimina datos existentes
-- Solo agrega las tablas y políticas que faltan
-- ===============================================

-- ========== AGREGAR TABLA NOTE_LINKS SI NO EXISTE ==========
create table if not exists public.note_links (
  id uuid primary key default gen_random_uuid(),
  from_note_id uuid not null references public.notes(id) on delete cascade,
  to_note_id uuid references public.notes(id) on delete cascade,
  anchor_text text,
  created_at timestamptz default now(),
  unique(from_note_id, to_note_id)
);
alter table public.note_links enable row level security;

-- ========== AGREGAR TABLA NOTE_DECK_LINKS SI NO EXISTE ==========
create table if not exists public.note_deck_links (
  id uuid primary key default gen_random_uuid(),
  note_id uuid not null references public.notes(id) on delete cascade,
  deck_id uuid not null references public.decks(id) on delete cascade,
  created_at timestamptz default now(),
  unique(note_id, deck_id)
);
alter table public.note_deck_links enable row level security;

-- ========== AGREGAR TOPIC_ID A DECKS SI NO EXISTE ==========
-- Agregar columna topic_id si no existe (sin referencia a topics que no existe)
alter table public.decks add column if not exists topic_id uuid;

-- ========== ÍNDICES FALTANTES ==========
-- Solo crear índices que no existen
create index if not exists idx_note_links_from on public.note_links(from_note_id);
create index if not exists idx_note_links_to on public.note_links(to_note_id);
create index if not exists idx_note_deck_links_note_id on public.note_deck_links(note_id);
create index if not exists idx_note_deck_links_deck_id on public.note_deck_links(deck_id);

-- ========== POLÍTICAS RLS FALTANTES ==========

-- NOTE_LINKS
drop policy if exists "note_links: select own" on public.note_links;
drop policy if exists "note_links: manage own" on public.note_links;

create policy "note_links: select own" on public.note_links for select to authenticated
using (exists (
  select 1 from public.notes n where n.id = from_note_id and n.owner_id = auth.uid()
));

create policy "note_links: manage own" on public.note_links for all to authenticated
using (exists (
  select 1 from public.notes n where n.id = from_note_id and n.owner_id = auth.uid()
));

-- NOTE_DECK_LINKS
drop policy if exists "note_deck_links: manage own" on public.note_deck_links;

create policy "note_deck_links: manage own" on public.note_deck_links for all to authenticated
using (exists (
  select 1 from public.notes n where n.id = note_id and n.owner_id = auth.uid()
));

-- ===============================================
-- CORRECCIÓN CONSERVADORA COMPLETADA
-- ===============================================
-- ✅ NO elimina datos existentes
-- ✅ Solo agrega tablas faltantes: note_links, note_deck_links
-- ✅ Hace topic_id opcional para flashcards automáticas
-- ✅ Agrega políticas RLS necesarias
-- ✅ Preserva todo el sistema actual
-- ===============================================
