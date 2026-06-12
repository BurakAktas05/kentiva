package com.burak.belediyeapp.service.event;

import com.burak.belediyeapp.config.CacheNames;
import com.burak.belediyeapp.dto.request.event.MunicipalityEventRequest;
import com.burak.belediyeapp.dto.response.widget.MunicipalityEventDto;
import com.burak.belediyeapp.entity.AppUser;
import com.burak.belediyeapp.entity.Municipality;
import com.burak.belediyeapp.entity.MunicipalityEvent;
import com.burak.belediyeapp.exception.BusinessException;
import com.burak.belediyeapp.exception.ResourceNotFoundException;
import com.burak.belediyeapp.repository.IMunicipalityEventRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class MunicipalityEventService {

    private final IMunicipalityEventRepository eventRepository;

    @Transactional(readOnly = true)
    public List<MunicipalityEventDto> listForAdmin(AppUser user) {
        String mid = requireMunicipality(user).getId();
        return eventRepository.findByMunicipalityIdOrderByStartsAtDesc(mid).stream()
                .map(e -> new MunicipalityEventDto(
                        e.getId(),
                        e.getTitle(),
                        e.getVenue(),
                        e.getDescription(),
                        e.getStartsAt(),
                        e.getEndsAt(),
                        e.getExternalUrl()))
                .toList();
    }

    @Transactional
    @CacheEvict(value = CacheNames.WIDGETS, allEntries = true)
    public MunicipalityEventDto create(AppUser user, MunicipalityEventRequest request) {
        Municipality m = requireMunicipality(user);
        MunicipalityEvent event = MunicipalityEvent.builder()
                .municipality(m)
                .title(request.title().trim())
                .venue(request.venue() != null ? request.venue().trim() : null)
                .description(request.description() != null ? request.description().trim() : null)
                .startsAt(request.startsAt())
                .endsAt(request.endsAt())
                .externalUrl(request.externalUrl() != null ? request.externalUrl().trim() : null)
                .active(request.active() == null || request.active())
                .build();
        MunicipalityEvent saved = eventRepository.save(event);
        return toDto(saved);
    }

    @Transactional
    @CacheEvict(value = CacheNames.WIDGETS, allEntries = true)
    public void delete(AppUser user, String id) {
        MunicipalityEvent event = eventRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Etkinlik", "id", id));
        if (!event.getMunicipality().getId().equals(requireMunicipality(user).getId())) {
            throw new BusinessException("Bu işlem için yetkiniz yok", "UNAUTHORIZED_ACCESS");
        }
        eventRepository.delete(event);
    }

    private static Municipality requireMunicipality(AppUser user) {
        Municipality m = user.getMunicipality();
        if (m == null) {
            throw new BusinessException("Bu hesap bir belediyeye bağlı değil", "MUNICIPALITY_NOT_ASSIGNED");
        }
        return m;
    }

    private static MunicipalityEventDto toDto(MunicipalityEvent e) {
        return new MunicipalityEventDto(
                e.getId(),
                e.getTitle(),
                e.getVenue(),
                e.getDescription(),
                e.getStartsAt(),
                e.getEndsAt(),
                e.getExternalUrl()
        );
    }
}
