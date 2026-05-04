/**
 * AG-UI Chat Adapter — uses HttpAgent from @ag-ui/client to communicate with
 * an AG-UI-compatible agent via SSE events.
 */
import { HttpAgent } from '@ag-ui/client';
import type { ChatAdapter, ChatAdapterConfig } from '../types.js';

/**
 * Simple async queue that bridges callback-based SSE events to an
 * async generator consumable by Clack's stream.message().
 */
class AsyncQueue<T> {
  private queue: T[] = [];
  private resolve: ((value: IteratorResult<T>) => void) | null = null;
  private done = false;

  push(value: T): void {
    if (this.resolve) {
      const r = this.resolve;
      this.resolve = null;
      r({ value, done: false });
    } else {
      this.queue.push(value);
    }
  }

  end(): void {
    this.done = true;
    if (this.resolve) {
      const r = this.resolve;
      this.resolve = null;
      r({ value: undefined as unknown as T, done: true });
    }
  }

  error(err: Error): void {
    this.push(`\n❌ Error: ${err.message}` as unknown as T);
    this.end();
  }

  [Symbol.asyncIterator](): AsyncIterator<T> {
    return {
      next: (): Promise<IteratorResult<T>> => {
        if (this.queue.length > 0) {
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          return Promise.resolve({ value: this.queue.shift()!, done: false });
        }
        if (this.done) {
          return Promise.resolve({
            value: undefined as unknown as T,
            done: true,
          });
        }
        return new Promise<IteratorResult<T>>((resolve) => {
          this.resolve = resolve;
        });
      },
    };
  }
}

import type { Message } from '@ag-ui/client';

export class AGUIChatAdapter implements ChatAdapter {
  private agentUrl = '';
  private messages: Message[] = [];
  private threadId = crypto.randomUUID();

  async connect(url: string): Promise<ChatAdapterConfig> {
    this.agentUrl = url;
    return {
      agentName: 'AG-UI Agent',
      description: `Connected to ${url}`,
    };
  }

  async *sendMessage(text: string): AsyncIterable<string> {
    const queue = new AsyncQueue<string>();

    // Add user message to conversation history
    this.messages.push({
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
    });

    // Create agent with full conversation history for context
    const agent = new HttpAgent({
      url: this.agentUrl,
      threadId: this.threadId,
      initialMessages: [...this.messages],
    });

    // Fire and forget — the subscriber callbacks push to the queue
    agent
      .runAgent(
        {},
        {
          onTextMessageContentEvent(params): void {
            const delta = String(
              (params.event as Record<string, unknown>).delta ?? '',
            );
            queue.push(delta);
          },
          onToolCallStartEvent(params): void {
            const name = String(
              (params.event as Record<string, unknown>).toolCallName ??
                'unknown',
            );
            queue.push(`\n🔧 Tool: ${name}(`);
          },
          onToolCallArgsEvent(params): void {
            const delta = String(
              (params.event as Record<string, unknown>).delta ?? '',
            );
            queue.push(delta);
          },
          onToolCallEndEvent(): void {
            queue.push(')');
          },
          onToolCallResultEvent(params): void {
            const content = String(
              (params.event as Record<string, unknown>).content ?? '',
            );
            queue.push(` → ${content}\n`);
          },
          onRunFinalized(): void {
            queue.end();
          },
          onRunFailed(params): void {
            queue.error(params.error);
          },
        },
      )
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err);
        queue.error(new Error(message));
      });

    // Yield tokens and collect text for message history
    const textParts: string[] = [];
    for await (const token of queue) {
      textParts.push(token);
      yield token;
    }

    // Add assistant response to conversation history
    const assistantText = textParts.join('');
    if (assistantText) {
      this.messages.push({
        id: crypto.randomUUID(),
        role: 'assistant',
        content: assistantText,
      });
    }
  }
}
