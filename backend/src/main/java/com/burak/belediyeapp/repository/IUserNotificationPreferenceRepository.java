package com.burak.belediyeapp.repository;

import com.burak.belediyeapp.entity.UserNotificationPreference;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface IUserNotificationPreferenceRepository extends JpaRepository<UserNotificationPreference, String> {

    Optional<UserNotificationPreference> findByUserId(String userId);

    List<UserNotificationPreference> findAllByUserIdIn(List<String> userIds);
}
