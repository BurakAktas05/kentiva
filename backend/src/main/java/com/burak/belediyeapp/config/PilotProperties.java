package com.burak.belediyeapp.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "app.pilot")
public class PilotProperties {

    private int trialDays = 90;

    public int getTrialDays() {
        return trialDays;
    }

    public void setTrialDays(int trialDays) {
        this.trialDays = trialDays;
    }

    public int effectiveTrialDays() {
        return Math.max(1, trialDays);
    }
}
