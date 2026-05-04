# agent-chat-cli

A minimal terminal chat client for [A2A](https://a2a-protocol.org/) and [AG-UI](https://docs.ag-ui.com/) protocol agents.

## Install

```bash
npm install -g agent-chat-cli
```

Or run directly with npx:

```bash
npx agent-chat-cli a2a
npx agent-chat-cli agui
```

## Usage

```
agent-chat-cli <a2a|agui> [url]
```

### A2A Protocol

Chat with an [Agent-to-Agent (A2A)](https://a2a-protocol.org/) compatible agent:

```bash
# Default: http://localhost:9000
agent-chat-cli a2a

# Custom URL
agent-chat-cli a2a http://my-agent:9000
```

**Example session:**

```
┌  Agent Chat CLI
│
◇  Connected to MyAgent
│
●  A Strands Agent exposed via the Agent-to-Agent (A2A) protocol.
│
◇  You → MyAgent
│  what is 5 times 3?
│
🤖 5 × 3 = 15! ✨
│
◇  You → MyAgent
│  and that plus 7?
│
🤖 15 + 7 = 22! 🔮
```

### AG-UI Protocol

Chat with an [AG-UI](https://docs.ag-ui.com/) compatible agent:

```bash
# Default: http://localhost:8000
agent-chat-cli agui

# Custom URL
agent-chat-cli agui http://my-agent:8000
```

**Example session with tool calls:**

```
┌  Agent Chat CLI
│
◇  Connected to AG-UI Agent
│
●  Connected to http://localhost:8000
│
◇  You → AG-UI Agent
│  what is 999 - 23?
│
🤖 Let me consult my spellbook! 🧙‍♂️✨
│  🔧 Tool: subtract({"a": 999, "b": 23}) → 976
│  The result is **976**! 🔮
```

## License

MIT
