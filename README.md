# Home Dashboard

A wall-tablet dashboard for a Home Assistant house — lights, fans, the family calendar, the
forecast, and what the kitchen is up to, on one glanceable screen.

The front end is deliberately plain HTML, CSS and JavaScript. No npm, no bundler, no build step:
edit `index.html`, `styles.css` or `app.js` and reload the tablet. Spring Boot sits behind it doing
three jobs and nothing more.

- **Serves the dashboard.** Static files, with `max-age=0` so the tablet picks up edits without a
  hard refresh.
- **Fronts Home Assistant.** The long-lived access token stays on the server; the browser only ever
  talks to its own origin.
- **Fetches the forecast.** Open-Meteo is called server-side, so the house coordinates live in
  configuration rather than in a file that gets committed.

That last pair is the whole reason a backend exists here. A dashboard that talked to Home Assistant
directly would need the token and the coordinates in browser JavaScript.

## Quick start

You need a Home Assistant instance and a
[long-lived access token](https://www.home-assistant.io/docs/authentication/#your-account-profile).

### With Docker

```bash
cp .env.example .env      # then fill in the token and coordinates
docker compose up -d
```

Open <http://localhost:8080/>. On CasaOS, import
[`casaos/docker-compose.yml`](casaos/docker-compose.yml) through **Custom Install** instead.

See [docs/deploying.md](docs/deploying.md) to point the compose file at your own image and get
pushes to `main` deploying themselves.

### From source

```bash
export HOME_ASSISTANT_BASE_URL="http://homeassistant.local:8123"
export HOME_ASSISTANT_TOKEN="<long-lived access token>"
export DASHBOARD_LATITUDE="40.1234"
export DASHBOARD_LONGITUDE="-74.5678"
export DASHBOARD_TIMEZONE="America/New_York"
./mvnw spring-boot:run
```

PowerShell uses `$env:NAME = "value"` and `.\mvnw.cmd spring-boot:run`.

To avoid exporting variables every time, put the same values in `application-local.yml` and start
with `--spring.profiles.active=local`. That path is already gitignored.

The server binds `0.0.0.0:8080`, so the tablet can point at `http://<server-ip>:8080/`. A line at
startup says which integrations are configured, so a missing variable looks like a missing variable
rather than a broken dashboard.

Neither integration has to be up. Without Home Assistant the page still loads and every adapter call
answers `503 {"error":"home_assistant_unavailable"}`, which `app.js` already treats as "no data".
Without coordinates the weather card reads `Weather unavailable`.

## Pointing it at your house

`src/main/resources/static/dashboard/config.js` maps dashboard cards to Home Assistant entity ids.
The ids committed here are placeholders — replace them with your own, which
**Developer Tools → States** in Home Assistant will list.

This file is served to the browser and committed to git, so it holds no token, no coordinates, and
nothing that identifies a particular house. Keep it that way; if you want your real entity ids to
stay out of your own commits:

```bash
git update-index --skip-worktree src/main/resources/static/dashboard/config.js
```

## Configuration

Everything sensitive is an environment variable.

| Setting | Environment variable | Default |
| --- | --- | --- |
| `home-assistant.base-url` | `HOME_ASSISTANT_BASE_URL` | empty |
| `home-assistant.token` | `HOME_ASSISTANT_TOKEN` | empty |
| `home-assistant.connect-timeout` | — | `3s` |
| `home-assistant.read-timeout` | — | `8s` |
| `home-assistant.allowed-service-domains` | — | see below |
| `dashboard.weather.latitude` | `DASHBOARD_LATITUDE` | empty |
| `dashboard.weather.longitude` | `DASHBOARD_LONGITUDE` | empty |
| `dashboard.weather.timezone` | `DASHBOARD_TIMEZONE` | `auto` |
| `dashboard.weather.forecast-days` | — | `7` |
| `server.port` | `SERVER_PORT` | `8080` |

`/actuator/health` is exposed for a quick "is it up" check, and is what the container healthcheck
uses.

## The adapter

Routes mirror the Home Assistant REST API, so `app.js` can use Home Assistant style paths directly:

| Dashboard call | Forwarded to |
| --- | --- |
| `GET /states/{entityId}` | `GET {baseUrl}/api/states/{entityId}` |
| `GET /calendars/{entityId}?start=&end=` | `GET {baseUrl}/api/calendars/{entityId}?start=&end=` |
| `POST /services/{domain}/{service}` | `POST {baseUrl}/api/services/{domain}/{service}` |

All under `/api/dashboard/home-assistant`. Status codes and bodies pass through untouched, because
the dashboard relies on them — a `404` for an unplugged outdoor light is how a row learns to hide
itself.

Two guards sit in front of the proxy:

- entity ids must look like `light.family_room_fan`, and domains and services must be plain
  lowercase names;
- service calls are limited to `home-assistant.allowed-service-domains` in `application.yml`
  (`switch`, `light`, `fan`, `media_player`, `automation`, `scene`, `script`, `cover`, `climate`,
  `input_boolean`, `button`). Add to that list when the dashboard grows a new control.

`GET /api/dashboard/home-assistant/status` is not used by the dashboard but is handy while wiring
things up: it reports whether the URL and token are set and whether Home Assistant answers.

`GET /api/dashboard/weather` calls Open-Meteo with the configured coordinates and returns its JSON
untouched. Responses carry a five minute `Cache-Control`, which absorbs tablet reloads between the
dashboard's own ten minute refresh.

## Layout

```
Dockerfile                               multi-stage build, JRE runtime, non-root
docker-compose.yml                       what runs on the server
.github/workflows/                       tests on every push, image published from main
src/main/java/com/homedashboard/
  config/                                settings binding and the startup summary
  service/                               Home Assistant and Open-Meteo REST clients
  web/                                   the proxy, weather and static-routing controllers
src/main/resources/
  application.yml
  static/dashboard/                      index.html, styles.css, app.js, config.js
src/test/java/com/homedashboard/         MockMvc coverage for the routes above
```

## Tests

```bash
./mvnw test
```

`HomeAssistantProxyControllerTest` covers the adapter contract `app.js` depends on: pass-through,
calendar query parameters, service bodies, the entity-id and allow-list guards, and the unreachable
case. `WeatherControllerTest` covers the forecast route. `HomeDashboardApplicationTests` boots the
whole app, checks the routes and static assets, and asserts the served `config.js` carries no
coordinates.

The front end has no test suite. The useful check is:

```bash
node --check src/main/resources/static/dashboard/app.js
```

## License

MIT — see [LICENSE](LICENSE).
