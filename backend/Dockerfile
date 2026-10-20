FROM maven:3.9-eclipse-temurin-25 AS build

WORKDIR /app

COPY pom.xml .
RUN mvn -B -q dependency:go-offline

COPY src ./src
RUN mvn -B -q clean package -Dmaven.test.skip=true

FROM eclipse-temurin:25-jre

WORKDIR /app

ARG SPRING_PROFILES_ACTIVE=prod
ENV SPRING_PROFILES_ACTIVE=${SPRING_PROFILES_ACTIVE}

# JVM tuned for a 1 GB container: cap heap at 75% of the cgroup memory limit,
# leave 25% for metaspace + native + direct buffers. -XX:+ExitOnOutOfMemoryError
# surfaces OOM fast instead of thrashing the GC.
ENV JVM_OPTS="-XX:MaxRAMPercentage=75.0 -XX:+ExitOnOutOfMemoryError"

COPY --from=build /app/target/*.jar app.jar

ENTRYPOINT ["sh", "-c", "exec java $JVM_OPTS -jar app.jar"]
