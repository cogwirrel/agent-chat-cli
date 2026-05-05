/**
 * Shared Clack-based chat loop used by both A2A and AG-UI CLI adapters.
 */
import * as p from '@clack/prompts';
import type { ChatAdapter } from './types.js';

export interface ChatLoopOptions {
  /** Maximum time to wait for connection in milliseconds (default: 20000) */
  timeout?: number;
  /** Interval between connection retries in milliseconds (default: 1000) */
  interval?: number;
}

/**
 * Retry connecting to the agent with a timeout and interval.
 */
async function connectWithRetry(
  adapter: ChatAdapter,
  url: string,
  timeout: number,
  interval: number,
  spinner: ReturnType<typeof p.spinner>,
): Promise<Awaited<ReturnType<ChatAdapter['connect']>>> {
  const deadline = Date.now() + timeout;
  let lastError: Error | undefined;
  let attempt = 0;

  while (Date.now() < deadline) {
    attempt++;
    try {
      return await adapter.connect(url);
    } catch (err: unknown) {
      lastError = err instanceof Error ? err : new Error(String(err));
      const remaining = Math.max(0, deadline - Date.now());
      if (remaining <= 0) break;
      spinner.message(
        `Retrying... (attempt ${attempt}, ${Math.ceil(remaining / 1000)}s remaining)`,
      );
      await new Promise((resolve) =>
        setTimeout(resolve, Math.min(interval, remaining)),
      );
    }
  }

  throw lastError ?? new Error('Connection timed out');
}

/**
 * Run an interactive chat loop with the given adapter and agent URL.
 */
export async function chatLoop(
  adapter: ChatAdapter,
  url: string,
  options?: ChatLoopOptions,
): Promise<void> {
  const timeout = options?.timeout ?? 20000;
  const interval = options?.interval ?? 1000;

  p.intro('Agent Chat CLI');

  const s = p.spinner();
  s.start('Connecting to agent...');

  let config;
  try {
    config = await connectWithRetry(adapter, url, timeout, interval, s);
    s.stop(`Connected to ${config.agentName}`);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    s.stop(`Failed: ${message}`);
    p.outro('Exiting.');
    process.exit(1);
  }

  if (config.description) {
    p.log.info(config.description);
  }

  // Chat loop
  while (true) {
    const input = await p.text({
      message: `You → ${config.agentName}`,
      placeholder: 'Type a message... (Ctrl+C to exit)',
    });

    if (p.isCancel(input)) {
      p.outro('Goodbye!');
      process.exit(0);
    }

    const trimmed = (input as string).trim();
    if (!trimmed) continue;

    // Stream the response with Clack's stream.message (renders token by token)
    await p.stream.message(adapter.sendMessage(trimmed), { symbol: '🤖' });
  }
}
