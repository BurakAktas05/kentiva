package com.burak.belediyeapp.repository;

import com.burak.belediyeapp.entity.ItemDonationAd;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface IItemDonationAdRepository extends JpaRepository<ItemDonationAd, String> {

    List<ItemDonationAd> findAllByOrderByCreatedAtDesc();

    List<ItemDonationAd> findByDistrictOrderByCreatedAtDesc(String district);
}
