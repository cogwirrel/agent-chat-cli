import { describe, it, expect } from 'vitest';
import { A2AChatAdapter, AGUIChatAdapter, chatLoop } from './index.js';
import type { ChatAdapter, ChatAdapterConfig } from './index.js';

describe('agent-chat-cli', () => {
  describe('exports', () => {
    it('should export A2AChatAdapter', () => {
      expect(A2AChatAdapter).toBeDefined();
      expect(typeof A2AChatAdapter).toBe('function');
    });

    it('should export AGUIChatAdapter', () => {
      expect(AGUIChatAdapter).toBeDefined();
      expect(typeof AGUIChatAdapter).toBe('function');
    });

    it('should export chatLoop', () => {
      expect(chatLoop).toBeDefined();
      expect(typeof chatLoop).toBe('function');
    });
  });

  describe('A2AChatAdapter', () => {
    it('should implement ChatAdapter interface', () => {
      const adapter: ChatAdapter = new A2AChatAdapter();
      expect(typeof adapter.connect).toBe('function');
      expect(typeof adapter.sendMessage).toBe('function');
    });

    it('should read the agent card and yield text from v1 StreamResponse events', async () => {
      // A fake client emitting v1.0-shaped StreamResponse payloads. This locks
      // in the v1 proto event contract the adapter parses (artifactUpdate /
      // statusUpdate / message with `content: { $case: 'text', value }`).
      const fakeClient = {
        getAgentCard: async () => ({
          name: 'Test Agent',
          description: 'A test agent.',
        }),
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        sendMessageStream: (_params: unknown) =>
          (async function* () {
            yield {
              payload: {
                $case: 'task',
                value: { contextId: 'ctx-1' },
              },
            };
            yield {
              payload: {
                $case: 'artifactUpdate',
                value: {
                  artifact: {
                    parts: [{ content: { $case: 'text', value: 'Hello' } }],
                  },
                },
              },
            };
            yield {
              payload: {
                $case: 'statusUpdate',
                value: {
                  status: {
                    message: {
                      parts: [{ content: { $case: 'text', value: ' world' } }],
                    },
                  },
                },
              },
            };
          })(),
      };
      const fakeFactory = {
        createFromUrl: async () => fakeClient,
      } as unknown as ConstructorParameters<
        typeof A2AChatAdapter
      >[0]['clientFactory'];

      const adapter = new A2AChatAdapter({ clientFactory: fakeFactory });
      const config = await adapter.connect('http://localhost:9000');
      expect(config.agentName).toBe('Test Agent');
      expect(config.description).toBe('A test agent.');

      let out = '';
      for await (const chunk of adapter.sendMessage('hi')) {
        out += chunk;
      }
      expect(out).toBe('Hello world');
    });
  });

  describe('AGUIChatAdapter', () => {
    it('should implement ChatAdapter interface', () => {
      const adapter: ChatAdapter = new AGUIChatAdapter();
      expect(typeof adapter.connect).toBe('function');
      expect(typeof adapter.sendMessage).toBe('function');
    });

    it('should return config on connect', async () => {
      const adapter = new AGUIChatAdapter();
      const config: ChatAdapterConfig = await adapter.connect(
        'http://localhost:8000',
      );
      expect(config.agentName).toBe('AG-UI Agent');
      expect(config.description).toContain('http://localhost:8000');
    });
  });
});
