package com.burak.belediyeapp.service.feedback;

import com.burak.belediyeapp.entity.AppUser;
import com.burak.belediyeapp.entity.SystemFeedback;
import com.burak.belediyeapp.repository.ISystemFeedbackRepository;
import com.burak.belediyeapp.service.ai.GeminiService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class SystemFeedbackService {

    private final ISystemFeedbackRepository feedbackRepository;
    private final GeminiService geminiService;

    @Transactional
    public SystemFeedback submitFeedback(AppUser user, int rating, String content) {
        SystemFeedback feedback = SystemFeedback.builder()
                .user(user)
                .rating(rating)
                .content(content)
                .build();

        try {
            GeminiService.FeedbackAnalysisResult analysis = geminiService.analyzeFeedback(content);
            feedback.setSentiment(analysis.sentiment());
            feedback.setCategory(analysis.category());
        } catch (Exception e) {
            log.warn("Feedback AI analizi sırasında hata oluştu, varsayılanlar kaydediliyor: {}", e.getMessage());
            feedback.setSentiment("NEUTRAL");
            feedback.setCategory("OTHER");
        }

        return feedbackRepository.save(feedback);
    }

    public Page<SystemFeedback> listAllFeedback(Pageable pageable) {
        return feedbackRepository.findAll(pageable);
    }

    public String getAiAnalysisReport() {
        List<SystemFeedback> allFeedbacks = feedbackRepository.findAll();
        return geminiService.generateGlobalFeedbackReport(allFeedbacks);
    }
}
