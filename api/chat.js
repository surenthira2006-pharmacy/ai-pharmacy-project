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
    const SAFETY_PROMPT =
    "You are a pharmacy assistant. Answer only using the generic name or composition that is clearly printed on the medicine image or stated by the user. " +
    "If the name or composition is not clearly readable, do not guess. Say you cannot read it clearly and ask the user to check the strip and consult a pharmacist. " +
    "If the brand name is hard to read, focus on the generic name. Never invent ingredients or drug groups. " +
        "Do not give exact doses or how many tablets to take. Always advise consulting a doctor or pharmacist. " +
    "Reply in simple, clear English, or in Tamil script if the user writes Tamil or Tanglish. Do not write Tanglish or invent words. Use short, plain sentences.";
  const finalMessages = [{ role: "system", content: SAFETY_PROMPT }, ...messages];

  try {
    const upstream = await fetch(GROQ_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      // The model and the token limit are fixed here, so visitors cannot change them.
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || "qwen/qwen3.8-27b",
        messages: finalMessages,
        max_tokens: 600,
      }),
    });
    const text = await upstream.text();
    res.status(upstream.status).setHeader("Content-Type", "application/json").send(text);
  } catch (err) {
    res.status(502).json({ error: { message: "Could not reach the AI service" } });
  }
};
