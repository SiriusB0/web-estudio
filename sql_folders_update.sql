-- ===============================================
-- SISTEMA OBSIDIAN - CONFIGURACIÓN SIMPLIFICADA
-- ===============================================
-- Este script configura el sistema de notas estilo Obsidian
-- con flashcards automáticas (SIN sistema terms/subjects/topics)
-- ===============================================

-- ========== LIMPIAR SISTEMA ANTERIOR ==========
-- Eliminar tablas del sistema original en orden correcto
drop table if exists public.cards cascade;
drop table if exists public.decks cascade;
drop table if exists public.topics cascade;
drop table if exists public.subjects cascade;
drop table if exists public.terms cascade;

-- ========== PROFILES ==========
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null check (length(username) >= 3),
  created_at timestamptz default now()
);
alter table public.profiles enable row level security;

-- ========== FOLDERS ==========
create table if not exists public.folders (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  parent_folder_id uuid references public.folders(id) on delete cascade,
  sort_order integer default 0,
  created_at timestamptz default now()
);
alter table public.folders enable row level security;

-- Agregar folder_id a notes
alter table public.notes add column if not exists folder_id uuid references public.folders(id) on delete set null;

-- Agregar sort_order a folders y notes
alter table public.folders add column if not exists sort_order integer default 0;
alter table public.notes add column if not exists sort_order integer default 0;

-- ========== ÍNDICES FOLDERS ==========
create index if not exists idx_folders_owner_id on public.folders(owner_id);
create index if not exists idx_folders_parent on public.folders(parent_folder_id);
create index if not exists idx_folders_sort_order on public.folders(sort_order);
create index if not exists idx_notes_folder_id on public.notes(folder_id);
create index if not exists idx_notes_sort_order on public.notes(sort_order);

-- ========== POLÍTICAS FOLDERS ==========
drop policy if exists "folders: select own" on public.folders;
drop policy if exists "folders: insert own" on public.folders;
drop policy if exists "folders: update own" on public.folders;
drop policy if exists "folders: delete own" on public.folders;

create policy "folders: select own" on public.folders for select to authenticated
using (auth.uid() = owner_id);

create policy "folders: insert own" on public.folders for insert to authenticated
with check (auth.uid() = owner_id);

create policy "folders: update own" on public.folders for update to authenticated
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

create policy "folders: delete own" on public.folders for delete to authenticated
using (auth.uid() = owner_id);

-- ========== POLÍTICAS NOTES ==========
drop policy if exists "notes: delete own" on public.notes;

create policy "notes: delete own" on public.notes for delete to authenticated
using (auth.uid() = owner_id);

-- ========== POLÍTICAS DECKS ==========
drop policy if exists "decks: select own" on public.decks;
drop policy if exists "decks: insert own" on public.decks;
drop policy if exists "decks: update own" on public.decks;
drop policy if exists "decks: delete own" on public.decks;

create policy "decks: select own" on public.decks for select to authenticated
using (auth.uid() = owner_id);

create policy "decks: insert own" on public.decks for insert to authenticated
with check (auth.uid() = owner_id);

create policy "decks: update own" on public.decks for update to authenticated
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

create policy "decks: delete own" on public.decks for delete to authenticated
using (auth.uid() = owner_id);

-- ========== ARREGLAR TOPIC_ID EN DECKS ==========
-- Hacer topic_id opcional para decks de flashcards automáticas
alter table public.decks alter column topic_id drop not null;

-- ========== TABLA NOTE_DECK_LINKS ==========
-- Crear tabla para vincular notas con decks de flashcards
create table if not exists public.note_deck_links (
  id uuid primary key default gen_random_uuid(),
  note_id uuid not null references public.notes(id) on delete cascade,
  deck_id uuid not null references public.decks(id) on delete cascade,
  created_at timestamptz default now(),
  unique(note_id, deck_id)
);

alter table public.note_deck_links enable row level security;

-- Índices para note_deck_links
create index if not exists idx_note_deck_links_note_id on public.note_deck_links(note_id);
create index if not exists idx_note_deck_links_deck_id on public.note_deck_links(deck_id);

-- ========== POLÍTICAS NOTE_DECK_LINKS ==========
drop policy if exists "note_deck_links: select own" on public.note_deck_links;
drop policy if exists "note_deck_links: insert own" on public.note_deck_links;
drop policy if exists "note_deck_links: update own" on public.note_deck_links;
drop policy if exists "note_deck_links: delete own" on public.note_deck_links;

create policy "note_deck_links: select own" on public.note_deck_links for select to authenticated
using (
  exists (
    select 1 from public.notes 
    where notes.id = note_deck_links.note_id 
    and notes.owner_id = auth.uid()
  )
);

create policy "note_deck_links: insert own" on public.note_deck_links for insert to authenticated
with check (
  exists (
    select 1 from public.notes 
    where notes.id = note_deck_links.note_id 
    and notes.owner_id = auth.uid()
  )
);

create policy "note_deck_links: update own" on public.note_deck_links for update to authenticated
using (
  exists (
    select 1 from public.notes 
    where notes.id = note_deck_links.note_id 
    and notes.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.notes 
    where notes.id = note_deck_links.note_id 
    and notes.owner_id = auth.uid()
  )
);

create policy "note_deck_links: delete own" on public.note_deck_links for delete to authenticated
using (
  exists (
    select 1 from public.notes 
    where notes.id = note_deck_links.note_id 
    and notes.owner_id = auth.uid()
  )
);

-- ========== POLÍTICAS CARDS ==========
drop policy if exists "cards: select own" on public.cards;
drop policy if exists "cards: insert own" on public.cards;
drop policy if exists "cards: update own" on public.cards;
drop policy if exists "cards: delete own" on public.cards;

create policy "cards: select own" on public.cards for select to authenticated
using (
  exists (
    select 1 from public.decks 
    where decks.id = cards.deck_id 
    and decks.owner_id = auth.uid()
  )
);

create policy "cards: insert own" on public.cards for insert to authenticated
with check (
  exists (
    select 1 from public.decks 
    where decks.id = cards.deck_id 
    and decks.owner_id = auth.uid()
  )
);

create policy "cards: update own" on public.cards for update to authenticated
using (
  exists (
    select 1 from public.decks 
    where decks.id = cards.deck_id 
    and decks.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.decks 
    where decks.id = cards.deck_id 
    and decks.owner_id = auth.uid()
  )
);

create policy "cards: delete own" on public.cards for delete to authenticated
using (
  exists (
    select 1 from public.decks 
    where decks.id = cards.deck_id 
    and decks.owner_id = auth.uid()
  )
);
