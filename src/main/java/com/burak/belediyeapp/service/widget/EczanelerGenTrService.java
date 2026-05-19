package com.burak.belediyeapp.service.widget;

import com.burak.belediyeapp.config.CacheNames;
import com.burak.belediyeapp.dto.response.widget.PharmacyWidgetItem;
import com.burak.belediyeapp.entity.Municipality;
import com.burak.belediyeapp.service.geo.NominatimReverseGeocodeService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
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
 * Free, no-key on-duty pharmacy source backed by eczaneler.gen.tr.
 * We only surface the currently active on-duty list and ignore nearby fallback rows.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class EczanelerGenTrService {

    private static final String BASE = "https://www.eczaneler.gen.tr";

    private static final Pattern TODAY_TAB = Pattern.compile(
            "<div[^>]*id=\"nav-bugun\"[^>]*>(.*?)</table>\\s*</div>",
            Pattern.DOTALL);

    private static final Pattern FIRST_RESULTS_TABLE = Pattern.compile(
            "<table class=\"table table-striped mt-2\"[^>]*>(.*?)</table>",
            Pattern.DOTALL);

    private static final Pattern NO_ON_DUTY = Pattern.compile(
            "açık\\s*<b><u>\\s*nöbetçi eczane bulunmuyor\\s*</u></b>|nöbetçi eczane bulunmuyor",
            Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE);

    private static final Pattern NEARBY_SECTION = Pattern.compile(
            "<h3[^>]*>.*?En Yakın Nöbetçi Eczaneler.*?</h3>",
            Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE | Pattern.DOTALL);

    private static final Pattern ROW = Pattern.compile(
            "<tr>\\s*<td[^>]*colspan=\"3\"[^>]*>(.*?)</td>\\s*</tr>",
            Pattern.DOTALL);

    private static final Pattern NAME = Pattern.compile("<span class=\"isim\">([^<]+)</span>");
    private static final Pattern PHONE_COL = Pattern.compile(
            "<div class=['\"]col-lg-3 py-lg-2['\"]>([^<]+)</div>");
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

    @Cacheable(
            value = CacheNames.DUTY_PHARMACY,
            key = "'gen:' + T(com.burak.belediyeapp.service.widget.DutyPharmacyCacheKeys).key(#municipality.id, #municipality.widgetCitySlug, #municipality.widgetDistrictSlug)")
    public List<PharmacyWidgetItem> fetchOnDuty(
            Municipality municipality, double userLat, double userLng, int limit) {

        String resolvedCity = municipality.getWidgetCitySlug();
        String resolvedDistrict = municipality.getWidgetDistrictSlug();

        if (resolvedCity == null || resolvedCity.isBlank() || resolvedDistrict == null || resolvedDistrict.isBlank()) {
            Optional<NominatimReverseGeocodeService.AdminArea> area =
                    geocodeService.resolve(userLat, userLng);
            if (area.isEmpty()) {
                log.debug("Eczaneler.gen.tr: slug could not be resolved from coordinates.");
                return List.of();
            }
            if (resolvedCity == null || resolvedCity.isBlank()) {
                resolvedCity = area.get().provinceSlug();
            }
            if (resolvedDistrict == null || resolvedDistrict.isBlank()) {
                resolvedDistrict = area.get().districtSlug();
            }
        }
        if (resolvedCity == null || resolvedCity.isBlank()) {
            return List.of();
        }
        return fetch(resolvedCity, resolvedDistrict, limit);
    }

    private List<PharmacyWidgetItem> fetch(String citySlug, String districtSlug, int limit) {
        String path = "/nobetci-" + citySlug
                + (districtSlug != null && !districtSlug.isBlank() ? "-" + districtSlug : "");
        URI uri = UriComponentsBuilder.fromUriString(BASE + path).build().encode().toUri();
        try {
            byte[] bytes = http.get().uri(uri).retrieve().body(byte[].class);
            if (bytes == null || bytes.length == 0) {
                return List.of();
            }
            String html = new String(bytes, StandardCharsets.UTF_8);
            return parse(html, limit);
        } catch (Exception e) {
            log.warn("Eczaneler.gen.tr call failed ({}): {}", uri, e.getMessage());
            return List.of();
        }
    }

    List<PharmacyWidgetItem> parse(String html, int limit) {
        String body = extractTodaySection(html);
        if (body == null || body.isBlank()) {
            return List.of();
        }
        if (NO_ON_DUTY.matcher(body).find()) {
            return List.of();
        }
        body = trimBeforeNearbySection(body);

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
                    null,
                    null,
                    null,
                    true,
                    phone != null && !phone.isBlank() ? phone : null,
                    true));
            if (items.size() >= limit) {
                break;
            }
        }
        return items;
    }

    private static String extractTodaySection(String html) {
        Matcher tabM = TODAY_TAB.matcher(html);
        if (tabM.find()) {
            return tabM.group(1);
        }
        Matcher tableM = FIRST_RESULTS_TABLE.matcher(html);
        return tableM.find() ? tableM.group(1) : null;
    }

    private static String trimBeforeNearbySection(String html) {
        Matcher nearbyM = NEARBY_SECTION.matcher(html);
        return nearbyM.find() ? html.substring(0, nearbyM.start()) : html;
    }

    private static String extractAddress(String row) {
        Matcher m = ADDRESS_COL.matcher(row);
        if (!m.find()) {
            return "";
        }
        String col = m.group(1);

        int cut = col.indexOf("<br>");
        if (cut < 0) {
            cut = col.indexOf("<br/>");
        }
        if (cut < 0) {
            cut = col.indexOf("<div");
        }
        String streetLine = (cut > 0 ? col.substring(0, cut) : col).trim();

        String italic = extract(ITALIC_DESC, col);
        String hood = extract(NEIGHBORHOOD, col);

        StringBuilder sb = new StringBuilder();
        if (!streetLine.isBlank()) {
            sb.append(decodeEntities(stripTags(streetLine).trim()));
        }
        if (italic != null && !italic.isBlank()) {
            if (sb.length() > 0) {
                sb.append(" - ");
            }
            sb.append(decodeEntities(stripTags(italic).trim()));
        }
        if (hood != null && !hood.isBlank()) {
            if (sb.length() > 0) {
                sb.append(" · ");
            }
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
        if (s == null) {
            return null;
        }
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
