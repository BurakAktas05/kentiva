package com.burak.belediyeapp.service.survey;

import com.burak.belediyeapp.dto.request.survey.MunicipalitySurveyRequest;
import com.burak.belediyeapp.dto.response.survey.CategoryStatsDto;
import com.burak.belediyeapp.dto.response.survey.MunicipalitySurveyDetailDto;
import com.burak.belediyeapp.dto.response.survey.SurveyAnalyticsDto;
import com.burak.belediyeapp.entity.AppUser;
import com.burak.belediyeapp.entity.Municipality;
import com.burak.belediyeapp.entity.MunicipalitySurvey;
import com.burak.belediyeapp.entity.MunicipalitySurveyVote;
import com.burak.belediyeapp.exception.BusinessException;
import com.burak.belediyeapp.exception.ResourceNotFoundException;
import com.burak.belediyeapp.repository.IAppUserRepository;
import com.burak.belediyeapp.repository.IMunicipalitySurveyRepository;
import com.burak.belediyeapp.repository.IMunicipalitySurveyVoteRepository;
import com.burak.belediyeapp.service.notification.SurveyNotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class MunicipalitySurveyService {

    private final IMunicipalitySurveyRepository surveyRepository;
    private final IMunicipalitySurveyVoteRepository surveyVoteRepository;
    private final IAppUserRepository userRepository;
    private final SurveyNotificationService surveyNotificationService;

    @Transactional(readOnly = true)
    public List<MunicipalitySurveyDetailDto> listPublic(String municipalityId, AppUser user) {
        ensureCitizenMunicipalityScope(user, municipalityId);
        List<MunicipalitySurvey> activeSurveys = surveyRepository.findByMunicipalityIdAndActiveTrueOrderByCreatedAtDesc(municipalityId);
        String recommendedId = null;

        if (user != null && !activeSurveys.isEmpty()) {
            recommendedId = calculateRecommendedSurveyId(activeSurveys, user);
        }

        final String finalRecId = recommendedId;
        return activeSurveys.stream()
                .map(s -> toDetailDto(s, user, false, null, s.getId().equals(finalRecId)))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<MunicipalitySurveyDetailDto> listForAdmin(AppUser user) {
        String mid = requireMunicipality(user).getId();
        return surveyRepository.findByMunicipalityIdOrderByCreatedAtDesc(mid).stream()
                .map(s -> toDetailDto(s, null, false, null, false))
                .toList();
    }

    @Transactional
    public MunicipalitySurveyDetailDto vote(String surveyId, int selectedOption, AppUser user) {
        MunicipalitySurvey survey = surveyRepository.findById(surveyId)
                .orElseThrow(() -> new ResourceNotFoundException("Anket", "id", surveyId));
        ensureCitizenMunicipalityScope(user, survey.getMunicipality().getId());

        if (!survey.isActive()) {
            throw new BusinessException("Bu anket artık aktif değil", "SURVEY_INACTIVE");
        }

        if (surveyVoteRepository.existsBySurveyIdAndUserId(surveyId, user.getId())) {
            throw new BusinessException("Bu ankete daha önce oy verdiniz", "ALREADY_VOTED");
        }

        validateSelectedOption(survey, selectedOption);

        MunicipalitySurveyVote vote = MunicipalitySurveyVote.builder()
                .survey(survey)
                .user(user)
                .selectedOption(selectedOption)
                .build();
        surveyVoteRepository.save(vote);

        user.setReputationScore(user.getReputationScore() + 15);
        userRepository.save(user);

        return toDetailDto(survey, user, true, selectedOption, false);
    }

    @Transactional
    public MunicipalitySurveyDetailDto create(AppUser user, MunicipalitySurveyRequest request) {
        Municipality m = requireMunicipality(user);
        MunicipalitySurvey survey = MunicipalitySurvey.builder()
                .municipality(m)
                .title(request.title().trim())
                .description(blankToNull(request.description()))
                .option1(request.option1().trim())
                .option2(request.option2().trim())
                .option3(normalizeOptionalOption(request.option3()))
                .option4(normalizeOptionalOption(request.option4()))
                .category(request.category() == null || request.category().isBlank() ? "Genel" : request.category().trim())
                .active(request.active() == null || request.active())
                .build();
        MunicipalitySurvey saved = surveyRepository.save(survey);
        if (saved.isActive()) {
            surveyNotificationService.broadcast(saved.getId());
        }
        return toDetailDto(saved, null, false, null, false);
    }

    @Transactional
    public MunicipalitySurveyDetailDto update(AppUser user, String id, MunicipalitySurveyRequest request) {
        MunicipalitySurvey survey = loadOwned(user, id);
        boolean hasVotes = !surveyVoteRepository.findBySurveyId(id).isEmpty();

        survey.setTitle(request.title().trim());
        survey.setDescription(blankToNull(request.description()));

        if (request.category() != null) {
            survey.setCategory(request.category().isBlank() ? "Genel" : request.category().trim());
        }

        if (hasVotes) {
            if (optionTextChanged(survey.getOption1(), request.option1())
                    || optionTextChanged(survey.getOption2(), request.option2())
                    || optionTextChanged(survey.getOption3(), request.option3())
                    || optionTextChanged(survey.getOption4(), request.option4())) {
                throw new BusinessException(
                        "Oy verilmiş anketlerde seçenek metinleri değiştirilemez",
                        "SURVEY_OPTIONS_LOCKED");
            }
        } else {
            survey.setOption1(request.option1().trim());
            survey.setOption2(request.option2().trim());
            survey.setOption3(normalizeOptionalOption(request.option3()));
            survey.setOption4(normalizeOptionalOption(request.option4()));
        }

        boolean wasActive = survey.isActive();
        if (request.active() != null) {
            survey.setActive(request.active());
        }

        MunicipalitySurvey saved = surveyRepository.save(survey);
        if (saved.isActive() && !wasActive) {
            surveyNotificationService.broadcast(saved.getId());
        }
        return toDetailDto(saved, null, false, null, false);
    }

    @Transactional(readOnly = true)
    public SurveyAnalyticsDto getAnalytics(AppUser user) {
        String mid = requireMunicipality(user).getId();
        List<MunicipalitySurvey> allSurveys = surveyRepository.findByMunicipalityIdOrderByCreatedAtDesc(mid);

        long totalSurveys = allSurveys.size();
        long activeSurveys = allSurveys.stream().filter(MunicipalitySurvey::isActive).count();
        long totalVotes = 0;

        Map<String, long[]> statsMap = new HashMap<>(); // category -> [surveyCount, voteCount]

        for (MunicipalitySurvey s : allSurveys) {
            long o1 = surveyVoteRepository.countBySurveyIdAndSelectedOption(s.getId(), 1);
            long o2 = surveyVoteRepository.countBySurveyIdAndSelectedOption(s.getId(), 2);
            long o3 = surveyVoteRepository.countBySurveyIdAndSelectedOption(s.getId(), 3);
            long o4 = surveyVoteRepository.countBySurveyIdAndSelectedOption(s.getId(), 4);
            long votes = o1 + o2 + o3 + o4;
            totalVotes += votes;

            String cat = s.getCategory() != null ? s.getCategory() : "Genel";
            long[] current = statsMap.computeIfAbsent(cat, k -> new long[2]);
            current[0]++; // survey count
            current[1] += votes; // vote count
        }

        List<CategoryStatsDto> catStats = statsMap.entrySet().stream()
                .map(e -> new CategoryStatsDto(e.getKey(), e.getValue()[0], e.getValue()[1]))
                .toList();

        return new SurveyAnalyticsDto(totalSurveys, activeSurveys, totalVotes, catStats);
    }

    @Transactional
    public void delete(AppUser user, String id) {
        surveyRepository.delete(loadOwned(user, id));
    }

    private MunicipalitySurvey loadOwned(AppUser user, String id) {
        MunicipalitySurvey survey = surveyRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Anket", "id", id));
        if (!survey.getMunicipality().getId().equals(requireMunicipality(user).getId())) {
            throw new BusinessException("Bu işlem için yetkiniz yok", "UNAUTHORIZED_ACCESS");
        }
        return survey;
    }

    private String calculateRecommendedSurveyId(List<MunicipalitySurvey> activeSurveys, AppUser user) {
        List<MunicipalitySurvey> unvotedActive = activeSurveys.stream()
                .filter(s -> !surveyVoteRepository.existsBySurveyIdAndUserId(s.getId(), user.getId()))
                .toList();

        if (unvotedActive.isEmpty()) {
            return null;
        }

        List<MunicipalitySurveyVote> userVotes = surveyVoteRepository.findByUserId(user.getId());

        if (userVotes.isEmpty()) {
            return findMostVotedSurveyId(unvotedActive);
        }

        Map<String, Long> categoryCounts = userVotes.stream()
                .map(v -> v.getSurvey().getCategory())
                .filter(Objects::nonNull)
                .collect(Collectors.groupingBy(c -> c, Collectors.counting()));

        if (categoryCounts.isEmpty()) {
            return findMostVotedSurveyId(unvotedActive);
        }

        String topCategory = categoryCounts.entrySet().stream()
                .max(Map.Entry.comparingByValue())
                .map(Map.Entry::getKey)
                .orElse("Genel");

        Optional<MunicipalitySurvey> recommendedOpt = unvotedActive.stream()
                .filter(s -> topCategory.equalsIgnoreCase(s.getCategory()))
                .findFirst();

        if (recommendedOpt.isPresent()) {
            return recommendedOpt.get().getId();
        }

        return findMostVotedSurveyId(unvotedActive);
    }

    private String findMostVotedSurveyId(List<MunicipalitySurvey> surveys) {
        String mostVotedId = null;
        long maxVotes = -1;
        for (MunicipalitySurvey s : surveys) {
            long o1 = surveyVoteRepository.countBySurveyIdAndSelectedOption(s.getId(), 1);
            long o2 = surveyVoteRepository.countBySurveyIdAndSelectedOption(s.getId(), 2);
            long o3 = surveyVoteRepository.countBySurveyIdAndSelectedOption(s.getId(), 3);
            long o4 = surveyVoteRepository.countBySurveyIdAndSelectedOption(s.getId(), 4);
            long total = o1 + o2 + o3 + o4;
            if (total > maxVotes) {
                maxVotes = total;
                mostVotedId = s.getId();
            }
        }
        return mostVotedId;
    }

    private MunicipalitySurveyDetailDto toDetailDto(
            MunicipalitySurvey s, AppUser user, boolean forceVoted, Integer votedOptionOverride, boolean recommended) {
        long o1 = surveyVoteRepository.countBySurveyIdAndSelectedOption(s.getId(), 1);
        long o2 = surveyVoteRepository.countBySurveyIdAndSelectedOption(s.getId(), 2);
        long o3 = surveyVoteRepository.countBySurveyIdAndSelectedOption(s.getId(), 3);
        long o4 = surveyVoteRepository.countBySurveyIdAndSelectedOption(s.getId(), 4);
        long total = o1 + o2 + o3 + o4;

        boolean voted = false;
        Integer votedOption = votedOptionOverride;

        if (forceVoted) {
            voted = true;
        } else if (user != null) {
            Optional<MunicipalitySurveyVote> voteOpt =
                    surveyVoteRepository.findBySurveyIdAndUserId(s.getId(), user.getId());
            if (voteOpt.isPresent()) {
                voted = true;
                votedOption = voteOpt.get().getSelectedOption();
            }
        }

        return new MunicipalitySurveyDetailDto(
                s.getId(), s.getTitle(), s.getDescription(),
                s.getOption1(), s.getOption2(), s.getOption3(), s.getOption4(),
                s.getCategory() != null ? s.getCategory() : "Genel",
                s.isActive(), voted, votedOption, recommended, o1, o2, o3, o4, total
        );
    }

    private void validateSelectedOption(MunicipalitySurvey survey, int selectedOption) {
        if (selectedOption < 1 || selectedOption > 4) {
            throw new BusinessException("Geçersiz seçenek", "INVALID_OPTION");
        }
        if (selectedOption == 3 && isBlank(survey.getOption3())) {
            throw new BusinessException("Geçersiz seçenek", "INVALID_OPTION");
        }
        if (selectedOption == 4 && isBlank(survey.getOption4())) {
            throw new BusinessException("Geçersiz seçenek", "INVALID_OPTION");
        }
    }

    private static boolean optionTextChanged(String current, String incoming) {
        String normalizedIncoming = normalizeOptionalOption(incoming);
        String normalizedCurrent = current;
        if (normalizedCurrent == null || normalizedCurrent.isBlank()) {
            normalizedCurrent = null;
        }
        return !Objects.equals(normalizedCurrent, normalizedIncoming);
    }

    private static String normalizeOptionalOption(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private static String blankToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    private static Municipality requireMunicipality(AppUser user) {
        Municipality m = user.getMunicipality();
        if (m == null) {
            throw new BusinessException("Bu hesap bir belediyeye bağlı değil", "MUNICIPALITY_NOT_ASSIGNED");
        }
        return m;
    }

    private static void ensureCitizenMunicipalityScope(AppUser user, String municipalityId) {
        if (user == null || municipalityId == null || municipalityId.isBlank()) {
            return;
        }
        Municipality allowed = user.getPreferredMunicipality() != null
                ? user.getPreferredMunicipality()
                : user.getMunicipality();
        if (allowed == null) {
            throw new BusinessException("Bu işlem için belediye kapsamı gerekli.", "MUNICIPALITY_REQUIRED");
        }
        if (!municipalityId.equals(allowed.getId())) {
            throw new BusinessException("Bu belediyeye ait ankete erişim yetkiniz yok.", "CROSS_MUNICIPALITY_ACCESS");
        }
    }
}
