package com.burak.belediyeapp.service.template;

import com.burak.belediyeapp.dto.response.template.ReportTemplateResponse;
import com.burak.belediyeapp.entity.Municipality;
import com.burak.belediyeapp.entity.ReportCategory;
import com.burak.belediyeapp.entity.ReportTemplate;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class ReportTemplateServiceTest {

    @Test
    void mergeTemplates_prefersMunicipalityOverrideOverGlobal() {
        ReportCategory category = ReportCategory.builder().name("Yol Çukuru").build();
        category.setId("cat-1");
        Municipality muni = Municipality.builder().name("Test").type(com.burak.belediyeapp.entity.MunicipalityType.DISTRICT).slug("test").build();
        muni.setId("muni-1");

        ReportTemplate global = ReportTemplate.builder()
                .templateKey("pothole")
                .title("Global çukur")
                .descriptionTemplate("global")
                .category(category)
                .sortOrder(10)
                .build();

        ReportTemplate local = ReportTemplate.builder()
                .municipality(muni)
                .templateKey("pothole")
                .title("Yerel çukur")
                .descriptionTemplate("yerel")
                .category(category)
                .sortOrder(5)
                .build();

        List<ReportTemplateResponse> merged = ReportTemplateService.mergeTemplates(List.of(global, local));

        assertThat(merged).hasSize(1);
        assertThat(merged.get(0).title()).isEqualTo("Yerel çukur");
        assertThat(merged.get(0).global()).isFalse();
    }
}
