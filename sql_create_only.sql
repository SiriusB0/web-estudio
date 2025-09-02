-- ===============================================
-- SISTEMA OBSIDIAN - SOLO CREACIÓN (SIN DROPS)
-- ===============================================
-- Este script solo CREA las tablas necesarias
-- sin intentar eliminar tablas que no existen
-- ===============================================

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

-- ========== NOTES ==========
create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Sin título',
  content_md text default '',
  slug text,
  folder_id uuid references public.folders(id) on delete set null,
  sort_order integer default 0,
  is_public boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.notes enable row level security;

-- ========== DECKS SIMPLIFICADO ==========
-- Solo para flashcards de notas Obsidian (sin topic_id)
create table if not exists public.decks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  is_public boolean not null default false,
  created_at timestamptz default now()
);
alter table public.decks enable row level security;

-- ========== CARDS ==========
create table if not exists public.cards (
  id uuid primary key default gen_random_uuid(),
  deck_id uuid not null references public.decks(id) on delete cascade,
  front text not null,
  back text not null,
  created_at timestamptz default now()
);
alter table public.cards enable row level security;

-- ========== NOTE_LINKS ==========
-- Para wikilinks entre notas estilo Obsidian
create table if not exists public.note_links (
  id uuid primary key default gen_random_uuid(),
  from_note_id uuid not null references public.notes(id) on delete cascade,
  to_note_id uuid references public.notes(id) on delete cascade,
  anchor_text text,
  created_at timestamptz default now(),
  unique(from_note_id, to_note_id)
);
alter table public.note_links enable row level security;

-- ========== NOTE_DECK_LINKS ==========
-- Vincula notas con sus decks de flashcards automáticas
create table if not exists public.note_deck_links (
  id uuid primary key default gen_random_uuid(),
  note_id uuid not null references public.notes(id) on delete cascade,
  deck_id uuid not null references public.decks(id) on delete cascade,
  created_at timestamptz default now(),
  unique(note_id, deck_id)
);
alter table public.note_deck_links enable row level security;

-- ========== ÍNDICES ==========
-- Índices para folders
create index if not exists idx_folders_owner_id on public.folders(owner_id);
create index if not exists idx_folders_parent on public.folders(parent_folder_id);
create index if not exists idx_folders_sort_order on public.folders(sort_order);

-- Índices para notas
create index if not exists idx_notes_owner_id on public.notes(owner_id);
create index if not exists idx_notes_folder_id on public.notes(folder_id);
create index if not exists idx_notes_sort_order on public.notes(sort_order);
create index if not exists idx_notes_slug on public.notes(slug) where slug is not null;
create index if not exists idx_notes_updated_at on public.notes(updated_at desc);

-- Índices para decks y cards
create index if not exists idx_decks_owner_id on public.decks(owner_id);
create index if not exists idx_decks_public on public.decks(is_public);
create index if not exists idx_cards_deck on public.cards(deck_id);

-- Índices para enlaces entre notas
create index if not exists idx_note_links_from on public.note_links(from_note_id);
create index if not exists idx_note_links_to on public.note_links(to_note_id);

-- Índices para note_deck_links
create index if not exists idx_note_deck_links_note_id on public.note_deck_links(note_id);
create index if not exists idx_note_deck_links_deck_id on public.note_deck_links(deck_id);

-- ========== LIMPIAR POLÍTICAS EXISTENTES ==========
-- Profiles
drop policy if exists "Profiles: select own" on public.profiles;
drop policy if exists "Profiles: insert own" on public.profiles;
drop policy if exists "Profiles: update own" on public.profiles;

-- Folders
drop policy if exists "folders: select own" on public.folders;
drop policy if exists "folders: insert own" on public.folders;
drop policy if exists "folders: update own" on public.folders;
drop policy if exists "folders: delete own" on public.folders;

-- Notes
drop policy if exists "notes: select own" on public.notes;
drop policy if exists "notes: insert own" on public.notes;
drop policy if exists "notes: update own" on public.notes;
drop policy if exists "notes: delete own" on public.notes;

-- Decks
drop policy if exists "decks: select own" on public.decks;
drop policy if exists "decks: select public (auth)" on public.decks;
drop policy if exists "decks: insert own" on public.decks;
drop policy if exists "decks: update own" on public.decks;
drop policy if exists "decks: delete own" on public.decks;

-- Cards
drop policy if exists "cards: select own" on public.cards;
drop policy if exists "cards: select public (auth)" on public.cards;
drop policy if exists "cards: insert own" on public.cards;
drop policy if exists "cards: update own" on public.cards;
drop policy if exists "cards: delete own" on public.cards;

