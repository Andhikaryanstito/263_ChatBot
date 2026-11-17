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
      return res.status(400).json({
        error: "message harus berupa array."
      });
    }

    // Daftar model gratis OpenRouter (otomatis fallback jika salah satu sedang penuh/rate-limited)
    const candidateModels = [
      process.env.MODEL,
      "openrouter/free",
      "nvidia/nemotron-3-ultra-550b-a55b:free",
      "meta-llama/llama-3.3-70b-instruct:free"
    ].filter(Boolean);

    // Konteks sistem agar AI selalu mengetahui waktu dan tahun saat ini
    const systemPrompt = {
      role: "system",
      content: `Kamu adalah Chatbot AI asisten pintar dan ramah berbahasa Indonesia. Tahun saat ini adalah 2026 (bulan November 2026). Jika pengguna menanyakan waktu atau perkembangan saat ini, gunakan acuan waktu tahun 2026 tersebut.`
    };

    // Gabungkan system prompt dengan pesan user
    const fullMessages = [systemPrompt, ...message.filter(m => m.role !== 'system')];

    let response = null;

    for (const modelName of candidateModels) {
      response = await fetch(
        "https://openrouter.ai/api/v1/chat/completions", 
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`
          },
          body: JSON.stringify({
            model: modelName,
            messages: fullMessages,
            temperature: 0.7,
            max_tokens: 1000,
            stream: true
          })
        }
      );

      // Jika berhasil, lanjut streaming
      if (response.ok) {
        break;
      }

      console.warn(`Model ${modelName} terkena limit (${response.status}), otomatis mencoba model cadangan...`);
    }
    
    if (!response || !response.ok) {
      const errorData = await response.text();
      console.error("Error response from OpenRouter API:", errorData);
      return res.status(response ? response.status : 500).json({
        error: errorData
      });
    }

    // Header untuk streaming SSE
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      buffer += decoder.decode(value, { 
        stream: true 
      });
       
      const lines = buffer.split("\n");
      buffer = lines.pop();

      for (const line of lines) {
        const trimmedLine = line.trim();

        if (!trimmedLine || !trimmedLine.startsWith("data:")) {
          continue;
        }

        const data = trimmedLine.slice(5).trim();

        if (data === "[DONE]") {
          continue;
        }

        try {
          const json = JSON.parse(data);
          const content = json.choices?.[0]?.delta?.content;

          if (content) {
            res.write(`data: ${JSON.stringify(content)}\n\n`);
          }
        } catch (error) {
          console.error("Gagal parsing streaming data:", error);
        }
      }
    }

    res.write("data: [DONE]\n\n");
    res.end();

  } catch (error) {
    console.error("Server Error:", error);

    if (!res.headersSent) {
      res.status(500).json({
        error: "Terjadi kesalahan pada server"
      });
    } else {
      res.write(`data: ${JSON.stringify("Terjadi kesalahan pada server")}\n\n`);
      res.end();
    }
  }
});

// Jalankan server lokal jika bukan di serverless environment Vercel
if (!process.env.VERCEL) {
  app.listen(port, () => {
    console.log(`Server berjalan di http://localhost:${port}`);
  });
}

module.exports = app;
