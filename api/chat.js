// Server-side proxy for the AI chatbot (Vercel serverless function).
// The Groq key stays here as the GROQ_API_KEY environment variable and is
// never sent to the browser.
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    res.status(405).json({ error: { message: "Use POST" } });
    return;
  }

  const key = process.env.GROQ_API_KEY;
  if (!key) {
    res.status(500).json({ error: { message: "GROQ_API_KEY is not set on the server" } });
    return;
  }

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch (e) { body = null; }
  }
  const messages = body && Array.isArray(body.messages) ? body.messages : null;
  if (!messages || messages.length === 0 || messages.length > 20) {
    res.status(400).json({ error: { message: "Invalid request" } });
    return;
  }
  if (JSON.stringify(messages).length > 2500000) {
    res.status(413).json({ error: { message: "Request too large" } });
    return;
  }

  try {
    const upstream = await fetch(GROQ_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      // The model and the token limit are fixed here, so visitors cannot change them.
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || "qwen/qwen3.8-27b",
        messages,
        max_tokens: 600,
      }),
    });
    const text = await upstream.text();
    res.status(upstream.status).setHeader("Content-Type", "application/json").send(text);
  } catch (err) {
    res.status(502).json({ error: { message: "Could not reach the AI service" } });
  }
};
