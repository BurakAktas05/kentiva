package com.burak.belediyeapp.service.admin;

import com.burak.belediyeapp.entity.MembershipStatus;
import com.burak.belediyeapp.entity.Municipality;
import com.burak.belediyeapp.entity.SubscriptionPlan;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

class MembershipStatusResolverTest {

    @Test
    void resolvesExpiredWhenEndDatePassed() {
        Municipality m = Municipality.builder()
                .active(true)
                .subscriptionPlan(SubscriptionPlan.STANDARD)
                .subscriptionEndsAt(LocalDateTime.now().minusDays(1))
                .build();
        assertThat(MembershipStatusResolver.resolve(m)).isEqualTo(MembershipStatus.EXPIRED);
    }

    @Test
    void resolvesExpiringSoonWithinSevenDays() {
        Municipality m = Municipality.builder()
                .active(true)
                .subscriptionPlan(SubscriptionPlan.TRIAL)
                .subscriptionEndsAt(LocalDateTime.now().plusDays(3))
                .build();
        assertThat(MembershipStatusResolver.resolve(m)).isEqualTo(MembershipStatus.EXPIRING_SOON);
    }
}
