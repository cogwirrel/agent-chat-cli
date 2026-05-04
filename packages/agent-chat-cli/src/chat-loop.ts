/**
 * Shared Clack-based chat loop used by both A2A and AG-UI CLI adapters.
 */
import * as p from '@clack/prompts';
import type { ChatAdapter } from './types.js';

/**
 * Run an interactive chat loop with the given adapter and agent URL.
 */
export async function chatLoop(
  adapter: ChatAdapter,
  url: string,
): Promise<void> {
  p.intro('Agent Chat CLI');

  const s = p.spinner();
  s.start('Connecting to agent...');

  let config;
  try {
    config = await adapter.connect(url);
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
