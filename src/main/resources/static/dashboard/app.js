const mockDashboard = {
  weather: {
    icon: "☀",
    temperature: "--°",
    summary: "Loading",
  },
  controls: [
    {
      id: "outdoorLights",
      label: "Exterior",
      title: "Outdoor Lights",
      state: "3 zones ready",
      activeState: "Outdoor scene selected",
      variant: "outdoor",
    },
    {
      id: "ceilingFans",
      label: "Airflow",
      title: "Ceiling Fans",
      state: "Family room medium",
      activeState: "Fan controls selected",
      variant: "fans",
    },
    {
      id: "frontDoor",
      label: "Entry",
      title: "Front Door",
      state: "Camera quiet",
      activeState: "Camera selected",
      variant: "frontDoor",
    },
    {
      id: "sleepScore",
      label: "Health",
      title: "Sleep Score",
      state: "Loading score",
      activeState: "Report selected",
      score: null,
      variant: "sleep",
    },
    {
      id: "kitchenMusic",
      label: "Audio",
      title: "Kitchen Music",
      state: "CasaTunes paused",
      activeState: "Music selected",
      meta: "Kitchen speaker",
      wide: true,
    },
  ],
};

const config = window.HA_CONFIG;
const pageParams = new URLSearchParams(window.location.search);
const previewMode = pageParams.get("preview");
const previewExample = pageParams.get("example") || "trash";

const elements = {
  dateLabel: document.querySelector("#dateLabel"),
  currentTime: document.querySelector("#currentTime"),
  weatherIcon: document.querySelector("#weatherIcon"),
  temperature: document.querySelector("#temperature"),
  weatherSummary: document.querySelector("#weatherSummary"),
  weatherSubline: document.querySelector("#weatherSubline"),
  weatherMiniFeels: document.querySelector("#weatherMiniFeels"),
  weatherMiniUv: document.querySelector("#weatherMiniUv"),
  weatherButton: document.querySelector("#weatherButton"),
  weatherDialog: document.querySelector("#weatherDialog"),
  weatherDialogIcon: document.querySelector("#weatherDialogIcon"),
  weatherDialogTemp: document.querySelector("#weatherDialogTemp"),
  weatherDialogSummary: document.querySelector("#weatherDialogSummary"),
  feelsLike: document.querySelector("#feelsLike"),
  windSpeed: document.querySelector("#windSpeed"),
  rainChance: document.querySelector("#rainChance"),
  uvIndex: document.querySelector("#uvIndex"),
  weeklyForecast: document.querySelector("#weeklyForecast"),
  greetingLine: document.querySelector("#greetingLine"),
  overviewMeta: document.querySelector("#overviewMeta"),
  controlGrid: document.querySelector("#controlGrid"),
  calendarTitle: document.querySelector("#calendarTitle"),
  monthCalendar: document.querySelector("#monthCalendar"),
  upcomingEvents: document.querySelector("#upcomingEvents"),
  themeButton: document.querySelector("#themeButton"),
  themeDialog: document.querySelector("#themeDialog"),
  lightsDialog: document.querySelector("#lightsDialog"),
  fansDialog: document.querySelector("#fansDialog"),
};

const outdoorLightKeys = ["gazeboLights", "tableLights", "couchLights"];
const fanKeys = ["familyRoomFan", "mainBedroomFan"];
const oneDayMs = 24 * 60 * 60 * 1000;
const sleepHistoryStorageKey = "dashboardSleepHistory";
const outdoorAutomationIds = {
  on: "automation.turn_on_back_6pm",
  off: "automation.turn_off_back_11pm",
};
const binReminderConfig = {
  trashDays: [0, 3], // Sunday and Wednesday nights.
  recyclingDay: 2, // Tuesday night.
  recyclingAnchorDate: "2026-04-28", // Every-other-Tuesday recycling starts next week.
};
let activeSmartSlotKey = "none";
let currentSmartSlot = null;

function hasHomeAssistantApi() {
  return Boolean(config?.apiBaseUrl);
}

function updateClock() {
  const now = new Date();
  const hour = now.getHours();

  elements.dateLabel.textContent = now.toLocaleDateString([], {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  elements.currentTime.textContent = now.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });

  elements.greetingLine.textContent =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : hour < 21 ? "Good evening" : "House settling in";
}

function renderOverview() {
  elements.weatherIcon.textContent = mockDashboard.weather.icon;
  elements.temperature.textContent = mockDashboard.weather.temperature;
  elements.weatherSummary.textContent = mockDashboard.weather.summary;
  elements.weatherSubline.textContent = "High --° · Low --°";
  elements.weatherMiniFeels.textContent = "Feels --°";
  elements.weatherMiniUv.textContent = "UV --";
  updateOverviewMeta(null);
}

