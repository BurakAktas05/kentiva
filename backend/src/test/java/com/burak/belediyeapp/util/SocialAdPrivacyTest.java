package com.burak.belediyeapp.util;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class SocialAdPrivacyTest {

    @Test
    void masksPhoneForAnonymousClients() {
        assertThat(SocialAdPrivacy.publicPhone("05551234567", false)).isEqualTo("***4567");
        assertThat(SocialAdPrivacy.publicPhone("05551234567", true)).isEqualTo("05551234567");
    }

    @Test
    void hidesUserIdUnlessRevealed() {
        assertThat(SocialAdPrivacy.publicUserId("user-1", false)).isNull();
        assertThat(SocialAdPrivacy.publicUserId("user-1", true)).isEqualTo("user-1");
    }

    @Test
    void masksPersonName() {
        assertThat(SocialAdPrivacy.maskPersonName("Ayşe Yılmaz", false)).isEqualTo("A***");
        assertThat(SocialAdPrivacy.maskPersonName("Ayşe Yılmaz", true)).isEqualTo("Ayşe Yılmaz");
    }
}
