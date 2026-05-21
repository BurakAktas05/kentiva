package com.burak.belediyeapp.service.template;

import com.burak.belediyeapp.dto.request.template.CreateReportTemplateRequest;
import com.burak.belediyeapp.dto.request.template.UpdateReportTemplateRequest;
import com.burak.belediyeapp.dto.response.template.ReportTemplateResponse;
import com.burak.belediyeapp.entity.AppUser;
import com.burak.belediyeapp.entity.Municipality;
import com.burak.belediyeapp.entity.ReportCategory;
import com.burak.belediyeapp.entity.ReportTemplate;
import com.burak.belediyeapp.exception.BusinessException;
import com.burak.belediyeapp.exception.ResourceNotFoundException;
import com.burak.belediyeapp.repository.IMunicipalityRepository;
import com.burak.belediyeapp.repository.IReportCategoryRepository;
import com.burak.belediyeapp.repository.IReportTemplateRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class ReportTemplateService {

    private final IReportTemplateRepository templateRepository;
    private final IReportCategoryRepository categoryRepository;
    private final IMunicipalityRepository municipalityRepository;

    @Transactional(readOnly = true)
    public List<ReportTemplateResponse> listForCitizen(String municipalityId) {
        return mergeTemplates(templateRepository.findActiveForMunicipality(municipalityId));
    }

    @Transactional(readOnly = true)
    public List<ReportTemplateResponse> listForCitizen(String municipalityId, String departmentId) {
        return mergeTemplates(templateRepository.findActiveForCitizenScope(
                municipalityId,
                departmentId != null && !departmentId.isBlank() ? departmentId.trim() : null));
    }

    @Transactional(readOnly = true)
    public List<ReportTemplateResponse> listForAdmin(AppUser user) {
        if (user.hasRole("ROLE_SUPER_ADMIN")) {
            List<ReportTemplateResponse> globals = templateRepository.findAllGlobal().stream()
                    .map(ReportTemplateResponse::from)
                    .toList();
            return new ArrayList<>(globals);
        }
        String mid = requireMunicipalityId(user);
        return templateRepository.findByMunicipalityIdOrderBySortOrderAscTitleAsc(mid).stream()
                .map(ReportTemplateResponse::from)
                .toList();
    }

    @Transactional
    public ReportTemplateResponse create(CreateReportTemplateRequest request, AppUser user) {
        boolean asGlobal = Boolean.TRUE.equals(request.global()) && user.hasRole("ROLE_SUPER_ADMIN");
        Municipality municipality = null;
        if (!asGlobal) {
            String mid = requireMunicipalityId(user);
            municipality = municipalityRepository.findById(mid)
                    .orElseThrow(() -> new ResourceNotFoundException("Belediye", "id", mid));
            if (templateRepository.existsByMunicipalityIdAndTemplateKey(mid, request.templateKey())) {
                throw new BusinessException("Bu anahtarla şablon zaten var: " + request.templateKey(), "TEMPLATE_KEY_EXISTS");
            }
        } else if (templateRepository.existsByMunicipalityIsNullAndTemplateKey(request.templateKey())) {
            throw new BusinessException("Global şablon anahtarı zaten mevcut: " + request.templateKey(), "TEMPLATE_KEY_EXISTS");
        }

        ReportCategory category = resolveCategory(request.categoryId());
        ReportTemplate template = ReportTemplate.builder()
                .municipality(municipality)
                .templateKey(request.templateKey().trim())
                .title(request.title().trim())
                .descriptionTemplate(request.descriptionTemplate().trim())
                .category(category)
                .iconCode(request.iconCode())
                .sortOrder(request.sortOrder() != null ? request.sortOrder() : 0)
                .active(true)
                .build();
        return ReportTemplateResponse.from(templateRepository.save(template));
    }

    @Transactional
    public ReportTemplateResponse update(String templateId, UpdateReportTemplateRequest request, AppUser user) {
        ReportTemplate template = findManaged(templateId, user);
        if (request.title() != null && !request.title().isBlank()) {
            template.setTitle(request.title().trim());
        }
        if (request.descriptionTemplate() != null && !request.descriptionTemplate().isBlank()) {
            template.setDescriptionTemplate(request.descriptionTemplate().trim());
        }
        if (request.categoryId() != null && !request.categoryId().isBlank()) {
            template.setCategory(resolveCategory(request.categoryId()));
        }
        if (request.iconCode() != null) {
            template.setIconCode(request.iconCode().isBlank() ? null : request.iconCode());
        }
        if (request.sortOrder() != null) {
            template.setSortOrder(request.sortOrder());
        }
        if (request.active() != null) {
            template.setActive(request.active());
        }
        return ReportTemplateResponse.from(templateRepository.save(template));
    }

    @Transactional
    public void delete(String templateId, AppUser user) {
        ReportTemplate template = findManaged(templateId, user);
        template.setActive(false);
        templateRepository.save(template);
    }

    static List<ReportTemplateResponse> mergeTemplates(List<ReportTemplate> rows) {
        Map<String, ReportTemplate> byKey = new LinkedHashMap<>();
        for (ReportTemplate row : rows) {
            String key = row.getTemplateKey();
            if (row.getMunicipality() != null) {
                byKey.put(key, row);
            } else if (!byKey.containsKey(key)) {
                byKey.put(key, row);
            }
        }
        return byKey.values().stream()
                .sorted((a, b) -> {
                    int cmp = Integer.compare(a.getSortOrder(), b.getSortOrder());
                    return cmp != 0 ? cmp : a.getTitle().compareToIgnoreCase(b.getTitle());
                })
                .map(ReportTemplateResponse::from)
                .toList();
    }

    private ReportTemplate findManaged(String templateId, AppUser user) {
        ReportTemplate template = templateRepository.findById(templateId)
                .orElseThrow(() -> new ResourceNotFoundException("Şablon", "id", templateId));
        if (template.getMunicipality() == null) {
            if (!user.hasRole("ROLE_SUPER_ADMIN")) {
                throw new BusinessException("Global şablonları yalnızca süper admin düzenleyebilir", "GLOBAL_TEMPLATE_RESTRICTED");
            }
            return template;
        }
        if (!user.hasRole("ROLE_SUPER_ADMIN")) {
            String mid = requireMunicipalityId(user);
            if (!template.getMunicipality().getId().equals(mid)) {
                throw new BusinessException("Bu şablona erişim yok", "ACCESS_DENIED");
            }
        }
        return template;
    }

    private ReportCategory resolveCategory(String categoryId) {
        return categoryRepository.findById(categoryId)
                .orElseThrow(() -> new ResourceNotFoundException("Kategori", "id", categoryId));
    }

    private static String requireMunicipalityId(AppUser user) {
        if (user.getMunicipality() == null) {
            throw new BusinessException("Belediye kapsamı gerekli.", "MUNICIPALITY_REQUIRED");
        }
        return user.getMunicipality().getId();
    }
}
