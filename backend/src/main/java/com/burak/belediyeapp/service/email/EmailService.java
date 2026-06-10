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
        try {
            MimeMessage message = mailSender.createMimeMessage();
            // Use true flag to indicate multipart message (needed for attachments)
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(text);

            if (attachment != null && attachment.exists()) {
                FileSystemResource fileResource = new FileSystemResource(attachment);
                helper.addAttachment(attachment.getName(), fileResource);
            }

            mailSender.send(message);
            log.info("Email successfully sent to {}", to);
        } catch (MessagingException e) {
            log.error("Failed to send email with attachment to {}: {}", to, e.getMessage(), e);
            throw new RuntimeException("E-posta gönderimi başarısız: " + e.getMessage(), e);
        }
    }
}
