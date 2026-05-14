package com.burak.belediyeapp;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.data.redis.RedisAutoConfiguration;
import org.springframework.boot.autoconfigure.data.redis.RedisRepositoriesAutoConfiguration;
import org.springframework.scheduling.annotation.EnableAsync;

/**
 * Kentiva — Çok Kiracılı Belediye Vatandaş Bildirim ve Takip Platformu
 *
 * @EnableAsync: NotificationService'in async metodları için gerekli
 */
@SpringBootApplication(exclude = {
        RedisAutoConfiguration.class,
        RedisRepositoriesAutoConfiguration.class
})
@EnableAsync
@org.springframework.cache.annotation.EnableCaching
@org.springframework.scheduling.annotation.EnableScheduling
public class BelediyeappApplication {

    public static void main(String[] args) {
        SpringApplication.run(BelediyeappApplication.class, args);
    }
}
