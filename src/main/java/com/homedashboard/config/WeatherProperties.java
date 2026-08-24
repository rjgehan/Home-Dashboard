package com.homedashboard.config;

import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Where the house is, for the forecast.
 *
 * <p>Bound from {@code dashboard.weather.*}, which reads the {@code DASHBOARD_LATITUDE},
 * {@code DASHBOARD_LONGITUDE} and {@code DASHBOARD_TIMEZONE} environment variables. The
 * coordinates stay on the server: Spring calls Open-Meteo, so the house location is never sent to
 * the browser and never lands in the repository.
 */
@ConfigurationProperties(prefix = "dashboard.weather")
public class WeatherProperties {

  /** Latitude of the house. Null until configured, which disables the forecast. */
  private Double latitude;

  /** Longitude of the house. Null until configured, which disables the forecast. */
  private Double longitude;

  /** IANA time zone name, or {@code auto} to let Open-Meteo infer it from the coordinates. */
  private String timezone = "auto";

  /** Number of days in the weekly forecast. */
  private int forecastDays = 7;

  /** Open-Meteo forecast endpoint. Overridable so tests can point at a stub. */
  private String apiUrl = "https://api.open-meteo.com/v1/forecast";

  private Duration connectTimeout = Duration.ofSeconds(3);

  private Duration readTimeout = Duration.ofSeconds(8);

  public Double getLatitude() {
    return latitude;
  }

  public void setLatitude(Double latitude) {
    this.latitude = latitude;
  }

  public Double getLongitude() {
    return longitude;
  }

  public void setLongitude(Double longitude) {
    this.longitude = longitude;
  }

  public String getTimezone() {
    return timezone;
  }

  public void setTimezone(String timezone) {
    this.timezone = timezone;
  }

  public int getForecastDays() {
    return forecastDays;
  }

  public void setForecastDays(int forecastDays) {
    this.forecastDays = forecastDays;
  }

  public String getApiUrl() {
    return apiUrl;
  }

  public void setApiUrl(String apiUrl) {
    this.apiUrl = apiUrl;
  }

  public Duration getConnectTimeout() {
    return connectTimeout;
  }

  public void setConnectTimeout(Duration connectTimeout) {
    this.connectTimeout = connectTimeout;
  }

  public Duration getReadTimeout() {
    return readTimeout;
  }

  public void setReadTimeout(Duration readTimeout) {
    this.readTimeout = readTimeout;
  }

  /** True once a location has been set. */
  public boolean isConfigured() {
    return latitude != null && longitude != null;
  }
}
