const express = require('express');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'Public')));

app.get("/", async (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post("/api/chat", async (req, res) => {
  try {
    const message = req.body.messages || req.body.message;
    if (!message || !Array.isArray(message)) {
      return res.status(400).json({ error: "message harus berupa array." });
    }

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": Bearer \
      },
      body: JSON.stringify({
        model: "openrouter/free",
        messages: message,
        temperature: 0.7,
        max_tokens: 1000,
        stream: true
      })
    });

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(decoder.decode(value));
    }
    res.end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
