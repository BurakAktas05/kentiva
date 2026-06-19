package com.burak.belediyeapp.service.notification;

import com.burak.belediyeapp.entity.*;
import com.burak.belediyeapp.repository.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.*;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.mockito.hamcrest.MockitoHamcrest.argThat;
import org.hamcrest.Matchers;

@ExtendWith(MockitoExtension.class)
class AnnouncementNotificationServiceTest {

    @Mock
    private IAppUserRepository userRepository;
    @Mock
    private INotificationRepository notificationRepository;
    @Mock
    private IMunicipalityAnnouncementRepository announcementRepository;
    @Mock
    private IBusRouteRepository busRouteRepository;
    @Mock
    private IStarredRouteRepository starredRouteRepository;
    @Mock
    private IStarredStopRepository starredStopRepository;
    @Mock
    private IUserNotificationPreferenceRepository preferenceRepository;
    @Mock
    private FirebasePushClient firebasePushClient;

    @InjectMocks
    private AnnouncementNotificationService service;

    @Test
    void testBroadcastWithMentionedRoute() {
        Municipality municipality = new Municipality();
        municipality.setId("muni-1");
        municipality.setName("Safranbolu");

        MunicipalityAnnouncement announcement = MunicipalityAnnouncement.builder()
                .municipality(municipality)
                .title("Yeni Ulaşım Duyurusu: SK Hattında Değişiklik")
                .content("Safranbolu - Karabük hattımızda (SK) sefer saatleri değişti.")
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
        when(userRepository.findByPreferredMunicipalityId("muni-1")).thenReturn(Arrays.asList(user1, user2));

        BusRoute route = BusRoute.builder()
                .code("SK")
                .name("Safranbolu - Karabük")
                .stopsJson("[\"Kıranköy\"]")
                .build();
        route.setId("route-1");

        when(busRouteRepository.findAllByMunicipalityIdAndActiveTrue("muni-1")).thenReturn(Collections.singletonList(route));

        StarredRoute starredRoute = new StarredRoute(user1, route);
        when(starredRouteRepository.findAllByRouteId("route-1")).thenReturn(Collections.singletonList(starredRoute));

        when(preferenceRepository.findAllByUserIdIn(Collections.singletonList("user-2"))).thenReturn(
                Collections.singletonList(UserNotificationPreference.builder().user(user2).announcementsEnabled(true).build())
        );

        service.broadcast("ann-1");

        verify(firebasePushClient).send(
                eq("token-1"),
                eq("🌟 [Ulaşım Duyurusu] Yeni Ulaşım Duyurusu: SK Hattında Değişiklik"),
                any(),
                (Map<String, String>) argThat(Matchers.hasEntry("priority", "high"))
        );

        verify(firebasePushClient).send(
                eq("token-2"),
                eq("Yeni Ulaşım Duyurusu: SK Hattında Değişiklik"),
                any(),
                (Map<String, String>) argThat(Matchers.not(Matchers.hasKey("priority")))
        );

        verify(notificationRepository).saveAll(any());
    }

    @Test
    void testBroadcastWithMentionedStop() {
        Municipality municipality = new Municipality();
        municipality.setId("muni-1");

        MunicipalityAnnouncement announcement = MunicipalityAnnouncement.builder()
                .municipality(municipality)
                .title("Kıranköy Durağında Çalışma")
                .content("Yol çalışması nedeniyle durak kapalı.")
                .active(true)
                .build();
        announcement.setId("ann-2");

        AppUser user1 = new AppUser();
        user1.setId("user-1");
        user1.setFcmToken("token-1");

        when(announcementRepository.findById("ann-2")).thenReturn(Optional.of(announcement));
        when(userRepository.findByPreferredMunicipalityId("muni-1")).thenReturn(Collections.singletonList(user1));

        BusRoute route = BusRoute.builder()
                .code("SK")
                .name("Safranbolu - Karabük")
                .stopsJson("[\"Kıranköy\", \"Sadri Artunç\"]")
                .build();
        route.setId("route-1");

        when(busRouteRepository.findAllByMunicipalityIdAndActiveTrue("muni-1")).thenReturn(Collections.singletonList(route));

        StarredStop starredStop = new StarredStop(user1, "Kıranköy", municipality);
        when(starredStopRepository.findAllByStopNameAndMunicipalityId("Kıranköy", "muni-1"))
                .thenReturn(Collections.singletonList(starredStop));

        service.broadcast("ann-2");

        verify(firebasePushClient).send(
                eq("token-1"),
                eq("🌟 [Ulaşım Duyurusu] Kıranköy Durağında Çalışma"),
                any(),
                (Map<String, String>) argThat(Matchers.hasEntry("priority", "high"))
        );
    }
}
