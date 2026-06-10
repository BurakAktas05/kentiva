package com.burak.belediyeapp.health;

import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.HealthIndicator;
import org.springframework.stereotype.Component;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.HeadBucketRequest;

/**
 * Cloudflare R2 / AWS S3 depolama erişim durumunu Actuator'a sunar.
 */
@Component
public class S3HealthIndicator implements HealthIndicator {

    private final ObjectProvider<S3Client> s3ClientProvider;

    @Value("${app.storage.type:s3}")
    private String storageType;

    @Value("${app.storage.s3.bucket-name:belediye-reports}")
    private String bucketName;

    @Autowired
    public S3HealthIndicator(ObjectProvider<S3Client> s3ClientProvider) {
        this.s3ClientProvider = s3ClientProvider;
    }

    @Override
    public Health health() {
        if (!"s3".equals(storageType)) {
            return Health.up()
                    .withDetail("storageType", "local")
                    .withDetail("message", "Yerel dosya sistemi aktif, S3/R2 kontrolü atlandı.")
                    .build();
        }

        S3Client s3Client = s3ClientProvider.getIfAvailable();
        if (s3Client == null) {
            return Health.down()
                    .withDetail("storageType", "s3")
                    .withDetail("error", "S3Client bean bulunamadı.")
                    .build();
        }

        try {
            s3Client.headBucket(HeadBucketRequest.builder().bucket(bucketName).build());
            return Health.up()
                    .withDetail("storageType", "s3")
                    .withDetail("bucket", bucketName)
                    .build();
        } catch (Exception e) {
            return Health.down(e)
                    .withDetail("storageType", "s3")
                    .withDetail("bucket", bucketName)
                    .build();
        }
    }
}
