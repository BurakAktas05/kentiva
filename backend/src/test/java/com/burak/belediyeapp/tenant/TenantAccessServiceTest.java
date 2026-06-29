package com.burak.belediyeapp.tenant;

import com.burak.belediyeapp.entity.Report;
import com.burak.belediyeapp.exception.BusinessException;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

class TenantAccessServiceTest {

    private final TenantAccessService service = new TenantAccessService();

    @Test
    void ensureCanViewReportRejectsMissingUser() {
        Report report = Report.builder().build();

        assertThatThrownBy(() -> service.ensureCanViewReport(report, null))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", "UNAUTHORIZED");
    }
}
