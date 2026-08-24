package com.homedashboard.web;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ViewControllerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Routes the launch surface.
 *
 * <p>The dashboard files live in {@code src/main/resources/static/dashboard}, so Spring already
 * serves them at {@code /dashboard/...}. These routes mean the tablet can simply be pointed at the
 * server root.
 *
 * <p>{@code index.html} links {@code styles.css}, {@code config.js} and {@code app.js} relatively,
 * so the paths without a trailing slash redirect rather than forward. Forwarding them would leave
 * the browser on {@code /} and make it look for {@code /app.js}.
 */
@Configuration
public class DashboardWebConfig implements WebMvcConfigurer {

  @Override
  public void addViewControllers(ViewControllerRegistry registry) {
    registry.addRedirectViewController("/", "/dashboard/");
    registry.addRedirectViewController("/dashboard", "/dashboard/");
    registry.addViewController("/dashboard/").setViewName("forward:/dashboard/index.html");
  }
}
