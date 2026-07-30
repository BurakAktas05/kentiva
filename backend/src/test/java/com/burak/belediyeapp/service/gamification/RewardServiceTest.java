package com.burak.belediyeapp.service.gamification;

import com.burak.belediyeapp.dto.request.gamification.RedeemRewardRequest;
import com.burak.belediyeapp.entity.AppUser;
import com.burak.belediyeapp.exception.BusinessException;
import com.burak.belediyeapp.repository.IAppUserRepository;
import com.burak.belediyeapp.repository.IMunicipalityRewardRepository;
import com.burak.belediyeapp.repository.IUserRedeemedRewardRepository;
import com.burak.belediyeapp.service.citizen.CitizenReputationService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.verifyNoInteractions;

@ExtendWith(MockitoExtension.class)
class RewardServiceTest {

    @Mock
    private IMunicipalityRewardRepository rewardRepository;

    @Mock
    private IUserRedeemedRewardRepository redeemedRewardRepository;

    @Mock
    private IAppUserRepository userRepository;

    @Mock
    private CitizenReputationService citizenReputationService;

    @InjectMocks
    private RewardService rewardService;

    @Test
    void redeem_RejectsNonCitizenUser() {
        AppUser admin = new AppUser();
        com.burak.belediyeapp.entity.Role adminRole = new com.burak.belediyeapp.entity.Role();
        adminRole.setName("ROLE_ADMIN");
        admin.getRoles().add(adminRole);

        BusinessException ex = assertThrows(
                BusinessException.class,
                () -> rewardService.redeem(new RedeemRewardRequest("reward-1"), admin));

        assertEquals("CITIZEN_REQUIRED", ex.getErrorCode());
        verifyNoInteractions(rewardRepository, redeemedRewardRepository, userRepository, citizenReputationService);
    }

    @Test
    void listRedeemed_RejectsNonCitizenUser() {
        AppUser manager = new AppUser();
        com.burak.belediyeapp.entity.Role managerRole = new com.burak.belediyeapp.entity.Role();
        managerRole.setName("ROLE_DEPT_MANAGER");
        manager.getRoles().add(managerRole);

        BusinessException ex = assertThrows(
                BusinessException.class,
                () -> rewardService.listRedeemed(manager));

        assertEquals("CITIZEN_REQUIRED", ex.getErrorCode());
        verifyNoInteractions(redeemedRewardRepository);
    }
}