async function refreshWeather() {
  if (!config?.weatherApiUrl) {
    elements.weatherSummary.textContent = "Weather unavailable";
    return;
  }

  try {
    // Spring calls Open-Meteo and hands back the same payload, so the house coordinates stay in
    // server configuration instead of this file.
    const response = await fetch(config.weatherApiUrl);

    if (!response.ok) {
      throw new Error(`Weather request failed: ${response.status}`);
    }

    const weather = await response.json();
    const code = weather.current?.weather_code;
    const icon = weatherIcon(code);
    const label = weatherLabel(code);
    const temp = `${Math.round(weather.current.temperature_2m)}°`;
    const guidance = weatherGuidance({
      currentTemp: weather.current?.temperature_2m,
      apparentTemp: weather.current?.apparent_temperature,
      windSpeed: weather.current?.wind_speed_10m,
      weatherCode: code,
      rainChance: weather.daily?.precipitation_probability_max?.[0],
      uvIndex: weather.daily?.uv_index_max?.[0],
      highTemp: weather.daily?.temperature_2m_max?.[0],
      lowTemp: weather.daily?.temperature_2m_min?.[0],
    });

    elements.temperature.textContent = temp;
    elements.weatherSummary.textContent = guidance || label;
    elements.weatherSubline.textContent = `High ${Math.round(weather.daily.temperature_2m_max[0])}° · Low ${Math.round(weather.daily.temperature_2m_min[0])}°`;
    elements.weatherMiniFeels.textContent = `Feels ${Math.round(weather.current.apparent_temperature)}°`;
    elements.weatherMiniUv.textContent = `UV ${formatUvShort(weather.daily?.uv_index_max?.[0])}`;
    elements.weatherDialogTemp.textContent = temp;
    elements.weatherDialogSummary.textContent = label;
    elements.feelsLike.textContent = `${Math.round(weather.current.apparent_temperature)}°`;
    elements.windSpeed.textContent = `${Math.round(weather.current.wind_speed_10m)} mph`;
    elements.rainChance.textContent = formatRainChance(weather.daily?.precipitation_probability_max?.[0]);
    elements.uvIndex.textContent = formatUvIndex(weather.daily?.uv_index_max?.[0]);
    elements.weatherIcon.textContent = icon;
    elements.weatherDialogIcon.textContent = icon;
    renderWeeklyForecast(weather.daily);
  } catch {
    elements.temperature.textContent = "--°";
    elements.weatherSummary.textContent = "Weather unavailable";
    elements.weatherSubline.textContent = "High --° · Low --°";
    elements.weatherMiniFeels.textContent = "Feels --°";
    elements.weatherMiniUv.textContent = "UV --";
    elements.weatherDialogTemp.textContent = "--°";
    elements.weatherDialogSummary.textContent = "Weather unavailable";
    elements.feelsLike.textContent = "--°";
    elements.windSpeed.textContent = "--";
    elements.rainChance.textContent = "--";
    elements.uvIndex.textContent = "--";
    elements.weatherIcon.textContent = "·";
    elements.weatherDialogIcon.textContent = "·";
    elements.weeklyForecast.innerHTML = "";
  }
}

function renderWeeklyForecast(daily) {
  if (!daily?.time?.length) {
    elements.weeklyForecast.innerHTML = "";
    return;
  }

  elements.weeklyForecast.innerHTML = daily.time
    .map((dateValue, index) => {
      const date = new Date(`${dateValue}T12:00:00`);
      const high = Math.round(daily.temperature_2m_max[index]);
      const low = Math.round(daily.temperature_2m_min[index]);
      const code = daily.weather_code[index];
      const rain = daily.precipitation_probability_max?.[index];

      return `
        <div class="forecast-day">
          <div>
            <strong>${index === 0 ? "Today" : date.toLocaleDateString([], { weekday: "short" })}</strong>
            <span>${date.toLocaleDateString([], { month: "short", day: "numeric" })}</span>
          </div>
          <div class="forecast-icon">${weatherIcon(code)}</div>
          <div class="forecast-temp">
            ${high}° / ${low}°
            <span>${rain ?? "--"}% rain</span>
          </div>
        </div>
      `;
    })
    .join("");
}

function renderControls() {
  activeSmartSlotKey = currentSmartSlot?.key || "none";
  elements.controlGrid.innerHTML = mockDashboard.controls.map(renderControlCard).join("");
}

function renderControlCard(control) {
  const meta = control.meta ? `<span class="music-meta">${control.meta}</span>` : "";
  const cardClass = [
    "control-card",
    control.wide ? "music-card" : "",
    control.variant === "sleep" ? "sleep-card" : "",
    control.variant ? `${control.variant}-card` : "",
    ["outdoor", "fans", "frontDoor"].includes(control.variant) ? "status-card" : "",
  ]
    .filter(Boolean)
    .join(" ");

  if (control.variant === "sleep") {
    if (currentSmartSlot) {
      return renderSmartSlotCard(currentSmartSlot);
    }

    return `
      <button class="${cardClass}" type="button" data-control="${control.id}">
        <span>
          <span class="card-label">${control.label}</span>
          <span class="card-title">${control.title}</span>
        </span>
        <span class="sleep-score-block">
          <strong data-sleep-score>${formatSleepScore(control.score)}</strong>
          <span class="sleep-history-grid" data-sleep-history>${renderSleepHistory()}</span>
        </span>
        <span class="sleep-meter" aria-hidden="true">
          <span data-sleep-meter style="width: ${sleepScoreWidth(control.score)}%"></span>
        </span>
      </button>
    `;
  }

  if (["outdoor", "fans", "frontDoor"].includes(control.variant)) {
    return `
      <button class="${cardClass}" type="button" data-control="${control.id}">
        <span>
          <span class="card-label">${control.label}</span>
          <span class="card-title">${control.title}</span>
        </span>
        <span class="status-card-body">
          <strong data-card-metric="${control.id}">--</strong>
          <span data-card-detail="${control.id}">${control.state}</span>
        </span>
        <span class="mini-chip-row" data-card-chips="${control.id}"></span>
      </button>
    `;
  }

  return `
    <button class="${cardClass}" type="button" data-control="${control.id}">
      <span>
        <span class="card-label">${control.label}</span>
        <span class="card-title">${control.title}</span>
      </span>
      <span class="card-state">${control.state}</span>
      ${meta}
    </button>
  `;
}

function renderSmartSlotCard(slot) {
  const itemChips = slot.items
    .map((item) => `<span class="is-active">${item.name}</span>`)
    .join("");
  const slotClass = slot.kind ? `slot-${slot.kind}` : "";
  const secondaryAlerts = Array.isArray(slot.secondaryAlerts) ? slot.secondaryAlerts : [];
  const secondaryMarkup = secondaryAlerts.length
    ? `
      <div class="smart-slot-secondary" aria-label="Additional reminders">
        ${secondaryAlerts
          .map(
            (alert) => `
              <div class="smart-slot-secondary-item slot-${alert.kind || "secondary"}">
                <span class="smart-slot-secondary-label">${alert.label}</span>
                <strong>${alert.title}</strong>
                <span class="smart-slot-secondary-state">${alert.state}</span>
              </div>
            `,
          )
          .join("")}
      </div>
    `
    : "";

  return `
    <article class="control-card sleep-card bin-card ${slotClass}" aria-live="polite">
      <span>
        <span class="card-label">${slot.label}</span>
        <span class="card-title">${slot.title}</span>
      </span>
      <span class="bin-card-body">
        <strong>${slot.icon}</strong>
        <span>${slot.state}</span>
      </span>
      <span class="mini-chip-row">${itemChips}</span>
      ${secondaryMarkup}
    </article>
  `;
}

