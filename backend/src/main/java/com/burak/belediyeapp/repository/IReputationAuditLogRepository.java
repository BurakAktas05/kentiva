package com.burak.belediyeapp.repository;

import com.burak.belediyeapp.entity.ReputationAuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

@Repository
public interface IReputationAuditLogRepository extends JpaRepository<ReputationAuditLog, String>, JpaSpecificationExecutor<ReputationAuditLog> {
}
