package com.burak.belediyeapp.util;

/**
 * Sosyal ilan yanıtlarında PII koruması.
 * Anonim istemcilere ham telefon ve kullanıcı kimliği verilmez.
 */
public final class SocialAdPrivacy {

    private SocialAdPrivacy() {}

    public static String maskPhone(String phone) {
        if (phone == null || phone.isBlank()) {
            return null;
        }
        String digits = phone.replaceAll("\\D", "");
        if (digits.length() < 4) {
            return "***";
        }
        return "***" + digits.substring(digits.length() - 4);
    }

    public static String publicPhone(String phone, boolean reveal) {
        return reveal ? phone : maskPhone(phone);
    }

    public static String publicUserId(String userId, boolean reveal) {
        return reveal ? userId : null;
    }

    /** Hasta adı gibi hassas alanlar için kısmi maske. */
    public static String maskPersonName(String name, boolean reveal) {
        if (reveal || name == null || name.isBlank()) {
            return name;
        }
        String trimmed = name.trim();
        if (trimmed.length() <= 2) {
            return trimmed.charAt(0) + "*";
        }
        return trimmed.charAt(0) + "***";
    }
}
