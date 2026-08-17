/**
 * A2A Chat Adapter — uses @a2a-js/sdk ClientFactory to communicate with
 * an A2A-compatible agent.
 *
 * The factory is configured with the v0.3 compatibility layer enabled so a
 * single client works against both v1.0 agents and pre-v1.0 agents (e.g. a
 * Strands agent pinning the Python a2a-sdk below v1.0). The factory inspects
 * each agent card's `protocolVersion` and selects the v1.0 or legacy v0.3
 * transport accordingly.
 */
import {
  ClientFactory,
  JsonRpcTransportFactory,
  RestTransportFactory,
  DefaultAgentCardResolver,
} from '@a2a-js/sdk/client';
import { Role } from '@a2a-js/sdk';
import type { ChatAdapter, ChatAdapterConfig } from '../types.js';

type A2AClientFactory = InstanceType<typeof ClientFactory>;

/** ClientFactory options with the v0.3 compatibility layer enabled. */
const legacyCompatOptions = () => ({
  transports: [
    new JsonRpcTransportFactory({ legacyCompat: { enabled: true } }),
    new RestTransportFactory({ legacyCompat: { enabled: true } }),
  ],
  cardResolver: new DefaultAgentCardResolver({
    legacyCompat: { enabled: true },
  }),
});

/** A text part in a v1.0 A2A event (`Part` with a `text` content oneof). */
interface A2ATextPart {
  content?: { $case: 'text'; value: string };
}

/** A v1.0 `StreamResponse`, whose `payload` is a discriminated union. */
interface A2AStreamResponse {
  payload?:
    | { $case: 'task'; value: { contextId?: string } }
    | { $case: 'message'; value: { contextId?: string; parts?: A2ATextPart[] } }
    | {
        $case: 'statusUpdate';
        value: {
          contextId?: string;
          status?: { message?: { parts?: A2ATextPart[] } };
        };
      }
    | {
        $case: 'artifactUpdate';
        value: { contextId?: string; artifact?: { parts?: A2ATextPart[] } };
      };
}

export class A2AChatAdapter implements ChatAdapter {
  private client!: Awaited<
    ReturnType<InstanceType<typeof ClientFactory>['createFromUrl']>
  >;
  private agentName = 'Agent';
  private contextId: string | undefined;
  private clientFactory: A2AClientFactory;

  constructor(options?: { clientFactory?: A2AClientFactory }) {
    this.clientFactory =
      options?.clientFactory ?? new ClientFactory(legacyCompatOptions());
  }

  async connect(url: string): Promise<ChatAdapterConfig> {
    this.client = await this.clientFactory.createFromUrl(url);
    const card = await this.client.getAgentCard();
    this.agentName =
      ((card as unknown as Record<string, unknown>).name as string) ?? 'Agent';
    const description = (card as unknown as Record<string, unknown>)
      .description as string | undefined;
    return { agentName: this.agentName, description };
  }

  async *sendMessage(text: string): AsyncIterable<string> {
    // Build the message, including contextId for session continuity.
    const message = {
      messageId: crypto.randomUUID(),
      contextId: this.contextId ?? '',
      taskId: '',
      role: Role.ROLE_USER,
      parts: [
        {
          content: { $case: 'text' as const, value: text },
          metadata: undefined,
          filename: '',
          mediaType: '',
        },
      ],
      metadata: undefined,
      extensions: [],
      referenceTaskIds: [],
    };

    const stream = this.client.sendMessageStream({
      message,
      tenant: '',
      configuration: undefined,
      metadata: undefined,
    });

    for await (const event of stream) {
      const payload = (event as A2AStreamResponse).payload;
      if (!payload) continue;

      // Capture contextId from any payload that carries it.
      const contextId = (payload.value as { contextId?: string }).contextId;
      if (contextId && !this.contextId) {
        this.contextId = contextId;
      }

      if (payload.$case === 'artifactUpdate') {
        const parts = payload.value.artifact?.parts ?? [];
        for (const part of parts) {
          if (part.content?.$case === 'text') {
            yield part.content.value;
          }
        }
      } else if (payload.$case === 'statusUpdate') {
        const parts = payload.value.status?.message?.parts ?? [];
        for (const part of parts) {
          if (part.content?.$case === 'text') {
            yield part.content.value;
          }
        }
      } else if (payload.$case === 'message') {
        const parts = payload.value.parts ?? [];
        for (const part of parts) {
          if (part.content?.$case === 'text') {
            yield part.content.value;
          }
        }
      }
    }
  }
}
