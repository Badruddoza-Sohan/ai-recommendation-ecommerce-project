import WebSocket from 'ws';

console.log("Connecting to WebSocket...");
const ws = new WebSocket('ws://localhost:8080/api/ai/stream?sessionId=test-session-123&type=support');

ws.on('open', () => {
  console.log("WebSocket connected.");
  console.log("Sending message...");
  ws.send(JSON.stringify({ 
    message: "Hello! How do I track my order?", 
    sessionId: "test-session-123",
    domain: "support",
    userId: 1
  }));
});

ws.on('message', (data) => {
  const message = data.toString();
  try {
    const parsed = JSON.parse(message);
    if (parsed.type === 'chunk') {
      process.stdout.write(parsed.content);
    } else if (parsed.type === 'done') {
      console.log("\n\n[Done receiving stream]");
      ws.close();
    } else if (parsed.type === 'error') {
      console.error("\n[Error from server]:", parsed.error);
      ws.close();
    }
  } catch (e) {
    console.log("Received raw message:", message);
  }
});

ws.on('error', (err) => {
  console.error("WebSocket error:", err);
});

ws.on('close', () => {
  console.log("WebSocket closed.");
});