function getBinReminder(date = new Date()) {
  const day = date.getDay();
  const items = [];

  if (binReminderConfig.trashDays.includes(day)) {
    items.push({ name: "Trash", icon: "Trash" });
  }

  if (day === binReminderConfig.recyclingDay && isRecyclingNight(date)) {
    items.push({ name: "Recycling", icon: "Recycle" });
  }

  if (!items.length) {
    return null;
  }

  const title =
    items.length > 1 ? "Take Out Trash + Recycling" : items[0].name === "Trash" ? "Take Out Trash" : "Take Out Recycling";

  return {
    key: items.map((item) => item.name).join("-"),
    label: "Tonight",
    title,
    icon: items.length > 1 ? "Trash" : items[0].name,
    state: items.length > 1 ? "Trash and recycling go out before bed" : `${items[0].name} goes out before bed`,
    items,
    kind: "bins",
    priority: 40,
  };
}

async function getSmartSlotAlert() {
  const previewSlot = getPreviewSmartSlot();

  if (previewSlot) {
    return previewSlot;
  }

  const applianceKeys = ["cooktopStatus", "topOven", "bottomOven", "dishwasherClean"];
  const [cooktopState, topOvenState, bottomOvenState, dishwasherState] = await getEntityStates(applianceKeys);
  const alerts = [];

  const applianceItems = [];

  if (cooktopState?.state === "on") {
    applianceItems.push({ name: "Stove" });
  }

  if (isTopOvenActive(topOvenState)) {
    applianceItems.push({ name: "Top Oven" });
  }

  if (isBottomOvenActive(bottomOvenState)) {
    applianceItems.push({ name: "Bottom Oven" });
  }

  if (applianceItems.length) {
    alerts.push({
      key: `appliance-${applianceItems.map((item) => item.name).join("-")}`,
      label: "Kitchen",
      title: applianceItems.length > 1 ? "Appliances On" : `${applianceItems[0].name} On`,
      icon: "On",
      state: applianceItems.length > 1 ? "Kitchen appliances are still running" : `${applianceItems[0].name} is still running`,
      items: applianceItems,
      kind: "kitchen",
      priority: cooktopState?.state === "on" ? 100 : 90,
    });
  }

  if (dishwasherState?.state === "on") {
    alerts.push({
      key: "dishwasher-clean",
      label: "Kitchen",
      title: "Dishwasher Clean",
      icon: "Clean",
      state: "Dishes are ready to be unloaded",
      items: [{ name: "Dishwasher" }],
      kind: "dishwasher",
      priority: 60,
    });
  }

  const binReminder = getBinReminder();

  if (binReminder) {
    alerts.push(binReminder);
  }

  if (!alerts.length) {
    return null;
  }

  const sortedAlerts = alerts.sort((a, b) => b.priority - a.priority);
  const primaryAlert = sortedAlerts[0];
  const secondaryAlerts = sortedAlerts.slice(1);

  return {
    ...primaryAlert,
    key: [primaryAlert.key, ...secondaryAlerts.map((alert) => alert.key)].join("__"),
    secondaryAlerts,
  };
}

function getPreviewSmartSlot() {
  if (previewMode !== "smartslot") {
    return null;
  }

  const examples = {
    trash: {
      key: "preview-trash",
      label: "Tonight",
      title: "Take Out Trash",
      icon: "Trash",
      state: "Trash goes out before bed",
      items: [{ name: "Trash" }],
      kind: "bins",
      priority: 40,
    },
    recycling: {
      key: "preview-recycling",
      label: "Tonight",
      title: "Take Out Recycling",
      icon: "Recycling",
      state: "Recycling goes out before bed",
      items: [{ name: "Recycling" }],
      kind: "bins",
      priority: 40,
    },
    dishwasher: {
      key: "preview-dishwasher",
      label: "Kitchen",
      title: "Dishwasher Clean",
      icon: "Clean",
      state: "Dishes are ready to be unloaded",
      items: [{ name: "Dishwasher" }],
      kind: "dishwasher",
      priority: 60,
    },
    cooktop: {
      key: "preview-cooktop",
      label: "Kitchen",
      title: "Stove On",
      icon: "On",
      state: "Stove is still running",
      items: [{ name: "Stove" }],
      kind: "kitchen",
      priority: 100,
    },
    oven: {
      key: "preview-oven",
      label: "Kitchen",
      title: "Top Oven On",
      icon: "On",
      state: "Top oven is still running",
      items: [{ name: "Top Oven" }],
      kind: "kitchen",
      priority: 90,
    },
    combo: {
      key: "preview-combo",
      label: "Kitchen",
      title: "Appliances On",
      icon: "On",
      state: "Kitchen appliances are still running",
      items: [{ name: "Stove" }, { name: "Top Oven" }, { name: "Bottom Oven" }],
      kind: "kitchen",
      priority: 100,
    },
    all: {
      key: "preview-all",
      label: "Kitchen",
      title: "Appliances On",
      icon: "On",
      state: "Kitchen appliances are still running",
      items: [{ name: "Stove" }, { name: "Top Oven" }, { name: "Bottom Oven" }],
      kind: "kitchen",
      priority: 100,
      secondaryAlerts: [
        {
          key: "preview-dishwasher-secondary",
          label: "Kitchen",
          title: "Dishwasher Clean",
          state: "Dishes are ready to be unloaded",
          kind: "dishwasher",
        },
        {
          key: "preview-trash-secondary",
          label: "Tonight",
          title: "Take Out Trash",
          state: "Trash goes out before bed",
          kind: "bins",
        },
      ],
    },
  };

  return examples[previewExample] || examples.trash;
}

function isTopOvenActive(state) {
  if (!state) {
    return false;
  }

  return !["off", "unknown", "unavailable"].includes(String(state.state).toLowerCase());
}

