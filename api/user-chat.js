const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
// PASTE the same apiKey value from your Firebase web config (it is a public key)
const FIREBASE_API_KEY = "AIzaSyBdVvs2ZHvgdZtfeK1JYMCC3dSP2_Jxclk";

const SAFETY_PROMPT =
  "You are a pharmacy assistant. Answer only using the generic name or composition that is clearly stated by the user. " +
  "If the name is not clearly recognizable, do not guess. Say you are not sure and ask the user to check the strip and consult a pharmacist. " +
  "Never invent ingredients or drug groups. " +
  "Do not give exact doses or how many tablets to take. Always advise consulting a doctor or pharmacist. " +
  "Reply in simple, clear English, or in Tamil script if the user writes Tamil or Tanglish. Do not write Tanglish or invent words. Use short, plain sentences.";

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: { message: "Use POST" } });

  const key = process.env.GROQ_API_KEY;
  if (!key) return res.status(500).json({ error: { message: "GROQ_API_KEY is not set on the server" } });

  const token = (req.headers.authorization || "").replace(/^Bearer /, "");
  if (!token) return res.status(401).json({ error: { message: "Please sign in" } });

  try {
    const v = await fetch(
      "https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=" + FIREBASE_API_KEY,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ idToken: token }) }
    );
    if (!v.ok) return res.status(401).json({ error: { message: "Sign-in expired. Please sign in again" } });
  } catch (e) {
    return res.status(502).json({ error: { message: "Could not verify sign-in" } });
  }

  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch (e) { body = null; } }
  const raw = body && Array.isArray(body.messages) ? body.messages : null;
  if (!raw || raw.length === 0 || raw.length > 20) return res.status(400).json({ error: { message: "Invalid request" } });

  const messages = [];
  for (const m of raw) {
    if (!m || (m.role !== "user" && m.role !== "assistant") || typeof m.content !== "string" || m.content.length > 4000)
      return res.status(400).json({ error: { message: "Invalid request" } });
    messages.push({ role: m.role, content: m.content });
  }

  try {
    const upstream = await fetch(GROQ_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + key },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || "qwen/qwen3.8-27b",
        messages: [{ role: "system", content: SAFETY_PROMPT }, ...messages],
        max_tokens: 700
      })
    });
    const text = await upstream.text();
    res.status(upstream.status).setHeader("Content-Type", "application/json").send(text);
  } catch (err) {
    res.status(502).json({ error: { message: "Could not reach the AI service" } });
  }
};
