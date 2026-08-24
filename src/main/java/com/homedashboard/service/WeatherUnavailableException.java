package com.homedashboard.service;

/** Thrown when the forecast has no location configured or the weather service cannot be reached. */
public class WeatherUnavailableException extends RuntimeException {

  public WeatherUnavailableException(String message) {
    super(message);
  }

  public WeatherUnavailableException(String message, Throwable cause) {
    super(message, cause);
  }
}
