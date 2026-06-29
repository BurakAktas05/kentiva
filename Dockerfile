# Build stage
FROM maven:3.9.6-eclipse-temurin-21 AS build
WORKDIR /app
COPY backend/pom.xml .
RUN mvn dependency:go-offline -B
COPY backend/src ./src
RUN mvn clean package -DskipTests -B

# Run stage
FROM eclipse-temurin:21-jre
WORKDIR /app
RUN apt-get update \
 && apt-get install -y --no-install-recommends curl \
 && rm -rf /var/lib/apt/lists/* \
 && useradd --system --create-home --shell /usr/sbin/nologin appuser \
 && mkdir -p /app/uploads \
 && chown -R appuser:appuser /app
COPY --from=build /app/target/*.jar app.jar

# Railway PORT desteği
ENV PORT=8080
EXPOSE ${PORT}

HEALTHCHECK --interval=30s --timeout=5s --start-period=45s --retries=5 \
  CMD sh -c 'curl --fail --silent "http://127.0.0.1:${PORT}/actuator/health/readiness" > /dev/null || exit 1'

USER appuser

# JVM optimizasyonları — Railway container'ları için
ENTRYPOINT ["java", \
  "-XX:+UseContainerSupport", \
  "-XX:MaxRAMPercentage=75.0", \
  "-Djava.security.egd=file:/dev/./urandom", \
  "-jar", "app.jar"]
