#!/usr/bin/env bash
# Creates the Always Free Arm server, retrying until Oracle has capacity.
#
# "Out of capacity for shape VM.Standard.A1.Flex" is common: free Arm hosts
# fill up and free up through the day. This script retries every availability
# domain in your region until one launch succeeds, then prints the public IP.
#
# One-time setup:
#   python3 -m venv ~/lib/oci-cli && ~/lib/oci-cli/bin/pip install oci-cli
#   ~/lib/oci-cli/bin/oci setup config   # follow the prompts, then upload the
#                           # printed public key: Profile → API keys → Add API key
#   Create the network once in the console: Networking → Virtual cloud
#   networks → Start VCN Wizard → "Create VCN with Internet Connectivity".
#
# Run (leave it going; caffeinate stops the Mac sleeping):
#   caffeinate -i infra/deployment/oracle-create.sh
#
# Optional settings (environment variables):
#   COMPARTMENT_ID   default: your tenancy (root compartment)
#   SUBNET_ID        default: the first public subnet in the compartment
#   SSH_PUBLIC_KEY   default: ~/.ssh/id_ed25519.pub
#   OCPUS / MEMORY_GB  default: 2 / 12 (Always Free allows up to 4 / 24)
#   RETRY_SECONDS    default: 60
#   NAME             default: untoldmoney-api

set -uo pipefail

SHAPE="VM.Standard.A1.Flex"
OCPUS="${OCPUS:-2}"
MEMORY_GB="${MEMORY_GB:-12}"
RETRY_SECONDS="${RETRY_SECONDS:-60}"
NAME="${NAME:-untoldmoney-api}"
SSH_PUBLIC_KEY="${SSH_PUBLIC_KEY:-$HOME/.ssh/id_ed25519.pub}"

die() { echo "Error: $*" >&2; exit 1; }
log() { echo "[$(date '+%H:%M:%S')] $*"; }

# Use the CLI from its own folder when it isn't on PATH (see setup above).
command -v oci >/dev/null || [ ! -x "$HOME/lib/oci-cli/bin/oci" ] || PATH="$HOME/lib/oci-cli/bin:$PATH"
command -v oci >/dev/null || die "OCI CLI not found. See the setup steps at the top of this script."
[ -f "$HOME/.oci/config" ] || die "No ~/.oci/config. Run: ~/lib/oci-cli/bin/oci setup config"
[ -f "$SSH_PUBLIC_KEY" ] || die "SSH public key not found at $SSH_PUBLIC_KEY (set SSH_PUBLIC_KEY)"

if [ -z "${COMPARTMENT_ID:-}" ]; then
  COMPARTMENT_ID=$(awk -F= '/^\[/{p=($0=="[DEFAULT]")} p && $1~/^tenancy/{gsub(/ /,"",$2); print $2; exit}' "$HOME/.oci/config")
  [ -n "$COMPARTMENT_ID" ] || die "Couldn't read tenancy from ~/.oci/config; set COMPARTMENT_ID"
fi

# The id of a live instance named $NAME, or nothing.
find_existing() {
  local id
  id=$(oci compute instance list --compartment-id "$COMPARTMENT_ID" --display-name "$NAME" \
    --query "data[?\"lifecycle-state\"!='TERMINATED' && \"lifecycle-state\"!='TERMINATING'].id | [0]" \
    --raw-output 2>/dev/null)
  [[ "$id" == ocid1.instance.* ]] && echo "$id"
}

finish() {
  local id="$1"
  log "Waiting for $id to start..."
  for _ in $(seq 1 60); do
    [ "$(oci compute instance get --instance-id "$id" --query 'data."lifecycle-state"' --raw-output 2>/dev/null)" = RUNNING ] && break
    sleep 10
  done
  ip=$(oci compute instance list-vnics --instance-id "$id" --query 'data[0]."public-ip"' --raw-output 2>/dev/null)
  log "Running. Public IP: ${ip:-<check the console>}"
  echo
  echo "Next: open ports 80 and 443 (README step 3), then:"
  echo "  ssh -i ${SSH_PUBLIC_KEY%.pub} ubuntu@${ip:-<IP>}"
  command -v osascript >/dev/null && osascript -e 'display notification "Oracle server created" with title "oracle-create.sh"' 2>/dev/null
  exit 0
}

