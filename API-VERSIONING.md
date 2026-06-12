# Kentiva API Versiyon Yönetimi ve Geriye Uyumluluk Rehberi

Kentiva platformunda büyük/majör değişiklikler yapılması durumunda geriye dönük uyumluluğun (backward compatibility) bozulmaması için **Header-Based Versioning (Accept Header)** stratejisi benimsenmiştir.

Bu rehber, platform geliştiricilerinin yeni versiyonlar yayınlarken izlemesi gereken adımları ve kodlama şablonlarını içermektedir.

---

## 🛡️ 1. Versiyonlama Stratejisi

- **Header Tipi:** `Accept`
- **Tasarım Şablonu:** `application/vnd.kentiva.{version}+json`
- **Mevcut Sürümler:**
  - **v1 (Varsayılan):** `Accept: application/vnd.kentiva.v1+json` veya header gönderilmeyen tüm durumlar.
  - **v2 (Gelecek Majör Sürüm):** `Accept: application/vnd.kentiva.v2+json`

### Geriye Uyumluluk (Default Fallback)
Mevcut mobil uygulama veya üçüncü taraf entegrasyonların kırılmaması için, `Accept` header'ı boş olan veya genel `application/json`, `*/*` formatında gelen tüm istekler **otomatik olarak v1 sürümüne** yönlendirilir.

---

## 💻 2. Spring Boot (Java) Uygulama Örneği

Spring Boot tarafında versiyon eşleşmesini sağlamak amacıyla `@RequestMapping` veya `@GetMapping` anotasyonlarındaki `produces` parametresi kullanılır.

Aşağıda bir endpoint'in v1 ve v2 sürümleri için nasıl ayrıştırılacağı gösterilmiştir:

```java
package com.burak.belediyeapp.controller;

import com.burak.belediyeapp.dto.response.common.ApiResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/reports")
public class ReportVersionedExampleController {

    // V1: Varsayılan Sürüm (Herhangi bir Accept veya v1 Accept header'ı için)
    @GetMapping(
            value = "/{reportId}",
            produces = {"application/json", "application/vnd.kentiva.v1+json"}
    )
    public ResponseEntity<ApiResponse<ReportResponseV1>> getReportByIdV1(
            @PathVariable String reportId) {
        
        ReportResponseV1 data = ...; // Eski veri şeması
        return ResponseEntity.ok(ApiResponse.success(data));
    }

    // V2: Yeni Sürüm (Sadece Accept: application/vnd.kentiva.v2+json için)
    @GetMapping(
            value = "/{reportId}",
            produces = "application/vnd.kentiva.v2+json"
    )
    public ResponseEntity<ApiResponse<ReportResponseV2>> getReportByIdV2(
            @PathVariable String reportId) {
        
        ReportResponseV2 data = ...; // Yeni eklenen/düzenlenen veri şeması
        return ResponseEntity.ok(ApiResponse.success(data));
    }
}
```

---

## 📡 3. İstemci (Client) İstek Örnekleri

### V1 Sürümü İstekleri (Mevcut Davranış)
Header belirtilmediğinde veya aşağıdaki gibi gönderildiğinde:

```http
GET /api/v1/reports/123-abc HTTP/1.1
Host: api.kentiva.app
Accept: application/json
```

**Yanıt:** V1 şeması döner.

---

### V2 Sürümü İstekleri (Yeni Davranış)
Yeni özellikleri kullanmak isteyen güncel istemciler isteği şu şekilde gönderir:

```http
GET /api/v1/reports/123-abc HTTP/1.1
Host: api.kentiva.app
Accept: application/vnd.kentiva.v2+json
```

**Yanıt:** V2 şeması döner.
