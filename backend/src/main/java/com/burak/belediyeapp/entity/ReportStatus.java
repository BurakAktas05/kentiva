package com.burak.belediyeapp.entity;

/**
 * Bir raporun yaşam döngüsündeki durumlar.
 *
 * Durum geçiş akışı:
 *   PENDING → PROCESSING → RESOLVED
 *   PENDING → REJECTED
 *   PROCESSING → REJECTED (istisnai durum)
 */
public enum ReportStatus {

    /**
     * Vatandaş raporunu gönderdi, henüz incelenmedi.
     * Başlangıç durumu.
     */
    PENDING,

    /**
     * Beyaz Masa tarafından departmana yönlendirildi, müdürlük henüz almadı.
     * Yalnızca DEPARTMENTAL modda kullanılır.
     */
    FORWARDED,

    /**
     * Rapor incelendi, saha ekibine atandı, üzerinde çalışılıyor.
     */
    PROCESSING,

    /**
     * Sorun sahada giderildi, rapor kapatıldı.
     */
    RESOLVED,

    /**
     * Rapor geçersiz, mükerrer veya yanlış kategoride.
     * Reddedildi.
     */
    REJECTED,

    /**
     * Rapor belediye yetki alanının dışındadır.
     */
    OUT_OF_JURISDICTION
}
