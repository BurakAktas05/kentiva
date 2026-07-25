package com.burak.belediyeapp.service.feedback;

import com.burak.belediyeapp.entity.AppUser;
import com.burak.belediyeapp.entity.SystemFeedback;
import com.burak.belediyeapp.repository.ISystemFeedbackRepository;
import com.burak.belediyeapp.service.ai.GeminiService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class SystemFeedbackService {

    private static final int AI_REPORT_SAMPLE_LIMIT = 200;

    private final ISystemFeedbackRepository feedbackRepository;
    private final GeminiService geminiService;

    @Autowired
    @Lazy
    private SystemFeedbackService self;

    /**
     * Gemini runs outside the DB transaction so connections are not held during HTTP.
     */
    public SystemFeedback submitFeedback(AppUser user, int rating, String content) {
        String sentiment = "NEUTRAL";
        String category = "OTHER";
        try {
            GeminiService.FeedbackAnalysisResult analysis = geminiService.analyzeFeedback(content);
            sentiment = analysis.sentiment();
            category = analysis.category();
        } catch (Exception e) {
            log.warn("Feedback AI analizi sırasında hata oluştu, varsayılanlar kaydediliyor: {}", e.getMessage());
        }
        return self.persistFeedback(user, rating, content, sentiment, category);
    }

    @Transactional
    public SystemFeedback persistFeedback(
            AppUser user, int rating, String content, String sentiment, String category) {
        SystemFeedback feedback = SystemFeedback.builder()
                .user(user)
                .rating(rating)
                .content(content)
                .sentiment(sentiment)
                .category(category)
                .build();
        return feedbackRepository.save(feedback);
    }

    public Page<SystemFeedback> listAllFeedback(Pageable pageable) {
        return feedbackRepository.findAll(pageable);
    }

    public String getAiAnalysisReport() {
        Page<SystemFeedback> page = feedbackRepository.findAll(
                PageRequest.of(0, AI_REPORT_SAMPLE_LIMIT, Sort.by(Sort.Direction.DESC, "createdAt")));
        List<SystemFeedback> sample = page.getContent();
        if (sample.isEmpty()) {
            return "Henüz sistem geri bildirimi bulunmuyor.";
        }
        return geminiService.generateGlobalFeedbackReport(sample);
    }
}
