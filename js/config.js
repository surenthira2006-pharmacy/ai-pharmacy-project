/* =========================================================
   CONFIG.JS — AI Chatbot settings
   =========================================================
   DEPLOYED SITE (GitHub / Vercel): keep AI_API_KEY empty.
   The real key lives on the server as the GROQ_API_KEY
   environment variable, and the chatbot calls /api/chat.

   LOCAL TESTING ONLY: you may paste a key below to test on
   localhost. Never push a real key to GitHub — anyone could
   read it from the public repository or the live page.
   ========================================================= */

const AI_API_KEY = "";                                           // keep empty before you push
const AI_API_URL = "https://api.groq.com/openai/v1/chat/completions"; // used only when a key is set above
const AI_MODEL = "qwen/qwen3.8-27b";
const AI_PROXY_URL = "/api/chat";                                 // server-side function used on the deployed site
