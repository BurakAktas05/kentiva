package com.burak.belediyeapp.service.admin;

import com.burak.belediyeapp.entity.MembershipStatus;
import com.burak.belediyeapp.entity.Municipality;
import com.burak.belediyeapp.entity.SubscriptionPlan;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;

public final class MembershipStatusResolver {

    private MembershipStatusResolver() {
    }

    public static Long daysRemaining(LocalDateTime subscriptionEndsAt) {
        if (subscriptionEndsAt == null) {
            return null;
        }
        return ChronoUnit.DAYS.between(LocalDate.now(), subscriptionEndsAt.toLocalDate());
    }

    public static MembershipStatus resolve(Municipality m) {
        if (!m.isActive()) {
            return MembershipStatus.SUSPENDED;
        }
        Long days = daysRemaining(m.getSubscriptionEndsAt());
        if (days != null && days < 0) {
            return MembershipStatus.EXPIRED;
        }
        if (days != null && days <= 7) {
            return MembershipStatus.EXPIRING_SOON;
        }
        if (m.getSubscriptionPlan() == SubscriptionPlan.TRIAL) {
            return MembershipStatus.TRIAL;
        }
        return MembershipStatus.ACTIVE;
    }
}
