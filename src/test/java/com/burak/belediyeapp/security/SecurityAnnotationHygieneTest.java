package com.burak.belediyeapp.security;

import org.junit.jupiter.api.Test;

import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;

class SecurityAnnotationHygieneTest {

    @Test
    void methodSecurityDoesNotUseRolePrefixWithHasRole() throws Exception {
        try (var files = Files.walk(Path.of("src/main/java"))) {
            String source = files
                    .filter(path -> path.toString().endsWith(".java"))
                    .map(path -> {
                        try {
                            return Files.readString(path);
                        } catch (Exception e) {
                            throw new IllegalStateException(e);
                        }
                    })
                    .reduce("", String::concat);

            assertThat(source).doesNotContain("hasRole('ROLE_");
            assertThat(source).doesNotContain("hasAnyRole('ROLE_");
        }
    }
}
