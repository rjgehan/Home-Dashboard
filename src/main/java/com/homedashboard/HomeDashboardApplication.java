package com.homedashboard;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

/**
 * Entry point for the home dashboard.
 *
 * <p>The dashboard itself is plain HTML/CSS/JS served from
 * {@code src/main/resources/static/dashboard}. Spring exists to host those files and to act as the
 * Home Assistant adapter so the long-lived access token never reaches the browser.
 */
@SpringBootApplication
@ConfigurationPropertiesScan
public class HomeDashboardApplication {

  public static void main(String[] args) {
    SpringApplication.run(HomeDashboardApplication.class, args);
  }
}
