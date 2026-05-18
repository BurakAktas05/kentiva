-- =====================================================================
-- V45 — Performans için kompozit / eksik indeksler
--
-- Audit bulgular:
--   • Notification listesi (user_id + created_at DESC)         → INotificationRepository.findByUserIdOrderByCreatedAtDesc
--   • Outage listesi      (municipality_id + active + starts_at) → IMunicipalityOutageRepository
--   • Event listesi       (municipality_id + active + starts_at) → IMunicipalityEventRepository
--   • Vatandaş tercih ettiği belediye                          → IAppUserRepository.findByPreferredMunicipalityId
--   • Rapor geçmişi yapan kullanıcı                            → idx_report_history_changed_by (FK lookup)
--   • Rapor duplicate group sayım sorgusu                      → idx_reports_duplicate_group_id (yeni)
-- =====================================================================

CREATE INDEX IF NOT EXISTS idx_notifications_user_created_at
    ON notifications (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_municipality_outages_muni_active_starts
    ON municipality_outages (municipality_id, active, starts_at DESC);

CREATE INDEX IF NOT EXISTS idx_municipality_events_muni_active_starts
    ON municipality_events (municipality_id, active, starts_at);

CREATE INDEX IF NOT EXISTS idx_app_users_preferred_municipality
    ON app_users (preferred_municipality_id)
    WHERE preferred_municipality_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_report_history_changed_by
    ON report_history (changed_by_id)
    WHERE changed_by_id IS NOT NULL;

-- duplicate_group_id'a göre toplu sayım için (ReportSupport batch çözücüsü)
CREATE INDEX IF NOT EXISTS idx_reports_duplicate_group_id
    ON reports (duplicate_group_id)
    WHERE duplicate_group_id IS NOT NULL;
