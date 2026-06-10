package com.burak.belediyeapp.config;

import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class RedisUrlNormalizerTest {

    @Test
    void parsesRedisUrl() {
        Map<String, Object> props = RedisUrlNormalizer.normalizeFromRedisUrl(
                "redis://default:secret@redis.internal:6379");

        assertThat(props.get("spring.data.redis.host")).isEqualTo("redis.internal");
        assertThat(props.get("spring.data.redis.port")).isEqualTo(6379);
        assertThat(props.get("spring.data.redis.password")).isEqualTo("secret");
    }
}
