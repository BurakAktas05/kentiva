package com.burak.belediyeapp.repository;

import com.burak.belediyeapp.entity.WebhookDeliveryLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface IWebhookDeliveryLogRepository extends JpaRepository<WebhookDeliveryLog, String> {

    List<WebhookDeliveryLog> findByStatusAndNextAttemptAtBeforeAndRetryCountLessThan(
            String status, LocalDateTime time, int maxRetries);

    Page<WebhookDeliveryLog> findByMunicipalityId(String municipalityId, Pageable pageable);
}
