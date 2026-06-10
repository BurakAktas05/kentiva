package com.burak.belediyeapp.dto.response.report;

import java.time.LocalDateTime;

public record ReportTimelineEntryResponse(
        LocalDateTime at,
        String oldStatus,
        String newStatus,
        String actorName,
        String note
) {}
