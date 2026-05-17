package com.burak.belediyeapp.service.export;

import com.burak.belediyeapp.entity.AppUser;
import com.burak.belediyeapp.entity.ExportRun;
import com.burak.belediyeapp.entity.ExportSchedule;
import com.burak.belediyeapp.entity.Municipality;
import com.burak.belediyeapp.exception.BusinessException;
import com.burak.belediyeapp.exception.ResourceNotFoundException;
import com.burak.belediyeapp.repository.IExportRunRepository;
import com.burak.belediyeapp.repository.IExportScheduleRepository;
import com.burak.belediyeapp.repository.IMunicipalityRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.DayOfWeek;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class ScheduledExportService {

    private static final ZoneId ZONE = ZoneId.of("Europe/Istanbul");

    private final IExportScheduleRepository scheduleRepository;
    private final IExportRunRepository runRepository;
    private final IMunicipalityRepository municipalityRepository;
    private final ExportService exportService;

    @Value("${app.storage.local.upload-dir:uploads}")
    private String uploadDir;

    @Transactional(readOnly = true)
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN','ROLE_SUPER_ADMIN','ROLE_DEPT_MANAGER')")
    public List<ExportSchedule> listSchedules(AppUser user) {
        String mid = requireMunicipalityId(user);
        return scheduleRepository.findByMunicipalityIdOrderByCreatedAtDesc(mid);
    }

    @Transactional
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN','ROLE_SUPER_ADMIN')")
    public ExportSchedule createSchedule(
            AppUser user,
            ExportSchedule.ExportFormat format,
            ExportSchedule.ExportFrequency frequency,
            int hourOfDay) {
        String mid = requireMunicipalityId(user);
        Municipality municipality = municipalityRepository.findById(mid)
                .orElseThrow(() -> new ResourceNotFoundException("Belediye", "id", mid));
        if (hourOfDay < 0 || hourOfDay > 23) {
            throw new BusinessException("Saat 0-23 arasında olmalıdır.", "INVALID_HOUR");
        }
        ExportSchedule schedule = ExportSchedule.builder()
                .municipality(municipality)
                .createdBy(user)
                .format(format != null ? format : ExportSchedule.ExportFormat.EXCEL)
                .frequency(frequency != null ? frequency : ExportSchedule.ExportFrequency.DAILY)
                .hourOfDay(hourOfDay)
                .enabled(true)
                .build();
        return scheduleRepository.save(schedule);
    }

    @Transactional
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN','ROLE_SUPER_ADMIN')")
    public void deleteSchedule(String scheduleId, AppUser user) {
        ExportSchedule schedule = findOwnedSchedule(scheduleId, user);
        scheduleRepository.delete(schedule);
    }

    @Transactional(readOnly = true)
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN','ROLE_SUPER_ADMIN','ROLE_DEPT_MANAGER')")
    public Page<ExportRun> listRuns(AppUser user, Pageable pageable) {
        return runRepository.findByMunicipalityIdOrderByCreatedAtDesc(requireMunicipalityId(user), pageable);
    }

    @Transactional(readOnly = true)
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN','ROLE_SUPER_ADMIN','ROLE_DEPT_MANAGER')")
    public ExportRun getRun(String runId, AppUser user) {
        String municipalityId = requireMunicipalityId(user);
        ExportRun run = runRepository.findByIdAndMunicipalityId(runId, municipalityId)
                .orElseThrow(() -> new ResourceNotFoundException("Export", "id", runId));
        validateRunStoragePath(run, municipalityId);
        return run;
    }

    /**
     * storagePath manipülasyonu ile dizin dışı dosya okunmasını engeller.
     */
    public void validateRunStoragePath(ExportRun run, String municipalityId) {
        if (run.getStoragePath() == null || run.getStoragePath().isBlank()) {
            throw new BusinessException("Dosya yolu geçersiz.", "INVALID_PATH");
        }
        Path path = Path.of(run.getStoragePath()).normalize().toAbsolutePath();
        Path base = Path.of(uploadDir, "exports", municipalityId).normalize().toAbsolutePath();
        if (!path.startsWith(base)) {
            throw new BusinessException("Dosya yolu geçersiz.", "INVALID_PATH");
        }
    }

    @Scheduled(cron = "0 5 * * * *", zone = "Europe/Istanbul")
    public void runDueSchedules() {
        int hour = LocalDateTime.now(ZONE).getHour();
        DayOfWeek dow = LocalDateTime.now(ZONE).getDayOfWeek();
        for (ExportSchedule schedule : scheduleRepository.findByEnabledTrue()) {
            if (schedule.getHourOfDay() != hour) {
                continue;
            }
            if (schedule.getFrequency() == ExportSchedule.ExportFrequency.WEEKLY
                    && dow != DayOfWeek.MONDAY) {
                continue;
            }
            if (alreadyRanThisPeriod(schedule)) {
                continue;
            }
            try {
                executeSchedule(schedule);
            } catch (Exception e) {
                log.error("Planlı export başarısız schedule={}: {}", schedule.getId(), e.getMessage());
            }
        }
    }

    @Transactional
    public ExportRun executeSchedule(ExportSchedule schedule) throws IOException {
        String mid = schedule.getMunicipality().getId();
        ExportFilter filter = ExportFilter.forMunicipality(mid);
        ExportService.ExportScheduleFormat fmt = schedule.getFormat() == ExportSchedule.ExportFormat.PDF
                ? ExportService.ExportScheduleFormat.PDF
                : ExportService.ExportScheduleFormat.EXCEL;

        Path dir = Path.of(uploadDir, "exports", mid);
        Path file = exportService.writeExportFile(filter, fmt, dir);

        ExportRun run = ExportRun.builder()
                .schedule(schedule)
                .municipality(schedule.getMunicipality())
                .fileName(file.getFileName().toString())
                .storagePath(file.toString())
                .byteSize(Files.size(file))
                .status(ExportRun.RunStatus.SUCCESS)
                .build();
        schedule.setLastRunAt(LocalDateTime.now());
        scheduleRepository.save(schedule);
        return runRepository.save(run);
    }

    private boolean alreadyRanThisPeriod(ExportSchedule schedule) {
        if (schedule.getLastRunAt() == null) {
            return false;
        }
        LocalDateTime now = LocalDateTime.now(ZONE);
        if (schedule.getFrequency() == ExportSchedule.ExportFrequency.WEEKLY) {
            return schedule.getLastRunAt().isAfter(now.minusDays(6));
        }
        return schedule.getLastRunAt().toLocalDate().equals(now.toLocalDate());
    }

    private ExportSchedule findOwnedSchedule(String scheduleId, AppUser user) {
        ExportSchedule schedule = scheduleRepository.findById(scheduleId)
                .orElseThrow(() -> new ResourceNotFoundException("Export planı", "id", scheduleId));
        if (!user.hasRole("ROLE_SUPER_ADMIN")
                && (user.getMunicipality() == null
                || !user.getMunicipality().getId().equals(schedule.getMunicipality().getId()))) {
            throw new BusinessException("Bu plana erişim yok.", "ACCESS_DENIED");
        }
        return schedule;
    }

    private static String requireMunicipalityId(AppUser user) {
        if (user.getMunicipality() == null) {
            throw new BusinessException("Belediye kapsamı gerekli.", "MUNICIPALITY_REQUIRED");
        }
        return user.getMunicipality().getId();
    }
}
