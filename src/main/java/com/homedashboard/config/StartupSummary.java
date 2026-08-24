package com.homedashboard.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

/**
 * Logs what is and is not wired up at startup.
 *
 * <p>Both integrations are optional, and the dashboard degrades quietly when they are missing, so
 * without this line a missing environment variable is easy to mistake for a broken dashboard.
 */
@Component
public class StartupSummary {

  private static final Logger log = LoggerFactory.getLogger(StartupSummary.class);

  private final HomeAssistantProperties homeAssistant;
  private final WeatherProperties weather;

  public StartupSummary(HomeAssistantProperties homeAssistant, WeatherProperties weather) {
    this.homeAssistant = homeAssistant;
    this.weather = weather;
  }

  @EventListener(ApplicationReadyEvent.class)
  public void logConfiguration() {
    if (homeAssistant.isConfigured()) {
      log.info("Home Assistant: {}", homeAssistant.normalizedBaseUrl());
    } else {
      log.warn(
          "Home Assistant is not configured. Controls will report unavailable until"
              + " HOME_ASSISTANT_BASE_URL and HOME_ASSISTANT_TOKEN are set.");
    }

    if (weather.isConfigured()) {
      log.info("Forecast location: {}, {}", weather.getLatitude(), weather.getLongitude());
    } else {
      log.warn(
          "No forecast location configured. The weather card will stay empty until"
              + " DASHBOARD_LATITUDE and DASHBOARD_LONGITUDE are set.");
    }
  }
}
