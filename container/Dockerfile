FROM node:25.9.0-alpine3.22

WORKDIR /bruno
RUN chown -R nobody:nobody /bruno

ARG BRUNO_VERSION=3.2.2
RUN npm install -g --no-fund --no-audit @usebruno/cli@${BRUNO_VERSION}

USER nobody

ENTRYPOINT ["bru"]
CMD ["run"]
