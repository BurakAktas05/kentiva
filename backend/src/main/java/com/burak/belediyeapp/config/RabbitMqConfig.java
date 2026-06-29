package com.burak.belediyeapp.config;

import org.springframework.amqp.core.*;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.HashMap;
import java.util.Map;

@Configuration
public class RabbitMqConfig {

    public static final String REPORT_EXCHANGE = "report.exchange";
    public static final String REPORT_PROCESSING_QUEUE = "q.report-processing";
    public static final String REPORT_PROCESSING_ROUTING_KEY = "report.created";

    // Dead Letter Exchange and Queue for resilience
    public static final String REPORT_DLX = "report.dlx";
    public static final String REPORT_DLQ = "q.report-processing-dlq";
    public static final String REPORT_DLQ_ROUTING_KEY = "report.failed";

    @Bean
    public DirectExchange reportExchange() {
        return new DirectExchange(REPORT_EXCHANGE, true, false);
    }

    @Bean
    public DirectExchange reportDlx() {
        return new DirectExchange(REPORT_DLX, true, false);
    }

    @Bean
    public Queue reportProcessingQueue() {
        Map<String, Object> args = new HashMap<>();
        args.put("x-dead-letter-exchange", REPORT_DLX);
        args.put("x-dead-letter-routing-key", REPORT_DLQ_ROUTING_KEY);
        return new Queue(REPORT_PROCESSING_QUEUE, true, false, false, args);
    }

    @Bean
    public Queue reportDlq() {
        return new Queue(REPORT_DLQ, true, false, false);
    }

    @Bean
    public Binding reportProcessingBinding() {
        return BindingBuilder.bind(reportProcessingQueue())
                .to(reportExchange())
                .with(REPORT_PROCESSING_ROUTING_KEY);
    }

    @Bean
    public Binding reportDlqBinding() {
        return BindingBuilder.bind(reportDlq())
                .to(reportDlx())
                .with(REPORT_DLQ_ROUTING_KEY);
    }

    @Bean
    public Jackson2JsonMessageConverter producerJackson2MessageConverter() {
        return new Jackson2JsonMessageConverter();
    }
}
