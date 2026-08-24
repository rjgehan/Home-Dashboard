package com.homedashboard.config;

import java.time.Duration;
import java.util.List;
import java.util.Locale;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Home Assistant connection settings.
 *
 * <p>Bound from {@code home-assistant.*} in {@code application.yml}, which in turn reads the
 * {@code HOME_ASSISTANT_BASE_URL} and {@code HOME_ASSISTANT_TOKEN} environment variables. These
 * values are secrets and must never be copied into the browser-side {@code config.js}.
 */
@ConfigurationProperties(prefix = "home-assistant")
public class HomeAssistantProperties {

  /** Base URL of the Home Assistant instance, for example {@code http://homeassistant.local:8123}. */
  private String baseUrl = "";

  /** Long-lived access token used for the {@code Authorization: Bearer} header. */
  private String token = "";

  /** How long to wait for a connection to Home Assistant. */
  private Duration connectTimeout = Duration.ofSeconds(3);

  /** How long to wait for a Home Assistant response once connected. */
  private Duration readTimeout = Duration.ofSeconds(8);

  /**
   * Service domains the dashboard is allowed to call through the adapter. Anything outside this
   * list is rejected before it reaches Home Assistant, so a stray page on the tablet cannot drive
   * the whole house. Add a domain here when the dashboard grows a new control.
   */
  private List<String> allowedServiceDomains =
      List.of(
          "automation",
          "button",
          "climate",
          "cover",
          "fan",
          "input_boolean",
          "light",
          "media_player",
          "scene",
          "script",
          "switch");

  public String getBaseUrl() {
    return baseUrl;
  }

  public void setBaseUrl(String baseUrl) {
    this.baseUrl = baseUrl;
  }

  public String getToken() {
    return token;
  }

  public void setToken(String token) {
    this.token = token;
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

  public List<String> getAllowedServiceDomains() {
    return allowedServiceDomains;
  }

  public void setAllowedServiceDomains(List<String> allowedServiceDomains) {
    this.allowedServiceDomains = allowedServiceDomains;
  }

  /** True when {@code domain} may be used in a service call. */
  public boolean allowsServiceDomain(String domain) {
    if (domain == null || allowedServiceDomains == null) {
      return false;
    }
    return allowedServiceDomains.contains(domain.toLowerCase(Locale.ROOT));
  }

  /** True when both a base URL and a token are configured. */
  public boolean isConfigured() {
    return hasText(baseUrl) && hasText(token);
  }

  /** Base URL without a trailing slash, so paths can be appended directly. */
  public String normalizedBaseUrl() {
    String trimmed = baseUrl == null ? "" : baseUrl.trim();
    while (trimmed.endsWith("/")) {
      trimmed = trimmed.substring(0, trimmed.length() - 1);
    }
    return trimmed;
  }

  private static boolean hasText(String value) {
    return value != null && !value.isBlank();
  }
}
