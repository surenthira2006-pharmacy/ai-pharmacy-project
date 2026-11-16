/* =========================================================
   CHATBOT.JS — AI Medicine Information Chatbot
   =========================================================
   - If AI is available (a key in js/config.js, or the /api/chat proxy on a deployed site), every message (plus
     an optional photo) is sent to that AI model for a real
     answer, in whichever language/script the user typed in.
     The AI is also given a snapshot of any matching medicine
     from YOUR pharmacy inventory (price/stock/prescription/
     expiry), so price/availability answers come from your real
     data instead of the AI guessing.
   - If no key is set, a small built-in offline demo responder
     answers instead, so the page still works for a viva without
     any paid API. It also reads your real inventory (added on
     the Inventory page) for price/stock/prescription/expiry, and
     a small built-in knowledge list for general medicine info.
   This chatbot is public (no pharmacist login needed) — it is
   meant for patients/customers asking about medicines.
   ========================================================= */

const SYSTEM_PROMPT = `You are "AI Pharmacy Assistant", a friendly medicine-information chatbot on a pharmacy website.

LANGUAGE — very important: reply in the SAME language/script the user used in their latest message.
- If they wrote in Tamil script (தமிழ் எழுத்துக்கள்), reply fully in Tamil script.
- If they wrote in plain English, reply fully in English.
- If they wrote in Tanglish (Tamil words spelled using English letters, e.g. "fever ku enna medicine edukanum"), reply in Tanglish the same way — Tamil words/grammar spelled using English letters. Do NOT switch to Tamil script and do NOT switch to pure English in that case.
  Example of a correct Tanglish reply style: "Fever ku Paracetamol nalla vela seiyum. Adults 500mg-1g every 4-6 hours edukalam, but per day 4g mela poga koodathu. Doctor kitta kandippa consult pannunga before start pannuvathu."
Never mix two of these in one reply, and never translate the user's own script style — match it exactly.

FORMATTING — very important: your reply is inserted directly into a small chat bubble as HTML. Do NOT use Markdown syntax of any kind — no tables (no "|" pipe characters), no "**bold**", no "#" headings, no numbered/bulleted markdown lists. Instead:
- Use plain short paragraphs and line breaks. Put a blank line between different sections (e.g. between "uses" and "who should use it").
- Put every bullet point on its OWN line — never chain several bullets together in one line separated by " - ". One idea per line only.
- For emphasis, wrap the word/phrase in real HTML tags like <strong>...</strong> (not asterisks).
- For a list, start each line with "• " (a bullet character) instead of "-" or "1.".
- Never build a table. If you need to compare several medicines, list them one after another as short "• Medicine name — key fact" lines instead.
- Keep the whole answer short: 5-8 short lines is ideal for this small chat window.

The user may give you: a medicine name, a photo of a medicine/strip/box, symptoms, a plain-language health question, or text pasted from a lab report or patient history. For each query, where relevant, cover in a short, clearly structured way:
- What the medicine is generally used for / which symptoms it treats
- Who typically uses it (adults / children / elderly / pregnancy notes) and common precautions
- Whether it is usually a prescription or over-the-counter medicine
- General label/package dosage information (NOT a personalized dose)
- Common side effects and interactions to be aware of

You may be given a "PHARMACY INVENTORY DATA" block with real price/stock/prescription/expiry info for a matching medicine from this pharmacy's own records. If present, use those exact figures for price/availability/prescription — do not invent or guess a different price. If no inventory data is given for a medicine, do not state a specific price; say price/availability should be confirmed with the pharmacy directly.

Rules you must always follow:
1. Never give a definitive personal dosage or treatment plan for a specific patient, even if they share lab values or history — explain in general terms what such values usually indicate, then say the exact dose/treatment must be confirmed by their doctor or pharmacist.
2. Always end with a brief reminder to consult a licensed doctor or pharmacist before starting, stopping, or changing any medication — this is especially important for children, pregnant/breastfeeding women, the elderly, or anyone with existing conditions.
3. If you are not confident about a medicine (e.g. from a blurry photo), say so plainly instead of guessing.
4. Keep answers concise and readable in a small chat window (short paragraphs / bullet points, no long essays).`;

