FROM node:22-alpine

LABEL maintainer="Bruno <engineering@usebruno.com>"

ARG BRUNO_VERSION
ENV BRUNO_VERSION=${BRUNO_VERSION}

ENV LC_ALL="en_US.UTF-8" \
    LANG="en_US.UTF-8" \
    LANGUAGE="en_US.UTF-8"

# If BRUNO_VERSION is provided, validate it is a valid semver before installing
RUN if [ -n "$BRUNO_VERSION" ]; then \
        if [ ! $(echo $BRUNO_VERSION | grep -oE "^[0-9]+\.[0-9]+\.[0-9]+$") ]; then \
            echo "\033[0;31mA valid semver Bruno version is required in the BRUNO_VERSION build-arg (e.g. 1.16.0)\033[0m"; \
            exit 1; \
        fi; \
    fi && \
    npm install -g @usebruno/cli${BRUNO_VERSION:+@${BRUNO_VERSION}}

WORKDIR /bruno

USER node

ENTRYPOINT ["bru"]
CMD []
