#!/usr/bin/env node
/**
 * agent-chat-cli — Interactive chat client for A2A and AG-UI protocol agents.
 */
import { parseArgs } from 'node:util';
import { chatLoop } from './chat-loop.js';
import { A2AChatAdapter } from './a2a/adapter.js';
import { AGUIChatAdapter } from './agui/adapter.js';

const DEFAULTS: Record<string, string> = {
  a2a: 'http://localhost:9000',
  agui: 'http://localhost:8000',
};

const HELP = `agent-chat-cli — A minimal terminal chat client for A2A and AG-UI protocol agents.

Usage:
  agent-chat-cli <a2a|agui> [url] [options]

Commands:
  a2a   Chat with an A2A protocol agent (default URL: ${DEFAULTS.a2a})
  agui  Chat with an AG-UI protocol agent (default URL: ${DEFAULTS.agui})

Options:
  --connect-timeout <ms>         Max time to wait for connection (default: 20000)
  --connect-retry-interval <ms>  Retry interval between attempts (default: 1000)
  --help, -h                     Show this help message

Examples:
  agent-chat-cli a2a
  agent-chat-cli a2a http://my-agent:9000
  agent-chat-cli agui
  agent-chat-cli agui http://my-agent:8000
  agent-chat-cli a2a --connect-timeout 10000 --connect-retry-interval 2000
`;

const { values, positionals } = parseArgs({
  args: process.argv.slice(2),
  options: {
    'connect-timeout': { type: 'string' },
    'connect-retry-interval': { type: 'string' },
    help: { type: 'boolean', short: 'h' },
  },
  allowPositionals: true,
  strict: false,
});

if (values.help) {
  console.log(HELP);
  process.exit(0);
}

const protocol = positionals[0];
const url = positionals[1];

if (!protocol || !['a2a', 'agui'].includes(protocol)) {
  console.error(HELP);
  process.exit(1);
}

const timeout = values['connect-timeout']
  ? parseInt(values['connect-timeout'] as string, 10)
  : undefined;
const interval = values['connect-retry-interval']
  ? parseInt(values['connect-retry-interval'] as string, 10)
  : undefined;

const adapter =
  protocol === 'a2a' ? new A2AChatAdapter() : new AGUIChatAdapter();
const resolvedUrl = url || DEFAULTS[protocol];

chatLoop(adapter, resolvedUrl, { timeout, interval }).catch((err: unknown) => {
  console.error('Fatal:', err instanceof Error ? err.message : err);
  process.exit(1);
});
