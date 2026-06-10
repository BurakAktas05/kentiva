package com.burak.belediyeapp.config;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

import javax.annotation.PostConstruct;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.util.Base64;

@Configuration
@Slf4j
public class FirebaseConfig {

    @Value("${app.firebase.config-base64:}")
    private String firebaseConfigBase64;

    @PostConstruct
    public void init() {
        if (firebaseConfigBase64 == null || firebaseConfigBase64.isBlank()) {
            log.warn("Firebase config base64 is missing. Push notifications will not work.");
            return;
        }

        try {
            byte[] decodedConfig = Base64.getDecoder().decode(firebaseConfigBase64);
            FirebaseOptions options = FirebaseOptions.builder()
                    .setCredentials(GoogleCredentials.fromStream(new ByteArrayInputStream(decodedConfig)))
                    .build();

            if (FirebaseApp.getApps().isEmpty()) {
                FirebaseApp.initializeApp(options);
                log.info("Firebase has been initialized successfully");
            }
        } catch (IOException e) {
            log.error("Error initializing Firebase", e);
        }
    }
}