// ---- AI availability --------------------------------------------------
// Local testing with a key in config.js  -> call the AI provider directly.
// Deployed site (no key in the browser)  -> call the server-side proxy (/api/chat),
// which holds the real key. If neither is available, the offline demo is used.
const IS_LOCAL_PAGE = location.protocol === "file:" || ["localhost", "127.0.0.1", ""].includes(location.hostname);
const PROXY_URL = typeof AI_PROXY_URL !== "undefined" ? AI_PROXY_URL : "/api/chat";
const USE_PROXY = !AI_API_KEY && !IS_LOCAL_PAGE;
function aiEnabled() {
  return Boolean(AI_API_KEY) || USE_PROXY;
}

document.addEventListener("DOMContentLoaded", () => {
  const chatBox = document.getElementById("chatBox");
  const input = document.getElementById("medicineInput");
  const sendBtn = document.getElementById("sendBtn");
  const imageInput = document.getElementById("medicineImage");
  const imageNameEl = document.getElementById("imageName");

  let pendingImage = null; // { dataUrl, fileName } — a newly attached photo, not yet sent
  let lastImage = null;    // remembers the most recently sent photo, so follow-up
                            // questions ("tell me more about this") still have it
                            // for context even if the user doesn't re-attach it
  const history = [];      // short rolling chat history for context

  addLangNote();

  imageInput.addEventListener("change", () => {
    const file = imageInput.files[0];
    if (!file) return;
    sendBtn.disabled = true;
    imageNameEl.textContent = "Processing photo...";
    resizeImageFile(file, 1024)
      .then(dataUrl => {
        pendingImage = { dataUrl, fileName: file.name };
        imageNameEl.innerHTML = `<img class="image-preview" src="${dataUrl}" alt="${file.name}"> Attached: ${file.name}`;
      })
      .catch(err => {
        imageNameEl.textContent = "Couldn't read that image: " + err.message;
      })
      .finally(() => {
        sendBtn.disabled = false;
      });
  });

  // Shrinks a photo to at most maxDim px on its longest side and re-encodes
  // it as a JPEG. Phone camera photos can be several MB, which some AI
  // providers reject outright — resizing keeps requests small and fast.
  function resizeImageFile(file, maxDim) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("could not read the file"));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error("could not decode the image"));
        img.onload = () => {
          let { width, height } = img;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          canvas.getContext("2d").drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", 0.82));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  sendBtn.addEventListener("click", handleSend);
  input.addEventListener("keyup", (e) => {
    if (e.key === "Enter") handleSend();
  });

  async function handleSend() {
    const text = input.value.trim();
    if (!text && !pendingImage) return;

    const newImageAttached = pendingImage; // only show/attach-as-new if truly new this turn
    addUserMessage(text, newImageAttached?.dataUrl);
    input.value = "";
    if (newImageAttached) lastImage = newImageAttached; // remember for follow-up questions
    const imageForThisMessage = newImageAttached || lastImage;
    pendingImage = null;
    imageNameEl.innerHTML = "";
    imageInput.value = "";

    sendBtn.disabled = true;
    const typingEl = addTyping();

    try {
      let reply;
      if (aiEnabled()) {
        try {
          reply = await getAIResponse(text, imageForThisMessage);
        } catch (err) {
          // If the deployed proxy itself is missing or down, fall back to the offline answer.
          if (USE_PROXY && /API error (404|405|500|502|503)/.test(err.message)) {
            reply = (await getOfflineResponse(text, newImageAttached)) +
              "<br><em>(The AI service is not reachable right now, so this is an offline answer.)</em>";
          } else {
            throw err;
          }
        }
      } else {
        reply = await getOfflineResponse(text, newImageAttached);
      }
      history.push({ role: "user", text });
      history.push({ role: "assistant", text: reply });
      typingEl.remove();
      addBotMessage(reply);
    } catch (err) {
      typingEl.remove();
      addBotMessage(friendlyErrorMessage(err));
    } finally {
      sendBtn.disabled = false;
    }
  }

  // Turns a raw fetch/API error into a message the user can actually act on,
  // instead of a generic "couldn't reach AI" every time.
  function friendlyErrorMessage(err) {
    const msg = err.message || "";
    if (!navigator.onLine || /Failed to fetch|NetworkError/i.test(msg)) {
      return "⚠️ Couldn't reach the internet/AI service. Please check your internet connection (or that the AI key/server is set up correctly) and try again.";
    }
    if (/429/.test(msg)) {
      return "⚠️ The AI service is a bit busy right now (rate limit reached on the free plan). Please wait 10–20 seconds and try again.";
    }
    if (/401|invalid api key|unauthorized/i.test(msg)) {
      return "⚠️ The AI key seems invalid or expired. Please check <code>js/config.js</code> and generate a fresh key if needed.";
    }
    if (/404|model_not_found/i.test(msg)) {
      return "⚠️ That AI model isn't available with this key. Please check <code>AI_MODEL</code> in <code>js/config.js</code>.";
    }
    return `Sorry, I couldn't get a response from the AI service (${escapeHtml(msg)}). Please try again in a moment.`;
  }

  /* ---------- Real AI call (OpenAI-compatible chat completions) ---------- */
  async function getAIResponse(text, image) {
    const messages = [{ role: "system", content: SYSTEM_PROMPT }];

    history.slice(-6).forEach(h => messages.push({ role: h.role, content: h.text }));

    // Pull in any matching medicine from the pharmacist's real inventory
    // (added via the Inventory page) so price/stock is accurate, not guessed.
    const inventoryMatches = findInventoryMatches(text);
    let userText = text || "Please identify this medicine and tell me about it.";
    if (inventoryMatches.length) {
      userText += `\n\n[PHARMACY INVENTORY DATA]\n${inventoryMatches.map(describeInventoryMed).join("\n")}`;
    }

    if (image) {
      messages.push({
        role: "user",
        content: [
          { type: "text", text: userText },
          { type: "image_url", image_url: { url: image.dataUrl } }
        ]
      });
    } else {
      messages.push({ role: "user", content: userText });
    }

    const headers = { "Content-Type": "application/json" };
    if (AI_API_KEY) headers["Authorization"] = `Bearer ${AI_API_KEY}`;
    const res = await fetch(AI_API_KEY ? AI_API_URL : PROXY_URL, {
      method: "POST",
      headers,
      body: JSON.stringify({ model: AI_MODEL, messages, max_tokens: 600 })
    });

    if (!res.ok) {
      let detail = "";
      try {
        const errJson = await res.json();
        detail = errJson.error?.message || JSON.stringify(errJson);
      } catch (e) { /* response wasn't JSON — ignore */ }
      throw new Error(`API error ${res.status}${detail ? ": " + detail : ""}`);
    }
    const data = await res.json();
    const raw = data.choices?.[0]?.message?.content?.trim() || "Sorry, I didn't get a response. Please try again.";
    return cleanupAIFormatting(raw);
  }

  // Safety net: models often ignore the "no Markdown" instruction and cram
  // everything (tables, bullets) onto one line with no real newlines. This
  // aggressively rebuilds the text into clean, readable HTML no matter how
  // it was originally formatted.
  function cleanupAIFormatting(text) {
    let t = text;

    // 1. Convert markdown tables — even inline ones with no real newlines
    //    between rows — into "• cell — cell" bullet lines.
    t = t.replace(/(\|[^\n]*?\|[^\n]*?\|(?:\s*\|[^\n]*?\|[^\n]*?\|)+)/g, (block) => {
      const rows = block.match(/\|[^|]*\|[^|]*\|/g) || [];
      const bullets = [];
      rows.forEach(row => {
        const cells = row.split("|").map(c => c.trim()).filter(c => c.length > 0);
        if (cells.length < 2 || cells.every(c => /^:?-{2,}:?$/.test(c))) return; // skip separator rows
        bullets.push("\n• " + cells.join(" — "));
      });
      return bullets.join("");
    });

    // 2. Break inline " - Something" / " * Something" bullet chains (with no
    //    real newline before them) onto their own line.
    t = t.replace(/\s[-*]\s+(?=[A-Za-z\u0B80-\u0BFF])/g, "\n• ");

    // 3. Markdown bold/headings -> <strong>
    t = t.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    t = t.replace(/^#{1,6}\s*(.+)$/gm, "<strong>$1</strong>");

    // 4. Any remaining "- " / "* " at the start of a real line -> bullet
    t = t.replace(/^[-*]\s+/gm, "• ");

    // 5. Strip any leftover stray asterisks the model left unconverted
    t = t.replace(/\*/g, "");

    // 6. Tidy spacing, then convert blank lines to paragraph gaps and single
    //    newlines to line breaks.
    t = t.split("\n").map(l => l.trim()).join("\n").replace(/\n{3,}/g, "\n\n");
    t = t.replace(/\n{2,}/g, "<br><br>").replace(/\n/g, "<br>");

    return t;
  }

  /* ---------- Offline demo fallback (no API key configured) ---------- */
  async function getOfflineResponse(text, image) {
    await delay(500); // small pause so it feels like "thinking"

    if (image && !text) {
      return (
        "📷 I received your photo, but identifying medicines from images needs the AI API connected " +
        "(add a key in <code>js/config.js</code>).<br><br>" +
        "For now, please type the medicine name printed on the strip/box and I'll look it up. " +
        "மருந்தின் பெயரை தட்டச்சு செய்யவும் — I'll answer in demo mode below."
      );
    }

    const knowledgeMatch = findOfflineMedicine(text);
    const inventoryMatch = findInventoryMatches(text)[0];

    if (knowledgeMatch || inventoryMatch) {
      return formatCombinedAnswer(knowledgeMatch, inventoryMatch);
    }

    return (
      `I couldn't find "<strong>${escapeHtml(text)}</strong>" in this pharmacy's inventory, and it's not in my offline demo knowledge list either.<br><br>` +
      `Offline demo mode only knows general info for: <em>${OFFLINE_MEDICINES.map(m => m.name).join(", ")}</em> (try a symptom too, e.g. "fever", "allergy", "acid reflux"). ` +
      `It also checks this pharmacy's own Inventory page for price/stock on any medicine added there.<br><br>` +
      `⚠️ For information on <strong>any</strong> medicine by name — like "Telma" — connect a real AI key in <code>js/config.js</code>. Until then, please ask your pharmacist directly.<br>` +
      `எப்போதும் சரியான மருந்து தகவலுக்கு உங்கள் மருந்தாளர் அல்லது மருத்துவரை அணுகவும்.`
    );
  }

  function findOfflineMedicine(text) {
    const q = text.toLowerCase();
    // Match by medicine name first...
    let found = OFFLINE_MEDICINES.find(m => q.includes(m.name.toLowerCase()) || m.name.toLowerCase().includes(q));
    if (found) return found;
    // ...then by symptom keywords.
    return OFFLINE_MEDICINES.find(m => m.symptoms.some(sym => q.includes(sym)));
  }

  // Looks up the pharmacist's real, locally-stored inventory (added on
  // the Inventory page) for any medicine whose name appears in the text.
  function findInventoryMatches(text) {
    if (typeof getMedicines !== "function") return [];
    const q = (text || "").toLowerCase();
    if (!q) return [];
    return getMedicines().filter(m => q.includes(m.name.toLowerCase()) || m.name.toLowerCase().includes(q));
  }

  function describeInventoryMed(m) {
    const est = typeof expiryStatus === "function" ? expiryStatus(m.expiryDate).label : "";
    return `- ${m.name}: price ₹${m.price}, stock ${m.quantity} units (${m.quantity > 0 ? "in stock" : "out of stock"}), ` +
      `prescription required: ${m.prescriptionRequired}, batch ${m.batchNumber}, expiry ${formatDate ? formatDate(m.expiryDate) : m.expiryDate}${est ? " (" + est + ")" : ""}.`;
  }

  function formatCombinedAnswer(knowledge, inv) {
    const name = knowledge?.name || inv?.name;
    let out = `<strong>${name}</strong><br>`;

    if (knowledge) {
      out +=
        `<strong>Common uses / symptoms treated:</strong> ${knowledge.uses}<br>` +
        `<strong>Who typically uses it:</strong> ${knowledge.who}<br>` +
        `<strong>Typical label dosage:</strong> ${knowledge.dosage}<br>` +
        `<strong>Common side effects:</strong> ${knowledge.sideEffects}<br>`;
    }

    if (inv) {
      const est = expiryStatus(inv.expiryDate);
      out +=
        `<strong>Price (this pharmacy):</strong> ₹${Number(inv.price).toFixed(2)}<br>` +
        `<strong>Availability:</strong> ${inv.quantity > 0 ? `In stock (${inv.quantity} units)` : "Out of stock"}<br>` +
        `<strong>Prescription needed:</strong> ${inv.prescriptionRequired}<br>` +
        `<strong>Expiry (current batch):</strong> ${formatDate(inv.expiryDate)} (${est.label})<br>`;
    } else if (knowledge) {
      out += `<strong>Prescription needed:</strong> ${knowledge.prescription}<br>`;
      out += `<em>Price/availability: not added to this pharmacy's inventory yet — please ask the pharmacist directly.</em><br>`;
    }

    out +=
      `<br>⚠️ General information only${!aiEnabled() ? " (offline demo mode)" : ""}. Always confirm the exact dose and suitability with your doctor or pharmacist, especially for children, elderly, pregnant/breastfeeding patients, or anyone with existing conditions.<br>` +
      `மருந்தை உபயோகிக்கும் முன் மருத்துவர்/மருந்தாளரை கலந்தாலோசிக்கவும்.`;

    return out;
  }

  function addLangNote() {
    const search = document.querySelector(".medicine-search");
    const note = document.createElement("p");
    note.className = "lang-note";
    note.textContent = aiEnabled()
      ? "You can type in English, Tamil, or Tanglish. Prices shown come from this pharmacy's Inventory."
      : "Demo mode (no AI key set) — try: paracetamol, dolo 650, amoxicillin, crocin, vitamin c, cetirizine, ibuprofen, omeprazole, or a symptom like \"fever\"/\"allergy\". Any medicine added on the Inventory page also works for price/stock.";
    search.insertAdjacentElement("afterend", note);
  }

  function addUserMessage(text, imageDataUrl) {
    const div = document.createElement("div");
    div.className = "user-message";
    div.innerHTML =
      `<strong>You:</strong>` +
      (imageDataUrl ? `<br><img class="image-preview" src="${imageDataUrl}" alt="uploaded medicine">` : "") +
      (text ? `<p>${escapeHtml(text)}</p>` : "");
    chatBox.appendChild(div);
    scrollToBottom();
  }

  function addBotMessage(html) {
    const div = document.createElement("div");
    div.className = "bot-message";
    div.innerHTML = `<strong>AI Assistant:</strong><p>${html}</p>`;
    chatBox.appendChild(div);
    scrollToBottom();
  }

  function addTyping() {
    const div = document.createElement("div");
    div.className = "bot-message typing-indicator";
    div.textContent = "AI Assistant is typing...";
    chatBox.appendChild(div);
    scrollToBottom();
    return div;
  }

  function scrollToBottom() {
    chatBox.scrollTop = chatBox.scrollHeight;
  }

  function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function escapeHtml(str) {
    const d = document.createElement("div");
    d.textContent = str;
    return d.innerHTML;
  }
});

