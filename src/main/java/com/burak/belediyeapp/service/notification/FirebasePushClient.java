package com.burak.belediyeapp.service.notification;

import com.google.firebase.FirebaseApp;
import com.google.firebase.messaging.FirebaseMessaging;
import com.google.firebase.messaging.Message;
import com.google.firebase.messaging.Notification;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.Map;

/**
 * FCM push gönderimi. Firebase yapılandırması yoksa sessizce atlar.
 */
@Component
@Slf4j
public class FirebasePushClient {

    @io.github.resilience4j.retry.annotation.Retry(name = "firebasePush", fallbackMethod = "fallbackSend")
    public void send(String fcmToken, String title, String body, Map<String, String> data) {
        if (fcmToken == null || fcmToken.isBlank()) {
            log.debug("FCM token yok, push atlandı");
            return;
        }
        if (FirebaseApp.getApps().isEmpty()) {
            log.debug("Firebase başlatılmadı (FIREBASE_CONFIG_BASE64), push atlandı");
            return;
        }

        Message.Builder builder = Message.builder()
                .setToken(fcmToken)
                .setNotification(Notification.builder()
                        .setTitle(title)
                        .setBody(body)
                        .build());
        if (data != null && !data.isEmpty()) {
            builder.putAllData(data);
        }
        try {
            String messageId = FirebaseMessaging.getInstance().send(builder.build());
            log.info("Push bildirimi başarıyla gönderildi: {}", messageId);
        } catch (com.google.firebase.messaging.FirebaseMessagingException e) {
            throw new RuntimeException("Firebase sending failed", e);
        }
    }

    public void fallbackSend(String fcmToken, String title, String body, Map<String, String> data, Throwable t) {
        log.warn("Push bildirimi 3 denemeden sonra da gönderilemedi: {}", t.getMessage());
    }
}
