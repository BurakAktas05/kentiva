package com.burak.belediyeapp.integration;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class ApiKeyHasherTest {

    @Test
    void generateAndVerify() {
        String raw = ApiKeyHasher.generateRawKey();
        assertTrue(raw.startsWith("bba_"));
        String hash = ApiKeyHasher.hash(raw);
        assertTrue(ApiKeyHasher.matches(raw, hash));
        assertFalse(ApiKeyHasher.matches(raw + "x", hash));
    }

    @Test
    void prefixIsStable() {
        String raw = ApiKeyHasher.generateRawKey();
        assertEquals(raw.substring(0, 12), ApiKeyHasher.prefixOf(raw));
    }
}
