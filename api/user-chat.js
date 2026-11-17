const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
// PASTE the same apiKey value from your Firebase web config (it is a public key)
const FIREBASE_API_KEY = "AIzaSyBdVvs2ZHvgdZtfeK1JYMCC3dSP2_Jxclk";

const SAFETY_PROMPT =
  "You are a friendly pharmacy information assistant for patients in India. " +
  "When the user names a medicine, or shows a photo of a medicine strip or box, give a helpful structured answer with these parts: " +
  "1) What it is: the generic name and drug group. " +
  "2) What it is used for. " +
  "3) How it is usually taken, in general terms only (for example with food or at night), without exact doses or tablet counts. " +
  "4) Common side effects. " +
  "5) Precautions: pregnancy, children, kidney or liver problems, alcohol, and other medicines to avoid. " +
  "6) When to see a doctor. " +
  "Use short bullet points. If you recognise the medicine with high confidence, explain it fully. " +
  "If the name or composition is not clear, do not guess: say you are not sure and ask the user to check the strip and ask a pharmacist. " +
  "For a symptom question, give simple general advice and say when to see a doctor. " +
  "Never invent ingredients or drug groups. Always end by advising the user to confirm with a doctor or pharmacist. " +
  "Reply in clear, simple English. If the user writes in Tamil script, reply in Tamil script. Never write made-up or broken words.";

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
    const c = m && m.content;
    const okText = typeof c === "string" && c.length <= 4000;
    const okImg = m && m.role === "user" && Array.isArray(c) && c.length === 2 &&
      c[0].type === "text" && typeof c[0].text === "string" && c[0].text.length <= 4000 &&
      c[1].type === "image_url" && c[1].image_url && typeof c[1].image_url.url === "string" &&
      c[1].image_url.url.startsWith("data:image/jpeg;base64,") && c[1].image_url.url.length < 3000000;
    if (!m || (m.role !== "user" && m.role !== "assistant") || !(okText || okImg))
      return res.status(400).json({ error: { message: "Invalid request" } });
    messages.push({
      role: m.role,
      content: okImg ? [{ type: "text", text: c[0].text }, { type: "image_url", image_url: { url: c[1].image_url.url } }] : c
    });
  }

  try {
    const upstream = await fetch(GROQ_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + key },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || "qwen/qwen3.8-27b",
        messages: [{ role: "system", content: SAFETY_PROMPT }, ...messages],
        max_tokens: 900,
        temperature: 0.3
      })
    });
    const text = await upstream.text();
    res.status(upstream.status).setHeader("Content-Type", "application/json").send(text);
  } catch (err) {
    res.status(502).json({ error: { message: "Could not reach the AI service" } });
  }
};
