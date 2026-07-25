package com.burak.belediyeapp.service.notification;

import com.burak.belediyeapp.entity.ReportStatus;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ReportLanguageMessagesTest {

    @Test
    void heuristicReplyDraft_variesByApproveAndRejectStatus() {
        String processing = ReportLanguageMessages.heuristicReplyDraft("tr", ReportStatus.PROCESSING);
        String rejected = ReportLanguageMessages.heuristicReplyDraft("tr", ReportStatus.REJECTED);
        String resolved = ReportLanguageMessages.heuristicReplyDraft("tr", ReportStatus.RESOLVED);
        String outOfJurisdiction = ReportLanguageMessages.heuristicReplyDraft("tr", ReportStatus.OUT_OF_JURISDICTION);

        assertTrue(processing.toLowerCase().contains("işleme"));
        assertTrue(rejected.toLowerCase().contains("redded"));
        assertTrue(resolved.toLowerCase().contains("giderilmiş") || resolved.toLowerCase().contains("çöz"));
        assertTrue(outOfJurisdiction.toLowerCase().contains("yetki"));

        assertNotEquals(processing, rejected);
        assertNotEquals(processing, resolved);
        assertNotEquals(rejected, outOfJurisdiction);
        assertFalse(processing.isBlank());
    }
}
