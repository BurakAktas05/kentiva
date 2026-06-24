package com.burak.belediyeapp.service.geo;

import com.burak.belediyeapp.config.EvictMunicipalityCaches;
import com.burak.belediyeapp.entity.Municipality;
import com.burak.belediyeapp.entity.MunicipalityType;
import com.burak.belediyeapp.exception.ResourceNotFoundException;
import com.burak.belediyeapp.repository.IMunicipalityRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;
import java.util.List;

/**
 * Belediye sınırlarını OpenStreetMap'ten otomatik çeker.
 *
 * Çalışma mantığı:
 *   1. İlçe (DISTRICT) belediyelerde varsayılan olarak parent METROPOLITAN belediyenin
 *      adı il olarak alınır (örn. Kadıköy → İstanbul).
 *   2. METROPOLITAN belediyelerde sadece kendi adı il olarak Nominatim'e gönderilir.
 *   3. Hata olursa loglanır, throw edilmez — admin yine yenile düğmesini deneyebilir.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class MunicipalityBoundaryAutoSyncService {

    private final IMunicipalityRepository municipalityRepository;
    private final OsmBoundaryService osmBoundaryService;

    /** Self-call yapan @Transactional metotları proxy üzerinden tetiklemek için. */
    @Autowired
    @Lazy
    private MunicipalityBoundaryAutoSyncService self;

    /**
     * Senkron / blokeleyici sınır çekme. Endpoint çağrılarında kullanılır,
     * sonuç başarılı/başarısız olarak controller'a döner.
     *
     * HTTP (Nominatim) çağrısı transaction DIŞINDA yapılır; sonra kısa bir yazma
     * transaction'ı ile GeoJSON kaydedilir → DB connection HTTP latency'sini beklemez.
     */
    public boolean syncNow(String municipalityId) {
        Resolved query = self.resolveQueryReadOnly(municipalityId);
        return runSync(municipalityId, query);
    }

    /**
     * Asenkron sınır çekme — belediye oluşturulduktan sonra arkaplanda denenir,
     * onboarding response'unu bloklamaz.
     */
    @Async
    public void syncAsync(String municipalityId) {
        try {
            syncNow(municipalityId);
        } catch (Exception e) {
            log.warn("syncAsync hata: {}", e.getMessage());
        }
    }

    /**
     * Uygulama başlarken sınır verisi eksik olan aktif belediyelerin sınırlarını
     * OpenStreetMap'ten arka planda otomatik ve sıralı olarak çeker.
     */
    @org.springframework.context.event.EventListener(org.springframework.boot.context.event.ApplicationReadyEvent.class)
    public void syncMissingBoundariesOnStartup() {
        self.syncAllMissingAsync();
    }

    @Async
    public void syncAllMissingAsync() {
        log.info("Sınırı eksik olan aktif belediyeler kontrol ediliyor...");
        List<Municipality> activeMunicipalities = municipalityRepository.findAllWithDistrictAndProvince();
        int count = 0;
        for (Municipality m : activeMunicipalities) {
            if (m.isOnboarded() && m.isActive() && m.getDistrict() != null && m.getDistrict().getBoundaries() == null) {
                log.info("Belediye sınırı eksik, OSM'den otomatik çekiliyor: {} ({})", m.getName(), m.getDistrict().getNameTr());
                try {
                    boolean success = syncNow(m.getId());
                    if (success) {
                        count++;
                    }
                } catch (Exception e) {
                    log.warn("Başlangıç sınır çekme hatası ({}): {}", m.getName(), e.getMessage());
                }
            }
        }
        if (count > 0) {
            log.info("Başlangıçta {} adet belediyenin sınırları OSM'den başarıyla çekildi.", count);
        }
    }

    /** Belediye adı + parent (varsa) bilgisini ayrı kısa bir read-only txn'de okur. */
    @Transactional(readOnly = true)
    public Resolved resolveQueryReadOnly(String municipalityId) {
        Municipality m = municipalityRepository.findById(municipalityId)
                .orElseThrow(() -> new ResourceNotFoundException("Belediye", "id", municipalityId));
        return resolveQuery(m);
    }

    /** Yazma txn'i — Nominatim çağrısından sonra GeoJSON DB'ye kaydedilir. */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    @EvictMunicipalityCaches
    public boolean persistGeoJson(String municipalityId, String geoJson) {
        municipalityRepository.updateBoundariesFromGeoJson(municipalityId, geoJson);
        return true;
    }

    private boolean runSync(String municipalityId, Resolved query) {
        if (query == null || query.districtName == null) {
            log.warn("Sınır çekme atlandı, belediye adı boş: {}", municipalityId);
            return false;
        }
        Optional<String> geoJson = osmBoundaryService.fetchGeoJson(
                query.districtName, query.cityName, "TR");
        if (geoJson.isEmpty()) {
            log.warn("OSM sınırı bulunamadı: '{}' / '{}'", query.districtName, query.cityName);
            return false;
        }
        boolean saved = self.persistGeoJson(municipalityId, geoJson.get());
        if (saved) {
            log.info("Belediye sınırı otomatik çekildi ve kaydedildi: {} ({})", municipalityId, query);
        }
        return saved;
    }

    /**
     * Belediye adı + (varsa) parent büyükşehir adından OSM sorgu parametrelerini üretir.
     * Referans katalog tanımlıysa doğrudan resmi adları kullanır; aksi takdirde eski mantığa düşer.
     */
    private Resolved resolveQuery(Municipality m) {
        if (m.getDistrict() != null) {
            String district = m.getDistrict().getNameTr();
            String city = m.getDistrict().getProvince() != null ? m.getDistrict().getProvince().getNameTr() : null;
            return new Resolved(district, city);
        }

        String district = preferred(m.getDisplayName(), m.getName());
        String city = null;
        if (m.getType() == MunicipalityType.DISTRICT && m.getParentMunicipality() != null) {
            // LAZY ilişki — id ile yeniden çekmeden alanı kullanmaya çalışırsak proxy sorunu çıkmasın diye DB'den okuruz.
            Municipality parent = municipalityRepository.findById(m.getParentMunicipality().getId()).orElse(null);
            if (parent != null) {
                city = preferred(parent.getDisplayName(), parent.getName());
            }
        }
        return new Resolved(district, city);
    }

    private static String preferred(String first, String second) {
        if (first != null && !first.isBlank()) return first.trim();
        if (second != null && !second.isBlank()) return second.trim();
        return null;
    }

    private record Resolved(String districtName, String cityName) {
        @Override public String toString() {
            return districtName + (cityName != null ? " / " + cityName : "");
        }
    }
}
