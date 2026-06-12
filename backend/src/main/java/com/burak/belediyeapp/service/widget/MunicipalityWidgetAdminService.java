package com.burak.belediyeapp.service.widget;

import com.burak.belediyeapp.dto.request.widget.MunicipalityEventRequest;
import com.burak.belediyeapp.dto.request.widget.MunicipalityOutageRequest;
import com.burak.belediyeapp.dto.response.widget.MunicipalityEventDto;
import com.burak.belediyeapp.dto.response.widget.MunicipalityOutageDto;
import com.burak.belediyeapp.entity.AppUser;
import com.burak.belediyeapp.entity.Municipality;
import com.burak.belediyeapp.entity.MunicipalityEvent;
import com.burak.belediyeapp.entity.MunicipalityOutage;
import com.burak.belediyeapp.exception.BusinessException;
import com.burak.belediyeapp.exception.ResourceNotFoundException;
import com.burak.belediyeapp.repository.IMunicipalityEventRepository;
import com.burak.belediyeapp.repository.IMunicipalityOutageRepository;
import com.burak.belediyeapp.service.notification.OutageNotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.cache.annotation.CacheEvict;
import com.burak.belediyeapp.config.CacheNames;

import java.util.List;

@Service
@RequiredArgsConstructor
public class MunicipalityWidgetAdminService {

    private final IMunicipalityOutageRepository outageRepository;
    private final IMunicipalityEventRepository eventRepository;
    private final OutageNotificationService outageNotificationService;

    private static Municipality requireMunicipality(AppUser user) {
        if (user.getMunicipality() == null) {
            throw new BusinessException("Belediye bağlamı gerekli.", "NO_MUNICIPALITY");
        }
        return user.getMunicipality();
    }

    @Transactional(readOnly = true)
    public List<MunicipalityOutageDto> listOutages(AppUser user) {
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
    public MunicipalityOutageDto createOutage(AppUser user, MunicipalityOutageRequest request) {
        Municipality m = requireMunicipality(user);
        MunicipalityOutage o = MunicipalityOutage.builder()
                .municipality(m)
                .outageType(request.outageType())
                .title(request.title())
                .district(request.district())
                .message(request.message())
                .startsAt(request.startsAt())
                .endsAt(request.endsAt())
                .active(request.active() == null || request.active())
                .build();
        MunicipalityOutage saved = outageRepository.save(o);
        // Aktif kesintiler vatandaşlara duyurulur. Asenkron — kayıt yanıtını bloklamaz.
        if (saved.isActive()) {
            outageNotificationService.broadcast(saved.getId());
        }
        return toOutageDto(saved);
    }

    @Transactional
    @CacheEvict(value = CacheNames.WIDGETS, allEntries = true)
    public MunicipalityOutageDto updateOutage(AppUser user, String id, MunicipalityOutageRequest request) {
        MunicipalityOutage o = loadOutage(user, id);
        boolean wasActive = o.isActive();
        o.setOutageType(request.outageType());
        o.setTitle(request.title());
        o.setDistrict(request.district());
        o.setMessage(request.message());
        o.setStartsAt(request.startsAt());
        o.setEndsAt(request.endsAt());
        if (request.active() != null) {
            o.setActive(request.active());
        }
        MunicipalityOutage saved = outageRepository.save(o);
        // Pasif → aktif geçişlerde de duyuru gönder; aktiften aktife "spam" göndermeyiz.
        if (saved.isActive() && !wasActive) {
            outageNotificationService.broadcast(saved.getId());
        }
        return toOutageDto(saved);
    }

    @Transactional
    @CacheEvict(value = CacheNames.WIDGETS, allEntries = true)
    public void deleteOutage(AppUser user, String id) {
        outageRepository.delete(loadOutage(user, id));
    }

    @Transactional(readOnly = true)
    public List<MunicipalityEventDto> listEvents(AppUser user) {
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
    public MunicipalityEventDto createEvent(AppUser user, MunicipalityEventRequest request) {
        Municipality m = requireMunicipality(user);
        MunicipalityEvent e = MunicipalityEvent.builder()
                .municipality(m)
                .title(request.title())
                .venue(request.venue())
                .description(request.description())
                .startsAt(request.startsAt())
                .endsAt(request.endsAt())
                .externalUrl(request.externalUrl())
                .active(request.active() == null || request.active())
                .build();
        return toEventDto(eventRepository.save(e));
    }

    @Transactional
    @CacheEvict(value = CacheNames.WIDGETS, allEntries = true)
    public MunicipalityEventDto updateEvent(AppUser user, String id, MunicipalityEventRequest request) {
        MunicipalityEvent e = loadEvent(user, id);
        e.setTitle(request.title());
        e.setVenue(request.venue());
        e.setDescription(request.description());
        e.setStartsAt(request.startsAt());
        e.setEndsAt(request.endsAt());
        e.setExternalUrl(request.externalUrl());
        if (request.active() != null) {
            e.setActive(request.active());
        }
        return toEventDto(eventRepository.save(e));
    }

    @Transactional
    @CacheEvict(value = CacheNames.WIDGETS, allEntries = true)
    public void deleteEvent(AppUser user, String id) {
        eventRepository.delete(loadEvent(user, id));
    }

    private MunicipalityOutage loadOutage(AppUser user, String id) {
        MunicipalityOutage o = outageRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Kesinti", "id", id));
        if (!o.getMunicipality().getId().equals(requireMunicipality(user).getId())) {
            throw new BusinessException("Bu kayda erişim yok.", "FORBIDDEN");
        }
        return o;
    }

    private MunicipalityEvent loadEvent(AppUser user, String id) {
        MunicipalityEvent e = eventRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Etkinlik", "id", id));
        if (!e.getMunicipality().getId().equals(requireMunicipality(user).getId())) {
            throw new BusinessException("Bu kayda erişim yok.", "FORBIDDEN");
        }
        return e;
    }

    private static MunicipalityOutageDto toOutageDto(MunicipalityOutage o) {
        return new MunicipalityOutageDto(
                o.getId(), o.getOutageType(), o.getTitle(), o.getDistrict(), o.getMessage(),
                o.getStartsAt(), o.getEndsAt());
    }

    private static MunicipalityEventDto toEventDto(MunicipalityEvent e) {
        return new MunicipalityEventDto(
                e.getId(), e.getTitle(), e.getVenue(), e.getDescription(),
                e.getStartsAt(), e.getEndsAt(), e.getExternalUrl());
    }
}
