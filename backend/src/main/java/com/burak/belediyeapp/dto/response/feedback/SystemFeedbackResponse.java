package com.burak.belediyeapp.dto.response.feedback;

import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Builder
public class SystemFeedbackResponse {
    private String id;
    private String username;
    private String userEmail;
    private int rating;
    private String content;
    private String sentiment;
    private String category;
    private LocalDateTime createdAt;
}
