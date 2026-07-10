#!/bin/bash
# scripts/setup-fly-secrets.sh
# Parses .env.local to extract commented staging or production variables and sets them on Fly.io
# Usage: ./scripts/setup-fly-secrets.sh

ENV_FILE=".env.local"
if [ ! -f "$ENV_FILE" ]; then
    echo "Error: $ENV_FILE not found in the root directory."
    exit 1
fi

if ! command -v flyctl &> /dev/null && ! command -v fly &> /dev/null; then
    echo "Error: flyctl or fly command not found. Please install Fly CLI first."
    exit 1
fi

FLY_BIN=$(command -v flyctl || command -v fly)

echo "=== Fly.io Secrets Setup ==="
echo "1) Load and set STAGING secrets from .env.local"
echo "2) Load and set PRODUCTION secrets from .env.local"
read -p "Select environment (1 or 2): " env_choice

if [ "$env_choice" = "1" ]; then
    echo "Parsing STAGING secrets..."
    # Read lines between STAGING and PRODUCTION section, extract commented variables
    SECRETS=$(sed -n '/ENVIRONMENT: STAGING/,/ENVIRONMENT: PRODUCTION/p' "$ENV_FILE" | grep -E '^#\s*[A-Z_]+=' | sed 's/^#\s*//')
elif [ "$env_choice" = "2" ]; then
    echo "Parsing PRODUCTION secrets..."
    # Read lines between PRODUCTION and THIRD-PARTY section, extract commented variables
    SECRETS=$(sed -n '/ENVIRONMENT: PRODUCTION/,/THIRD-PARTY/p' "$ENV_FILE" | grep -E '^#\s*[A-Z_]+=' | sed 's/^#\s*//')
else
    echo "Invalid choice. Exiting."
    exit 1
fi

if [ -z "$SECRETS" ]; then
    echo "Error: No secrets found in the specified section of $ENV_FILE."
    exit 1
fi

# Print parsed variable names (without showing values for security)
echo "Found the following variables to set:"
echo "$SECRETS" | cut -d'=' -f1 | sed 's/^/  - /'

# Prepare arguments for fly secrets set
# Convert newline-separated list to array
IFS=$'\n' read -rd '' -a secrets_arr <<< "$SECRETS"

# Run fly secrets set
echo "Setting secrets on Fly.io..."
$FLY_BIN secrets set "${secrets_arr[@]}"

echo "Done! Secrets have been pushed to Fly.io."
