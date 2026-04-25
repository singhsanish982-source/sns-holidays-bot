// ============================================================
//  SNS Holiday — WhatsApp Chatbot (Meta Cloud API)
//  Fixed-flow, button-based booking assistant
//  Deploy on: Render / Railway / VPS
// ============================================================

const express = require("express");
const axios = require("axios");
const app = express();
app.use(express.json());

// ── CONFIG ──────────────────────────────────────────────────
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || "sns_holiday_token";
const WA_TOKEN    = process.env.WA_TOKEN;        // Meta WhatsApp API token
const PHONE_ID    = process.env.PHONE_ID;        // Meta Phone Number ID
const SNS_OWNER   = process.env.SNS_OWNER_PHONE; // e.g. "919558076199"
const API_URL     = `https://graph.facebook.com/v19.0/${PHONE_ID}/messages`;

// ── SESSION STORE (in-memory) ────────────────────────────────
// For production use Redis or a database
const sessions = {};

function getSession(phone) {
  if (!sessions[phone]) sessions[phone] = { step: "start", data: {} };
  return sessions[phone];
}
function setStep(phone, step) { sessions[phone].step = step; }
function setData(phone, key, val) { sessions[phone].data[key] = val; }

// ── SEND HELPERS ─────────────────────────────────────────────
async function sendText(to, text) {
  await axios.post(API_URL, {
    messaging_product: "whatsapp",
    to,
    type: "text",
    text: { body: text }
  }, { headers: { Authorization: `Bearer ${WA_TOKEN}` } });
}

async function sendButtons(to, bodyText, buttons) {
  // buttons: [{ id, title }]  max 3
  await axios.post(API_URL, {
    messaging_product: "whatsapp",
    to,
    type: "interactive",
    interactive: {
      type: "button",
      body: { text: bodyText },
      action: {
        buttons: buttons.map(b => ({
          type: "reply",
          reply: { id: b.id, title: b.title }
        }))
      }
    }
  }, { headers: { Authorization: `Bearer ${WA_TOKEN}` } });
}

async function sendList(to, headerText, bodyText, buttonLabel, sections) {
  await axios.post(API_URL, {
    messaging_product: "whatsapp",
    to,
    type: "interactive",
    interactive: {
      type: "list",
      header: { type: "text", text: headerText },
      body:   { text: bodyText },
      action: {
        button: buttonLabel,
        sections
      }
    }
  }, { headers: { Authorization: `Bearer ${WA_TOKEN}` } });
}

// ── FLOW ─────────────────────────────────────────────────────

