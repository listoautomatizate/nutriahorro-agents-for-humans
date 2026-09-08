# AWS and AgentCore deployment

This guide keeps credentials out of the repository and minimizes paid runtime. Use `us-east-1` consistently.

## Credit and cost rules

- The hackathon credit is optional until a real Bedrock or AgentCore test is required.
- Redeem a promotional code only at <https://aws.amazon.com/awscredits/> while signed into the intended billing account.
- The current AWS Free Plan includes Amazon Bedrock and Amazon Bedrock AgentCore, although a new account can still require account-level authorization. Do not change plans unless AWS Support explicitly confirms that it is necessary.
- AWS Budgets and billing alarms are alerts, not a universal guaranteed hard stop.
- This project uses Nova Lite, a 60-second idle timeout, a 15-minute maximum runtime lifetime, Lambda concurrency of two, short test prompts, and seven-day bridge log retention.
- Create a conservative USD 5 monthly budget before deployment and review it before and after every AWS test. Add an email notification only through the private AWS console. Delete the bridge and AgentCore stacks after judging if they are no longer needed.
- Never paste a promotional code, card, password, access key, or one-time code into source files, chat, screenshots, or the demo video.

## Prerequisites

1. AWS account with the required services available.
2. AWS Builder ID for the Devpost submission.
3. Amazon Bedrock model access in `us-east-1`.
4. An authenticated AWS CloudShell session.

The project defaults to `us.amazon.nova-lite-v1:0` for both agent reasoning and receipt images.

Before any deployment, run the read-only guardrail check. It stops if the AWS session, conservative budget, or Nova authorization is missing, and only performs a five-token model test after authorization succeeds:

```bash
AWS_PROFILE=nutriahorro ./scripts/aws-preflight.sh
```

Omit `AWS_PROFILE=nutriahorro` when running inside AWS CloudShell.

## Why CloudShell

CloudShell uses the current AWS session and avoids creating long-lived IAM access keys. The repository must remain free of credentials.

## Deploy the AgentCore runtime

Run these commands from AWS CloudShell after the public repository contains the final commit:

```bash
git clone https://github.com/listoautomatizate/nutriahorro-agents-for-humans.git
cd nutriahorro-agents-for-humans
npm install -g @aws/agentcore@latest
python3 -m pip install --user uv
agentcore validate --directory . --json
agentcore deploy
```

For the deployment target, select the current account and `us-east-1`. Do not use `--yes` on the first deployment: review the resources and estimated changes before confirming.

The runtime entrypoint is `agent/main.py`. AgentCore packages `agent/requirements.txt` and deploys the Strands agent using the manifest in `agentcore/agentcore.json`.

After deployment:

```bash
agentcore status --json
agentcore invoke "How am I doing on calories, protein, carbs and fat today?"
```

Record the runtime ARN from the status output. Do not publish account identifiers in screenshots.

## Deploy the secure web bridge

The web server cannot call an IAM-protected AgentCore runtime directly without credentials. `infra/agentcore-bridge.yaml` creates a least-privilege Lambda bridge that can invoke only this runtime.

Generate a private token in CloudShell:

```bash
export BRIDGE_SECRET="$(openssl rand -hex 32)"
export AGENT_RUNTIME_ARN="paste-the-runtime-arn-here"
aws cloudformation deploy --region us-east-1 --stack-name NutriAhorroBridge --template-file infra/agentcore-bridge.yaml --capabilities CAPABILITY_IAM --parameter-overrides AgentRuntimeArn="$AGENT_RUNTIME_ARN" SharedSecret="$BRIDGE_SECRET"
aws cloudformation describe-stacks --region us-east-1 --stack-name NutriAhorroBridge --query "Stacks[0].Outputs[?OutputKey=='AgentBridgeUrl'].OutputValue" --output text
```

Store the returned URL as `NUTRIAHORRO_AGENT_URL` and `BRIDGE_SECRET` as `NUTRIAHORRO_AGENT_TOKEN` in the private Sites environment. The token must never be exposed as a browser variable or committed to GitHub.

## Troubleshoot a new-account authorization block

If an Amazon Nova invocation returns `ValidationException: Operation not allowed`, check model availability before changing code or deploying resources:

```bash
aws bedrock get-foundation-model-availability \
  --model-id amazon.nova-lite-v1:0 \
  --region us-east-1 \
  --profile nutriahorro
```

When agreement, entitlement, and region are available but `authorizationStatus` is `NOT_AUTHORIZED`, stop deployment and open a free account-support case under **Account Activation > Bedrock Allowlisting**. This is an account-level restriction; do not upgrade the support plan, rotate credentials, or repeatedly invoke the model. Resume deployment only after a tiny Nova test succeeds.

## Required real tests

1. Ask for today's four nutrition metrics and verify `get_daily_progress` appears in the tool trace.
2. Ask for a meal under 20 minutes and verify `suggest_meals` returns only recipes with sufficient quantities.
3. Ask what to use first and verify `inspect_pantry` reads current expiry state.
4. Compare a nearby basket by walking and by car; verify round-trip travel cost changes.
5. Ask to register a meal; verify the agent requests confirmation.
6. Confirm once; verify all four daily totals update and exact pantry quantities decrease once.
7. Upload a readable receipt image; verify Bedrock returns editable candidates and the pantry remains unchanged until confirmation.

## Cleanup after judging

```bash
aws cloudformation delete-stack --region us-east-1 --stack-name NutriAhorroBridge
agentcore remove runtime NutriAhorroAgent
```

Confirm the exact AgentCore removal syntax with `agentcore remove --help` before running it. Never delete resources during the judging period if the submitted live demo depends on them.

## Official references

- AgentCore direct code deployment: <https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/runtime-get-started-code-deploy-python.html>
- AgentCore CLI quickstart: <https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/runtime-get-started-cli.html>
- Runtime invocation: <https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/runtime-invoke-agent.html>
- Services included in the AWS Free Plan: <https://docs.aws.amazon.com/accounts/latest/reference/supported-services-sign-up-new.html>
- Bedrock `Operation not allowed` account restriction: <https://www.repost.aws/knowledge-center/bedrock-invokemodel-api-error>
- Hackathon rules and credits: <https://agentsforhumans.devpost.com/rules>
