package com.burak.belediyeapp.service.survey;

import com.burak.belediyeapp.dto.response.survey.MunicipalitySurveyDetailDto;
import com.burak.belediyeapp.dto.response.survey.SurveyAnalyticsDto;
import com.burak.belediyeapp.entity.AppUser;
import com.burak.belediyeapp.entity.Municipality;
import com.burak.belediyeapp.entity.MunicipalitySurvey;
import com.burak.belediyeapp.entity.MunicipalitySurveyVote;
import com.burak.belediyeapp.repository.IAppUserRepository;
import com.burak.belediyeapp.repository.IMunicipalitySurveyRepository;
import com.burak.belediyeapp.repository.IMunicipalitySurveyVoteRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Collections;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MunicipalitySurveyServiceTest {

    @Mock
    private IMunicipalitySurveyRepository surveyRepository;

    @Mock
    private IMunicipalitySurveyVoteRepository surveyVoteRepository;

    @Mock
    private IAppUserRepository userRepository;

    @InjectMocks
    private MunicipalitySurveyService surveyService;

    private Municipality municipality;
    private AppUser user;
    private MunicipalitySurvey survey1;
    private MunicipalitySurvey survey2;

    @BeforeEach
    void setUp() {
        municipality = new Municipality();
        municipality.setId("muni-1");
        municipality.setName("Kentiva Municipality");

        user = new AppUser();
        user.setId("user-1");
        user.setMunicipality(municipality);
        user.setReputationScore(100);

        survey1 = MunicipalitySurvey.builder()
                .municipality(municipality)
                .title("Survey 1")
                .option1("Opt A")
                .option2("Opt B")
                .category("Ulaşım")
                .active(true)
                .build();
        survey1.setId("survey-1");

        survey2 = MunicipalitySurvey.builder()
                .municipality(municipality)
                .title("Survey 2")
                .option1("Opt C")
                .option2("Opt D")
                .category("Çevre")
                .active(true)
                .build();
        survey2.setId("survey-2");
    }

    @Test
    void getAnalytics_Success() {
        when(surveyRepository.findByMunicipalityIdOrderByCreatedAtDesc("muni-1"))
                .thenReturn(List.of(survey1, survey2));

        // Mock counts for survey1 (Ulaşım) - total 10 votes
        lenient().when(surveyVoteRepository.countBySurveyIdAndSelectedOption(eq("survey-1"), eq(1))).thenReturn(6L);
        lenient().when(surveyVoteRepository.countBySurveyIdAndSelectedOption(eq("survey-1"), eq(2))).thenReturn(4L);
        lenient().when(surveyVoteRepository.countBySurveyIdAndSelectedOption(eq("survey-1"), eq(3))).thenReturn(0L);
        lenient().when(surveyVoteRepository.countBySurveyIdAndSelectedOption(eq("survey-1"), eq(4))).thenReturn(0L);

        // Mock counts for survey2 (Çevre) - total 5 votes
        lenient().when(surveyVoteRepository.countBySurveyIdAndSelectedOption(eq("survey-2"), eq(1))).thenReturn(3L);
        lenient().when(surveyVoteRepository.countBySurveyIdAndSelectedOption(eq("survey-2"), eq(2))).thenReturn(2L);
        lenient().when(surveyVoteRepository.countBySurveyIdAndSelectedOption(eq("survey-2"), eq(3))).thenReturn(0L);
        lenient().when(surveyVoteRepository.countBySurveyIdAndSelectedOption(eq("survey-2"), eq(4))).thenReturn(0L);

        SurveyAnalyticsDto analytics = surveyService.getAnalytics(user);

        assertNotNull(analytics);
        assertEquals(2, analytics.totalSurveys());
        assertEquals(2, analytics.activeSurveys());
        assertEquals(15, analytics.totalVotes());
        assertEquals(2, analytics.categoryStats().size());

        var stats1 = analytics.categoryStats().stream().filter(s -> s.category().equals("Ulaşım")).findFirst().orElse(null);
        assertNotNull(stats1);
        assertEquals(1, stats1.surveyCount());
        assertEquals(10, stats1.voteCount());

        var stats2 = analytics.categoryStats().stream().filter(s -> s.category().equals("Çevre")).findFirst().orElse(null);
        assertNotNull(stats2);
        assertEquals(1, stats2.surveyCount());
        assertEquals(5, stats2.voteCount());
    }

    @Test
    void listPublic_WithRecommendationFromHistory() {
        when(surveyRepository.findByMunicipalityIdAndActiveTrueOrderByCreatedAtDesc("muni-1"))
                .thenReturn(List.of(survey1, survey2));

        MunicipalitySurvey oldVotedSurvey = MunicipalitySurvey.builder()
                .category("Ulaşım")
                .build();
        oldVotedSurvey.setId("old-voted");

        MunicipalitySurveyVote pastVote = MunicipalitySurveyVote.builder()
                .survey(oldVotedSurvey)
                .user(user)
                .selectedOption(1)
                .build();

        when(surveyVoteRepository.findByUserId("user-1")).thenReturn(List.of(pastVote));
        when(surveyVoteRepository.existsBySurveyIdAndUserId("survey-1", "user-1")).thenReturn(false);
        when(surveyVoteRepository.existsBySurveyIdAndUserId("survey-2", "user-1")).thenReturn(false);

        List<MunicipalitySurveyDetailDto> results = surveyService.listPublic("muni-1", user);

        assertNotNull(results);
        assertEquals(2, results.size());

        var dto1 = results.stream().filter(r -> r.id().equals("survey-1")).findFirst().orElse(null);
        assertNotNull(dto1);
        assertTrue(dto1.recommended());

        var dto2 = results.stream().filter(r -> r.id().equals("survey-2")).findFirst().orElse(null);
        assertNotNull(dto2);
        assertFalse(dto2.recommended());
    }

    @Test
    void listPublic_WithRecommendationFallbackToMostPopular() {
        when(surveyRepository.findByMunicipalityIdAndActiveTrueOrderByCreatedAtDesc("muni-1"))
                .thenReturn(List.of(survey1, survey2));

        when(surveyVoteRepository.findByUserId("user-1")).thenReturn(Collections.emptyList());
        when(surveyVoteRepository.existsBySurveyIdAndUserId("survey-1", "user-1")).thenReturn(false);
        when(surveyVoteRepository.existsBySurveyIdAndUserId("survey-2", "user-1")).thenReturn(false);

        lenient().when(surveyVoteRepository.countBySurveyIdAndSelectedOption(anyString(), anyInt())).thenReturn(0L);
        lenient().when(surveyVoteRepository.countBySurveyIdAndSelectedOption(eq("survey-1"), eq(1))).thenReturn(2L);
        lenient().when(surveyVoteRepository.countBySurveyIdAndSelectedOption(eq("survey-2"), eq(1))).thenReturn(20L);

        List<MunicipalitySurveyDetailDto> results = surveyService.listPublic("muni-1", user);

        assertNotNull(results);
        
        var dto1 = results.stream().filter(r -> r.id().equals("survey-1")).findFirst().orElse(null);
        assertNotNull(dto1);
        assertFalse(dto1.recommended());

        var dto2 = results.stream().filter(r -> r.id().equals("survey-2")).findFirst().orElse(null);
        assertNotNull(dto2);
        assertTrue(dto2.recommended());
    }
}