async function handleMessage(phone, msgType, msgBody, buttonId) {
  const session = getSession(phone);
  const step = session.step;
  const input = (buttonId || msgBody || "").trim().toLowerCase();

  // ── STEP: start ──────────────────────────────────────────
  if (step === "start" || input === "hi" || input === "hello" || input === "menu") {
    setStep(phone, "main_menu");
    await sendButtons(phone,
      `👋 Welcome to *SNS Holiday*!\n\nYour trusted travel partner from Surat since 2018 🌍\n\nHow can we help you today?`,
      [
        { id: "book_tour",    title: "✈️ Book a Tour" },
        { id: "view_packages", title: "📋 View Packages" },
        { id: "contact_us",   title: "📞 Contact Us" }
      ]
    );
    return;
  }

  // ── STEP: main_menu ──────────────────────────────────────
  if (step === "main_menu") {
    if (input === "book_tour") {
      setStep(phone, "select_destination");
      await sendList(phone,
        "🗺️ Select Destination",
        "Choose where you'd like to travel:",
        "View Destinations",
        [
          {
            title: "🇮🇳 Domestic",
            rows: [
              { id: "dest_kerala",    title: "Kerala",          description: "Backwaters, beaches & tea gardens" },
              { id: "dest_kashmir",   title: "Kashmir",         description: "Paradise on Earth" },
              { id: "dest_goa",       title: "Goa",             description: "Sun, sand & seafood" },
              { id: "dest_himachal",  title: "Himachal Pradesh",description: "Shimla, Manali & more" },
              { id: "dest_andaman",   title: "Andaman",         description: "Pristine island getaway" },
            ]
          },
          {
            title: "🌍 International",
            rows: [
              { id: "dest_dubai",     title: "Dubai",    description: "The city of gold" },
              { id: "dest_maldives",  title: "Maldives", description: "Luxury island resort" },
              { id: "dest_thailand",  title: "Thailand", description: "Bangkok, Phuket & Pattaya" },
            ]
          }
        ]
      );
    } else if (input === "view_packages") {
      setStep(phone, "view_packages");
      await sendText(phone,
        `📦 *Our Popular Packages:*\n\n` +
        `1️⃣ *Kerala Houseboat* — 7N/8D — ₹27,780/person\n` +
        `2️⃣ *Kashmir Paradise* — 6N/7D — ₹22,500/person\n` +
        `3️⃣ *Goa Escape* — 3N/4D — ₹12,999/person\n` +
        `4️⃣ *Himachal + Amritsar* — 9N/10D — ₹26,500/person\n` +
        `5️⃣ *Dubai Glamour* — 4N/5D — ₹55,000/person\n` +
        `6️⃣ *Maldives Retreat* — 4N/5D — ₹85,000/person\n\n` +
        `_All packages include hotel + transfers + sightseeing._`
      );
      await sendButtons(phone, "Would you like to book any of these?", [
        { id: "book_tour",  title: "✈️ Book Now" },
        { id: "back_menu",  title: "🏠 Main Menu" }
      ]);
    } else if (input === "contact_us") {
      await sendText(phone,
        `📍 *SNS Holiday Office*\nShop No. 109/209, Rajhans Platinum Plaza,\nPalanpur Canal Road, Surat – 395009\n\n` +
        `📞 +91 95580 76199\n📞 +91 93275 05459\n` +
        `✉️ snsholiday18@gmail.com\n\n` +
        `🕐 Mon–Sat: 10 AM – 7 PM\n❌ Sunday Closed`
      );
      setStep(phone, "main_menu");
      await sendButtons(phone, "Anything else we can help with?", [
        { id: "book_tour",  title: "✈️ Book a Tour" },
        { id: "back_menu",  title: "🏠 Main Menu" }
      ]);
    } else if (input === "back_menu") {
      setStep(phone, "start");
      await handleMessage(phone, "text", "menu", null);
    }
    return;
  }

  // ── STEP: select_destination ─────────────────────────────
  if (step === "select_destination") {
    const destMap = {
      dest_kerala:   "Kerala",
      dest_kashmir:  "Kashmir",
      dest_goa:      "Goa",
      dest_himachal: "Himachal Pradesh",
      dest_andaman:  "Andaman",
      dest_dubai:    "Dubai",
      dest_maldives: "Maldives",
      dest_thailand: "Thailand",
    };
    if (destMap[input]) {
      setData(phone, "destination", destMap[input]);
      setStep(phone, "select_travellers");
      await sendButtons(phone,
        `Great choice! 🌟 *${destMap[input]}* it is.\n\nHow many travellers?`,
        [
          { id: "pax_1_2",  title: "👫 1–2 People" },
          { id: "pax_3_5",  title: "👨‍👩‍👧 3–5 People" },
          { id: "pax_6plus", title: "👥 6+ People" }
        ]
      );
    }
    return;
  }

  // ── STEP: select_travellers ──────────────────────────────
  if (step === "select_travellers") {
    const paxMap = { pax_1_2: "1–2", pax_3_5: "3–5", pax_6plus: "6+" };
    if (paxMap[input]) {
      setData(phone, "travellers", paxMap[input]);
      setStep(phone, "select_month");
      await sendList(phone,
        "📅 Travel Month",
        "When are you planning to travel?",
        "Select Month",
        [{
          title: "2025",
          rows: [
            { id: "month_jan", title: "January" },
            { id: "month_feb", title: "February" },
            { id: "month_mar", title: "March" },
            { id: "month_apr", title: "April" },
            { id: "month_may", title: "May" },
            { id: "month_jun", title: "June" },
          ]
        }, {
          title: "2025–2026",
          rows: [
            { id: "month_jul", title: "July" },
            { id: "month_aug", title: "August" },
            { id: "month_sep", title: "September" },
            { id: "month_oct", title: "October" },
            { id: "month_nov", title: "November" },
            { id: "month_dec", title: "December" },
          ]
        }]
      );
    }
    return;
  }

  // ── STEP: select_month ───────────────────────────────────
  if (step === "select_month") {
    const months = {
      month_jan:"January", month_feb:"February", month_mar:"March",
      month_apr:"April",   month_may:"May",      month_jun:"June",
      month_jul:"July",    month_aug:"August",   month_sep:"September",
      month_oct:"October", month_nov:"November", month_dec:"December"
    };
    if (months[input]) {
      setData(phone, "month", months[input]);
      setStep(phone, "select_budget");
      await sendButtons(phone,
        `📅 *${months[input]}* noted!\n\nWhat's your approximate budget per person?`,
        [
          { id: "budget_low",  title: "Under ₹20,000" },
          { id: "budget_mid",  title: "₹20k – ₹50k" },
          { id: "budget_high", title: "Above ₹50,000" }
        ]
      );
    }
    return;
  }

  // ── STEP: select_budget ──────────────────────────────────
  if (step === "select_budget") {
    const budgetMap = {
      budget_low:  "Under ₹20,000",
      budget_mid:  "₹20,000 – ₹50,000",
      budget_high: "Above ₹50,000"
    };
    if (budgetMap[input]) {
      setData(phone, "budget", budgetMap[input]);
      setStep(phone, "get_name");
      await sendText(phone, `Perfect! 😊\n\nTo complete your enquiry, please type your *full name*:`);
    }
    return;
  }

  // ── STEP: get_name ───────────────────────────────────────
  if (step === "get_name") {
    setData(phone, "name", msgBody);
    setStep(phone, "confirm");
    const d = session.data;
    await sendButtons(phone,
      `✅ *Booking Enquiry Summary*\n\n` +
      `👤 Name: ${d.name}\n` +
      `📍 Destination: ${d.destination}\n` +
      `👥 Travellers: ${d.travellers}\n` +
      `📅 Month: ${d.month}\n` +
      `💰 Budget: ${d.budget}\n\n` +
      `Shall we confirm this enquiry?`,
      [
        { id: "confirm_yes", title: "✅ Confirm" },
        { id: "confirm_no",  title: "❌ Start Over" }
      ]
    );
    return;
  }

  // ── STEP: confirm ────────────────────────────────────────
  if (step === "confirm") {
    if (input === "confirm_yes") {
      const d = session.data;
      // Notify SNS owner on WhatsApp
      await notifyOwner(d, phone);
      setStep(phone, "done");
      await sendText(phone,
        `🎉 *Enquiry Confirmed!*\n\n` +
        `Thank you, *${d.name}*! Our travel expert will call you within *2 hours* to discuss your ${d.destination} trip.\n\n` +
        `📞 You can also reach us at:\n+91 95580 76199\n+91 93275 05459\n\n` +
        `_SNS Holiday — Making Every Trip Unforgettable_ 🌍`
      );
      // Reset session after 5 mins
      setTimeout(() => { delete sessions[phone]; }, 5 * 60 * 1000);
    } else if (input === "confirm_no") {
      delete sessions[phone];
      await handleMessage(phone, "text", "menu", null);
    }
    return;
  }

  // ── FALLBACK ─────────────────────────────────────────────
  await sendButtons(phone,
    `Sorry, I didn't understand that. 😅\n\nLet's start fresh:`,
    [
      { id: "book_tour",   title: "✈️ Book a Tour" },
      { id: "view_packages", title: "📋 View Packages" },
      { id: "contact_us",  title: "📞 Contact Us" }
    ]
  );
  setStep(phone, "main_menu");
}

