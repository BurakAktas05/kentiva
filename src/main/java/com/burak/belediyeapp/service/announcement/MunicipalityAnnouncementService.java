package com.burak.belediyeapp.service.announcement;

import com.burak.belediyeapp.dto.request.announcement.MunicipalityAnnouncementRequest;
import com.burak.belediyeapp.dto.response.announcement.MunicipalityAnnouncementDto;
import com.burak.belediyeapp.entity.AppUser;
import com.burak.belediyeapp.entity.Municipality;
import com.burak.belediyeapp.entity.MunicipalityAnnouncement;
import com.burak.belediyeapp.exception.BusinessException;
import com.burak.belediyeapp.exception.ResourceNotFoundException;
import com.burak.belediyeapp.repository.IMunicipalityAnnouncementRepository;
import com.burak.belediyeapp.service.media.MediaGuardClient;
import com.burak.belediyeapp.service.storage.StorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class MunicipalityAnnouncementService {

    private final IMunicipalityAnnouncementRepository announcementRepository;
    private final StorageService storageService;
    private final MediaGuardClient mediaGuardClient;

    @Transactional(readOnly = true)
    public List<MunicipalityAnnouncementDto> listPublic(String municipalityId) {
        return announcementRepository
                .findByMunicipalityIdAndActiveTrueOrderByStartsAtDesc(municipalityId)
                .stream()
                .filter(this::isCurrentlyVisible)
                .map(MunicipalityAnnouncementService::toDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<MunicipalityAnnouncementDto> listForAdmin(AppUser user) {
        String mid = requireMunicipality(user).getId();
        return announcementRepository.findByMunicipalityIdOrderByStartsAtDesc(mid).stream()
                .map(MunicipalityAnnouncementService::toDto)
                .toList();
    }

    @Transactional
    public MunicipalityAnnouncementDto create(AppUser user, MunicipalityAnnouncementRequest request) {
        Municipality m = requireMunicipality(user);
        LocalDateTime startsAt = request.startsAt() != null ? request.startsAt() : LocalDateTime.now();
        MunicipalityAnnouncement announcement = MunicipalityAnnouncement.builder()
                .municipality(m)
                .title(request.title().trim())
                .content(request.content().trim())
                .imageUrl(blankToNull(request.imageUrl()))
                .startsAt(startsAt)
                .endsAt(request.endsAt())
                .active(request.active() == null || request.active())
                .build();
        return toDto(announcementRepository.save(announcement));
    }

    @Transactional
    public MunicipalityAnnouncementDto update(AppUser user, String id, MunicipalityAnnouncementRequest request) {
        MunicipalityAnnouncement announcement = loadOwned(user, id);
        announcement.setTitle(request.title().trim());
        announcement.setContent(request.content().trim());
        announcement.setImageUrl(blankToNull(request.imageUrl()));
        if (request.startsAt() != null) {
            announcement.setStartsAt(request.startsAt());
        }
        announcement.setEndsAt(request.endsAt());
        if (request.active() != null) {
            announcement.setActive(request.active());
        }
        return toDto(announcementRepository.save(announcement));
    }

    @Transactional
    public void delete(AppUser user, String id) {
        announcementRepository.delete(loadOwned(user, id));
    }

    @Transactional
    public String uploadImage(AppUser user, MultipartFile file) {
        Municipality municipality = requireMunicipality(user);
        if (file == null || file.isEmpty()) {
            throw new BusinessException("Duyuru gorseli gerekli", "FILE_REQUIRED");
        }

        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            throw new BusinessException("Yalnizca goruntu dosyalari yuklenebilir.", "INVALID_MEDIA_TYPE");
        }
        if (file.getSize() > 8 * 1024 * 1024) {
            throw new BusinessException("Duyuru gorseli en fazla 8 MB olabilir.", "FILE_TOO_LARGE");
        }

        byte[] bytes;
        try {
            bytes = file.getBytes();
        } catch (Exception e) {
            throw new BusinessException("Dosya okunamadi.", "FILE_READ_ERROR");
        }

        mediaGuardClient.validateImageOrThrow(bytes, contentType);
        return storageService.uploadBytes(
                bytes,
                contentType,
                "announcements/" + municipality.getId(),
                file.getOriginalFilename());
    }

    private MunicipalityAnnouncement loadOwned(AppUser user, String id) {
        MunicipalityAnnouncement announcement = announcementRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Duyuru", "id", id));
        if (!announcement.getMunicipality().getId().equals(requireMunicipality(user).getId())) {
            throw new BusinessException("Bu işlem için yetkiniz yok", "UNAUTHORIZED_ACCESS");
        }
        return announcement;
    }

    private boolean isCurrentlyVisible(MunicipalityAnnouncement a) {
        if (!a.isActive()) {
            return false;
        }
        LocalDateTime endsAt = a.getEndsAt();
        return endsAt == null || endsAt.isAfter(LocalDateTime.now());
    }

    private static Municipality requireMunicipality(AppUser user) {
        Municipality m = user.getMunicipality();
        if (m == null) {
            throw new BusinessException("Bu hesap bir belediyeye bağlı değil", "MUNICIPALITY_NOT_ASSIGNED");
        }
        return m;
    }

    private static String blankToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    private static MunicipalityAnnouncementDto toDto(MunicipalityAnnouncement a) {
        return new MunicipalityAnnouncementDto(
                a.getId(),
                a.getTitle(),
                a.getContent(),
                a.getImageUrl(),
                a.getStartsAt(),
                a.getEndsAt(),
                a.isActive()
        );
    }
}
