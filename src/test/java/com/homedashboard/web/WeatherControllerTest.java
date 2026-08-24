package com.homedashboard.web;

import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.homedashboard.service.WeatherClient;
import com.homedashboard.service.WeatherUnavailableException;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

/** The forecast route the dashboard header reads. */
@WebMvcTest(controllers = WeatherController.class)
@EnableAutoConfiguration
class WeatherControllerTest {

  @Autowired private MockMvc mockMvc;

  @MockitoBean private WeatherClient weatherClient;

  @Test
  void forecastIsPassedThroughUnchanged() throws Exception {
    given(weatherClient.forecast())
        .willReturn(
            ResponseEntity.ok(
                "{\"current\":{\"temperature_2m\":71.2},\"daily\":{\"temperature_2m_max\":[78.1]}}"));

    mockMvc
        .perform(get("/api/dashboard/weather"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.current.temperature_2m").value(71.2))
        .andExpect(jsonPath("$.daily.temperature_2m_max[0]").value(78.1));
  }

  @Test
  void missingLocationBecomesServiceUnavailable() throws Exception {
    given(weatherClient.forecast())
        .willThrow(new WeatherUnavailableException("No forecast location configured."));

    mockMvc
        .perform(get("/api/dashboard/weather"))
        .andExpect(status().isServiceUnavailable())
        .andExpect(jsonPath("$.error").value("weather_unavailable"));
  }
}
