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
