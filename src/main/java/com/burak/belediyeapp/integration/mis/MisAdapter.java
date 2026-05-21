package com.burak.belediyeapp.integration.mis;

import com.burak.belediyeapp.entity.Report;

/**
 * Belediye İç Sistemleri (MIS/EBYS) entegrasyon adaptör arayüzü.
 * Her MIS türü için ayrı bir implementasyon sağlanır.
 */
public interface MisAdapter {

    /**
     * Raporu hedef MIS sistemine gönderir.
     *
     * @param report  gönderilecek rapor
     * @param baseUrl MIS API temel URL'i
     * @param apiKey  API kimlik doğrulama anahtarı
     */
    void sendReport(Report report, String baseUrl, String apiKey);
}
