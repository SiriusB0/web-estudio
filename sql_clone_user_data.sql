-- ===============================================
-- FUNCIÓN DE CLONACIÓN DE DATOS DE USUARIO
-- ===============================================
-- Esta función clona todo el contenido de un usuario (admin) 
-- a un nuevo usuario manteniendo todas las relaciones
-- ===============================================

CREATE OR REPLACE FUNCTION clone_user_data(
    source_user_id UUID,
    target_user_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    folder_mapping JSONB := '{}';
    deck_mapping JSONB := '{}';
    note_mapping JSONB := '{}';
    card_mapping JSONB := '{}';
    
    source_folder RECORD;
    source_note RECORD;
    source_deck RECORD;
    source_card RECORD;
    source_link RECORD;
    source_note_deck_link RECORD;
    source_image RECORD;
    
    new_folder_id UUID;
    new_note_id UUID;
    new_deck_id UUID;
    new_card_id UUID;
    
    cloned_folders INTEGER := 0;
    cloned_notes INTEGER := 0;
    cloned_decks INTEGER := 0;
    cloned_cards INTEGER := 0;
    cloned_links INTEGER := 0;
    cloned_note_deck_links INTEGER := 0;
    cloned_images INTEGER := 0;
BEGIN
    -- Verificar que ambos usuarios existen
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = source_user_id) THEN
        RAISE EXCEPTION 'Usuario origen no existe: %', source_user_id;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = target_user_id) THEN
        RAISE EXCEPTION 'Usuario destino no existe: %', target_user_id;
    END IF;

    -- ========== 1. CLONAR PROFILE ==========
    INSERT INTO public.profiles (id, username, created_at)
    SELECT 
        target_user_id,
        (SELECT username FROM public.profiles WHERE id = source_user_id) || '_copy',
        NOW()
    WHERE NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = target_user_id);

    -- ========== 2. CLONAR FOLDERS (en orden jerárquico) ==========
    -- Primero las carpetas raíz (sin parent)
    FOR source_folder IN 
        SELECT * FROM public.folders 
        WHERE owner_id = source_user_id AND parent_folder_id IS NULL
        ORDER BY sort_order, created_at
    LOOP
        INSERT INTO public.folders (owner_id, name, parent_folder_id, sort_order, created_at)
        VALUES (target_user_id, source_folder.name, NULL, source_folder.sort_order, NOW())
        RETURNING id INTO new_folder_id;
        
        folder_mapping := folder_mapping || jsonb_build_object(source_folder.id::text, new_folder_id::text);
        cloned_folders := cloned_folders + 1;
    END LOOP;

    -- Luego las subcarpetas (con parent)
    FOR source_folder IN 
        SELECT * FROM public.folders 
        WHERE owner_id = source_user_id AND parent_folder_id IS NOT NULL
        ORDER BY sort_order, created_at
    LOOP
        INSERT INTO public.folders (owner_id, name, parent_folder_id, sort_order, created_at)
        VALUES (
            target_user_id, 
            source_folder.name, 
            (folder_mapping ->> source_folder.parent_folder_id::text)::UUID,
            source_folder.sort_order, 
            NOW()
        )
        RETURNING id INTO new_folder_id;
        
        folder_mapping := folder_mapping || jsonb_build_object(source_folder.id::text, new_folder_id::text);
        cloned_folders := cloned_folders + 1;
    END LOOP;

    -- ========== 3. CLONAR NOTES ==========
    FOR source_note IN 
        SELECT * FROM public.notes 
        WHERE owner_id = source_user_id
        ORDER BY sort_order, created_at
    LOOP
        INSERT INTO public.notes (
            owner_id, title, content_md, slug, folder_id, 
            sort_order, is_public, created_at, updated_at
        )
        VALUES (
            target_user_id,
            source_note.title,
            source_note.content_md,
            source_note.slug,
            CASE 
                WHEN source_note.folder_id IS NOT NULL 
                THEN (folder_mapping ->> source_note.folder_id::text)::UUID
                ELSE NULL 
            END,
            source_note.sort_order,
            source_note.is_public,
            NOW(),
            NOW()
        )
        RETURNING id INTO new_note_id;
        
        note_mapping := note_mapping || jsonb_build_object(source_note.id::text, new_note_id::text);
        cloned_notes := cloned_notes + 1;
    END LOOP;

    -- ========== 4. CLONAR DECKS ==========
    FOR source_deck IN 
        SELECT * FROM public.decks 
        WHERE owner_id = source_user_id
        ORDER BY created_at
    LOOP
        INSERT INTO public.decks (owner_id, name, is_public, created_at)
        VALUES (target_user_id, source_deck.name, source_deck.is_public, NOW())
        RETURNING id INTO new_deck_id;
        
        deck_mapping := deck_mapping || jsonb_build_object(source_deck.id::text, new_deck_id::text);
        cloned_decks := cloned_decks + 1;
    END LOOP;

    -- ========== 5. CLONAR CARDS ==========
    FOR source_card IN 
        SELECT * FROM public.cards 
        WHERE deck_id IN (SELECT id FROM public.decks WHERE owner_id = source_user_id)
        ORDER BY created_at
    LOOP
        INSERT INTO public.cards (
            deck_id, front, back, front_image_url, back_image_url, 
            front_image_name, back_image_name, created_at
        )
        VALUES (
            (deck_mapping ->> source_card.deck_id::text)::UUID,
            source_card.front,
            source_card.back,
            source_card.front_image_url,
            source_card.back_image_url,
            source_card.front_image_name,
            source_card.back_image_name,
            NOW()
        )
        RETURNING id INTO new_card_id;
        
        card_mapping := card_mapping || jsonb_build_object(source_card.id::text, new_card_id::text);
        cloned_cards := cloned_cards + 1;
    END LOOP;

    -- ========== 6. CLONAR NOTE_LINKS ==========
    FOR source_link IN 
        SELECT * FROM public.note_links 
        WHERE from_note_id IN (SELECT id FROM public.notes WHERE owner_id = source_user_id)
    LOOP
        -- Solo clonar si ambas notas (origen y destino) existen en el mapeo
        IF (note_mapping ? source_link.from_note_id::text) AND 
           (source_link.to_note_id IS NULL OR note_mapping ? source_link.to_note_id::text) THEN
            
            INSERT INTO public.note_links (from_note_id, to_note_id, anchor_text, created_at)
            VALUES (
                (note_mapping ->> source_link.from_note_id::text)::UUID,
                CASE 
                    WHEN source_link.to_note_id IS NOT NULL 
                    THEN (note_mapping ->> source_link.to_note_id::text)::UUID
                    ELSE NULL 
                END,
                source_link.anchor_text,
                NOW()
            );
            cloned_links := cloned_links + 1;
        END IF;
    END LOOP;

    -- ========== 7. CLONAR NOTE_DECK_LINKS ==========
    FOR source_note_deck_link IN 
        SELECT * FROM public.note_deck_links ndl
        JOIN public.notes n ON ndl.note_id = n.id
        WHERE n.owner_id = source_user_id
    LOOP
        INSERT INTO public.note_deck_links (note_id, deck_id, created_at)
        VALUES (
            (note_mapping ->> source_note_deck_link.note_id::text)::UUID,
            (deck_mapping ->> source_note_deck_link.deck_id::text)::UUID,
            NOW()
        );
        cloned_note_deck_links := cloned_note_deck_links + 1;
    END LOOP;

    -- ========== 8. CLONAR FLASHCARD_IMAGES ==========
    FOR source_image IN 
        SELECT fi.* FROM public.flashcard_images fi
        JOIN public.cards c ON fi.card_id = c.id
        JOIN public.decks d ON c.deck_id = d.id
        WHERE d.owner_id = source_user_id
    LOOP
        INSERT INTO public.flashcard_images (
            card_id, image_url, image_name, image_type, 
            file_size, mime_type, uploaded_by, created_at
        )
        VALUES (
            (card_mapping ->> source_image.card_id::text)::UUID,
            source_image.image_url,
            source_image.image_name,
            source_image.image_type,
            source_image.file_size,
            source_image.mime_type,
            target_user_id,
            NOW()
        );
        cloned_images := cloned_images + 1;
    END LOOP;

    -- ========== RETORNAR RESUMEN ==========
    RETURN json_build_object(
        'success', true,
        'source_user_id', source_user_id,
        'target_user_id', target_user_id,
        'cloned_folders', cloned_folders,
        'cloned_notes', cloned_notes,
        'cloned_decks', cloned_decks,
        'cloned_cards', cloned_cards,
        'cloned_note_links', cloned_links,
        'cloned_note_deck_links', cloned_note_deck_links,
        'cloned_images', cloned_images,
        'timestamp', NOW()
    );

