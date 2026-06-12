package com.burak.belediyeapp.integration;

import org.junit.jupiter.api.extension.ConditionEvaluationResult;
import org.junit.jupiter.api.extension.ExecutionCondition;
import org.junit.jupiter.api.extension.ExtensionContext;
import org.testcontainers.DockerClientFactory;

public class DockerRunningCondition implements ExecutionCondition {

    @Override
    public ConditionEvaluationResult evaluateExecutionCondition(ExtensionContext context) {
        try {
            boolean dockerAvailable = DockerClientFactory.instance().isDockerAvailable();
            if (dockerAvailable) {
                return ConditionEvaluationResult.enabled("Docker is running and available.");
            }
        } catch (Throwable t) {
            // Testcontainers client initialization might fail if docker is not installed
        }
        return ConditionEvaluationResult.disabled("Docker is not running or not installed. Skipping integration test.");
    }
}
