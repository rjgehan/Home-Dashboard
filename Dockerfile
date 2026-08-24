# Stage 1 - build the jar with the Maven wrapper already in the repo.
FROM eclipse-temurin:21-jdk AS build
WORKDIR /build

# Copy the wrapper and the pom first so dependencies cache between builds.
COPY .mvn/ .mvn/
COPY mvnw pom.xml ./
RUN chmod +x mvnw && ./mvnw -B dependency:go-offline

COPY src/ src/
RUN ./mvnw -B clean package -DskipTests

# Stage 2 - run it on a JRE only, as a non-root user.
FROM eclipse-temurin:21-jre
WORKDIR /app

# curl is only here so the container healthcheck can hit /actuator/health.
RUN apt-get update \
  && apt-get install -y --no-install-recommends curl \
  && rm -rf /var/lib/apt/lists/* \
  && useradd --system --create-home --uid 10001 dashboard

USER dashboard
COPY --from=build --chown=dashboard:dashboard /build/target/*.jar app.jar

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD curl -fsS http://localhost:8080/actuator/health || exit 1

ENTRYPOINT ["java", "-jar", "/app/app.jar"]
