package com.burak.belediyeapp.dto.response.common;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Getter;

import java.time.LocalDateTime;

/**
 * Tüm API yanıtları için standart sarmalayıcı.
 * Her endpoint bu formatı döner — istemci tarafında tutarlı işleme sağlar.
 *
 * Başarılı: { success: true, message: "...", data: {...} }
 * Hatalı:   { success: false, message: "...", errorCode: "...", errors: {...} }
 */
@Getter
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ApiResponse<T> {

    private final boolean success;
    private final String message;
    private final T data;
    private final String errorCode;
    private final Object errors;
    private final LocalDateTime timestamp;

    private ApiResponse(boolean success, String message, T data, String errorCode, Object errors) {
        this.success = success;
        this.message = message;
        this.data = data;
        this.errorCode = errorCode;
        this.errors = errors;
        this.timestamp = LocalDateTime.now();
    }

    // ===================================================
    // Factory Methods
    // ===================================================

    public static <T> ApiResponse<T> success(T data) {
        return new ApiResponse<>(true, "İşlem başarılı", data, null, null);
    }

    public static <T> ApiResponse<T> success(String message, T data) {
        return new ApiResponse<>(true, message, data, null, null);
    }

    public static <T> ApiResponse<T> error(String message, String errorCode) {
        return new ApiResponse<>(false, message, null, errorCode, null);
    }

    public static <T> ApiResponse<T> error(String message, String errorCode, Object errors) {
        return new ApiResponse<>(false, message, null, errorCode, errors);
    }
}
