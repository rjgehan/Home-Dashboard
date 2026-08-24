package com.homedashboard.service;

import com.homedashboard.config.HomeAssistantProperties;
import java.net.URI;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.BufferingClientHttpRequestFactory;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.UriComponentsBuilder;

/**
 * Thin adapter over the Home Assistant REST API.
 *
 * <p>Responses are passed through as raw JSON. The dashboard already knows the Home Assistant
 * payload shapes, so there is nothing to gain by mapping them into Java types here.
 */
@Service
public class HomeAssistantClient {

  private static final Logger log = LoggerFactory.getLogger(HomeAssistantClient.class);

  private final HomeAssistantProperties properties;
  private final RestClient restClient;

  public HomeAssistantClient(HomeAssistantProperties properties) {
    this.properties = properties;

    SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
    requestFactory.setConnectTimeout((int) properties.getConnectTimeout().toMillis());
    requestFactory.setReadTimeout((int) properties.getReadTimeout().toMillis());

    this.restClient =
        RestClient.builder()
            // Buffering keeps service-call bodies small and length-delimited instead of chunked,
            // which is what Home Assistant expects for its short JSON service payloads.
            .requestFactory(new BufferingClientHttpRequestFactory(requestFactory))
            // Home Assistant errors (404 for an unknown entity, 401 for a bad token) are forwarded
            // to the browser as-is instead of becoming exceptions here.
            .defaultStatusHandler(HttpStatusCode::isError, (request, response) -> {})
            .build();
  }

  public boolean isConfigured() {
    return properties.isConfigured();
  }

  public String baseUrl() {
    return properties.normalizedBaseUrl();
  }

  /** Forwards a GET to {@code {baseUrl}/api/{path}}. */
  public ResponseEntity<String> get(String path, MultiValueMap<String, String> query) {
    URI uri = buildUri(path, query);

    try {
      return restClient
          .get()
          .uri(uri)
          .header(HttpHeaders.AUTHORIZATION, "Bearer " + properties.getToken())
          .accept(MediaType.APPLICATION_JSON)
          .retrieve()
          .toEntity(String.class);
    } catch (ResourceAccessException ex) {
      throw unreachable(uri, ex);
    }
  }

  /** Forwards a POST to {@code {baseUrl}/api/{path}} with a JSON body. */
  public ResponseEntity<String> post(String path, Map<String, Object> body) {
    URI uri = buildUri(path, null);

    try {
      return restClient
          .post()
          .uri(uri)
          .header(HttpHeaders.AUTHORIZATION, "Bearer " + properties.getToken())
          .contentType(MediaType.APPLICATION_JSON)
          .accept(MediaType.APPLICATION_JSON)
          .body(body == null ? Map.of() : body)
          .retrieve()
          .toEntity(String.class);
    } catch (ResourceAccessException ex) {
      throw unreachable(uri, ex);
    }
  }

  private URI buildUri(String path, MultiValueMap<String, String> query) {
    if (!properties.isConfigured()) {
      throw new HomeAssistantUnavailableException(
          "Home Assistant is not configured. Set HOME_ASSISTANT_BASE_URL and HOME_ASSISTANT_TOKEN.");
    }

    UriComponentsBuilder builder =
        UriComponentsBuilder.fromUriString(properties.normalizedBaseUrl())
            .path("/api/")
            .path(path.startsWith("/") ? path.substring(1) : path);

    if (query != null && !query.isEmpty()) {
      builder.queryParams(query);
    }

    return builder.build().encode().toUri();
  }

  private HomeAssistantUnavailableException unreachable(URI uri, Exception cause) {
    log.warn("Home Assistant is unreachable at {}: {}", uri, cause.getMessage());
    return new HomeAssistantUnavailableException(
        "Home Assistant is unreachable at " + properties.normalizedBaseUrl(), cause);
  }
}
