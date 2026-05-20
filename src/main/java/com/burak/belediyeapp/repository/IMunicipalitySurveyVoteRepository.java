package com.burak.belediyeapp.repository;

import com.burak.belediyeapp.entity.MunicipalitySurveyVote;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface IMunicipalitySurveyVoteRepository extends JpaRepository<MunicipalitySurveyVote, String> {

    long countBySurveyIdAndSelectedOption(String surveyId, int selectedOption);

    boolean existsBySurveyIdAndUserId(String surveyId, String userId);

    List<MunicipalitySurveyVote> findBySurveyId(String surveyId);

    Optional<MunicipalitySurveyVote> findBySurveyIdAndUserId(String surveyId, String userId);
}
