/**
 * A2A Chat Adapter — uses @a2a-js/sdk ClientFactory to communicate with
 * an A2A-compatible agent.
 */
import { ClientFactory } from '@a2a-js/sdk/client';
import type { ChatAdapter, ChatAdapterConfig } from '../types.js';

/** Minimal shape of a text part in an A2A event. */
interface A2ATextPart {
  kind: 'text';
  text: string;
}

/** Minimal shape of an artifact-update event. */
interface A2AArtifactUpdate {
  kind: 'artifact-update';
  artifact?: { parts?: A2ATextPart[] };
}

/** Minimal shape of a status-update event. */
interface A2AStatusUpdate {
  kind: 'status-update';
  contextId?: string;
  status?: { message?: { parts?: A2ATextPart[] } };
}

/** Minimal shape of a task event. */
interface A2ATaskEvent {
  kind: 'task';
  contextId?: string;
}

type A2AEvent =
  | A2AArtifactUpdate
  | A2AStatusUpdate
  | A2ATaskEvent
  | { kind: string; contextId?: string };

export class A2AChatAdapter implements ChatAdapter {
  private client!: Awaited<
    ReturnType<InstanceType<typeof ClientFactory>['createFromUrl']>
  >;
  private agentName = 'Agent';
  private contextId: string | undefined;

  async connect(url: string): Promise<ChatAdapterConfig> {
    const factory = new ClientFactory();
    this.client = await factory.createFromUrl(url);
    const card = await this.client.getAgentCard();
    this.agentName =
      ((card as unknown as Record<string, unknown>).name as string) ?? 'Agent';
    const description = (card as unknown as Record<string, unknown>)
      .description as string | undefined;
    return { agentName: this.agentName, description };
  }

  async *sendMessage(text: string): AsyncIterable<string> {
    // Build the message, including contextId for session continuity
    const message = {
      messageId: crypto.randomUUID(),
      kind: 'message' as const,
      role: 'user' as const,
      parts: [{ kind: 'text' as const, text }],
      ...(this.contextId ? { contextId: this.contextId } : {}),
    };

    const stream = this.client.sendMessageStream({ message });

    for await (const event of stream) {
      const ev = event as A2AEvent;

      // Capture contextId from any event that carries it
      if ('contextId' in ev && ev.contextId && !this.contextId) {
        this.contextId = ev.contextId;
      }

      if (ev.kind === 'artifact-update') {
        const parts = (ev as A2AArtifactUpdate).artifact?.parts ?? [];
        for (const part of parts) {
          if (part.kind === 'text') {
            yield part.text;
          }
        }
      } else if (ev.kind === 'status-update') {
        // Capture contextId from status updates too
        const statusEv = ev as A2AStatusUpdate;
        if (statusEv.contextId && !this.contextId) {
          this.contextId = statusEv.contextId;
        }
        const status = statusEv.status;
        if (status?.message?.parts) {
          for (const part of status.message.parts) {
            if (part.kind === 'text') {
              yield part.text;
            }
          }
        }
      }
    }
  }
}
