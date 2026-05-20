package com.burak.belediyeapp.service.survey;

import com.burak.belediyeapp.dto.request.survey.MunicipalitySurveyRequest;
import com.burak.belediyeapp.dto.response.survey.MunicipalitySurveyDetailDto;
import com.burak.belediyeapp.entity.AppUser;
import com.burak.belediyeapp.entity.Municipality;
import com.burak.belediyeapp.entity.MunicipalitySurvey;
import com.burak.belediyeapp.entity.MunicipalitySurveyVote;
import com.burak.belediyeapp.exception.BusinessException;
import com.burak.belediyeapp.exception.ResourceNotFoundException;
import com.burak.belediyeapp.repository.IAppUserRepository;
import com.burak.belediyeapp.repository.IMunicipalitySurveyRepository;
import com.burak.belediyeapp.repository.IMunicipalitySurveyVoteRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class MunicipalitySurveyService {

    private final IMunicipalitySurveyRepository surveyRepository;
    private final IMunicipalitySurveyVoteRepository surveyVoteRepository;
    private final IAppUserRepository userRepository;

    @Transactional(readOnly = true)
    public List<MunicipalitySurveyDetailDto> listPublic(String municipalityId, AppUser user) {
        return surveyRepository.findByMunicipalityIdAndActiveTrueOrderByCreatedAtDesc(municipalityId).stream()
                .map(s -> toDetailDto(s, user, false, null))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<MunicipalitySurveyDetailDto> listForAdmin(AppUser user) {
        String mid = requireMunicipality(user).getId();
        return surveyRepository.findByMunicipalityIdOrderByCreatedAtDesc(mid).stream()
                .map(s -> toDetailDto(s, null, false, null))
                .toList();
    }

    @Transactional
    public MunicipalitySurveyDetailDto vote(String surveyId, int selectedOption, AppUser user) {
        MunicipalitySurvey survey = surveyRepository.findById(surveyId)
                .orElseThrow(() -> new ResourceNotFoundException("Anket", "id", surveyId));

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

        return toDetailDto(survey, user, true, selectedOption);
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
                .active(request.active() == null || request.active())
                .build();
        MunicipalitySurvey saved = surveyRepository.save(survey);
        return toDetailDto(saved, null, false, null);
    }

    @Transactional
    public MunicipalitySurveyDetailDto update(AppUser user, String id, MunicipalitySurveyRequest request) {
        MunicipalitySurvey survey = loadOwned(user, id);
        boolean hasVotes = !surveyVoteRepository.findBySurveyId(id).isEmpty();

        survey.setTitle(request.title().trim());
        survey.setDescription(blankToNull(request.description()));

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

        if (request.active() != null) {
            survey.setActive(request.active());
        }

        return toDetailDto(surveyRepository.save(survey), null, false, null);
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

    private MunicipalitySurveyDetailDto toDetailDto(
            MunicipalitySurvey s, AppUser user, boolean forceVoted, Integer votedOptionOverride) {
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
                s.isActive(), voted, votedOption, o1, o2, o3, o4, total
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
        return !java.util.Objects.equals(normalizedCurrent, normalizedIncoming);
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
}