function isBottomOvenActive(state) {
  if (!state) {
    return false;
  }

  return !["off", "unknown", "unavailable", "n/a"].includes(String(state.state).toLowerCase());
}

function isRecyclingNight(date) {
  const anchor = localDateFromIso(binReminderConfig.recyclingAnchorDate);
  const today = startOfLocalDay(date);
  const weeksSinceAnchor = Math.round((today - anchor) / (7 * oneDayMs));

  return Math.abs(weeksSinceAnchor % 2) === 0;
}

function localDateFromIso(value) {
  return startOfLocalDay(new Date(`${value}T12:00:00`));
}

function startOfLocalDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

async function refreshHomeCards() {
  await Promise.all([refreshOutdoorLightCard(), refreshFanCard(), refreshFrontDoorCard()]);
}

async function refreshOutdoorLightCard() {
  const states = await getEntityStates(outdoorLightKeys);
  const availableStates = states.filter((state) => state && !["unavailable", "unknown"].includes(state.state));
  const onCount = availableStates.filter((state) => state.state === "on").length;
  const total = availableStates.length;
  const scheduleSummary = await getOutdoorLightScheduleSummary();

  updateStatusCard(
    "outdoorLights",
    total ? `${onCount}/${total}` : "--",
    scheduleSummary || lightSummary(onCount, total),
  );
  renderCardChips(
    "outdoorLights",
    buildOutdoorLightChips(states),
  );
  refreshOutdoorLightDialog(states);
}

async function refreshFanCard() {
  const states = await getEntityStates(fanKeys);
  const activeFans = states.filter((state) => state?.state === "on");
  updateStatusCard("ceilingFans", `${activeFans.length}/2`, fanSummary(states));
  renderCardChips(
    "ceilingFans",
    buildFanChips(states),
  );
}

async function refreshFrontDoorCard() {
  const entityId = config?.entities?.doorbellCamera;

  if (!entityId) {
    updateStatusCard("frontDoor", "--", "Camera not configured");
    renderCardChips("frontDoor", [{ label: "No camera", active: false }]);
    return;
  }

  try {
    const state = await haGet(`/api/states/${encodeURIComponent(entityId)}`);
    const isUnavailable = ["unavailable", "unknown"].includes(state.state);
    const motion = state.attributes?.motion_detection;

    updateStatusCard("frontDoor", isUnavailable ? "Offline" : "Ready", isUnavailable ? "Camera unavailable" : "Live view available");
    renderCardChips(
      "frontDoor",
      [
        { label: "Live", active: !isUnavailable },
        { label: motion === false ? "Motion off" : "Motion", active: motion !== false && !isUnavailable },
      ],
    );
  } catch {
    updateStatusCard("frontDoor", "Offline", "Camera unavailable");
    renderCardChips("frontDoor", [{ label: "Check HA", active: false }]);
  }
}

async function getEntityStates(keys) {
  return Promise.all(
    keys.map(async (key) => {
      const entityId = config?.entities?.[key];

      if (!entityId) {
        return null;
      }

      try {
        return await haGet(`/api/states/${encodeURIComponent(entityId)}`);
      } catch {
        return null;
      }
    }),
  );
}

function updateStatusCard(cardId, metric, detail) {
  const metricNode = document.querySelector(`[data-card-metric="${cardId}"]`);
  const detailNode = document.querySelector(`[data-card-detail="${cardId}"]`);

  if (metricNode) {
    metricNode.textContent = metric;
  }

  if (detailNode) {
    detailNode.textContent = detail;
  }
}

function renderCardChips(cardId, chips) {
  const chipContainer = document.querySelector(`[data-card-chips="${cardId}"]`);

  if (!chipContainer) {
    return;
  }

  chipContainer.innerHTML = chips
    .map((chip) => `<span class="${chip.active ? "is-active" : ""}">${chip.label}</span>`)
    .join("");
}

function buildOutdoorLightChips(states) {
  const labels = ["Gazebo", "Table", "Couch"];
  return labels
    .map((label, index) => ({ label, active: states[index]?.state === "on" }))
    .filter((chip) => chip.active);
}

async function getOutdoorLightScheduleSummary() {
  if (!hasHomeAssistantApi()) {
    return "";
  }

  try {
    const [turnOnState, turnOffState] = await Promise.all([
      haGet(`/api/states/${encodeURIComponent(outdoorAutomationIds.on)}`),
      haGet(`/api/states/${encodeURIComponent(outdoorAutomationIds.off)}`),
    ]);
    const turnOnLabel = formatAutomationTime(turnOnState?.attributes?.last_triggered);
    const turnOffLabel = formatAutomationTime(turnOffState?.attributes?.last_triggered);

    if (turnOnLabel && turnOffLabel) {
      return `${turnOnLabel} on · ${turnOffLabel} off`;
    }

    if (turnOnLabel) {
      return `${turnOnLabel} on`;
    }

    if (turnOffLabel) {
      return `${turnOffLabel} off`;
    }

    return "";
  } catch {
    return "";
  }
}

function fanSummary(states) {
  const activeSummaries = [
    states[0]?.state === "on" ? `Family ${formatFanPercent(states[0]?.attributes?.percentage, states[0]?.state)}` : null,
    states[1]?.state === "on" ? `Master ${formatFanPercent(states[1]?.attributes?.percentage, states[1]?.state)}` : null,
  ].filter(Boolean);

  if (!activeSummaries.length) {
    return "Both fans off";
  }

  return activeSummaries.join(" · ");
}

function buildFanChips(states) {
  return [
    states[0]?.state === "on"
      ? { label: `Family ${formatFanPercent(states[0]?.attributes?.percentage, states[0]?.state)}`, active: true }
      : null,
    states[1]?.state === "on"
      ? { label: `Master ${formatFanPercent(states[1]?.attributes?.percentage, states[1]?.state)}`, active: true }
      : null,
  ].filter(Boolean);
}

