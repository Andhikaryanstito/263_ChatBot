const userInput = document.getElementById("user-input");
const chatBox = document.getElementById("chat-box");
const chatForm = document.getElementById("chat-form");

const messages = [];

// Fungsi untuk mengubah format Markdown menjadi HTML
function formatMarkdown(text) {
    if (!text) return "";
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/__(.*?)__/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`([^`]+)`/g, '<code style="background:#e2e8f0;padding:2px 6px;border-radius:4px;font-family:monospace;">$1</code>')
        .replace(/\n/g, '<br>');
}

function hideWelcome() {
    const hero = document.getElementById("welcome-hero");
    if (hero) hero.style.display = "none";
}

function addMessage(text, sender) {
    hideWelcome();

    const message = document.createElement("div");
    message.classList.add("message", sender);

    const content = document.createElement("div");
    content.classList.add("message-content");
    content.innerHTML = formatMarkdown(text);

    message.appendChild(content);
    chatBox.appendChild(message);
    chatBox.scrollTop = chatBox.scrollHeight;

    return content;
}

// Kirim pesan dari form
async function sendMessage(event) {
    if (event) event.preventDefault();

    const message = userInput.value.trim();
    if (!message) return;

    addMessage(message, "user");
    messages.push({ role: "user", content: message });
    userInput.value = "";

    // Disable input
    userInput.disabled = true;
    const btn = document.getElementById("send-btn");
    btn.disabled = true;
    btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" stroke-dasharray="31.4" stroke-dashoffset="10" style="animation:spin 1s linear infinite"></circle></svg> Menunggu...`;

    const botContent = addMessage("", "bot");
    let botResponse = "";

    try {
        const response = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ messages })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Terjadi kesalahan");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop();

            for (const line of lines) {
                const trimmedLine = line.trim();
                if (!trimmedLine || !trimmedLine.startsWith("data:")) continue;

                const data = trimmedLine.slice(5).trim();
                if (data === "[DONE]") continue;

                try {
                    const token = JSON.parse(data);
                    botResponse += token;
                    botContent.innerHTML = formatMarkdown(botResponse);
                    chatBox.scrollTop = chatBox.scrollHeight;
                } catch (e) {
                    console.error("Gagal membaca token:", e);
                }
            }
        }

        messages.push({ role: "assistant", content: botResponse });

    } catch (error) {
        console.error(error);
        botContent.innerHTML = `<em style="color:#ef4444">Maaf, terjadi kesalahan: ${error.message}</em>`;
    } finally {
        userInput.disabled = false;
        btn.disabled = false;
        btn.innerHTML = `<svg width="14" height="14" fill="none" viewBox="0 0 24 24"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg> Kirim`;
        userInput.focus();
    }
}

// Quick prompt dari welcome cards
function quickPrompt(text) {
    userInput.value = text;
    sendMessage(null);
}

// New chat - reset halaman
function newChat() {
    messages.length = 0;

    // Hapus semua pesan kecuali welcome hero
    const allMessages = chatBox.querySelectorAll(".message");
    allMessages.forEach(m => m.remove());

    // Tampilkan kembali welcome hero
    const hero = document.getElementById("welcome-hero");
    if (hero) hero.style.display = "";

    userInput.value = "";
    userInput.focus();
}

// Style animasi spin untuk loading button
const style = document.createElement("style");
style.textContent = `@keyframes spin { to { transform: rotate(360deg); } }`;
document.head.appendChild(style);
