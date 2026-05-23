package com.burak.belediyeapp.service.widget;

import com.burak.belediyeapp.entity.Municipality;
import java.util.Optional;

/**
 * Harici entegrasyonlar veya dinamik belediye widget'ları için arayüz.
 * Bu arayüzü uygulayan sınıflar, belediyenin ana ekran widget paketine dinamik olarak eklenir.
 */
public interface IMunicipalityWidgetProvider {
    
    /**
     * Eklentinin benzersiz anahtarı (örn. "bus-schedules", "garbage-collection").
     */
    String getWidgetKey();

    /**
     * Eklentinin kullanıcı arayüzünde gösterilecek varsayılan başlığı.
     */
    String getWidgetTitle();

    /**
     * Eklenti verisini çeker. Konum veya belediye bilgisi kullanılabilir.
     * Boş dönerse widget ana ekranda listelenmez.
     */
    Optional<Object> fetchWidgetData(Municipality municipality, double lat, double lng);
}
