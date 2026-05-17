-- ============================================================
-- V16: Safranbolu Belediyesi
-- Test amacıyla eklenmiştir.
-- ============================================================

INSERT INTO municipalities (
    id, 
    name, 
    type, 
    center_lat, 
    center_lng, 
    default_zoom, 
    slug, 
    display_name, 
    active, 
    onboarded, 
    public_stats_enabled,
    created_at,
    updated_at
) VALUES (
    'uuid-safranbolu-belediyesi',
    'Safranbolu Belediyesi',
    'DISTRICT',
    41.2519,
    32.6937,
    13,
    'safranbolu',
    'Safranbolu Belediyesi',
    true,
    true,
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
) ON CONFLICT (slug) DO NOTHING;
