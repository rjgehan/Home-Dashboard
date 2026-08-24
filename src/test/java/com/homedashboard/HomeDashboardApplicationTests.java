package com.homedashboard;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.forwardedUrl;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.homedashboard.config.HomeAssistantProperties;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;

/** Boots the whole app the way it runs on the wall tablet server. */
@SpringBootTest
@AutoConfigureMockMvc
class HomeDashboardApplicationTests {

  @Autowired private MockMvc mockMvc;

  @Autowired private HomeAssistantProperties properties;

  @Test
  void contextLoads() {
    assertThat(properties).isNotNull();
  }

  @Test
  void rootRedirectsToTheDashboard() throws Exception {
    mockMvc.perform(get("/")).andExpect(status().is3xxRedirection());
    mockMvc.perform(get("/dashboard")).andExpect(status().is3xxRedirection());
  }

  @Test
  void dashboardDirectoryForwardsToIndex() throws Exception {
    mockMvc
        .perform(get("/dashboard/"))
        .andExpect(status().isOk())
        .andExpect(forwardedUrl("/dashboard/index.html"));
  }

  @Test
  void dashboardIndexIsServed() throws Exception {
    mockMvc
        .perform(get("/dashboard/index.html"))
        .andExpect(status().isOk())
        .andExpect(content().string(containsString("app.js")));
  }

  @Test
  void dashboardAssetsAreServed() throws Exception {
    mockMvc.perform(get("/dashboard/app.js")).andExpect(status().isOk());
    mockMvc.perform(get("/dashboard/styles.css")).andExpect(status().isOk());
    mockMvc.perform(get("/dashboard/config.js")).andExpect(status().isOk());
  }

  @Test
  void statusReportsMissingHomeAssistantConfig() throws Exception {
    mockMvc
        .perform(get("/api/dashboard/home-assistant/status"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.configured").value(false))
        .andExpect(jsonPath("$.reachable").value(false));
  }

  @Test
  void weatherFailsCleanlyWhenNoLocationIsConfigured() throws Exception {
    mockMvc
        .perform(get("/api/dashboard/weather"))
        .andExpect(status().isServiceUnavailable())
        .andExpect(jsonPath("$.error").value("weather_unavailable"));
  }

  @Test
  void browserConfigCarriesNoHouseCoordinates() throws Exception {
    String browserConfig =
        mockMvc
            .perform(get("/dashboard/config.js"))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();

    // A re-added coordinate would look like `latitude: 40.23`. The environment variable names in
    // the file's comment are deliberately not a match.
    assertThat(browserConfig).doesNotContainPattern("(?i)l(at|ong)itude\s*:");
    assertThat(browserConfig).contains("/api/dashboard/weather");
  }

  @Test
  void stateRequestsFailCleanlyWhenHomeAssistantIsNotConfigured() throws Exception {
    mockMvc
        .perform(get("/api/dashboard/home-assistant/states/light.family_room_fan"))
        .andExpect(status().isServiceUnavailable())
        .andExpect(jsonPath("$.error").value("home_assistant_unavailable"));
  }
}
