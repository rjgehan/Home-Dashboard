// Public dashboard configuration. This file is served to the browser and committed
// to the repository, so it holds nothing secret and nothing that identifies a house:
// the two same-origin API routes, Home Assistant entity ids, and the card layout.
//
// The Home Assistant token and the house coordinates live in server configuration
// (HOME_ASSISTANT_TOKEN, DASHBOARD_LATITUDE, DASHBOARD_LONGITUDE). See the README.
//
// The entity ids below are placeholders. Replace them with your own - in Home
// Assistant, Developer Tools > States lists every id you can use.

window.HA_CONFIG = {
  // Spring proxies Home Assistant through this same-origin API.
  apiBaseUrl: "/api/dashboard/home-assistant",

  // Spring fetches the forecast, so the browser never learns where the house is.
  weatherApiUrl: "/api/dashboard/weather",

  entities: {
    tableLights: "switch.table_lights",
    xmasTree: "switch.christmas_tree",
    couchLights: "switch.couch_lights",
    gazeboLights: "switch.gazebo_lights",
    doorbellCamera: "camera.front_door",

    kitchenMedia: "media_player.kitchen",

    familyRoomFan: "fan.family_room_fan",
    familyRoomMainLight: "light.family_room_fan_light",
    familyRoomAccentLight: "light.family_room_fan",
    mainBedroomFan: "fan.main_bedroom_fan",
    mainBedroomMainLight: "light.main_bedroom_fan_light",
    mainBedroomAccentLight: "light.main_bedroom_fan",

    weather: "weather.forecast_home",
    calendar: "calendar.the_squad",

    topOven: "water_heater.oven",
    cookTimeRemaining: "sensor.oven_cook_time_remaining",
    cooktopStatus: "binary_sensor.cooktop_status",
    bottomOven: "sensor.lower_oven_cook_mode",

    fuelLevel: "sensor.vehicle_fuel_level",
    sleepScore: "sensor.cpap_total_myair_score",
    dishwasherClean: "binary_sensor.dishwasher_is_clean",
    carBattery: "sensor.vehicle_battery_level",
    engine: "binary_sensor.vehicle_engine",
    airConditioner: "binary_sensor.vehicle_air_conditioner",
  },

  dashboard: {
    quickControls: [
      { key: "tableLights", name: "Table Lights", icon: "TL", action: "toggle" },
      { key: "xmasTree", name: "X-mas Tree", icon: "XT", action: "toggle" },
      { key: "couchLights", name: "Couch Lights", icon: "CL", action: "toggle" },
      { key: "gazeboLights", name: "Gazebo Lights", icon: "GZ", action: "toggle" },
      { key: "doorbellCamera", name: "Doorbell", icon: "CAM", action: "status" },
      { key: "familyRoomMainLight", name: "Fan Main", icon: "FM", action: "toggle" },
      { key: "familyRoomAccentLight", name: "Fan Accent", icon: "FA", action: "toggle" },
    ],

    fanGroups: [
      {
        fanKey: "familyRoomFan",
        name: "Family Room Fan",
        lights: [
          { key: "familyRoomMainLight", name: "Main" },
          { key: "familyRoomAccentLight", name: "Accent" },
        ],
      },
      {
        fanKey: "mainBedroomFan",
        name: "Main Bedroom Fan",
        lights: [
          { key: "mainBedroomMainLight", name: "Main" },
          { key: "mainBedroomAccentLight", name: "Accent" },
        ],
      },
    ],

    kitchenItems: [
      { key: "topOven", name: "Top Oven" },
      { key: "cookTimeRemaining", name: "Time Remaining" },
      { key: "cooktopStatus", name: "Cooktop" },
      { key: "bottomOven", name: "Bottom Oven" },
    ],

    badges: [
      { key: "fuelLevel", name: "Fuel" },
      { key: "sleepScore", name: "Sleep" },
      { key: "dishwasherClean", name: "Dishwasher", formatter: "dishwasherClean" },
    ],

    vehicleItems: [
      { key: "carBattery", name: "Battery" },
      { key: "fuelLevel", name: "Fuel" },
      { key: "engine", name: "Engine" },
      { key: "airConditioner", name: "AC" },
    ],

    lightPresets: [25, 50, 75, 100],

    // Optional image for the vehicle card. Point it at your own asset.
    vehicleImageUrl: "",
  },
};
