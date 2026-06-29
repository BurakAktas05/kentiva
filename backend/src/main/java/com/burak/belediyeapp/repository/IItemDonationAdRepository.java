package com.burak.belediyeapp.repository;

import com.burak.belediyeapp.entity.ItemDonationAd;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface IItemDonationAdRepository extends JpaRepository<ItemDonationAd, String> {

    @EntityGraph(attributePaths = "user")
    List<ItemDonationAd> findAllByOrderByCreatedAtDesc();

    @EntityGraph(attributePaths = "user")
    List<ItemDonationAd> findByDistrictOrderByCreatedAtDesc(String district);

    List<ItemDonationAd> findAllByUserId(String userId);

    @Modifying
    @Query("delete from ItemDonationAd ad where ad.user.id = :userId")
    void hardDeleteAllByUserId(String userId);
}
