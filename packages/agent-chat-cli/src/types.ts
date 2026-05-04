/**
 * Configuration returned when connecting to an agent.
 */
export interface ChatAdapterConfig {
  agentName: string;
  description?: string;
}

/**
 * Common interface for chat adapters (A2A, AG-UI, etc.).
 */
export interface ChatAdapter {
  /** Connect to the agent at the given URL and return its metadata. */
  connect(url: string): Promise<ChatAdapterConfig>;

  /** Send a user message and stream back response tokens. */
  sendMessage(text: string): AsyncIterable<string>;
}
