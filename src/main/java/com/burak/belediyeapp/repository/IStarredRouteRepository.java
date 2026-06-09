package com.burak.belediyeapp.repository;

import com.burak.belediyeapp.entity.StarredRoute;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface IStarredRouteRepository extends JpaRepository<StarredRoute, String> {
    List<StarredRoute> findAllByUserId(String userId);
    Optional<StarredRoute> findByUserIdAndRouteId(String userId, String routeId);
    boolean existsByUserIdAndRouteId(String userId, String routeId);
    List<StarredRoute> findAllByRouteId(String routeId);
}
