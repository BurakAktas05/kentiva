package com.burak.belediyeapp.service.integration;

import com.burak.belediyeapp.entity.MisIntegrationType;
import com.burak.belediyeapp.entity.Municipality;
import com.burak.belediyeapp.entity.Report;
import com.burak.belediyeapp.integration.mis.KolayliAdapter;
import com.burak.belediyeapp.integration.mis.MisAdapter;
import com.burak.belediyeapp.integration.mis.NetigmaAdapter;
import com.burak.belediyeapp.integration.mis.SampasAdapter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

/**
 * Belediye İç Sistemleri (MIS/EBYS) entegrasyon orkestratörü.
 * Rapor oluşturulduğunda belediyenin yapılandırdığı MIS sistemine asenkron olarak iletir.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class MisIntegrationService {

    private final SampasAdapter sampasAdapter;
    private final KolayliAdapter kolayliAdapter;
    private final NetigmaAdapter netigmaAdapter;

    @Async
    public void sendReportToMis(Municipality municipality, Report report) {
        if (municipality == null || municipality.getMisType() == null
                || municipality.getMisType() == MisIntegrationType.NONE) {
            return;
        }

        String url = municipality.getMisUrl();
        String key = municipality.getMisApiKey();
        if (url == null || url.isBlank()) {
            log.warn("MIS URL tanımlı değil: belediye={}, misType={}",
                    municipality.getId(), municipality.getMisType());
            return;
        }

        MisAdapter adapter = resolveAdapter(municipality.getMisType());
        if (adapter == null) {
            log.warn("MIS adaptör bulunamadı: belediye={}, misType={}",
                    municipality.getId(), municipality.getMisType());
            return;
        }

        try {
            adapter.sendReport(report, url, key);
        } catch (Exception e) {
            log.error("MIS entegrasyon hatası: belediye={}, misType={}, rapor={}, hata={}",
                    municipality.getId(), municipality.getMisType(), report.getId(), e.getMessage());
        }
    }

    private MisAdapter resolveAdapter(MisIntegrationType type) {
        return switch (type) {
            case SAMPAS -> sampasAdapter;
            case KOLAYLI -> kolayliAdapter;
            case NETIGMA -> netigmaAdapter;
            case NONE -> null;
        };
    }
}
