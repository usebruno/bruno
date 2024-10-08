FROM node:18-bullseye-slim

ARG CLI_VERSION
ARG GITHUB_ACCESS_TOKEN

RUN echo "@berlingoqc:registry=https://npm.pkg.github.com" >> $HOME/.npmrc
RUN echo "//npm.pkg.github.com/:_authToken=${GITHUB_ACCESS_TOKEN}" >> $HOME/.npmrc

RUN npm install -g @berlingoqc/openbruno-cli@${CLI_VERSION}