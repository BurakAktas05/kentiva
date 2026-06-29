package com.burak.belediyeapp.dto.messaging;

import java.io.Serializable;

public record ReportProcessingMessage(
        String reportId,
        String municipalityId,
        String correlationId,
        long timestamp
) implements Serializable {}
