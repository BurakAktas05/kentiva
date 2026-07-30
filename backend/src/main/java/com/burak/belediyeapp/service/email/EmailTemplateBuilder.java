package com.burak.belediyeapp.service.email;

import org.springframework.stereotype.Component;

/**
 * Kentiva kurumsal HTML e-posta şablonları üretici servisi.
 */
@Component
public class EmailTemplateBuilder {

    /**
     * İhbar durum güncellemesi e-postası şablonu.
     */
    public String buildReportStatusUpdateEmail(
            String citizenName,
            String trackingNumber,
            String categoryName,
            String statusLabel,
            String municipalityName,
            String updatedDate,
            String actionUrl) {

        String safeCitizen = citizenName != null && !citizenName.isBlank() ? citizenName : "Değerli Hemşehrimiz";
        String safeMuni = municipalityName != null ? municipalityName : "Kentiva Belediyesi";
        String safeTracking = trackingNumber != null ? trackingNumber : "—";
        String safeCategory = categoryName != null ? categoryName : "Genel İhbar";

        return """
            <!DOCTYPE html>
            <html lang="tr">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>İhbar Durum Güncellemesi</title>
              <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; margin: 0; padding: 0; color: #1e293b; }
                .container { max-width: 600px; margin: 30px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05); }
                .header { background: linear-gradient(135deg, #0284c7 0%%, #0f172a 100%%); color: #ffffff; padding: 32px 24px; text-align: center; }
                .header h1 { margin: 0; font-size: 24px; font-weight: 800; tracking: -0.025em; }
                .header p { margin: 8px 0 0 0; opacity: 0.9; font-size: 14px; }
                .content { padding: 32px 24px; }
                .greeting { font-size: 16px; font-weight: 700; color: #0f172a; margin-bottom: 16px; }
                .card { background: #f1f5f9; border-radius: 12px; padding: 20px; margin: 20px 0; border: 1px solid #e2e8f0; }
                .card-row { display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 14px; }
                .card-row:last-child { margin-bottom: 0; }
                .label { color: #64748b; font-weight: 600; }
                .value { font-weight: 700; color: #0f172a; }
                .status-badge { display: inline-block; background: #0284c7; color: #ffffff; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 800; }
                .btn { display: inline-block; background: #0284c7; color: #ffffff !important; text-decoration: none; padding: 12px 28px; border-radius: 10px; font-weight: 700; font-size: 14px; margin-top: 20px; text-align: center; }
                .footer { background: #f8fafc; padding: 20px 24px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>%s</h1>
                  <p>İhbarınızda Yeni Bir Gelişme Var</p>
                </div>
                <div class="content">
                  <div class="greeting">Sayın %s,</div>
                  <p>Belediyemize iletmiş olduğunuz ihbar kaydınız güncellenmiştir. Detaylar aşağıdadır:</p>
                  
                  <div class="card">
                    <div class="card-row">
                      <span class="label">Takip No:</span>
                      <span class="value">#%s</span>
                    </div>
                    <div class="card-row">
                      <span class="label">Kategori:</span>
                      <span class="value">%s</span>
                    </div>
                    <div class="card-row">
                      <span class="label">Yeni Durum:</span>
                      <span class="value"><span class="status-badge">%s</span></span>
                    </div>
                    <div class="card-row">
                      <span class="label">Güncelleme Tarihi:</span>
                      <span class="value">%s</span>
                    </div>
                  </div>

                  <p>İhbarınızın sürecini mobil uygulamamız üzerinden anlık olarak takip edebilirsiniz.</p>
                  
                  %s
                </div>
                <div class="footer">
                  <p>Bu e-posta Kentiva Akıllı Şehir & Şehir Yönetim SaaS Platformu tarafından otomatik gönderilmiştir.</p>
                  <p>&copy; 2026 %s. Tüm hakları saklıdır.</p>
                </div>
              </div>
            </body>
            </html>
            """.formatted(
                safeMuni,
                safeCitizen,
                safeTracking,
                safeCategory,
                statusLabel != null ? statusLabel : "Güncellendi",
                updatedDate != null ? updatedDate : "—",
                actionUrl != null && !actionUrl.isBlank() ? "<a href=\"" + actionUrl + "\" class=\"btn\">İhbar Detayına Git</a>" : "",
                safeMuni
        );
    }

    /**
     * Zamanlanmış veri dışa aktarma (scheduled export) e-postası şablonu.
     */
    public String buildScheduledExportEmail(
            String recipientName,
            String exportTitle,
            String municipalityName,
            String rowCount,
            String generatedAt) {

        String safeRecipient = recipientName != null ? recipientName : "Yönetici";
        String safeMuni = municipalityName != null ? municipalityName : "Kentiva";
        String safeTitle = exportTitle != null ? exportTitle : "Veri Dışa Aktarımı";

        return """
            <!DOCTYPE html>
            <html lang="tr">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Zamanlanmış Rapor Raporu</title>
              <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; margin: 0; padding: 0; color: #1e293b; }
                .container { max-width: 600px; margin: 30px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05); }
                .header { background: linear-gradient(135deg, #0f172a 0%%, #1e293b 100%%); color: #ffffff; padding: 32px 24px; text-align: center; }
                .header h1 { margin: 0; font-size: 22px; font-weight: 800; }
                .content { padding: 32px 24px; }
                .card { background: #f8fafc; border-radius: 12px; padding: 20px; margin: 20px 0; border: 1px solid #e2e8f0; }
                .card-row { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 14px; }
                .label { color: #64748b; font-weight: 600; }
                .value { font-weight: 700; color: #0f172a; }
                .footer { background: #f8fafc; padding: 20px 24px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>Kentiva Rapor Servisi</h1>
                  <p>%s — Zamanlanmış Veri Dosyası</p>
                </div>
                <div class="content">
                  <p>Sayın <strong>%s</strong>,</p>
                  <p>Ayarlamış olduğunuz <strong>%s</strong> isimli otomatik rapor başarıyla oluşturulmuş ve e-posta eklentisi olarak eklenmiştir.</p>
                  
                  <div class="card">
                    <div class="card-row">
                      <span class="label">Belediye:</span>
                      <span class="value">%s</span>
                    </div>
                    <div class="card-row">
                      <span class="label">Rapor İsmi:</span>
                      <span class="value">%s</span>
                    </div>
                    <div class="card-row">
                      <span class="label">Satır Sayısı:</span>
                      <span class="value">%s</span>
                    </div>
                    <div class="card-row">
                      <span class="label">Oluşturulma Zamanı:</span>
                      <span class="value">%s</span>
                    </div>
                  </div>

                  <p>Dosyayı e-posta ekinden indirebilirsiniz.</p>
                </div>
                <div class="footer">
                  <p>Kentiva Yönetim Portalı &copy; 2026</p>
                </div>
              </div>
            </body>
            </html>
            """.formatted(
                safeMuni,
                safeRecipient,
                safeTitle,
                safeMuni,
                safeTitle,
                rowCount != null ? rowCount : "—",
                generatedAt != null ? generatedAt : "—"
        );
    }
}
