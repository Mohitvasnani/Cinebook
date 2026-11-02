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

# Tuned for a very small container: Render's free instance is 0.1 CPU and
# 512MB. Each flag earns its place.
#
#   MaxRAMPercentage=70   The JVM defaults to a quarter of available memory,
#                         which wastes most of 512MB. 70 rather than 75 leaves
#                         room for metaspace, thread stacks and the JVM itself,
#                         which live outside the heap.
#   UseSerialGC           G1 runs concurrent collector threads, which is a poor
#                         trade on a tenth of a core. Serial has the smallest
#                         footprint and the least overhead at this size.
#   TieredStopAtLevel=1   Compile with C1 only and never promote to C2. Startup
#                         gets noticeably cheaper because the JIT does far less
#                         work; peak throughput is lower, which does not matter
#                         for a demo serving a handful of requests.
#   Xss512k               Smaller thread stacks. Tomcat starts around 200
#                         threads, so the default 1MB each is real memory.
ENTRYPOINT ["java", \
  "-XX:MaxRAMPercentage=70", \
  "-XX:+UseSerialGC", \
  "-XX:TieredStopAtLevel=1", \
  "-Xss512k", \
  "-jar", "/app/app.jar"]
