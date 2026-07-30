package com.burak.belediyeapp.service.email;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.FileSystemResource;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.io.File;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    private final JavaMailSender mailSender;

    public void sendEmailWithAttachment(String to, String subject, String text, File attachment) {
        sendHtmlEmailWithAttachment(to, subject, text, false, attachment);
    }

    public void sendHtmlEmail(String to, String subject, String htmlContent) {
        sendHtmlEmailWithAttachment(to, subject, htmlContent, true, null);
    }

    public void sendHtmlEmailWithAttachment(String to, String subject, String content, boolean isHtml, File attachment) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            boolean isMultipart = attachment != null && attachment.exists();
            MimeMessageHelper helper = new MimeMessageHelper(message, isMultipart, "UTF-8");

            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(content, isHtml);

            if (isMultipart) {
                FileSystemResource fileResource = new FileSystemResource(attachment);
                helper.addAttachment(attachment.getName(), fileResource);
            }

            mailSender.send(message);
            log.info("Email ({}) successfully sent to {}", isHtml ? "HTML" : "TEXT", to);
        } catch (MessagingException e) {
            log.error("Failed to send email to {}: {}", to, e.getMessage(), e);
            throw new RuntimeException("E-posta gönderimi başarısız: " + e.getMessage(), e);
        }
    }
}
