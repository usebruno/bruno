ARG NODE_MAJOR_VERSION

FROM mcr.microsoft.com/devcontainers/javascript-node:${NODE_MAJOR_VERSION}

ENV EDITOR="code -w" VISUAL="code -w"

# install system dependencies for playwright
RUN npx --yes playwright install-deps

# uncomment to install additional npm packages
# RUN su node -c 'npm i -g cowsay@1.5.0'
