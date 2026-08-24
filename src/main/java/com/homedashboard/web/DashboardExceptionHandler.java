package com.homedashboard.web;

import com.homedashboard.service.HomeAssistantUnavailableException;
import com.homedashboard.service.WeatherUnavailableException;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/**
 * Turns adapter failures into small JSON errors.
 *
 * <p>Home Assistant being down is the normal case while the house is still being set up, so it
 * answers with a plain 503 body rather than a stack trace. {@code app.js} treats any non-OK
 * response as "no data" and keeps showing its fallbacks.
 */
@RestControllerAdvice(
    assignableTypes = {HomeAssistantProxyController.class, WeatherController.class})
public class DashboardExceptionHandler {

  @ExceptionHandler(HomeAssistantUnavailableException.class)
  public ResponseEntity<Map<String, Object>> handleHomeAssistantUnavailable(
      HomeAssistantUnavailableException ex) {
    return unavailable("home_assistant_unavailable", ex.getMessage());
  }

  @ExceptionHandler(WeatherUnavailableException.class)
  public ResponseEntity<Map<String, Object>> handleWeatherUnavailable(
      WeatherUnavailableException ex) {
    return unavailable("weather_unavailable", ex.getMessage());
  }

  private static ResponseEntity<Map<String, Object>> unavailable(String error, String message) {
    Map<String, Object> body = new LinkedHashMap<>();
    body.put("error", error);
    body.put("message", message);

    return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(body);
  }
}