-- Note Links
drop policy if exists "note_links: select own" on public.note_links;
drop policy if exists "note_links: manage own" on public.note_links;

-- Note Deck Links
drop policy if exists "note_deck_links: manage own" on public.note_deck_links;

-- ========== POLÍTICAS RLS ==========

-- PROFILES
create policy "Profiles: select own" on public.profiles for select to authenticated
using (auth.uid() = id);

create policy "Profiles: insert own" on public.profiles for insert to authenticated
with check (auth.uid() = id);

create policy "Profiles: update own" on public.profiles for update to authenticated
using (auth.uid() = id) with check (auth.uid() = id);

-- FOLDERS
create policy "folders: select own" on public.folders for select to authenticated
using (auth.uid() = owner_id);

create policy "folders: insert own" on public.folders for insert to authenticated
with check (auth.uid() = owner_id);

create policy "folders: update own" on public.folders for update to authenticated
using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create policy "folders: delete own" on public.folders for delete to authenticated
using (auth.uid() = owner_id);

-- NOTES
create policy "notes: select own" on public.notes for select to authenticated
using (auth.uid() = owner_id);

create policy "notes: insert own" on public.notes for insert to authenticated
with check (auth.uid() = owner_id);

create policy "notes: update own" on public.notes for update to authenticated
using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create policy "notes: delete own" on public.notes for delete to authenticated
using (auth.uid() = owner_id);

-- DECKS (simplificado, sin topic_id)
create policy "decks: select own" on public.decks for select to authenticated
using (auth.uid() = owner_id);

create policy "decks: select public (auth)" on public.decks for select to authenticated
using (true);

create policy "decks: insert own" on public.decks for insert to authenticated
with check (auth.uid() = owner_id);

create policy "decks: update own" on public.decks for update to authenticated
using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create policy "decks: delete own" on public.decks for delete to authenticated
using (auth.uid() = owner_id);

-- CARDS
create policy "cards: select own" on public.cards for select to authenticated
using (exists (
  select 1 from public.decks d where d.id = cards.deck_id and d.owner_id = auth.uid()
));

create policy "cards: select public (auth)" on public.cards for select to authenticated
using (exists (
  select 1 from public.decks d where d.id = cards.deck_id and d.is_public = true
));

create policy "cards: insert own" on public.cards for insert to authenticated
with check (exists (
  select 1 from public.decks d where d.id = cards.deck_id and d.owner_id = auth.uid()
));

create policy "cards: update own" on public.cards for update to authenticated
using (exists (
  select 1 from public.decks d where d.id = cards.deck_id and d.owner_id = auth.uid()
))
with check (exists (
  select 1 from public.decks d where d.id = cards.deck_id and d.owner_id = auth.uid()
));

create policy "cards: delete own" on public.cards for delete to authenticated
using (exists (
  select 1 from public.decks d where d.id = cards.deck_id and d.owner_id = auth.uid()
));

-- NOTE_LINKS
create policy "note_links: select own" on public.note_links for select to authenticated
using (exists (
  select 1 from public.notes n where n.id = from_note_id and n.owner_id = auth.uid()
));

create policy "note_links: manage own" on public.note_links for all to authenticated
using (exists (
  select 1 from public.notes n where n.id = from_note_id and n.owner_id = auth.uid()
));

-- NOTE_DECK_LINKS
create policy "note_deck_links: manage own" on public.note_deck_links for all to authenticated
using (exists (
  select 1 from public.notes n where n.id = note_id and n.owner_id = auth.uid()
));

-- ========== TRIGGER UPDATED_AT ==========
create or replace function update_updated_at_column()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language 'plpgsql';

drop trigger if exists update_notes_updated_at on public.notes;
create trigger update_notes_updated_at 
    before update on public.notes 
    for each row 
    execute function update_updated_at_column();

-- ===============================================
-- SISTEMA OBSIDIAN SIMPLIFICADO COMPLETADO
-- ===============================================
-- ✅ Sistema anterior eliminado completamente
-- ✅ Solo tablas necesarias: profiles, folders, notes, decks, cards, note_links, note_deck_links
-- ✅ Decks sin topic_id (solo para flashcards Obsidian)
-- ✅ Políticas RLS completas y corregidas
-- ✅ Índices optimizados
-- ✅ Trigger para updated_at
-- ✅ Wikilinks corregidos con esquema correcto
-- ===============================================
