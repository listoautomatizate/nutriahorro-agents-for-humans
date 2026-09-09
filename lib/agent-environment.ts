import { env } from 'cloudflare:workers';

type AgentEnvironment = {
  NUTRIAHORRO_AGENT_URL?: string;
  NUTRIAHORRO_AGENT_TOKEN?: string;
};

const runtimeEnvironment = env as unknown as AgentEnvironment;

export function getAgentEnvironment() {
  return {
    url: (runtimeEnvironment.NUTRIAHORRO_AGENT_URL || process.env.NUTRIAHORRO_AGENT_URL || '').replace(/\/$/, ''),
    token: runtimeEnvironment.NUTRIAHORRO_AGENT_TOKEN || process.env.NUTRIAHORRO_AGENT_TOKEN || '',
  };
}
