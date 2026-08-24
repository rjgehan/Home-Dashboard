package com.homedashboard.web;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.homedashboard.config.HomeAssistantProperties;
import com.homedashboard.service.HomeAssistantClient;
import com.homedashboard.service.HomeAssistantUnavailableException;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.util.MultiValueMap;

/** Covers the adapter contract that {@code app.js} depends on. */
@WebMvcTest(controllers = HomeAssistantProxyController.class)
@EnableConfigurationProperties(HomeAssistantProperties.class)
@EnableAutoConfiguration
class HomeAssistantProxyControllerTest {

  @Autowired private MockMvc mockMvc;

  @MockitoBean private HomeAssistantClient client;

  @Test
  void entityStateIsPassedThrough() throws Exception {
    given(client.get(eq("/states/fan.family_room_fan"), isNull()))
        .willReturn(ResponseEntity.ok("{\"state\":\"on\",\"attributes\":{\"percentage\":80}}"));

    mockMvc
        .perform(get("/api/dashboard/home-assistant/states/fan.family_room_fan"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.state").value("on"))
        .andExpect(jsonPath("$.attributes.percentage").value(80));
  }

  @Test
  void upstreamNotFoundIsPreserved() throws Exception {
    given(client.get(any(), any()))
        .willReturn(ResponseEntity.status(HttpStatus.NOT_FOUND).body("{\"message\":\"Not found\"}"));

    mockMvc
        .perform(get("/api/dashboard/home-assistant/states/switch.gazebo_socket_1"))
        .andExpect(status().isNotFound());
  }

  @Test
  void calendarRangeIsForwardedAsQueryParameters() throws Exception {
    given(client.get(eq("/calendars/calendar.family"), any())).willReturn(ResponseEntity.ok("[]"));

    mockMvc
        .perform(
            get("/api/dashboard/home-assistant/calendars/calendar.family")
                .param("start", "2026-08-01T00:00:00.000Z")
                .param("end", "2026-09-01T00:00:00.000Z"))
        .andExpect(status().isOk())
        .andExpect(content().json("[]"));

    @SuppressWarnings("unchecked")
    ArgumentCaptor<MultiValueMap<String, String>> query =
        ArgumentCaptor.forClass(MultiValueMap.class);
    verify(client).get(eq("/calendars/calendar.family"), query.capture());

    org.assertj.core.api.Assertions.assertThat(query.getValue().getFirst("start"))
        .isEqualTo("2026-08-01T00:00:00.000Z");
    org.assertj.core.api.Assertions.assertThat(query.getValue().getFirst("end"))
        .isEqualTo("2026-09-01T00:00:00.000Z");
  }

  @Test
  void fanServiceCallIsForwardedWithItsBody() throws Exception {
    given(client.post(eq("/services/fan/turn_on"), any())).willReturn(ResponseEntity.ok("[]"));

    mockMvc
        .perform(
            post("/api/dashboard/home-assistant/services/fan/turn_on")
                .contentType("application/json")
                .content("{\"entity_id\":\"fan.family_room_fan\",\"percentage\":80}"))
        .andExpect(status().isOk());

    @SuppressWarnings("unchecked")
    ArgumentCaptor<Map<String, Object>> body = ArgumentCaptor.forClass(Map.class);
    verify(client).post(eq("/services/fan/turn_on"), body.capture());

    org.assertj.core.api.Assertions.assertThat(body.getValue())
        .containsEntry("entity_id", "fan.family_room_fan")
        .containsEntry("percentage", 80);
  }

  @Test
  void malformedEntityIdIsRejected() throws Exception {
    mockMvc
        .perform(get("/api/dashboard/home-assistant/states/not-an-entity"))
        .andExpect(status().isBadRequest());

    verify(client, never()).get(any(), any());
  }

  @Test
  void serviceDomainOutsideTheAllowListIsRejected() throws Exception {
    mockMvc
        .perform(
            post("/api/dashboard/home-assistant/services/hassio/host_reboot")
                .contentType("application/json")
                .content("{}"))
        .andExpect(status().isForbidden());

    verify(client, never()).post(any(), any());
  }

  @Test
  void unreachableHomeAssistantBecomesServiceUnavailable() throws Exception {
    given(client.get(any(), any()))
        .willThrow(new HomeAssistantUnavailableException("Home Assistant is unreachable"));

    mockMvc
        .perform(get("/api/dashboard/home-assistant/states/sensor.sleep_score"))
        .andExpect(status().isServiceUnavailable())
        .andExpect(jsonPath("$.error").value("home_assistant_unavailable"));
  }
}
