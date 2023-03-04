FROM mcr.microsoft.com/devcontainers/base:ubuntu

RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
   && apt -y install --no-install-recommends default-jdk clang

# ARG GRADLE_VERSION="6.7"
# RUN su vscode -c "source /usr/local/sdkman/bin/sdkman-init.sh && sdk install gradle \"${GRADLE_VERSION}\""

ARG GRADLE_VERSION="7.6.1"
RUN curl -L https://services.gradle.org/distributions/gradle-${GRADLE_VERSION}-bin.zip -o gradle-${GRADLE_VERSION}-bin.zip
RUN apt-get install -y unzip
RUN unzip gradle-${GRADLE_VERSION}-bin.zip
ENV GRADLE_HOME=/gradle-${GRADLE_VERSION}
ENV PATH=$PATH:$GRADLE_HOME/bin

RUN su vscode -c "curl -fsSL https://deno.land/x/install/install.sh | sh -s v1.31.1"
ENV DENO_INSTALL="/home/vscode/.deno"
ENV PATH="$DENO_INSTALL/bin:$PATH"