// ── NOTIFY OWNER ─────────────────────────────────────────────
async function notifyOwner(data, customerPhone) {
  const msg =
    `🔔 *New Booking Enquiry — SNS Holiday*\n\n` +
    `👤 Name: ${data.name}\n` +
    `📱 Phone: +${customerPhone}\n` +
    `📍 Destination: ${data.destination}\n` +
    `👥 Travellers: ${data.travellers}\n` +
    `📅 Month: ${data.month}\n` +
    `💰 Budget: ${data.budget}\n\n` +
    `_Please call the customer within 2 hours._`;

  await axios.post(API_URL, {
    messaging_product: "whatsapp",
    to: SNS_OWNER,
    type: "text",
    text: { body: msg }
  }, { headers: { Authorization: `Bearer ${WA_TOKEN}` } });
}

// ── WEBHOOK ROUTES ────────────────────────────────────────────

// Verification (Meta requires GET)
app.get("/webhook", (req, res) => {
  const mode  = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("✅ Webhook verified");
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// Incoming messages (Meta sends POST)
app.post("/webhook", async (req, res) => {
  res.sendStatus(200); // Always ACK immediately

  try {
    const entry = req.body?.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const messages = value?.messages;
    if (!messages || messages.length === 0) return;

    const msg   = messages[0];
    const phone = msg.from;
    const type  = msg.type;

    let msgBody  = "";
    let buttonId = "";

    if (type === "text") {
      msgBody = msg.text?.body || "";
    } else if (type === "interactive") {
      const ia = msg.interactive;
      if (ia.type === "button_reply") {
        buttonId = ia.button_reply?.id || "";
        msgBody  = ia.button_reply?.title || "";
      } else if (ia.type === "list_reply") {
        buttonId = ia.list_reply?.id || "";
        msgBody  = ia.list_reply?.title || "";
      }
    }

    await handleMessage(phone, type, msgBody, buttonId);
  } catch (err) {
    console.error("Error handling message:", err.message);
  }
});

// Health check
app.get("/", (req, res) => res.send("SNS Holiday WhatsApp Bot is running ✅"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Bot running on port ${PORT}`));
