.PHONY: install
install:
	npm i --legacy-peer-deps

.PHONY: build-graphql
build-graphql:
	npm run build:graphql-docs

.PHONY: build-query
build-query:
	npm run build:bruno-query

.PHONY: build-common
build-common:
	npm run build:bruno-common

.PHONY: build-all
build-all: build-graphql build-query build-common

.PHONY: build-sandbox
build-sandbox:
	npm run sandbox:bundle-libraries --workspace=packages/bruno-js

.PHONY: run-web
run-web:
	npm run dev:web

.PHONY: run-app
run-app:
	npm run dev:electron

.PHONY: run-dev
run-dev:
	npm run dev