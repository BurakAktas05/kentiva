package com.burak.belediyeapp.repository;

import com.burak.belediyeapp.entity.TurkeyProvince;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ITurkeyProvinceRepository extends JpaRepository<TurkeyProvince, String> {
    Optional<TurkeyProvince> findBySlugIgnoreCase(String slug);
}
