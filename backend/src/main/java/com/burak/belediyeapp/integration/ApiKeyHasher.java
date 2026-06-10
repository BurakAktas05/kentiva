package com.burak.belediyeapp.integration;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.HexFormat;

public final class ApiKeyHasher {

    private static final SecureRandom RANDOM = new SecureRandom();
    private static final String KEY_PREFIX = "bba_";

    private ApiKeyHasher() {}

    public static String generateRawKey() {
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        return KEY_PREFIX + Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    public static String prefixOf(String rawKey) {
        return rawKey.substring(0, Math.min(12, rawKey.length()));
    }

    public static String hash(String rawKey) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashed = digest.digest(rawKey.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hashed);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 not available", e);
        }
    }

    public static boolean matches(String rawKey, String storedHash) {
        return hash(rawKey).equalsIgnoreCase(storedHash);
    }
}
