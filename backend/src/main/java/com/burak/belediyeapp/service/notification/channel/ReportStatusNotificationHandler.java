package com.burak.belediyeapp.service.notification.channel;

import com.burak.belediyeapp.entity.AppUser;
import com.burak.belediyeapp.entity.Report;
import com.burak.belediyeapp.entity.ReportStatus;

/**
 * Rapor durumu değişiminde tek bir bildirim kanalı stratejisi (SRP).
 */
public interface ReportStatusNotificationHandler {

    boolean supports(ReportStatus status);

    void deliver(AppUser reporter, Report report, String staffNote);
}