function lightSummary(onCount, total = outdoorLightKeys.length) {
  if (total === 0) {
    return "No lights available";
  }

  if (onCount === 0) {
    return "All zones off";
  }

  if (onCount === total) {
    return "All zones on";
  }

  return `${onCount} zone${onCount === 1 ? "" : "s"} on`;
}

function formatAutomationTime(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatFanPercent(percent, state) {
  if (state !== "on") {
    return "off";
  }

  if (Number.isFinite(percent)) {
    return `${percent}%`;
  }

  return "on";
}

async function refreshSleepScore() {
  if (currentSmartSlot) {
    updateSleepCard(null);
  }

  const entityId = config?.entities?.sleepScore;

  if (!entityId) {
    updateOverviewMeta(null);
    updateSleepCard(null);
    return;
  }

  try {
    const state = await haGet(`/api/states/${encodeURIComponent(entityId)}`);
    const score = Number.parseFloat(state.state);
    const roundedScore = Number.isFinite(score) ? Math.round(score) : null;
    saveSleepHistory(roundedScore);
    updateOverviewMeta(roundedScore);
    updateSleepCard(roundedScore);
  } catch {
    updateOverviewMeta(null);
    updateSleepCard(null);
  }
}

function updateSleepCard(score) {
  const control = mockDashboard.controls.find((item) => item.id === "sleepScore");

  if (control) {
    control.score = score;
  }

  const scoreNode = document.querySelector("[data-sleep-score]");
  const meterNode = document.querySelector("[data-sleep-meter]");
  const historyNode = document.querySelector("[data-sleep-history]");

  if (!scoreNode || !meterNode || !historyNode) {
    return;
  }

  scoreNode.textContent = formatSleepScore(score);
  meterNode.style.width = `${sleepScoreWidth(score)}%`;
  historyNode.innerHTML = renderSleepHistory();
}

function updateOverviewMeta(score) {
  if (!elements.overviewMeta) {
    return;
  }

  if (!currentSmartSlot) {
    elements.overviewMeta.innerHTML = "";
    return;
  }

  elements.overviewMeta.innerHTML = `
    <span class="overview-badge">
      <span>Sleep</span>
      ${Number.isFinite(score) ? score : "--"}
    </span>
  `;
}

function refreshBinReminderSlot() {
  refreshSmartSlot();
}

async function refreshSmartSlot() {
  const nextSmartSlot = await getSmartSlotAlert();
  const nextKey = nextSmartSlot?.key || "none";

  currentSmartSlot = nextSmartSlot;

  if (nextKey === activeSmartSlotKey) {
    updateOverviewMeta(mockDashboard.controls.find((item) => item.id === "sleepScore")?.score ?? null);
    return;
  }

  renderControls();
  refreshHomeCards();
  refreshSleepScore();
  updateOverviewMeta(mockDashboard.controls.find((item) => item.id === "sleepScore")?.score ?? null);
}

function renderEvents(container, events) {
  if (!events.length) {
    container.innerHTML = `
      <article class="event-row">
        <div>
          <strong>No events found</strong>
          <span>The family calendar is clear for this section.</span>
        </div>
        <div class="event-time">--</div>
      </article>
    `;
    return;
  }

  container.innerHTML = events
    .map(
      (event) => `
        <article class="event-row">
          <div>
            <strong>${event.title}</strong>
            <span>${event.detail}</span>
          </div>
          <div class="event-time">${event.time}</div>
        </article>
      `,
    )
    .join("");
}

function renderMonthCalendar(events = []) {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const { startDate } = getMonthGridRange(today);

  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const days = [];

  elements.calendarTitle.textContent = today.toLocaleDateString([], {
    month: "long",
    year: "numeric",
  });

  for (let index = 0; index < 42; index += 1) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + index);
    days.push(date);
  }

  elements.monthCalendar.innerHTML = [
    ...weekdays.map((day) => `<div class="weekday">${day}</div>`),
    ...days.map((date) => renderCalendarDay(date, month, today, events)),
  ].join("");
}

