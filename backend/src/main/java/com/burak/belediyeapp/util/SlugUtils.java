package com.burak.belediyeapp.util;

import java.util.Locale;

public final class SlugUtils {
    private SlugUtils() {}

    public static String slugify(String input) {
        if (input == null || input.isBlank()) {
            return "";
        }
        String normalized = input.trim().toLowerCase(Locale.forLanguageTag("tr"));
        normalized = normalized
                .replace('ı', 'i')
                .replace('ğ', 'g')
                .replace('ü', 'u')
                .replace('ş', 's')
                .replace('ö', 'o')
                .replace('ç', 'c')
                .replace('İ', 'i');
        return normalized
                .replaceAll("[^a-z0-9-]+", "-")
                .replaceAll("-+", "-")
                .replaceAll("^-|-$", "");
    }
}
