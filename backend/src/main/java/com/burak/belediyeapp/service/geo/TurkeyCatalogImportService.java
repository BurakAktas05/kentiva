package com.burak.belediyeapp.service.geo;

import com.burak.belediyeapp.entity.TurkeyDistrict;
import com.burak.belediyeapp.repository.ITurkeyDistrictRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class TurkeyCatalogImportService {

    private final ITurkeyDistrictRepository districtRepository;
    private final OsmBoundaryService osmBoundaryService;
    private final JdbcTemplate jdbcTemplate;

    @Async
    public void importBoundariesAsync() {
        log.info("Türkiye ilçeleri coğrafi sınırları OSM Nominatim API üzerinden asenkron içe aktarım işlemi başladı...");
        List<TurkeyDistrict> districts = districtRepository.findAll();
        int importedCount = 0;
        int failedCount = 0;

        for (TurkeyDistrict district : districts) {
            if ("IMPORTED".equals(district.getBoundaryStatus())) {
                continue;
            }

            String provinceName = district.getProvince() != null ? district.getProvince().getNameTr() : null;
            log.info("Sınır çekiliyor: {} ({})", district.getNameTr(), provinceName);

            try {
                Optional<String> geoJson = osmBoundaryService.fetchGeoJson(
                        district.getNameTr(), 
                        provinceName, 
                        "TR"
                );

                if (geoJson.isPresent()) {
                    // PostGIS native güncelleme
                    jdbcTemplate.update("""
                        UPDATE turkey_districts 
                        SET boundaries = ST_Multi(ST_CollectionExtract(ST_MakeValid(ST_SetSRID(ST_GeomFromGeoJSON(?), 4326)), 3)),
                            centroid = ST_Centroid(ST_Multi(ST_CollectionExtract(ST_MakeValid(ST_SetSRID(ST_GeomFromGeoJSON(?), 4326)), 3))),
                            boundary_status = 'IMPORTED' 
                        WHERE id = ?
                        """, geoJson.get(), geoJson.get(), district.getId());
                    
                    importedCount++;
                    log.info("Sınır başarıyla kaydedildi: {}", district.getNameTr());
                } else {
                    jdbcTemplate.update("UPDATE turkey_districts SET boundary_status = 'FAILED' WHERE id = ?", district.getId());
                    failedCount++;
                    log.warn("Sınır bulunamadı: {}", district.getNameTr());
                }
            } catch (Exception e) {
                failedCount++;
                log.error("İlçe sınır aktarımı sırasında hata oluştu (id: {}): {}", district.getId(), e.getMessage());
                try {
                    jdbcTemplate.update("UPDATE turkey_districts SET boundary_status = 'FAILED' WHERE id = ?", district.getId());
                } catch (Exception ignored) {}
            }
        }

        log.info("Türkiye ilçeleri sınır aktarımı tamamlandı. Başarılı: {}, Başarısız/Bulunamayan: {}", importedCount, failedCount);
    }
}