function renderCalendarDay(date, currentMonth, today, events) {
  const eventsForDay = events.filter((event) => isSameDay(event.startDate, date));
  const visibleDots = eventsForDay.slice(0, 3).map(() => `<span class="event-dot"></span>`).join("");
  const extraCount = eventsForDay.length > 3 ? `<span class="event-count">+${eventsForDay.length - 3}</span>` : "";
  const classes = [
    "calendar-day",
    date.getMonth() !== currentMonth ? "is-muted" : "",
    isSameDay(date, today) ? "is-today" : "",
    eventsForDay.length ? "has-events" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return `
    <div class="${classes}" title="${eventsForDay.map((event) => event.title).join(", ")}">
      <span class="day-number">${date.getDate()}</span>
      <span class="event-dots">${visibleDots}${extraCount}</span>
    </div>
  `;
}

async function refreshCalendar() {
  if (!hasHomeAssistantApi() || !config?.entities?.calendar) {
    renderCalendarUnavailable("Missing Home Assistant calendar config");
    return;
  }

  const { startDate, endDate } = getMonthGridRange(new Date());

  const query = new URLSearchParams({
    start: startDate.toISOString(),
    end: endDate.toISOString(),
  });

  try {
    const events = await haGet(`/api/calendars/${encodeURIComponent(config.entities.calendar)}?${query}`);
    renderCalendarEvents(Array.isArray(events) ? events : []);
  } catch {
    renderCalendarUnavailable("Calendar is unavailable from Home Assistant");
  }
}

function renderCalendarEvents(events) {
  const normalizedEvents = events.map(normalizeCalendarEvent).sort((a, b) => a.startDate - b.startDate);
  const upcomingEvents = normalizedEvents.filter((event) => event.startDate >= startOfToday()).slice(0, 3);

  renderMonthCalendar(normalizedEvents);
  renderEvents(elements.upcomingEvents, upcomingEvents);
}

function normalizeCalendarEvent(event) {
  const startValue = event.start?.dateTime || event.start?.date || event.start;
  const startDate = startValue ? new Date(startValue) : new Date();

  return {
    title: event.summary || "Untitled event",
    detail: event.location || "Family calendar",
    time: isSameDay(startDate, new Date()) ? formatEventTime(startDate) : formatEventDay(startDate),
    startDate,
  };
}

function renderCalendarUnavailable(message) {
  const unavailable = [{ title: message, detail: "Check Spring Home Assistant settings", time: "--" }];

  renderMonthCalendar([]);
  renderEvents(elements.upcomingEvents, unavailable);
}

function bindControls() {
  elements.controlGrid.addEventListener("click", (event) => {
    const card = event.target.closest("[data-control]");

    if (!card) {
      return;
    }

    const control = mockDashboard.controls.find((item) => item.id === card.dataset.control);
    const state = card.querySelector(".card-state");

    if (!control) {
      return;
    }

    if (control.id === "outdoorLights") {
      elements.lightsDialog.showModal();
      refreshOutdoorLightCard();
      return;
    }

    if (control.id === "ceilingFans") {
      elements.fansDialog.showModal();
      refreshFanSliderValues();
      return;
    }

    if (!state) {
      return;
    }

    card.classList.toggle("is-active");
    state.textContent = card.classList.contains("is-active") ? control.activeState : control.state;

    // Later Home Assistant hooks:
    // outdoorLights -> gazebo, table, and couch switches
    // ceilingFans -> family room and master bedroom fan entities
    // frontDoor -> doorbell camera entity
    // sleepScore -> sleep score sensor
    // kitchenMusic -> CasaTunes / kitchen media player
  });

  document.addEventListener("click", async (event) => {
    const toggleButton = event.target.closest("[data-toggle-entity]");
    const lightSceneButton = event.target.closest("[data-light-scene]");
    const lightEntityActionButton = event.target.closest("[data-light-entity-action]");
    const fanOffButton = event.target.closest("[data-fan-off]");

    try {
      if (toggleButton) {
        await toggleEntity(toggleButton.dataset.toggleEntity);
      }

      if (lightSceneButton) {
        await setOutdoorLights(lightSceneButton.dataset.lightScene);
      }

      if (lightEntityActionButton) {
        await setOutdoorLightEntity(
          lightEntityActionButton.dataset.lightEntityAction,
          lightEntityActionButton.dataset.lightAction,
        );
      }

      if (fanOffButton) {
        await turnFanOff(fanOffButton.dataset.fanOff);
        updateSliderOutput(fanOffButton.dataset.fanOff, null);
      }

      if (toggleButton || lightSceneButton || lightEntityActionButton || fanOffButton) {
        window.setTimeout(refreshHomeCards, 500);
      }
    } catch {
      // Keep the prototype calm; failed service calls can be surfaced with fuller status UI later.
    }
  });

  document.addEventListener("input", (event) => {
    const fanSlider = event.target.closest("[data-fan-slider]");
    const lightSlider = event.target.closest("[data-light-slider]");

    if (fanSlider) {
      updateSliderOutput(fanSlider.dataset.fanSlider, Number(fanSlider.value));
    }

    if (lightSlider) {
      updateSliderOutput(lightSlider.dataset.lightSlider, Number(lightSlider.value));
    }
  });

  document.addEventListener("change", async (event) => {
    const fanSlider = event.target.closest("[data-fan-slider]");
    const lightSlider = event.target.closest("[data-light-slider]");

    try {
      if (fanSlider) {
        await setFanSpeed(fanSlider.dataset.fanSlider, Number(fanSlider.value));
      }

      if (lightSlider) {
        await setLightBrightness(lightSlider.dataset.lightSlider, Number(lightSlider.value));
      }

      if (fanSlider || lightSlider) {
        window.setTimeout(refreshHomeCards, 500);
      }
    } catch {
      // Keep the prototype calm; failed service calls can be surfaced with fuller status UI later.
    }
  });
}

function bindThemeControls() {
  const savedTheme = window.localStorage.getItem("dashboardTheme") || "blue";
  applyTheme(savedTheme);

  elements.themeButton.addEventListener("click", () => {
    elements.themeDialog.showModal();
  });

  document.querySelectorAll("[data-theme]").forEach((button) => {
    button.addEventListener("click", () => {
      applyTheme(button.dataset.theme);
      window.localStorage.setItem("dashboardTheme", button.dataset.theme);
    });
  });
}

function applyTheme(theme) {
  const availableThemes = [...document.querySelectorAll("[data-theme]")].map((button) => button.dataset.theme);
  const selectedTheme = availableThemes.includes(theme) ? theme : "blue";

  document.body.dataset.theme = selectedTheme;

  document.querySelectorAll("[data-theme]").forEach((button) => {
    button.classList.toggle("is-selected", button.dataset.theme === selectedTheme);
  });
}

function bindWeatherControls() {
  elements.weatherButton.addEventListener("click", () => {
    elements.weatherDialog.showModal();
  });
}

function bindLiveRefresh() {
  const refreshVisibleState = () => {
    if (document.hidden) {
      return;
    }

    refreshHomeCards();
    refreshSmartSlot();
  };

  document.addEventListener("visibilitychange", refreshVisibleState);
  window.addEventListener("focus", refreshVisibleState);
}

function initDashboard() {
  updateClock();
  renderOverview();
  renderControls();
  renderMonthCalendar([]);
  renderEvents(elements.upcomingEvents, [{ title: "Loading the family calendar", detail: "Home Assistant", time: "--" }]);
  bindControls();
  bindThemeControls();
  bindWeatherControls();
  bindLiveRefresh();
  refreshWeather();
  refreshHomeCards();
  refreshSleepScore();
  refreshSmartSlot();
  refreshCalendar();

  window.setInterval(updateClock, 1000);
  window.setInterval(refreshWeather, 10 * 60 * 1000);
  window.setInterval(refreshHomeCards, 30 * 1000);
  window.setInterval(refreshSleepScore, 10 * 60 * 1000);
  window.setInterval(refreshSmartSlot, 15 * 1000);
  window.setInterval(refreshCalendar, 5 * 60 * 1000);
}

initDashboard();

async function haGet(path) {
  if (!hasHomeAssistantApi()) {
    return null;
  }

  const response = await fetch(`${config.apiBaseUrl}${toDashboardApiPath(path)}`, {
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Home Assistant request failed: ${response.status}`);
  }

  return response.json();
}

async function haPost(path, body) {
  if (!hasHomeAssistantApi()) {
    return null;
  }

  const response = await fetch(`${config.apiBaseUrl}${toDashboardApiPath(path)}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Home Assistant request failed: ${response.status}`);
  }

  return response.json();
}

function toDashboardApiPath(path) {
  return path.replace(/^\/api\//, "/");
}

async function toggleEntity(key) {
  const entityId = config?.entities?.[key];

  if (!entityId) {
    return;
  }

  const domain = entityId.split(".")[0];
  await haPost(`/api/services/${domain}/toggle`, { entity_id: entityId });
}

async function setOutdoorLights(mode) {
  const entityIds = outdoorLightKeys.map((key) => config?.entities?.[key]).filter(Boolean);

  if (!entityIds.length) {
    return;
  }

  await haPost(`/api/services/switch/turn_${mode}`, { entity_id: entityIds });
}

async function setOutdoorLightEntity(key, mode) {
  const entityId = config?.entities?.[key];

  if (!entityId) {
    return;
  }

  await haPost(`/api/services/switch/turn_${mode}`, { entity_id: entityId });
}

async function setFanSpeed(key, percentage) {
  const entityId = config?.entities?.[key];

  if (!entityId) {
    return;
  }

  const fanState = await haGet(`/api/states/${entityId}`);
  const fanPercentage = normalizeFanPercentage(percentage, fanState?.attributes?.percentage_step);

  // Use turn_on with percentage so an off fan starts at the selected speed instead of
  // only updating its remembered percentage value.
  await haPost("/api/services/fan/turn_on", {
    entity_id: entityId,
    percentage: fanPercentage,
  });
}

function normalizeFanPercentage(value, step = 10) {
  const fanStep = Number.isFinite(Number(step)) && Number(step) > 0 ? Number(step) : 10;
  const clamped = Math.min(100, Math.max(fanStep, Number(value) || fanStep));

  return Math.min(100, Math.max(fanStep, Math.round(clamped / fanStep) * fanStep));
}

async function turnFanOff(key) {
  const entityId = config?.entities?.[key];

  if (!entityId) {
    return;
  }

  await haPost("/api/services/fan/turn_off", { entity_id: entityId });
}

async function setLightBrightness(key, brightnessPct) {
  const entityId = config?.entities?.[key];

  if (!entityId) {
    return;
  }

  if (brightnessPct === 0) {
    await haPost("/api/services/light/turn_off", { entity_id: entityId });
    return;
  }

  await haPost("/api/services/light/turn_on", {
    entity_id: entityId,
    brightness_pct: brightnessPct,
  });
}

async function refreshFanSliderValues() {
  const sliderKeys = [
    "familyRoomFan",
    "familyRoomMainLight",
    "familyRoomAccentLight",
    "mainBedroomFan",
    "mainBedroomMainLight",
    "mainBedroomAccentLight",
  ];
  const states = await getEntityStates(sliderKeys);

  states.forEach((state, index) => {
    const key = sliderKeys[index];
    const isFanSlider = key.endsWith("Fan");
    const value = sliderValueFromState(state, isFanSlider);
    const slider =
      document.querySelector(`[data-fan-slider="${key}"]`) || document.querySelector(`[data-light-slider="${key}"]`);

    if (!slider) {
      return;
    }

    slider.value = value ?? slider.min ?? 0;
    updateSliderOutput(key, state?.state === "on" ? value : null);
  });
}

function refreshOutdoorLightDialog(states) {
  const labels = {
    gazeboLights: "Back patio",
    tableLights: "Outdoor table",
    couchLights: "Outdoor seating",
  };
  let availableCount = 0;

  outdoorLightKeys.forEach((key, index) => {
    const state = states?.[index];
    const isAvailable = Boolean(state) && !["unavailable", "unknown"].includes(state.state);
    const row = document.querySelector(`[data-light-row="${key}"]`);
    const statusNode = document.querySelector(`[data-light-status="${key}"]`);
    const onButton = document.querySelector(`[data-light-entity-action="${key}"][data-light-action="on"]`);
    const offButton = document.querySelector(`[data-light-entity-action="${key}"][data-light-action="off"]`);

    if (isAvailable) {
      availableCount += 1;
    }

    if (row) {
      row.hidden = !isAvailable;
    }

    if (statusNode) {
      statusNode.textContent = !isAvailable
        ? "Unavailable"
        : state.state === "on"
          ? `${labels[key]} on`
          : `${labels[key]} off`;
    }

    if (onButton) {
      onButton.disabled = !isAvailable;
      onButton.classList.toggle("is-active", isAvailable && state?.state === "on");
    }

    if (offButton) {
      offButton.disabled = !isAvailable;
      offButton.classList.toggle("is-active", isAvailable && state?.state === "off");
    }
  });

  document.querySelectorAll("[data-light-scene]").forEach((button) => {
    button.disabled = availableCount === 0;
  });
}

function sliderValueFromState(state, isFanSlider = false) {
  if (!state) {
    return null;
  }

  if (isFanSlider && Number.isFinite(state.attributes?.percentage)) {
    return Math.round(state.attributes.percentage);
  }

  if (state.state !== "on") {
    return null;
  }

  if (Number.isFinite(state.attributes?.brightness)) {
    return Math.max(1, Math.round((state.attributes.brightness / 255) * 100));
  }

  return 100;
}

function updateSliderOutput(key, value) {
  const output = document.querySelector(`[data-slider-output="${key}"]`);

  if (output) {
    output.textContent = Number.isFinite(value) ? `${value}%` : "Off";
  }
}

function isSameDay(firstDate, secondDate) {
  return (
    firstDate.getFullYear() === secondDate.getFullYear() &&
    firstDate.getMonth() === secondDate.getMonth() &&
    firstDate.getDate() === secondDate.getDate()
  );
}

function startOfToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function getMonthGridRange(date) {
  const firstOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
  const startDate = new Date(firstOfMonth);
  startDate.setDate(firstOfMonth.getDate() - firstOfMonth.getDay());
  startDate.setHours(0, 0, 0, 0);

  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 42);
  endDate.setHours(23, 59, 59, 999);

  return { startDate, endDate };
}

function formatEventTime(date) {
  return date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatEventDay(date) {
  return date.toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function weatherLabel(code) {
  const labels = {
    0: "Clear",
    1: "Mostly clear",
    2: "Partly cloudy",
    3: "Cloudy",
    45: "Fog",
    48: "Fog",
    51: "Drizzle",
    53: "Drizzle",
    55: "Drizzle",
    61: "Light rain",
    63: "Rain",
    65: "Heavy rain",
    71: "Light snow",
    73: "Snow",
    75: "Heavy snow",
    80: "Rain showers",
    81: "Rain showers",
    82: "Heavy showers",
    95: "Thunderstorm",
  };

  return labels[code] || "Weather";
}

function weatherIcon(code) {
  if ([0, 1].includes(code)) {
    return "☀";
  }

  if ([2, 3, 45, 48].includes(code)) {
    return "☁";
  }

  if ([71, 73, 75].includes(code)) {
    return "❄";
  }

  if ([95].includes(code)) {
    return "⚡";
  }

  return "☂";
}

function formatUvIndex(value) {
  if (!Number.isFinite(value)) {
    return "--";
  }

  const rounded = Math.round(value);

  if (rounded <= 2) {
    return `${rounded} low`;
  }

  if (rounded <= 5) {
    return `${rounded} moderate`;
  }

  if (rounded <= 7) {
    return `${rounded} high`;
  }

  return `${rounded} very high`;
}

function formatUvShort(value) {
  if (!Number.isFinite(value)) {
    return "--";
  }

  const rounded = Math.round(value);

  if (rounded <= 2) {
    return `${rounded} low`;
  }

  if (rounded <= 5) {
    return `${rounded} mod`;
  }

  if (rounded <= 7) {
    return `${rounded} high`;
  }

  return `${rounded} v high`;
}

function formatRainChance(value) {
  return Number.isFinite(value) ? `${Math.round(value)}%` : "--";
}

function weatherGuidance({ currentTemp, apparentTemp, windSpeed, weatherCode, rainChance, uvIndex, highTemp, lowTemp }) {
  const temp = Number.isFinite(apparentTemp) ? apparentTemp : currentTemp;

  if (Number.isFinite(rainChance) && rainChance >= 65) {
    return "Bring a coat";
  }

  if ([71, 73, 75, 77, 85, 86].includes(weatherCode)) {
    return "Bundle up!";
  }

  if (Number.isFinite(temp) && temp <= 38) {
    return "Bundle up!";
  }

  if (Number.isFinite(uvIndex) && uvIndex >= 7) {
    return "Wear sunscreen";
  }

  if (Number.isFinite(temp) && temp >= 88) {
    return "Stay cool";
  }

  if (Number.isFinite(windSpeed) && windSpeed >= 18) {
    return "It is windy out";
  }

  if (Number.isFinite(lowTemp) && lowTemp <= 42 && Number.isFinite(highTemp) && highTemp - lowTemp >= 18) {
    return "Layers today";
  }

  if ([95, 96, 99].includes(weatherCode)) {
    return "Storms possible";
  }

  if ([45, 48].includes(weatherCode)) {
    return "Low visibility";
  }

  return "Nice day outside";
}

function formatSleepScore(score) {
  return Number.isFinite(score) ? String(score) : "--";
}

function renderSleepHistory() {
  const historyByDate = new Map(getRecentSleepHistory().map((entry) => [entry.date, entry.score]));
  const lastSixDays = Array.from({ length: 6 }, (_, index) => {
    const offset = 5 - index;
    const date = startOfLocalDay(new Date(Date.now() - offset * oneDayMs));
    const key = formatStorageDateKey(date);

    return {
      date: key,
      score: historyByDate.get(key),
    };
  });

  return lastSixDays
    .map(
      (entry, index) => `
        <span class="sleep-history-chip ${index === lastSixDays.length - 1 ? "is-current" : ""}">
          <small>${index === lastSixDays.length - 1 ? "Today" : formatHistoryLabel(entry.date)}</small>
          <strong>${Number.isFinite(entry.score) ? entry.score : "--"}</strong>
        </span>
      `
    )
    .join("");
}

function saveSleepHistory(score) {
  if (!Number.isFinite(score)) {
    return;
  }

  const todayKey = formatStorageDateKey(new Date());
  const history = readSleepHistory().filter((entry) => entry.date !== todayKey);

  history.unshift({ date: todayKey, score });
  writeSleepHistory(history.slice(0, 6));
}

function getRecentSleepHistory() {
  return readSleepHistory().slice(0, 6);
}

function readSleepHistory() {
  try {
    const raw = window.localStorage.getItem(sleepHistoryStorageKey);
    const parsed = raw ? JSON.parse(raw) : [];

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((entry) => typeof entry?.date === "string" && Number.isFinite(entry?.score))
      .sort((a, b) => b.date.localeCompare(a.date));
  } catch {
    return [];
  }
}

function writeSleepHistory(history) {
  try {
    window.localStorage.setItem(sleepHistoryStorageKey, JSON.stringify(history));
  } catch {
    // Keep the dashboard working even if localStorage is unavailable.
  }
}

function formatStorageDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatHistoryLabel(dateKey) {
  const date = localDateFromIso(dateKey);

  return date.toLocaleDateString([], { weekday: "short" });
}

function sleepScoreLabel(score) {
  if (!Number.isFinite(score)) {
    return "Score unavailable";
  }

  if (score >= 90) {
    return "Excellent rest";
  }

  if (score >= 75) {
    return "Good rest";
  }

  if (score >= 60) {
    return "Needs attention";
  }

  return "Check report";
}

function sleepScoreWidth(score) {
  if (!Number.isFinite(score)) {
    return 0;
  }

  return Math.max(0, Math.min(100, score));
}
