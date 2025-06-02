#!/usr/bin/env bash

################################################################################
# Bruno Development Script
#
# This script sets up and runs the Bruno development environment with hot-reloading.
# It manages concurrent processes for various packages and provides cleanup on exit.
#
# Usage:
#   From the root of the project, run:
#       ./scripts/dev-hot-reload.sh [options]
#   or
#       npm run dev:watch -- [options]
################################################################################

set -euo pipefail
IFS=$'\n\t'

################################################################################
# Configuration
################################################################################

declare -r NODE_VERSION="v22"

# Source directories to watch for changes
declare -ra ELECTRON_WATCH_PATHS=(
    "packages/**/dist/"
    "packages/bruno-electron/src/"
    "packages/bruno-lang/src/"
    "packages/bruno-lang/v2/src/"
    "packages/bruno-js/src/"
    "packages/bruno-schema/src/"
)

# Other configuration
declare -r ELECTRON_START_DELAY=10  # Seconds to wait before starting electron
declare -r NODEMON_WATCH_DELAY=1000 # Milliseconds between rebuild checks

################################################################################
# Log Level Configuration
################################################################################

declare -r LOG_LEVEL_INFO="INFO"
declare -r LOG_LEVEL_WARN="WARN"
declare -r LOG_LEVEL_ERROR="ERROR"
declare -r LOG_LEVEL_DEBUG="DEBUG"
declare -r LOG_LEVEL_SUCCESS="SUCCESS"

################################################################################
# Color Configuration
################################################################################

declare -r COLOR_RED='\033[0;31m'
declare -r COLOR_GREEN='\033[0;32m'
declare -r COLOR_YELLOW='\033[1;33m'
declare -r COLOR_BLUE='\033[0;34m'
declare -r COLOR_NC='\033[0m' # No Color

################################################################################
# Logging Functions
################################################################################

log() {
    local level=$1
    local msg=$2
    local color=""

    case "$level" in
        "$LOG_LEVEL_INFO")  color=$COLOR_GREEN ;;
        "$LOG_LEVEL_SUCCESS")  color=$COLOR_GREEN ;;
        "$LOG_LEVEL_WARN")  color=$COLOR_YELLOW ;;
        "$LOG_LEVEL_ERROR") color=$COLOR_RED ;;
        "$LOG_LEVEL_DEBUG") color=$COLOR_BLUE ;;
    esac

    if [ "$level" = "$LOG_LEVEL_ERROR" ]; then
        echo -e "${color}[${level}]${COLOR_NC} ${msg}" >&2
    else
        echo -e "${color}[${level}]${COLOR_NC} ${msg}"
    fi
}

################################################################################
# Help Documentation
################################################################################

show_help() {
    cat << EOF

Development Environment Setup for Bruno

Usage:
    From the root of the project, run:
        npm run dev:watch -- [options]
    or
        ./scripts/$(basename "$0") [options]

Options:
    -s, --setup    Clean all node_modules folders and re-install dependencies before starting
    -h, --help     Show this help message

Examples:
    # Start development environment
    npm run dev:watch

    # Start after cleaning node_modules
    npm run dev:watch -- --setup

    # Show this help
    npm run dev:watch -- --help

EOF
}

################################################################################
# Utility Functions
################################################################################

# Check if a command exists
command_exists() {
    command -v "$1" &> /dev/null
}

# Install global NPM package if not present
ensure_global_package() {
    local package_name=$1

    if ! command_exists "$package_name"; then
        log "$LOG_LEVEL_INFO" "Installing $package_name globally..."
        npm install -g "$package_name"
    fi
}

# Ensure node version is installed
ensure_node_version() {
    local version=$1 current_version=$(node -v)

    if ! echo "$current_version" | grep -q "$version" &> /dev/null; then
        log "$LOG_LEVEL_ERROR" "Node $version is required but currently installed version is $current_version"
        log "$LOG_LEVEL_ERROR" "Please install node $version and try again."
        log "$LOG_LEVEL_ERROR" "You can run 'nvm install $version' to install it, or 'nvm use $version' if it's already installed."
        exit 1
    fi
}

# Clean all node_modules directories
clean_node_modules() {
    log "$LOG_LEVEL_INFO" "Removing all node_modules directories..."
    find . -name "node_modules" -type d -prune -exec rm -rf {} +
    log "$LOG_LEVEL_SUCCESS" "Node modules cleanup completed"
}

# Re-install dependencies
re_install_dependencies() {
    log "$LOG_LEVEL_INFO" "Re-installing dependencies..."
    npm install --legacy-peer-deps
    log "$LOG_LEVEL_SUCCESS" "Dependencies re-installation completed"
}

################################################################################
# Process Management Functions
################################################################################

# Build watch paths string for nodemon
build_watch_paths() {
    local watch_string=""
    for path in "${ELECTRON_WATCH_PATHS[@]}"; do
        watch_string+="--watch \"$path\" "
    done
    echo "$watch_string"
}

################################################################################
# Main Development Setup
################################################################################

setup_development() {
    # Build command strings
    local electron_watch_paths=$(build_watch_paths)

    log "$LOG_LEVEL_INFO" "Starting development servers..."

    # Start concurrent processes
    # shellcheck disable=SC2086
    exec npx concurrently \
        --kill-others \
        --names "common,converters,query,graphql,requests,react,electron" \
        --prefix-colors "magenta,green,blue,white,gray,cyan,yellow" \
        --prefix "[{name}]" \
        --restart-tries 3 \
        --restart-after 1000 \
        "npm run watch --workspace=packages/bruno-common" \
        "npm run watch --workspace=packages/bruno-converters" \
        "npm run watch --workspace=packages/bruno-query" \
        "npm run watch --workspace=packages/bruno-graphql-docs" \
        "npm run watch --workspace=packages/bruno-requests" \
        "npm run dev:web" \
        "sh -c '\
            sleep ${ELECTRON_START_DELAY} && \
            nodemon \
                ${electron_watch_paths} \
                --ext js,jsx,ts,tsx \
                --delay ${NODEMON_WATCH_DELAY}ms \
                --exec \"npm run dev --workspace=packages/bruno-electron\" \
        '"
}

################################################################################
# Main Script Execution
################################################################################

main() {
    local run_setup=false

    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case "$1" in
            -s|--setup) run_setup=true ;;
            -h|--help) show_help; exit 0 ;;
            *) log "$LOG_LEVEL_ERROR" "Unknown parameter: $1"; show_help; exit 1 ;;
        esac
        shift
    done

    log "$LOG_LEVEL_INFO" "Initializing Bruno development environment..."

    # Ensure required global packages
    ensure_node_version "$NODE_VERSION"
    ensure_global_package "nodemon"
    ensure_global_package "concurrently"

    # Run setup if requested
    if [[ "$run_setup" == true ]]; then
        clean_node_modules
        re_install_dependencies
    fi

    # Start development environment
    setup_development
}

# Execute main function with all arguments
main "$@"