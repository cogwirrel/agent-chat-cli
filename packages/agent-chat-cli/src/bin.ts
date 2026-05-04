#!/usr/bin/env node
/**
 * agent-chat-cli — Interactive chat client for A2A and AG-UI protocol agents.
 *
 * Usage:
 *   agent-chat-cli a2a [url]     Chat with an A2A agent (default: http://localhost:9000)
 *   agent-chat-cli agui [url]    Chat with an AG-UI agent (default: http://localhost:8000)
 */
import { chatLoop } from './chat-loop.js';
import { A2AChatAdapter } from './a2a/adapter.js';
import { AGUIChatAdapter } from './agui/adapter.js';

const DEFAULTS: Record<string, string> = {
  a2a: 'http://localhost:9000',
  agui: 'http://localhost:8000',
};

const protocol = process.argv[2];
const url = process.argv[3];

if (!protocol || !['a2a', 'agui'].includes(protocol)) {
  console.error(`Usage: agent-chat-cli <a2a|agui> [url]

Commands:
  a2a   Chat with an A2A protocol agent
  agui  Chat with an AG-UI protocol agent

Examples:
  agent-chat-cli a2a
  agent-chat-cli a2a http://localhost:9000
  agent-chat-cli agui
  agent-chat-cli agui http://localhost:8000`);
  process.exit(1);
}

const adapter =
  protocol === 'a2a' ? new A2AChatAdapter() : new AGUIChatAdapter();
const resolvedUrl = url || DEFAULTS[protocol];

chatLoop(adapter, resolvedUrl).catch((err: unknown) => {
  console.error('Fatal:', err instanceof Error ? err.message : err);
  process.exit(1);
});
