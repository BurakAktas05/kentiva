package com.burak.belediyeapp.service.ai;

import java.util.Locale;
import java.util.regex.Pattern;

/**
 * Rapor başlık/açıklamasından içerik dilini tahmin eder (tr, en, ar).
 */
public final class ContentLanguageDetector {

    private static final Pattern ARABIC = Pattern.compile("[\\p{Script=Arabic}]");
    private static final Pattern TURKISH_CHARS = Pattern.compile("[ğüşöçıİĞÜŞÖÇ]");

    private ContentLanguageDetector() {}

    public static String detect(String title, String description) {
        String text = ((title != null ? title : "") + " " + (description != null ? description : "")).trim();
        if (text.isBlank()) {
            return "tr";
        }
        if (ARABIC.matcher(text).find()) {
            return "ar";
        }
        String lower = text.toLowerCase(Locale.ROOT);
        if (TURKISH_CHARS.matcher(text).find() || containsAny(lower,
                " ve ", " bir ", " için ", " değil ", " çok ", " ile ", " bu ", " şu ", " var ", " yok ")) {
            return "tr";
        }
        return "en";
    }

    private static boolean containsAny(String text, String... needles) {
        for (String n : needles) {
            if (text.contains(n)) {
                return true;
            }
        }
        return false;
    }
}
