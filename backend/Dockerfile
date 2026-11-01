# Two stages: the first has a JDK and Gradle and produces a jar, the second has
# only a JRE and the jar. The build tooling never ships, so the running image is
# a few hundred MB instead of over a gigabyte.

# ---------------------------------------------------------------- build stage
FROM eclipse-temurin:21-jdk AS build
WORKDIR /app

# Build scripts first, source second. Docker caches each layer, so editing a
# Java file does not re-download every dependency.
COPY gradlew settings.gradle build.gradle ./
COPY gradle gradle
RUN chmod +x ./gradlew && ./gradlew --no-daemon dependencies > /dev/null

COPY src src
RUN ./gradlew --no-daemon bootJar

# ------------------------------------------------------------------ run stage
FROM eclipse-temurin:21-jre
WORKDIR /app

# A container process that does not need root should not have it.
RUN useradd --system --create-home --uid 1001 app

COPY --from=build /app/build/libs/*.jar app.jar
USER app

EXPOSE 8082
# The JVM defaults to a quarter of available memory. On a 512MB box that wastes
# most of it, so give the heap a deliberate share of the container limit.
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75", "-jar", "/app/app.jar"]
