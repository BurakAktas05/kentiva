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
import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
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
        String municipalityId = requireMunicipalityId(user);
        return scheduleRepository.findByMunicipalityIdOrderByCreatedAtDesc(municipalityId);
    }

    public LocalDateTime calculateNextRunAt(ExportSchedule schedule) {
        if (schedule == null || !schedule.isEnabled()) {
            return null;
        }

        LocalDateTime now = LocalDateTime.now(ZONE);
        LocalDateTime next = now
                .withHour(schedule.getHourOfDay())
                .withMinute(0)
                .withSecond(0)
                .withNano(0);

        if (!next.isAfter(now)) {
            next = next.plusDays(1);
        }

        if (schedule.getFrequency() == ExportSchedule.ExportFrequency.WEEKLY) {
            while (next.getDayOfWeek() != DayOfWeek.MONDAY) {
                next = next.plusDays(1);
            }
        }

        return next;
    }

    @Transactional
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN','ROLE_SUPER_ADMIN')")
    public ExportSchedule createSchedule(
            AppUser user,
            ExportSchedule.ExportFormat format,
            ExportSchedule.ExportFrequency frequency,
            int hourOfDay) {
        String municipalityId = requireMunicipalityId(user);
        Municipality municipality = municipalityRepository.findById(municipalityId)
                .orElseThrow(() -> new ResourceNotFoundException("Belediye", "id", municipalityId));

        if (hourOfDay < 0 || hourOfDay > 23) {
            throw new BusinessException("Saat 0-23 arasinda olmalidir.", "INVALID_HOUR");
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

    @Transactional
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN','ROLE_SUPER_ADMIN')")
    public ExportRun runNow(String scheduleId, AppUser user) throws IOException {
        ExportSchedule schedule = findOwnedSchedule(scheduleId, user);
        try {
            return executeSchedule(schedule);
        } catch (IOException e) {
            recordFailedRun(schedule, e);
            throw e;
        } catch (RuntimeException e) {
            recordFailedRun(schedule, e);
            throw e;
        }
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

    public void validateRunStoragePath(ExportRun run, String municipalityId) {
        if (run.getStoragePath() == null || run.getStoragePath().isBlank()) {
            throw new BusinessException("Dosya yolu gecersiz.", "INVALID_PATH");
        }
        Path path = Path.of(run.getStoragePath()).normalize().toAbsolutePath();
        Path base = Path.of(uploadDir, "exports", municipalityId).normalize().toAbsolutePath();
        if (!path.startsWith(base)) {
            throw new BusinessException("Dosya yolu gecersiz.", "INVALID_PATH");
        }
    }

    @Scheduled(cron = "0 5 * * * *", zone = "Europe/Istanbul")
    @SchedulerLock(name = "ScheduledExportService_runDueSchedules", lockAtMostFor = "10m", lockAtLeastFor = "1m")
    public void runDueSchedules() {
        int hour = LocalDateTime.now(ZONE).getHour();
        DayOfWeek dayOfWeek = LocalDateTime.now(ZONE).getDayOfWeek();

        for (ExportSchedule schedule : scheduleRepository.findByEnabledTrue()) {
            if (schedule.getHourOfDay() != hour) {
                continue;
            }
            if (schedule.getFrequency() == ExportSchedule.ExportFrequency.WEEKLY
                    && dayOfWeek != DayOfWeek.MONDAY) {
                continue;
            }
            if (alreadyRanThisPeriod(schedule)) {
                continue;
            }

            try {
                executeSchedule(schedule);
            } catch (Exception e) {
                recordFailedRun(schedule, e);
                log.error("Planned export failed schedule={}: {}", schedule.getId(), e.getMessage());
            }
        }
    }

    @Transactional
    public ExportRun executeSchedule(ExportSchedule schedule) throws IOException {
        String municipalityId = schedule.getMunicipality().getId();
        ExportFilter filter = ExportFilter.forMunicipality(municipalityId);
        ExportService.ExportScheduleFormat format =
                schedule.getFormat() == ExportSchedule.ExportFormat.PDF
                        ? ExportService.ExportScheduleFormat.PDF
                        : ExportService.ExportScheduleFormat.EXCEL;

        Path dir = Path.of(uploadDir, "exports", municipalityId);
        Path file = exportService.writeExportFile(filter, format, dir);

        ExportRun run = ExportRun.builder()
                .schedule(schedule)
                .municipality(schedule.getMunicipality())
                .fileName(file.getFileName().toString())
                .storagePath(file.toString())
                .byteSize(Files.size(file))
                .status(ExportRun.RunStatus.SUCCESS)
                .build();

        schedule.setLastRunAt(LocalDateTime.now(ZONE));
        scheduleRepository.save(schedule);
        return runRepository.save(run);
    }

    @Transactional
    public void recordFailedRun(ExportSchedule schedule, Exception e) {
        String failedFileName = schedule.getFormat() == ExportSchedule.ExportFormat.PDF
                ? "kentiva-export-failed.pdf"
                : "kentiva-export-failed.xlsx";

        runRepository.save(ExportRun.builder()
                .schedule(schedule)
                .municipality(schedule.getMunicipality())
                .fileName(failedFileName)
                .storagePath(Path.of(uploadDir, "exports", schedule.getMunicipality().getId(), "failed").toString())
                .byteSize(0)
                .status(ExportRun.RunStatus.FAILED)
                .errorMessage(e.getMessage())
                .build());
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
                .orElseThrow(() -> new ResourceNotFoundException("Export plani", "id", scheduleId));
        if (!user.hasRole("ROLE_SUPER_ADMIN")
                && (user.getMunicipality() == null
                || !user.getMunicipality().getId().equals(schedule.getMunicipality().getId()))) {
            throw new BusinessException("Bu plana erisim yok.", "ACCESS_DENIED");
        }
        return schedule;
    }

    private static String requireMunicipalityId(AppUser user) {
        if (user.getMunicipality() == null) {
            throw new BusinessException("Belediye kapsami gerekli.", "MUNICIPALITY_REQUIRED");
        }
        return user.getMunicipality().getId();
    }
}
