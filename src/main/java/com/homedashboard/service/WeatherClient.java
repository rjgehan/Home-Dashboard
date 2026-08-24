package com.homedashboard.service;

import com.homedashboard.config.WeatherProperties;
import java.net.URI;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.UriComponentsBuilder;

/**
 * Fetches the forecast from Open-Meteo on the server's behalf.
 *
 * <p>The dashboard used to call Open-Meteo straight from the browser, which meant the house
 * coordinates lived in {@code config.js}. Asking Spring for the forecast keeps them in server
 * configuration instead. The response is passed through unchanged, so {@code app.js} still reads
 * the same Open-Meteo payload it always did.
 */
@Service
public class WeatherClient {

  private static final Logger log = LoggerFactory.getLogger(WeatherClient.class);

  private static final String CURRENT_FIELDS =
      "temperature_2m,apparent_temperature,weather_code,wind_speed_10m,precipitation";

  private static final String DAILY_FIELDS =
      "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,uv_index_max";

  private final WeatherProperties properties;
  private final RestClient restClient;

  public WeatherClient(WeatherProperties properties) {
    this.properties = properties;

    SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
    requestFactory.setConnectTimeout((int) properties.getConnectTimeout().toMillis());
    requestFactory.setReadTimeout((int) properties.getReadTimeout().toMillis());

    this.restClient =
        RestClient.builder()
            .requestFactory(requestFactory)
            .defaultStatusHandler(HttpStatusCode::isError, (request, response) -> {})
            .build();
  }

  public boolean isConfigured() {
    return properties.isConfigured();
  }

  /** Returns the raw Open-Meteo forecast JSON for the configured location. */
  public ResponseEntity<String> forecast() {
    if (!properties.isConfigured()) {
      throw new WeatherUnavailableException(
          "No forecast location configured. Set DASHBOARD_LATITUDE and DASHBOARD_LONGITUDE.");
    }

    URI uri =
        UriComponentsBuilder.fromUriString(properties.getApiUrl())
            .queryParam("latitude", properties.getLatitude())
            .queryParam("longitude", properties.getLongitude())
            .queryParam("timezone", properties.getTimezone())
            .queryParam("temperature_unit", "fahrenheit")
            .queryParam("wind_speed_unit", "mph")
            .queryParam("precipitation_unit", "inch")
            .queryParam("current", CURRENT_FIELDS)
            .queryParam("daily", DAILY_FIELDS)
            .queryParam("forecast_days", properties.getForecastDays())
            .build()
            .encode()
            .toUri();

    try {
      return restClient.get().uri(uri).accept(MediaType.APPLICATION_JSON).retrieve().toEntity(String.class);
    } catch (ResourceAccessException ex) {
      log.warn("Open-Meteo is unreachable: {}", ex.getMessage());
      throw new WeatherUnavailableException("The weather service is unreachable", ex);
    }
  }
}
