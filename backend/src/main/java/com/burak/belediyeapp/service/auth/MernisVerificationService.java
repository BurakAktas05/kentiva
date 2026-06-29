package com.burak.belediyeapp.service.auth;

import com.burak.belediyeapp.exception.BusinessException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.Locale;

@Service
@Slf4j
public class MernisVerificationService {

    private final RestClient restClient = RestClient.create();

    @Value("${app.security.mernis.enabled:false}")
    private boolean enabled;

    public void verify(String tcNo, String firstName, String lastName, Integer birthYear) {
        if (!enabled) {
            log.info("MERNIS doğrulaması devre dışı, doğrulama atlanıyor.");
            return;
        }

        if (tcNo == null || tcNo.isBlank() || tcNo.length() != 11) {
            throw new BusinessException("Geçersiz T.C. Kimlik Numarası.", "INVALID_TC_NO");
        }
        if (firstName == null || firstName.isBlank() || lastName == null || lastName.isBlank()) {
            throw new BusinessException("Ad ve soyad boş bırakılamaz.", "INVALID_NAME");
        }
        if (birthYear == null || birthYear < 1900) {
            throw new BusinessException("Geçersiz doğum yılı.", "INVALID_BIRTH_YEAR");
        }

        String tcClean = tcNo.trim();
        String adUpper = firstName.trim().toUpperCase(new Locale("tr", "TR"));
        String soyadUpper = lastName.trim().toUpperCase(new Locale("tr", "TR"));

        String soapRequest = String.format(
                """
                <?xml version="1.0" encoding="utf-8"?>
                <soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
                  <soap:Body>
                    <TCKimlikNoDogrula xmlns="http://tckimlik.nvi.gov.tr/WS">
                      <TCKimlikNo>%s</TCKimlikNo>
                      <Ad>%s</Ad>
                      <Soyad>%s</Soyad>
                      <DogumYili>%d</DogumYili>
                    </TCKimlikNoDogrula>
                  </soap:Body>
                </soap:Envelope>
                """,
                tcClean, adUpper, soyadUpper, birthYear
        );

        try {
            String response = restClient.post()
                    .uri("https://tckimlik.nvi.gov.tr/Service/KPSPublic.asmx")
                    .contentType(MediaType.valueOf("text/xml; charset=utf-8"))
                    .header("SOAPAction", "http://tckimlik.nvi.gov.tr/WS/TCKimlikNoDogrula")
                    .body(soapRequest)
                    .retrieve()
                    .body(String.class);

            if (response == null || !response.contains("<TCKimlikNoDogrulaResult>true</TCKimlikNoDogrulaResult>")) {
                log.warn("MERNIS doğrulaması başarısız: TC={}, Ad={}, Soyad={}", tcClean, adUpper, soyadUpper);
                throw new BusinessException("T.C. Kimlik bilgileri Nüfus Müdürlüğü tarafından doğrulanamadı.", "MERNIS_VERIFICATION_FAILED");
            }
            log.info("MERNIS doğrulaması başarılı: TC={}", tcClean);
        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            log.error("MERNIS servisi ile iletişim kurulamadı (fail-soft geçiş izin verildi): {}", e.getMessage());
            // Kamu servisi kesintisinde vatandaşın kaydını tamamen engellememek için fail-soft davranalım.
        }
    }
}