# Don't create a second server if one already exists.
existing=$(find_existing)
[ -n "$existing" ] && die "An instance named $NAME already exists: $existing"

if [ -z "${SUBNET_ID:-}" ]; then
  SUBNET_ID=$(oci network subnet list --compartment-id "$COMPARTMENT_ID" \
    --query "data[?\"prohibit-public-ip-on-vnic\"==\`false\`].id | [0]" --raw-output 2>/dev/null)
  [ -n "$SUBNET_ID" ] && [ "$SUBNET_ID" != "null" ] || die "No public subnet found. Create one with the VCN Wizard (see top of this file) or set SUBNET_ID."
fi

IMAGE_ID=$(oci compute image list --compartment-id "$COMPARTMENT_ID" \
  --operating-system "Canonical Ubuntu" --operating-system-version "24.04" --shape "$SHAPE" \
  --sort-by TIMECREATED --sort-order DESC --limit 1 --query 'data[0].id' --raw-output 2>/dev/null)
[ -n "$IMAGE_ID" ] && [ "$IMAGE_ID" != "null" ] || die "Couldn't find an Ubuntu 24.04 Arm image"

ADS=$(oci iam availability-domain list --compartment-id "$COMPARTMENT_ID" \
  --query 'join(`" "`, data[].name)' --raw-output) || die "Couldn't list availability domains"

log "Shape $SHAPE ($OCPUS OCPU, $MEMORY_GB GB), Ubuntu 24.04, key $SSH_PUBLIC_KEY"
log "Availability domains: $ADS"
log "Retrying every ${RETRY_SECONDS}s until a launch succeeds. Ctrl+C to stop."

attempt=0
while true; do
  for ad in $ADS; do
    attempt=$((attempt + 1))
    # --no-retry: one quick request per attempt; this loop does the retrying.
    out=$(oci compute instance launch --no-retry \
      --compartment-id "$COMPARTMENT_ID" \
      --availability-domain "$ad" \
      --display-name "$NAME" \
      --shape "$SHAPE" \
      --shape-config "{\"ocpus\": $OCPUS, \"memoryInGBs\": $MEMORY_GB}" \
      --image-id "$IMAGE_ID" \
      --subnet-id "$SUBNET_ID" \
      --assign-public-ip true \
      --ssh-authorized-keys-file "$SSH_PUBLIC_KEY" \
      --query 'data.id' --raw-output 2>&1)

    if [[ "$out" == ocid1.instance.* ]]; then
      log "Launched in $ad: $out"
      finish "$out"
    fi

    case "$out" in
      *"Out of host capacity"*|*"Out of capacity"*|*InternalError*)
        log "Attempt $attempt ($ad): out of capacity" ;;
      *TooManyRequests*)
        log "Attempt $attempt ($ad): rate limited, waiting longer"; sleep "$RETRY_SECONDS" ;;
      *LimitExceeded*|*QuotaExceeded*)
        die "Free-tier limit reached (Always Free allows 4 OCPU / 24 GB of A1 in total). Details: $out" ;;
      *RequestException*|*"timed out"*|*"Connection"*|*"Max retries exceeded"*|*"Temporary failure"*|*"503"*|*ServiceUnavailable*)
        # Network trouble: the launch may still have gone through, so look first.
        log "Attempt $attempt ($ad): network error, checking whether it launched anyway"
        sleep 30
        existing=$(find_existing)
        [ -n "$existing" ] && { log "It did: $existing"; finish "$existing"; } ;;
      *)
        die "Launch failed for a reason retrying won't fix: $out" ;;
    esac
  done
  sleep "$RETRY_SECONDS"
done
