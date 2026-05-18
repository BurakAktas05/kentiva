package com.burak.belediyeapp.service.widget;

import com.burak.belediyeapp.dto.response.widget.PharmacyWidgetItem;
import com.burak.belediyeapp.entity.Municipality;
import com.burak.belediyeapp.service.geo.NominatimReverseGeocodeService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Ücretsiz, anahtarsız nöbetçi eczane kaynağı (eczaneler.gen.tr — Türkiye Eczacılar Odalarının
 * yayımladığı listeleri toplayan kamu sayfası).
 *
 * URL şablonu: https://www.eczaneler.gen.tr/nobetci-{il-slug}-{ilce-slug}
 * Yalnızca "bugün açık" (tab id="nav-bugun") sekmesindeki eczaneleri çekeriz —
 * tüm eczaneler değil, sadece o günün nöbet listesi.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class EczanelerGenTrService {

    private static final String BASE = "https://www.eczaneler.gen.tr";

    // <div ... id="nav-bugun" ...> ... </div>  (aktif "bugün" sekmesi)
    private static final Pattern TODAY_TAB = Pattern.compile(
            "id=\"nav-bugun\"[^>]*>(.*?)(?=<div[^>]*id=\"nav-yarin\"|</div>\\s*</div>\\s*</div>)",
            Pattern.DOTALL);

    // Her eczane satırı bir <tr><td colspan="3"> ... </td></tr> içinde.
    private static final Pattern ROW = Pattern.compile(
            "<tr>\\s*<td[^>]*colspan=\"3\"[^>]*>(.*?)</td>\\s*</tr>",
            Pattern.DOTALL);

    private static final Pattern NAME      = Pattern.compile("<span class=\"isim\">([^<]+)</span>");
    private static final Pattern PHONE_COL = Pattern.compile(
            "<div class=['\"]col-lg-3 py-lg-2['\"]>([^<]+)</div>");
    // col-lg-6 içinde iç içe div'ler var; non-greedy `(.*?)</div>` ilk iç div'de durur.
    // Bir sonraki kardeş kolon (phone) her zaman 'col-lg-3 py-lg-2' ile başlar; ona kadar yakalıyoruz.
    private static final Pattern ADDRESS_COL = Pattern.compile(
            "<div class=['\"]col-lg-6['\"]>(.*?)<div class=['\"]col-lg-3 py-lg-2['\"]>",
            Pattern.DOTALL);
    private static final Pattern ITALIC_DESC = Pattern.compile(
            "<span class=['\"]font-italic['\"]>(.*?)</span>", Pattern.DOTALL);
    private static final Pattern NEIGHBORHOOD = Pattern.compile(
            "<span class=\"[^\"]*rounded bg-secondary[^\"]*\">([^<]+)</span>");

    private final NominatimReverseGeocodeService geocodeService;

    private final RestClient http = RestClient.builder()
            .requestFactory(factory())
            .defaultHeader("User-Agent",
                    "Kentiva-SaaS/1.0 (+https://kentiva.app; contact@kentiva.app)")
            .defaultHeader("Accept", "text/html,application/xhtml+xml")
            .defaultHeader("Accept-Language", "tr,en;q=0.8")
            .build();

    /**
     * @param municipality   Belediye (widgetCitySlug / widgetDistrictSlug öncelikli)
     * @param userLat / userLng  konumdan slug çözmek için (slug yoksa)
     * @param limit  döndürülen maksimum kayıt
     * @return on-duty eczane listesi; sayfa bulunamazsa boş
     */
    public List<PharmacyWidgetItem> fetchOnDuty(
            Municipality municipality, double userLat, double userLng, int limit) {

        String citySlug = municipality.getWidgetCitySlug();
        String districtSlug = municipality.getWidgetDistrictSlug();

        if (citySlug == null || citySlug.isBlank() || districtSlug == null || districtSlug.isBlank()) {
            Optional<NominatimReverseGeocodeService.AdminArea> area =
                    geocodeService.resolve(userLat, userLng);
            if (area.isEmpty()) {
                log.debug("Eczaneler.gen.tr: slug çözülemedi (Nominatim boş)");
                return List.of();
            }
            if (citySlug == null || citySlug.isBlank()) {
                citySlug = area.get().provinceSlug();
            }
            if (districtSlug == null || districtSlug.isBlank()) {
                districtSlug = area.get().districtSlug();
            }
        }
        if (citySlug == null || citySlug.isBlank()) {
            return List.of();
        }
        return fetch(citySlug, districtSlug, limit);
    }

    private List<PharmacyWidgetItem> fetch(String citySlug, String districtSlug, int limit) {
        String path = "/nobetci-" + citySlug
                + (districtSlug != null && !districtSlug.isBlank() ? "-" + districtSlug : "");
        URI uri = UriComponentsBuilder.fromUriString(BASE + path).build().encode().toUri();
        try {
            // Sunucu Content-Type'da charset bildirmediği için Spring varsayılan ISO-8859-1'e düşer
            // ve Türkçe karakterler bozulur. Bayt olarak çek, UTF-8 olarak yorumla.
            byte[] bytes = http.get().uri(uri).retrieve().body(byte[].class);
            if (bytes == null || bytes.length == 0) {
                return List.of();
            }
            String html = new String(bytes, StandardCharsets.UTF_8);
            return parse(html, limit);
        } catch (Exception e) {
            log.warn("Eczaneler.gen.tr çağrısı başarısız ({}): {}", uri, e.getMessage());
            return List.of();
        }
    }

    List<PharmacyWidgetItem> parse(String html, int limit) {
        // Aktif "bugün" sekmesini ayıkla
        Matcher tabM = TODAY_TAB.matcher(html);
        String body = tabM.find() ? tabM.group(1) : html;

        List<PharmacyWidgetItem> items = new ArrayList<>();
        Matcher rowM = ROW.matcher(body);
        while (rowM.find()) {
            String row = rowM.group(1);

            String name = extract(NAME, row);
            String phone = clean(extract(PHONE_COL, row));
            String address = extractAddress(row);

            if (name == null || name.isBlank()) {
                continue;
            }
            items.add(new PharmacyWidgetItem(
                    decodeEntities(name.trim()),
                    address,
                    null,                                    // mesafe — sayfa koordinat içermez
                    null, null,
                    true,                                    // nöbetçi listesi
                    phone != null && !phone.isBlank() ? phone : null,
                    true));                                  // doğrulanmış (resmi liste)
            if (items.size() >= limit) {
                break;
            }
        }
        return items;
    }

    private static String extractAddress(String row) {
        Matcher m = ADDRESS_COL.matcher(row);
        if (!m.find()) return "";
        String col = m.group(1);

        // İlk <br> ya da <div>'e kadar olan kısım açık sokak adresidir.
        int cut = col.indexOf("<br>");
        if (cut < 0) cut = col.indexOf("<br/>");
        if (cut < 0) cut = col.indexOf("<div");
        String streetLine = (cut > 0 ? col.substring(0, cut) : col).trim();

        String italic = extract(ITALIC_DESC, col);
        String hood = extract(NEIGHBORHOOD, col);

        StringBuilder sb = new StringBuilder();
        if (!streetLine.isBlank()) sb.append(decodeEntities(stripTags(streetLine).trim()));
        if (italic != null && !italic.isBlank()) {
            if (sb.length() > 0) sb.append(" — ");
            sb.append(decodeEntities(stripTags(italic).trim()));
        }
        if (hood != null && !hood.isBlank()) {
            if (sb.length() > 0) sb.append(" · ");
            sb.append(decodeEntities(hood.trim()));
        }
        return sb.toString();
    }

    private static String extract(Pattern p, String text) {
        Matcher m = p.matcher(text);
        return m.find() ? m.group(1) : null;
    }

    private static String stripTags(String html) {
        return html == null ? "" : html.replaceAll("<[^>]+>", " ").replaceAll("\\s+", " ");
    }

    private static String clean(String value) {
        return value == null ? null : value.replaceAll("\\s+", " ").trim();
    }

    private static String decodeEntities(String s) {
        if (s == null) return null;
        return s
                .replace("&raquo;", "»")
                .replace("&apos;", "'")
                .replace("&quot;", "\"")
                .replace("&amp;", "&")
                .replace("&nbsp;", " ")
                .replace("&lt;", "<")
                .replace("&gt;", ">");
    }

    private static SimpleClientHttpRequestFactory factory() {
        SimpleClientHttpRequestFactory f = new SimpleClientHttpRequestFactory();
        f.setConnectTimeout(8_000);
        f.setReadTimeout(15_000);
        return f;
    }
}
