package com.homedashboard.service;

/** Thrown when Home Assistant is not configured or cannot be reached. */
public class HomeAssistantUnavailableException extends RuntimeException {

  public HomeAssistantUnavailableException(String message) {
    super(message);
  }

  public HomeAssistantUnavailableException(String message, Throwable cause) {
    super(message, cause);
  }
}
