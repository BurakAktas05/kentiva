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

    public void send(String fcmToken, String title, String body, Map<String, String> data) {
        if (fcmToken == null || fcmToken.isBlank()) {
            log.debug("FCM token yok, push atlandı");
            return;
        }
        if (FirebaseApp.getApps().isEmpty()) {
            log.debug("Firebase başlatılmadı (FIREBASE_CONFIG_BASE64), push atlandı");
            return;
        }

        try {
            Message.Builder builder = Message.builder()
                    .setToken(fcmToken)
                    .setNotification(Notification.builder()
                            .setTitle(title)
                            .setBody(body)
                            .build());
            if (data != null && !data.isEmpty()) {
                builder.putAllData(data);
            }
            FirebaseMessaging.getInstance().sendAsync(builder.build());
            log.info("Push bildirimi kuyruğa alındı");
        } catch (Exception e) {
            log.warn("Push bildirimi gönderilemedi: {}", e.getMessage());
        }
    }
}
