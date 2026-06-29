package com.burak.belediyeapp.service.notification;

import com.burak.belediyeapp.entity.Notification;
import com.burak.belediyeapp.repository.INotificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class NotificationBatchPersistenceService {

    private final INotificationRepository notificationRepository;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void saveAll(List<Notification> notifications) {
        if (notifications == null || notifications.isEmpty()) {
            return;
        }
        notificationRepository.saveAll(notifications);
    }
}
