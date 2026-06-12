package com.burak.belediyeapp.service.outage;

import com.burak.belediyeapp.config.CacheNames;
import com.burak.belediyeapp.dto.request.outage.MunicipalityOutageRequest;
import com.burak.belediyeapp.dto.response.widget.MunicipalityOutageDto;
import com.burak.belediyeapp.entity.AppUser;
import com.burak.belediyeapp.entity.Municipality;
import com.burak.belediyeapp.entity.MunicipalityOutage;
import com.burak.belediyeapp.exception.BusinessException;
import com.burak.belediyeapp.exception.ResourceNotFoundException;
import com.burak.belediyeapp.repository.IMunicipalityOutageRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class MunicipalityOutageService {

    private final IMunicipalityOutageRepository outageRepository;

    @Transactional(readOnly = true)
    public List<MunicipalityOutageDto> listForAdmin(AppUser user) {
        String mid = requireMunicipality(user).getId();
        return outageRepository.findByMunicipalityIdOrderByStartsAtDesc(mid).stream()
                .map(o -> new MunicipalityOutageDto(
                        o.getId(),
                        o.getOutageType(),
                        o.getTitle(),
                        o.getDistrict(),
                        o.getMessage(),
                        o.getStartsAt(),
                        o.getEndsAt()))
                .toList();
    }

    @Transactional
    @CacheEvict(value = CacheNames.WIDGETS, allEntries = true)
    public MunicipalityOutageDto create(AppUser user, MunicipalityOutageRequest request) {
        Municipality m = requireMunicipality(user);
        MunicipalityOutage outage = MunicipalityOutage.builder()
                .municipality(m)
                .outageType(request.outageType())
                .title(request.title().trim())
                .district(request.district() != null ? request.district().trim() : null)
                .message(request.message() != null ? request.message().trim() : null)
                .startsAt(request.startsAt())
                .endsAt(request.endsAt())
                .active(request.active() == null || request.active())
                .build();
        MunicipalityOutage saved = outageRepository.save(outage);
        return toDto(saved);
    }

    @Transactional
    @CacheEvict(value = CacheNames.WIDGETS, allEntries = true)
    public void delete(AppUser user, String id) {
        MunicipalityOutage outage = outageRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Kesinti", "id", id));
        if (!outage.getMunicipality().getId().equals(requireMunicipality(user).getId())) {
            throw new BusinessException("Bu işlem için yetkiniz yok", "UNAUTHORIZED_ACCESS");
        }
        outageRepository.delete(outage);
    }

    private static Municipality requireMunicipality(AppUser user) {
        Municipality m = user.getMunicipality();
        if (m == null) {
            throw new BusinessException("Bu hesap bir belediyeye bağlı değil", "MUNICIPALITY_NOT_ASSIGNED");
        }
        return m;
    }

    private static MunicipalityOutageDto toDto(MunicipalityOutage o) {
        return new MunicipalityOutageDto(
                o.getId(),
                o.getOutageType(),
                o.getTitle(),
                o.getDistrict(),
                o.getMessage(),
                o.getStartsAt(),
                o.getEndsAt()
        );
    }
}
