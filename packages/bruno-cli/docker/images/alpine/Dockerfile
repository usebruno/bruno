FROM node:22-alpine

LABEL maintainer="Bruno <engineering@usebruno.com>"

ARG BRUNO_VERSION
ENV BRUNO_VERSION=${BRUNO_VERSION}

LABEL org.opencontainers.image.source="https://github.com/usebruno/bruno"
LABEL org.opencontainers.image.description="Bruno CLI - Open source IDE for exploring and testing APIs"
LABEL org.opencontainers.image.licenses="MIT"
LABEL org.opencontainers.image.title="Bruno CLI"
LABEL org.opencontainers.image.version="${BRUNO_VERSION}"
LABEL org.opencontainers.image.url="https://www.usebruno.com"
LABEL org.opencontainers.image.documentation="https://docs.usebruno.com/bru-cli/overview"

ENV LC_ALL="en_US.UTF-8" \
    LANG="en_US.UTF-8" \
    LANGUAGE="en_US.UTF-8"

# If BRUNO_VERSION is provided, validate it is a valid semver before installing
RUN if [ -n "$BRUNO_VERSION" ]; then \
        if ! echo "$BRUNO_VERSION" | grep -qE "^[0-9]+\.[0-9]+\.[0-9]+$"; then \
            echo "\033[0;31mA valid semver Bruno version is required in the BRUNO_VERSION build-arg (e.g. 1.16.0)\033[0m"; \
            exit 1; \
        fi; \
    fi && \
    npm install -g @usebruno/cli${BRUNO_VERSION:+@${BRUNO_VERSION}}

WORKDIR /bruno

USER node

ENTRYPOINT ["bru"]
CMD []