/* Small built-in demo medicine + symptom knowledge base, used for the
   general "uses / who / dosage / side effects" part of every answer.
   Real price/stock always comes from the pharmacy's own Inventory data
   (see findInventoryMatches / describeInventoryMed above) when available. */
const OFFLINE_MEDICINES = [
  { name: "Paracetamol", uses: "Fever and mild to moderate pain relief.", who: "Generally suitable for adults and children (child dose depends on weight) — check the pack or ask a pharmacist for children's dosing.", prescription: "No (over-the-counter)", dosage: "Adults: commonly 500–650mg every 4–6 hours, not exceeding the pack's daily limit.", sideEffects: "Rare at normal doses; overdose can seriously harm the liver.", symptoms: ["fever", "காய்ச்சல்", "pain", "வலி", "headache"] },
  { name: "Dolo 650", uses: "Fever, headache, body pain (Paracetamol 650mg brand).", who: "Adults and adolescents; not for young children without medical advice.", prescription: "No (over-the-counter)", dosage: "Commonly one tablet every 4–6 hours as needed, not exceeding the pack's daily limit.", sideEffects: "Rare at normal doses; avoid exceeding the daily limit.", symptoms: ["fever", "காய்ச்சல்", "body pain", "headache"] },
  { name: "Amoxicillin", uses: "Bacterial infections (e.g. throat, ear, chest, urinary infections) — only works on bacteria, not viruses.", who: "Prescribed by a doctor based on the specific infection, age, and weight.", prescription: "Yes", dosage: "Exact dose and duration set by the prescribing doctor — always complete the full course.", sideEffects: "Nausea, diarrhoea, rash; tell your doctor about any penicillin allergy.", symptoms: ["infection", "throat infection", "bacterial"] },
  { name: "Crocin", uses: "Fever and mild pain relief (Paracetamol-based brand).", who: "Adults and children (age/weight-specific formulations exist).", prescription: "No (over-the-counter)", dosage: "Follow the specific product's label — formulations and strengths vary by age group.", sideEffects: "Rare at normal doses; avoid combining with other paracetamol-containing products.", symptoms: ["fever", "காய்ச்சல்", "pain"] },
  { name: "Vitamin C", uses: "Immune system support; common cold season supplement.", who: "Generally suitable for most people as a daily supplement.", prescription: "No (over-the-counter)", dosage: "Commonly 500–1000mg per day as a supplement, per label.", sideEffects: "Mild stomach upset at high doses.", symptoms: ["cold", "immunity", "சளி"] },
  { name: "Cetirizine", uses: "Allergy symptoms — sneezing, runny nose, itchy/watery eyes, hives.", who: "Adults and children (age-specific dosing exists); caution for elderly patients.", prescription: "No (over-the-counter)", dosage: "Commonly one 10mg tablet once daily for adults, per label.", sideEffects: "Mild drowsiness in some people.", symptoms: ["allergy", "sneezing", "hives", "ஒவ்வாமை"] },
  { name: "Ibuprofen", uses: "Pain, inflammation, and fever relief.", who: "Adults and children (age-specific dosing); avoid in certain stomach, kidney, or heart conditions without medical advice.", prescription: "No (over-the-counter, low strength)", dosage: "Commonly 200–400mg every 6–8 hours with food, not exceeding the pack's daily limit.", sideEffects: "Stomach upset; avoid long-term use without medical advice.", symptoms: ["pain", "inflammation", "swelling", "வலி"] },
  { name: "Omeprazole", uses: "Acid reflux, heartburn, and stomach acid-related conditions.", who: "Adults; longer-term use should be guided by a doctor.", prescription: "Often available over-the-counter for short-term use; higher doses need a prescription.", dosage: "Commonly 20mg once daily before a meal, per label or doctor's advice.", sideEffects: "Headache, mild stomach upset with short-term use.", symptoms: ["acid reflux", "heartburn", "acidity", "gastric"] }
];
