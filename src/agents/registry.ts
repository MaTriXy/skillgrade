/**
 * Agent registry — maps agent names to their implementations.
 *
 * Supported agents:
 *   - gemini: Google Gemini CLI
 *   - claude: Anthropic Claude Code CLI
 *   - codex: OpenAI Codex CLI
 */
import { BaseAgent } from '../types';
import { GeminiAgent } from './gemini';
import { ClaudeAgent } from './claude';
import { CodexAgent } from './codex';

/** Registry of available agent implementations */
const AGENT_REGISTRY: Record<string, () => BaseAgent> = {
    gemini: () => new GeminiAgent(),
    claude: () => new ClaudeAgent(),
    codex: () => new CodexAgent(),
};

/** Get the list of supported agent names */
export function getAgentNames(): string[] {
    return Object.keys(AGENT_REGISTRY);
}

/** Create an agent instance by name. Throws if the name is unknown. */
export function createAgent(name: string): BaseAgent {
    const factory = AGENT_REGISTRY[name];
    if (!factory) {
        const available = getAgentNames().join(', ');
        throw new Error(`Unknown agent "${name}". Available agents: ${available}`);
    }
    return factory();
}
