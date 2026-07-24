package com.burak.belediyeapp.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.AsyncConfigurer;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.lang.reflect.Method;
import java.util.concurrent.Executor;
import java.util.concurrent.ThreadPoolExecutor;

/**
 * Bounded asynchronous execution with explicit backpressure. CallerRunsPolicy
 * slows producers under saturation instead of silently dropping notifications
 * or post-commit report processing tasks.
 */
@Configuration
@Slf4j
public class AsyncExecutionConfig implements AsyncConfigurer {

    @Value("${spring.task.execution.pool.core-size:6}")
    private int corePoolSize;

    @Value("${spring.task.execution.pool.max-size:16}")
    private int maxPoolSize;

    @Value("${spring.task.execution.pool.queue-capacity:5000}")
    private int queueCapacity;

    @Override
    public Executor getAsyncExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setThreadNamePrefix("kentiva-async-");
        executor.setCorePoolSize(corePoolSize);
        executor.setMaxPoolSize(maxPoolSize);
        executor.setQueueCapacity(queueCapacity);
        executor.setWaitForTasksToCompleteOnShutdown(true);
        executor.setAwaitTerminationSeconds(30);
        executor.setRejectedExecutionHandler(new ThreadPoolExecutor.CallerRunsPolicy());
        executor.initialize();
        return executor;
    }

    @Override
    public org.springframework.aop.interceptor.AsyncUncaughtExceptionHandler getAsyncUncaughtExceptionHandler() {
        return (Throwable throwable, Method method, Object... params) ->
                log.error("Async görev başarısız: method={}, error={}",
                        method.getName(), throwable.getMessage(), throwable);
    }
}
