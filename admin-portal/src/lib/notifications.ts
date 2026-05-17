import type { BrandingFormValues } from './branding';

export type NotificationTemplateKind =
  | 'SMS_RESOLVED'
  | 'SMS_PROCESSING'
  | 'SMS_ASSIGNED'
  | 'PUSH_REJECTED_TITLE'
  | 'PUSH_REJECTED_BODY'
  | 'PUSH_PROCESSING_TITLE'
  | 'PUSH_PROCESSING_BODY'
  | 'PUSH_ASSIGNED_TITLE'
  | 'PUSH_ASSIGNED_BODY';

export type NotificationFormValues = Pick<
  BrandingFormValues,
  | 'smsSenderHeader'
  | 'smsResolvedTemplate'
  | 'smsProcessingTemplate'
  | 'smsAssignedTemplate'
  | 'pushRejectedTitleTemplate'
  | 'pushRejectedBodyTemplate'
  | 'pushProcessingTitleTemplate'
  | 'pushProcessingBodyTemplate'
  | 'pushAssignedTitleTemplate'
  | 'pushAssignedBodyTemplate'
>;

export function notificationFieldsFromBranding(f: BrandingFormValues): NotificationFormValues {
  return {
    smsSenderHeader: f.smsSenderHeader,
    smsResolvedTemplate: f.smsResolvedTemplate,
    smsProcessingTemplate: f.smsProcessingTemplate,
    smsAssignedTemplate: f.smsAssignedTemplate,
    pushRejectedTitleTemplate: f.pushRejectedTitleTemplate,
    pushRejectedBodyTemplate: f.pushRejectedBodyTemplate,
    pushProcessingTitleTemplate: f.pushProcessingTitleTemplate,
    pushProcessingBodyTemplate: f.pushProcessingBodyTemplate,
    pushAssignedTitleTemplate: f.pushAssignedTitleTemplate,
    pushAssignedBodyTemplate: f.pushAssignedBodyTemplate,
  };
}

export function patchPayloadFromNotifications(n: NotificationFormValues) {
  return {
    smsSenderHeader: n.smsSenderHeader.trim() || null,
    smsResolvedTemplate: n.smsResolvedTemplate.trim() || null,
    smsProcessingTemplate: n.smsProcessingTemplate.trim() || null,
    smsAssignedTemplate: n.smsAssignedTemplate.trim() || null,
    pushRejectedTitleTemplate: n.pushRejectedTitleTemplate.trim() || null,
    pushRejectedBodyTemplate: n.pushRejectedBodyTemplate.trim() || null,
    pushProcessingTitleTemplate: n.pushProcessingTitleTemplate.trim() || null,
    pushProcessingBodyTemplate: n.pushProcessingBodyTemplate.trim() || null,
    pushAssignedTitleTemplate: n.pushAssignedTitleTemplate.trim() || null,
    pushAssignedBodyTemplate: n.pushAssignedBodyTemplate.trim() || null,
  };
}
