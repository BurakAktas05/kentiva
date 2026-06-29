package com.burak.belediyeapp.service.security;

import com.burak.belediyeapp.exception.BusinessException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.text.Normalizer;
import java.security.SecureRandom;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

@Service
public class PasswordPolicyService {

    private static final String UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    private static final String LOWER = "abcdefghijkmnopqrstuvwxyz";
    private static final String DIGITS = "23456789";
    private static final String SYMBOLS = "!@#$%^&*()-_=+[]{}:,.?";

    private final SecureRandom secureRandom = new SecureRandom();

    @Value("${app.security.password.citizen-min-length:10}")
    private int citizenMinLength;

    @Value("${app.security.password.privileged-min-length:12}")
    private int privilegedMinLength;

    @Value("${app.security.password.max-length:128}")
    private int maxLength;

    public void validateCitizenPassword(String rawPassword, String... userHints) {
        validate(rawPassword, Math.max(8, citizenMinLength), false, userHints);
    }

    public void validatePrivilegedPassword(String rawPassword, String... userHints) {
        validate(rawPassword, Math.max(10, privilegedMinLength), true, userHints);
    }

    public String generateStrongPassword(int length, boolean privileged) {
        int minLength = privileged ? Math.max(10, privilegedMinLength) : Math.max(8, citizenMinLength);
        int targetLength = Math.max(length, minLength);

        List<Character> chars = new ArrayList<>();
        chars.add(randomChar(UPPER));
        chars.add(randomChar(LOWER));
        chars.add(randomChar(DIGITS));

        String pool = UPPER + LOWER + DIGITS;
        while (chars.size() < targetLength) {
            chars.add(randomChar(pool));
        }

        java.util.Collections.shuffle(chars, secureRandom);
        StringBuilder builder = new StringBuilder(chars.size());
        chars.forEach(builder::append);
        return builder.toString();
    }

    private void validate(String rawPassword, int minLength, boolean privileged, String... userHints) {
        if (rawPassword == null || rawPassword.isBlank()) {
            throw new BusinessException("Sifre bos birakilamaz.", "WEAK_PASSWORD");
        }
        if (rawPassword.length() < minLength) {
            throw new BusinessException(
                    "Sifre en az " + minLength + " karakter olmalidir.",
                    "WEAK_PASSWORD");
        }
        if (rawPassword.length() > Math.max(minLength, maxLength)) {
            throw new BusinessException(
                    "Sifre en fazla " + Math.max(minLength, maxLength) + " karakter olabilir.",
                    "WEAK_PASSWORD");
        }
        if (rawPassword.chars().anyMatch(Character::isWhitespace)) {
            throw new BusinessException("Sifre bosluk karakteri iceremez.", "WEAK_PASSWORD");
        }

        boolean hasLetter = rawPassword.chars().anyMatch(Character::isLetter);
        boolean hasDigit = rawPassword.chars().anyMatch(Character::isDigit);

        if (!hasLetter || !hasDigit) {
            throw new BusinessException("Sifre en az bir harf ve bir rakam icermelidir.", "WEAK_PASSWORD");
        }

        String normalizedPassword = normalize(rawPassword);
        for (String weakToken : List.of("password", "sifre", "parola", "qwerty", "123456", "admin", "belediye", "kentiva")) {
            if (normalizedPassword.contains(weakToken)) {
                throw new BusinessException("Sifre kolay tahmin edilebilir ifadeler iceremez.", "WEAK_PASSWORD");
            }
        }

        for (String hint : userHints) {
            String normalizedHint = normalize(hint);
            if (normalizedHint.length() >= 3 && normalizedPassword.contains(normalizedHint)) {
                throw new BusinessException(
                        "Sifre ad, soyad veya e-posta bilgisini icermemelidir.",
                        "WEAK_PASSWORD");
            }
        }
    }

    private char randomChar(String chars) {
        return chars.charAt(secureRandom.nextInt(chars.length()));
    }

    private String normalize(String value) {
        if (value == null) {
            return "";
        }
        String lowered = Normalizer.normalize(value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}+", "")
                .toLowerCase(Locale.ROOT)
                .trim();

        int atIndex = lowered.indexOf('@');
        if (atIndex >= 0) {
            lowered = lowered.substring(0, atIndex);
        }
        return lowered.replaceAll("[^a-z0-9]+", "");
    }
}
