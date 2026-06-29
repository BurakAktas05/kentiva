package com.burak.belediyeapp.repository;

import com.burak.belediyeapp.entity.SystemFeedback;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ISystemFeedbackRepository extends JpaRepository<SystemFeedback, String> {

    void deleteAllByUserId(String userId);
}
