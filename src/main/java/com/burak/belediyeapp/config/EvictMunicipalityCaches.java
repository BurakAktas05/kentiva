package com.burak.belediyeapp.config;

import org.springframework.cache.annotation.CacheEvict;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Belediye verisi güncellendiğinde public/admin önbelleklerini temizler.
 */
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
@CacheEvict(value = {CacheNames.PUBLIC_MUNICIPALITIES, CacheNames.MUNICIPALITIES}, allEntries = true)
public @interface EvictMunicipalityCaches {
}
