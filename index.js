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
    res.json({ status: "ok" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