EXCEPTION
    WHEN OTHERS THEN
        -- En caso de error, la transacción se revierte automáticamente
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM,
            'source_user_id', source_user_id,
            'target_user_id', target_user_id,
            'timestamp', NOW()
        );
END;
$$;

-- ========== COMENTARIOS Y DOCUMENTACIÓN ==========
COMMENT ON FUNCTION clone_user_data(UUID, UUID) IS 
'Clona todo el contenido de un usuario a otro usuario manteniendo las relaciones. 
Parámetros: source_user_id (admin), target_user_id (nuevo usuario).
Retorna JSON con resumen de la operación.';

-- ========== FUNCIÓN AUXILIAR PARA OBTENER ESTADÍSTICAS ==========
CREATE OR REPLACE FUNCTION get_user_content_stats(user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    folder_count INTEGER;
    note_count INTEGER;
    deck_count INTEGER;
    card_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO folder_count FROM public.folders WHERE owner_id = user_id;
    SELECT COUNT(*) INTO note_count FROM public.notes WHERE owner_id = user_id;
    SELECT COUNT(*) INTO deck_count FROM public.decks WHERE owner_id = user_id;
    SELECT COUNT(*) INTO card_count 
    FROM public.cards c 
    JOIN public.decks d ON c.deck_id = d.id 
    WHERE d.owner_id = user_id;
    
    RETURN json_build_object(
        'user_id', user_id,
        'folders', folder_count,
        'notes', note_count,
        'decks', deck_count,
        'cards', card_count,
        'timestamp', NOW()
    );
END;
$$;

COMMENT ON FUNCTION get_user_content_stats(UUID) IS 
'Obtiene estadísticas del contenido de un usuario para verificar la clonación.';
