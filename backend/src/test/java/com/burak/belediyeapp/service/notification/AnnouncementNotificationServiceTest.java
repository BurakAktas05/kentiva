package com.burak.belediyeapp.service.notification;

import com.burak.belediyeapp.entity.AppUser;
import com.burak.belediyeapp.entity.Municipality;
import com.burak.belediyeapp.entity.MunicipalityAnnouncement;
import com.burak.belediyeapp.entity.Notification;
import com.burak.belediyeapp.repository.IMunicipalityAnnouncementRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.function.Consumer;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AnnouncementNotificationServiceTest {

    @Mock
    private IMunicipalityAnnouncementRepository announcementRepository;
    @Mock
    private MunicipalityAudienceNotificationSupport audienceSupport;
    @Mock
    private NotificationBatchPersistenceService notificationBatchPersistenceService;
    @Mock
    private FirebasePushClient firebasePushClient;

    @InjectMocks
    private AnnouncementNotificationService service;

    @Test
    void testBroadcastSendsOnlyFilteredBatch() {
        Municipality municipality = new Municipality();
        municipality.setId("muni-1");
        municipality.setName("Safranbolu");

        MunicipalityAnnouncement announcement = MunicipalityAnnouncement.builder()
                .municipality(municipality)
                .title("Yeni Belediye Duyurusu")
                .content("Belediyemizin yeni hizmet binasi aciliyor.")
                .active(true)
                .build();
        announcement.setId("ann-1");

        AppUser user1 = new AppUser();
        user1.setId("user-1");
        user1.setFcmToken("token-1");

        AppUser user2 = new AppUser();
        user2.setId("user-2");
        user2.setFcmToken("token-2");

        when(announcementRepository.findById("ann-1")).thenReturn(Optional.of(announcement));
        doAnswer(invocation -> {
            Consumer<List<AppUser>> batchConsumer = invocation.getArgument(3);
            batchConsumer.accept(List.of(user1));
            return 1;
        }).when(audienceSupport).forEachRecipientBatch(eq("muni-1"), any(), any(), any());

        service.broadcast("ann-1");

        verify(notificationBatchPersistenceService).saveAll(argThat(notifications ->
                notifications.size() == 1
                        && notificationMatches(notifications.get(0), user1, "Yeni Belediye Duyurusu")));
        verify(firebasePushClient).send(
                eq("token-1"),
                eq("Yeni Belediye Duyurusu"),
                eq("Belediyemizin yeni hizmet binasi aciliyor."),
                any()
        );
        verify(firebasePushClient, never()).send(
                eq("token-2"),
                any(),
                any(),
                any()
        );
    }

    private static boolean notificationMatches(Notification notification, AppUser user, String title) {
        return notification != null
                && notification.getUser() == user
                && title.equals(notification.getTitle())
                && "ANNOUNCEMENT".equals(notification.getType());
    }
}
