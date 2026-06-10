package com.burak.belediyeapp.service.notification;

import com.burak.belediyeapp.entity.Municipality;
import com.burak.belediyeapp.entity.MunicipalityType;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class MunicipalityMessageServiceTest {

    private final MunicipalityMessageService service = new MunicipalityMessageService();

    @Test
    void buildResolvedSms_usesCustomTemplate() {
        Municipality m = municipality("Safranbolu Belediyesi", "Güzel şehir");
        m.setSmsResolvedTemplate("{belediye} bildiri: {baslik} tamamlandi.{not}");

        String sms = service.buildResolvedSms(m, "Çukur yol", "Asfalt atıldı");

        assertThat(sms).contains("Safranbolu Belediyesi");
        assertThat(sms).contains("Çukur yol");
        assertThat(sms).contains("Asfalt atıldı");
    }

    @Test
    void buildRejectedPush_usesMunicipalityNameInTitle() {
        Municipality m = municipality("Kadıköy Belediyesi", null);
        var push = service.buildRejectedPush(m, "Park sorunu", null);

        assertThat(push.title()).startsWith("Kadıköy Belediyesi");
        assertThat(push.body()).contains("Park sorunu");
    }

    @Test
    void buildProcessingPush_usesCustomTemplate() {
        Municipality m = municipality("Test Belediyesi", null);
        m.setPushProcessingTitleTemplate("{belediye} — işlemde");
        m.setPushProcessingBodyTemplate("Rapor: {baslik}");

        var push = service.buildProcessingPush(m, "Su baskını", "Ekip yolda");

        assertThat(push.title()).contains("Test Belediyesi");
        assertThat(push.body()).contains("Su baskını");
    }

    @Test
    void buildAssignedPush_usesCustomTemplate() {
        Municipality m = municipality("Test Belediyesi", null);
        m.setPushAssignedTitleTemplate("Görev: {baslik}");
        m.setPushAssignedBodyTemplate("{belediye} saha görevi");

        var push = service.buildAssignedPush(m, "Çöp konteyneri", null);

        assertThat(push.title()).contains("Çöp konteyneri");
        assertThat(push.body()).contains("Test Belediyesi");
    }

    private static Municipality municipality(String displayName, String slogan) {
        Municipality m = new Municipality();
        m.setName("test");
        m.setType(MunicipalityType.DISTRICT);
        m.setSlug("test");
        m.setDisplayName(displayName);
        m.setSlogan(slogan);
        return m;
    }
}
