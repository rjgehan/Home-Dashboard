package com.homedashboard.web;

import com.homedashboard.config.HomeAssistantProperties;
import com.homedashboard.service.HomeAssistantClient;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.regex.Pattern;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

/**
 * Same-origin adapter the dashboard talks to instead of calling Home Assistant directly.
 *
 * <p>The browser config sets {@code apiBaseUrl} to {@code /api/dashboard/home-assistant} and
 * {@code app.js} strips the leading {@code /api/} from Home Assistant style paths, so the routes
 * here mirror the Home Assistant REST API one level down:
 *
 * <ul>
 *   <li>{@code GET  /api/dashboard/home-assistant/states/{entityId}}
 *   <li>{@code GET  /api/dashboard/home-assistant/calendars/{entityId}?start=&end=}
 *   <li>{@code POST /api/dashboard/home-assistant/services/{domain}/{service}}
 * </ul>
 */
@RestController
@RequestMapping("/api/dashboard/home-assistant")
public class HomeAssistantProxyController {

  /** Home Assistant entity ids look like {@code light.family_room_fan}. */
  private static final Pattern ENTITY_ID = Pattern.compile("^[a-z_]+\\.[a-z0-9_]+$");

  private static final Pattern DOMAIN_OR_SERVICE = Pattern.compile("^[a-z0-9_]+$");

  private final HomeAssistantClient client;
  private final HomeAssistantProperties properties;

  public HomeAssistantProxyController(
      HomeAssistantClient client, HomeAssistantProperties properties) {
    this.client = client;
    this.properties = properties;
  }

  /** Lightweight check the dashboard (or a human) can hit to see whether the adapter is wired up. */
  @GetMapping("/status")
  public ResponseEntity<Map<String, Object>> status() {
    Map<String, Object> body = new LinkedHashMap<>();
    body.put("configured", client.isConfigured());
    body.put("baseUrl", client.baseUrl());

    if (!client.isConfigured()) {
      body.put("reachable", false);
      body.put("detail", "Set HOME_ASSISTANT_BASE_URL and HOME_ASSISTANT_TOKEN.");
      return ResponseEntity.ok(body);
    }

    try {
      ResponseEntity<String> response = client.get("/", null);
      body.put("reachable", response.getStatusCode().is2xxSuccessful());
      body.put("upstreamStatus", response.getStatusCode().value());
    } catch (RuntimeException ex) {
      body.put("reachable", false);
      body.put("detail", ex.getMessage());
    }

    return ResponseEntity.ok(body);
  }

  @GetMapping("/states/{entityId}")
  public ResponseEntity<String> state(@PathVariable String entityId) {
    requireEntityId(entityId);
    return passThrough(client.get("/states/" + entityId, null));
  }

  @GetMapping("/calendars/{entityId}")
  public ResponseEntity<String> calendar(
      @PathVariable String entityId,
      @RequestParam(required = false) String start,
      @RequestParam(required = false) String end) {
    requireEntityId(entityId);

    MultiValueMap<String, String> query = new LinkedMultiValueMap<>();
    if (start != null && !start.isBlank()) {
      query.add("start", start);
    }
    if (end != null && !end.isBlank()) {
      query.add("end", end);
    }

    return passThrough(client.get("/calendars/" + entityId, query));
  }

  @PostMapping("/services/{domain}/{service}")
  public ResponseEntity<String> callService(
      @PathVariable String domain,
      @PathVariable String service,
      @RequestBody(required = false) Map<String, Object> body) {
    requireName(domain, "service domain");
    requireName(service, "service name");

    if (!properties.allowsServiceDomain(domain)) {
      throw new ResponseStatusException(
          HttpStatus.FORBIDDEN, "Service domain '" + domain + "' is not allowed by this dashboard");
    }

    return passThrough(client.post("/services/" + domain + "/" + service, body));
  }

  /**
   * Copies the Home Assistant status and JSON body straight back to the browser. Upstream errors
   * such as a 404 for an unplugged entity stay meaningful to {@code app.js}, which uses them to
   * hide rows.
   */
  private ResponseEntity<String> passThrough(ResponseEntity<String> upstream) {
    return ResponseEntity.status(upstream.getStatusCode())
        .contentType(MediaType.APPLICATION_JSON)
        .cacheControl(CacheControl.noStore())
        .header(HttpHeaders.PRAGMA, "no-cache")
        .body(upstream.getBody() == null ? "null" : upstream.getBody());
  }

  private static void requireEntityId(String entityId) {
    if (entityId == null || !ENTITY_ID.matcher(entityId).matches()) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "Invalid Home Assistant entity id: " + entityId);
    }
  }

  private static void requireName(String value, String label) {
    if (value == null || !DOMAIN_OR_SERVICE.matcher(value).matches()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid " + label + ": " + value);
    }
  }
}
