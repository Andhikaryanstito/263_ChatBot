const chatForm = document.getElementById("chat-form");
const userInput = document.getElementById("user-input");
const chatBox = document.getElementById("chat-box");

const messages = [];

function formatMarkdown(text) {
    if (!text) return "";
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\*\*(.*?)\*\*/g, '<strong></strong>')
        .replace(/__(.*?)__/g, '<strong></strong>')
        .replace(/\*(.*?)\*/g, '<em></em>')
        .replace(/([^]+)/g, '<code style="background:#e2e8f0;padding:2px 6px;border-radius:4px;font-family:monospace;"></code>')
        .replace(/\n/g, '<br>');
}

function addMessage(text, sender) {
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
