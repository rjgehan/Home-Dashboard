package com.homedashboard.web;

import com.homedashboard.service.WeatherClient;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Serves the forecast the dashboard header and weather dialog read.
 *
 * <p>{@code config.js} points {@code weatherApiUrl} here rather than at Open-Meteo directly, so the
 * house coordinates stay in server configuration.
 */
@RestController
@RequestMapping("/api/dashboard")
public class WeatherController {

  private final WeatherClient weatherClient;

  public WeatherController(WeatherClient weatherClient) {
    this.weatherClient = weatherClient;
  }

  @GetMapping("/weather")
  public ResponseEntity<String> weather() {
    ResponseEntity<String> upstream = weatherClient.forecast();

    return ResponseEntity.status(upstream.getStatusCode())
        .contentType(MediaType.APPLICATION_JSON)
        // The dashboard refreshes every ten minutes; a short cache absorbs reloads on the tablet.
        .cacheControl(CacheControl.maxAge(java.time.Duration.ofMinutes(5)))
        .body(upstream.getBody() == null ? "null" : upstream.getBody());
  }
}
