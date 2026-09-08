#!/usr/bin/env bash
set -euo pipefail

REGION="${AWS_REGION:-us-east-1}"
PROFILE_ARGS=()
if [[ -n "${AWS_PROFILE:-}" ]]; then
  PROFILE_ARGS+=(--profile "$AWS_PROFILE")
fi

if ! command -v aws >/dev/null 2>&1; then
  echo "AWS CLI v2 is required." >&2
  exit 2
fi

ACCOUNT_ID="$(aws sts get-caller-identity "${PROFILE_ARGS[@]}" --query Account --output text)"
BUDGET_LIMIT="$(aws budgets describe-budget \
  "${PROFILE_ARGS[@]}" \
  --account-id "$ACCOUNT_ID" \
  --budget-name NutriAhorro-Hackathon-Guard \
  --query 'Budget.BudgetLimit.Amount' \
  --output text 2>/dev/null || true)"

if [[ -z "$BUDGET_LIMIT" || "$BUDGET_LIMIT" == "None" ]]; then
  echo "The NutriAhorro-Hackathon-Guard budget is missing. Stop before deployment." >&2
  exit 3
fi

AUTHORIZATION="$(aws bedrock get-foundation-model-availability \
  "${PROFILE_ARGS[@]}" \
  --model-id amazon.nova-lite-v1:0 \
  --region "$REGION" \
  --query authorizationStatus \
  --output text)"

if [[ "$AUTHORIZATION" != "AUTHORIZED" ]]; then
  echo "Nova Lite is $AUTHORIZATION. Stop before deployment and wait for AWS Support." >&2
  exit 4
fi

NOVA_REPLY="$(aws bedrock-runtime converse \
  "${PROFILE_ARGS[@]}" \
  --model-id amazon.nova-lite-v1:0 \
  --messages '[{"role":"user","content":[{"text":"Reply only OK."}]}]' \
  --inference-config '{"maxTokens":5,"temperature":0}' \
  --region "$REGION" \
  --query 'output.message.content[0].text' \
  --output text)"

echo "AWS preflight passed in $REGION. Budget: USD $BUDGET_LIMIT. Nova: $NOVA_REPLY"
