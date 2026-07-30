package com.burak.belediyeapp.service.template;

import com.burak.belediyeapp.dto.response.template.ReportTemplateResponse;
import com.burak.belediyeapp.entity.Municipality;
import com.burak.belediyeapp.entity.ReportCategory;
import com.burak.belediyeapp.entity.ReportTemplate;
import com.burak.belediyeapp.exception.BusinessException;
import com.burak.belediyeapp.repository.IMunicipalityRepository;
import com.burak.belediyeapp.repository.IReportCategoryRepository;
import com.burak.belediyeapp.repository.IReportTemplateRepository;
import com.burak.belediyeapp.tenant.TenantAccessService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ReportTemplateServiceTest {

    @Mock
    private IReportTemplateRepository templateRepository;

    @Mock
    private IReportCategoryRepository categoryRepository;

    @Mock
    private IMunicipalityRepository municipalityRepository;

    @Mock
    private TenantAccessService tenantAccess;

    @InjectMocks
    private ReportTemplateService reportTemplateService;

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

    @Test
    void create_RejectsForeignMunicipalityCategory() {
        Municipality municipality = Municipality.builder()
                .name("Tenant A")
                .type(com.burak.belediyeapp.entity.MunicipalityType.DISTRICT)
                .build();
        municipality.setId("muni-1");

        com.burak.belediyeapp.entity.AppUser user = new com.burak.belediyeapp.entity.AppUser();
        user.setMunicipality(municipality);

        ReportCategory foreignCategory = ReportCategory.builder().name("Foreign").build();
        Municipality foreignMunicipality = Municipality.builder()
                .name("Tenant B")
                .type(com.burak.belediyeapp.entity.MunicipalityType.DISTRICT)
                .build();
        foreignMunicipality.setId("muni-2");
        foreignCategory.setMunicipality(foreignMunicipality);

        when(municipalityRepository.findById("muni-1")).thenReturn(java.util.Optional.of(municipality));
        when(categoryRepository.findById("cat-foreign")).thenReturn(java.util.Optional.of(foreignCategory));
        doThrow(new BusinessException("forbidden", "CATEGORY_MUNICIPALITY_MISMATCH"))
                .when(tenantAccess).ensureCategoryVisibleToMunicipality(foreignCategory, "muni-1");

        BusinessException ex = assertThrows(
                BusinessException.class,
                () -> reportTemplateService.create(
                        new com.burak.belediyeapp.dto.request.template.CreateReportTemplateRequest(
                                "road-issue",
                                "Road issue",
                                "desc",
                                "cat-foreign",
                                "icon-road",
                                1,
                                false),
                        user));

        assertEquals("CATEGORY_MUNICIPALITY_MISMATCH", ex.getErrorCode());
        verify(tenantAccess).ensureCategoryVisibleToMunicipality(foreignCategory, "muni-1");
    }
}
