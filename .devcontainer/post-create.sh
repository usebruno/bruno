#!/usr/bin/env zsh

set -eo pipefail

# when in a VS Code or GitHub Codespaces devcontainer
if [ -n "${REMOTE_CONTAINERS}" ]; then
	this_dir=$(cd -P -- "$(dirname -- "$(command -v -- "$0")")" && pwd -P)
	workspace_root=$(realpath ${this_dir}/..)

	# perform additional one-time setup just after
	# the devcontainer is created
	zsh "$NVM_DIR/nvm.sh" --install                             # install nvm node version
	npm install --legacy-peer-deps --prefix "${workspace_root}" # install workspace node dependencies
	npx --yes playwright install                                # install playwright browsers
	npm run build:graphql-docs                                  # initial graphql-docs build
	npm run build:bruno-query                                   # initial bruno-query build

	# configure SUID mode and owner (https://github.com/electron/electron/issues/17972)
	suid_sandbox="${workspace_root}/packages/bruno-electron/node_modules/electron/dist/chrome-sandbox"
	if [ -f "${suid_sandbox}" ]; then
		sudo chown root:root "${suid_sandbox}" && sudo chmod 4755 "${suid_sandbox}"
	fi

fi
