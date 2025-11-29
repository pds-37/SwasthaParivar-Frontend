import React, { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import EmojiPicker from "emoji-picker-react";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { sendToAI } from "../api/ai"; // your existing api wrapper

// ---------------------------
// Suggested Qs (you already had these)
const suggestedQs = [
  "What checkups should a 60-year-old have?",
  "Vaccination reminders for a 5-year-old",
  "Home remedies for common cold",
  "Daily diet tips for diabetes",
  "How often should I get a dental check-up?",
];

// ---------------------------
// Utility: inject minimal CSS for component (keeps file self-contained)
const injectStyles = () => {
  if (document.getElementById("aichat-styles")) return;
  const style = document.createElement("style");
  style.id = "aichat-styles";
  style.innerHTML = `
  .aichat-root { display:flex; flex-direction:column; height:100vh; font-family: Inter, system-ui, sans-serif; }
  .aichat-header { padding:16px; color:white; background:linear-gradient(90deg,#0ea5e9,#10b981); display:flex; flex-direction:column; gap:8px; }
  .aichat-header-row { display:flex; gap:8px; align-items:center; }
  .aichat-suggests { margin-top:8px; display:flex; gap:8px; flex-wrap:wrap; }
  .chip { padding:6px 12px; border-radius:20px; background:rgba(255,255,255,0.18); cursor:pointer; font-size:13px; }
  .aichat-body { flex:1; overflow:hidden; display:flex; flex-direction:column; background: var(--bg, #f7fbfd); }
  .messages-wrap { flex:1; overflow-y:auto; padding:20px; }
  .bubble { max-width:72%; padding:12px 16px; border-radius:12px; margin-bottom:12px; white-space:pre-wrap; word-break:break-word; overflow-wrap:anywhere; line-height:1.5; }
  .bubble.ai { background: #f1f5f9; color:#0f172a; border-left:4px solid #3b82f6; }
  .bubble.user { background:#2563eb; color:#fff; margin-left:auto; }
  .typing { width:70px; height:28px; display:flex; gap:6px; align-items:center; }
  .dot { width:8px;height:8px;border-radius:50%;background:#94a3b8; animation: blink 1s infinite; }
  .dot:nth-child(2){ animation-delay:0.15s } .dot:nth-child(3){ animation-delay:0.3s }
  @keyframes blink { 0%,100%{opacity:0.2} 50%{opacity:1} }
  .aichat-inputbar { display:flex; gap:8px; align-items:center; padding:12px; border-top:1px solid #e6eef6; background:var(--input-bg,#fff) }
  .aichat-input { flex:1; padding:12px; border-radius:10px; border:1px solid #cbd5e1; }
  .icon-btn { padding:8px 10px; border-radius:10px; background:#f1f5f9; cursor:pointer; border:none; }
  .dark .aichat-header { background:linear-gradient(90deg,#0f172a,#064e3b); }
  .dark .aichat-body { --bg: #041025; --input-bg:#06202b; color:#e6f0f7 }
  .dark .bubble.ai { background:#06202b; color:#dbeafe; border-left-color:#06b6d4; }
  .dark .bubble.user { background:#2563eb; color:#fff; }
  .warning-box { border-left:4px solid #ef4444; background:rgba(254,226,226,0.6); padding:10px 12px; border-radius:8px; color:#7f1d1d; margin:8px 0; }
  .new-msg-btn { position:fixed; right:24px; bottom:100px; background:#ef4444; color:white; padding:8px 12px; border-radius:8px; cursor:pointer; box-shadow:0 6px 18px rgba(0,0,0,0.15); }
  .attachment-preview { max-width:120px; max-height:90px; object-fit:cover; border-radius:8px; margin-right:8px; border:1px solid #e2e8f0; }
  .small-muted { font-size:12px; color:#64748b; }
  `;
  document.head.appendChild(style);
};

// ---------------------------
// Component
export default function AIChat({ token, userFamily = [] }) {
  useEffect(() => injectStyles(), []);

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const [selectedMember, setSelectedMember] = useState("Self");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [darkMode, setDarkMode] = useState(localStorage.getItem("aichat-dark") === "1");
  const [attachmentPreview, setAttachmentPreview] = useState(null);
  const [newMessagesAvailable, setNewMessagesAvailable] = useState(false);

  const recognitionRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const userAtBottomRef = useRef(true);
  const mountedRef = useRef(false);

  // --- Load memory (backend first, fallback localStorage)
  useEffect(() => {
    mountedRef.current = true;
    const load = async () => {
      // Try backend memory (if backend implemented)
      try {
        const res = await fetch(`/api/ai/memory?member=${encodeURIComponent(selectedMember)}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

        if (res.ok) {
          const data = await res.json();
          if (data?.messages?.length) {
            setMessages(data.messages);
            return;
          }
        } else if (res.status !== 404) {
          // if not 404 (not found) and not ok, throw so we fallback to local storage
          // 401 will also be handled below
          if (res.status === 401) {
            setMessages([{ sender: "ai", text: "Unauthorized — please login to use AI features.", ts: Date.now() }]);
            return;
          }
        }
      } catch (err) {
        // backend unreachable or other error -> fallback to localStorage
      }

      // fallback: localStorage memory keyed by member
      const key = `aichat_mem_${selectedMember}`;
      const raw = localStorage.getItem(key);
      if (raw) {
        try {
          setMessages(JSON.parse(raw));
          return;
        } catch {}
      }

      // if nothing, set initial system message
      setMessages([
        {
          sender: "ai",
          text: "👋 **Hello — I'm your Health Assistant.**\nHow can I help today?",
          ts: Date.now(),
        },
      ]);
    };

    load();

    return () => {
      mountedRef.current = false;
      if (recognitionRef.current) recognitionRef.current.stop();
    };
  }, [selectedMember, token]);

  // --- Save memory (attempt backend; fallback localStorage)
  useEffect(() => {
    if (!mountedRef.current) return;
    const save = async () => {
      const payload = { member: selectedMember, messages };
      try {
        await fetch("/api/ai/memory", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(payload),
        });
      } catch (err) {
        // fallback localStorage
        try {
          localStorage.setItem(`aichat_mem_${selectedMember}`, JSON.stringify(messages));
        } catch {}
      }
    };
    const t = setTimeout(save, 800);
    return () => clearTimeout(t);
  }, [messages, selectedMember, token]);

  // dark mode apply
  useEffect(() => {
    document.body.classList.toggle("dark", darkMode);
    localStorage.setItem("aichat-dark", darkMode ? "1" : "0");
  }, [darkMode]);

  // scroll detection
  useEffect(() => {
    const sc = scrollContainerRef.current;
    if (!sc) return;
    const onScroll = () => {
      const threshold = 160;
      const dist = sc.scrollHeight - (sc.scrollTop + sc.clientHeight);
      userAtBottomRef.current = dist < threshold;
      if (userAtBottomRef.current) setNewMessagesAvailable(false);
    };
    sc.addEventListener("scroll", onScroll);
    onScroll();
    return () => sc.removeEventListener("scroll", onScroll);
  }, []);

  // auto scroll or show indicator
  useEffect(() => {
    const sc = scrollContainerRef.current;
    if (!sc) return;
    if (userAtBottomRef.current) {
      sc.scrollTo({ top: sc.scrollHeight, behavior: "smooth" });
    } else {
      setNewMessagesAvailable(true);
    }
  }, [messages]);

  // speech
  const startRecording = () => {
    if (!("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
      alert("Speech recognition not supported in this browser.");
      return;
    }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const r = new SR();
    r.lang = "en-US";
    r.interimResults = false;
    r.continuous = false;
    r.maxAlternatives = 1;
    r.onstart = () => setIsRecording(true);
    r.onerror = () => setIsRecording(false);
    r.onend = () => setIsRecording(false);
    r.onresult = (e) => {
      const t = Array.from(e.results).map((r) => r[0].transcript).join(" ");
      setInput((prev) => (prev ? prev + " " + t : t));
    };
    r.start();
    recognitionRef.current = r;
  };
  const stopRecording = () => {
    if (recognitionRef.current) recognitionRef.current.stop();
    setIsRecording(false);
  };

  // attachments
  const onFileChange = (ev) => {
    const f = ev.target.files[0];
    if (!f) return;
    const url = URL.createObjectURL(f);
    setAttachmentPreview({ url, file: f });
  };

  const sendAttachment = async () => {
    if (!attachmentPreview?.file) return;
    setMessages((prev) => [
      ...prev,
      { sender: "user", text: `📷 Sent an image`, ts: Date.now(), attachment: attachmentPreview.url },
    ]);
    const fd = new FormData();
    fd.append("file", attachmentPreview.file);
    fd.append("member", selectedMember);
    try {
      const resp = await fetch("/api/ai/attachments", {
        method: "POST",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: fd,
      });

      if (resp.status === 401) {
        setMessages((prev) => [...prev, { sender: "ai", text: "Unauthorized — please login to upload attachments.", ts: Date.now() }]);
        return;
      }

      if (!resp.ok) throw new Error("Upload failed");
      const data = await resp.json();
      if (data?.reply) {
        setMessages((prev) => [...prev, { sender: "ai", text: data.reply, ts: Date.now() }]);
      } else {
        setMessages((prev) => [...prev, { sender: "ai", text: "✅ Image uploaded (no AI reply).", ts: Date.now() }]);
      }
    } catch (err) {
      setMessages((prev) => [...prev, { sender: "ai", text: "⚠️ Image upload failed. Try again.", ts: Date.now() }]);
    } finally {
      setAttachmentPreview(null);
    }
  };

  // ---------------------------
  // Send message flow with typing indicator / backend call
  const handleSend = async (txt = null) => {
    const messageText = (txt ?? input).trim();
    if (!messageText) return;

    const userMsg = { sender: "user", text: messageText, ts: Date.now() };
    setMessages((prev) => [...prev, userMsg]);

    setInput("");
    setShowEmojiPicker(false);
    setIsTyping(true);

    const payload = { message: messageText, member: selectedMember };

    try {
      // Try sendToAI helper first (ensure it accepts token); fallback to fetch with token
      let responseObj = null;

      try {
        if (typeof sendToAI === "function") {
          // assume sendToAI(message, token, extras) -> returns object
          responseObj = await sendToAI(messageText, token, { member: selectedMember });
        }
      } catch (err) {
        // ignore -> fallback to raw fetch
      }

      if (!responseObj) {
        const r = await fetch("/api/ai/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(payload),
        });

        if (r.status === 401) {
          // Show friendly unauthorized msg and stop
          setIsTyping(false);
          setMessages((prev) => [...prev, { sender: "ai", text: "Unauthorized — please login to use AI features.", ts: Date.now() }]);
          return;
        }

        if (!r.ok) {
          const txt = await r.text().catch(() => "");
          setIsTyping(false);
          setMessages((prev) => [...prev, { sender: "ai", text: `⚠️ Server error: ${r.status} ${r.statusText}\n${txt}`, ts: Date.now() }]);
          return;
        }

        try {
          responseObj = await r.json();
        } catch (err) {
          // if server returned plain text
          const txt = await r.text();
          responseObj = { reply: txt };
        }
      }

      // Expected server reply fields: reply | text | message
      let reply = (responseObj && (responseObj.reply || responseObj.text || responseObj.message)) || "Sorry, no response.";

      // If server returns JSON-string we try to format (but aiController should return Markdown)
      try {
        const parsed = JSON.parse(reply);
        if (parsed?.title) {
          reply = `## ${parsed.title}\n\n${parsed.summary || ""}\n\n${(parsed.points || []).map((p) => `- ${p}`).join("\n")}\n\n> ⚠️ ${parsed.note || ""}`;
        }
      } catch {}

      // push AI reply with slight delay to feel natural
      setTimeout(() => {
        setMessages((prev) => [...prev, { sender: "ai", text: reply, ts: Date.now() }]);
        setIsTyping(false);
      }, 400 + Math.random() * 700);
    } catch (err) {
      setIsTyping(false);
      setMessages((prev) => [...prev, { sender: "ai", text: "⚠️ Sorry — I couldn't reach the server right now.", ts: Date.now() }]);
    }
  };

  // quick send when clicking chips
  const handleChipSend = (q) => {
    setInput(q);
    setTimeout(() => handleSend(q), 100);
  };

  const onEmojiSelect = (ev, emojiObj) => {
    setInput((p) => p + emojiObj.emoji);
  };

  const exportToPDF = () => {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const margin = 40;
    const width = doc.internal.pageSize.getWidth() - margin * 2;
    let y = 60;
    doc.setFontSize(18);
    doc.text("SwasthaParivar - Chat Export", margin, y);
    y += 28;
    doc.setFontSize(11);

    messages.forEach((m) => {
      const sender = m.sender === "user" ? "You" : "Assistant";
      const text = `${sender}: ${m.text.replace(/\*/g, "")}`;
      const lines = doc.splitTextToSize(text, width);
      if (y + lines.length * 14 > doc.internal.pageSize.getHeight() - 40) {
        doc.addPage();
        y = 40;
      }
      doc.text(lines, margin, y);
      y += lines.length * 14 + 10;
    });
    doc.save("chat.pdf");
  };

  const filtered = messages.filter((m) => m.text.toLowerCase().includes(search.toLowerCase()));

  const mdComponents = {
    p: ({ node, children }) => {
      const txt = String(children).trim().toLowerCase();
      if (txt.startsWith("⚠️") || txt.startsWith("warning:") || txt.startsWith("alert:")) {
        return <div className="warning-box">{children}</div>;
      }
      return <p style={{ margin: 0 }}>{children}</p>;
    },
  };

  return (
    <div className="aichat-root" style={{ background: darkMode ? "#031324" : "#fff" }}>
      {/* HEADER */}
      <div className="aichat-header">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 18 }}>SwasthaParivar — Health AI</div>
            <div style={{ fontSize: 13, opacity: 0.95 }}>Context: {selectedMember}</div>
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              placeholder="Search chat..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ padding: 8, borderRadius: 8, border: "none", minWidth: 220 }}
            />
            <button className="icon-btn" onClick={() => setMessages([])}>Clear</button>
            <button className="icon-btn" onClick={exportToPDF}>Export</button>
            <select
              value={selectedMember}
              onChange={(e) => setSelectedMember(e.target.value)}
              style={{ padding: 8, borderRadius: 8 }}
            >
              <option value="Self">Self</option>
              {userFamily.map((m) => <option key={m._id} value={m.name}>{m.name}</option>)}
            </select>

            <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <input type="checkbox" checked={darkMode} onChange={(e) => setDarkMode(e.target.checked)} />
              <span style={{ fontSize: 13 }}>Dark</span>
            </label>
          </div>
        </div>

        <div className="aichat-suggests">
          {suggestedQs.map((q) => (
            <div key={q} className="chip" onClick={() => handleChipSend(q)}>{q}</div>
          ))}
        </div>
      </div>

      {/* BODY */}
      <div className="aichat-body">
        <div className="messages-wrap" ref={scrollContainerRef}>
          {filtered.map((m, i) => (
            <div key={i} style={{ display: "flex", justifyContent: m.sender === "user" ? "flex-end" : "flex-start" }}>
              <div className={`bubble ${m.sender === "user" ? "user" : "ai"}`} style={{ maxWidth: "78%" }}>
                {m.attachment && <img src={m.attachment} alt="att" className="attachment-preview" />}
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
                  {m.text}
                </ReactMarkdown>
                <div style={{ marginTop: 8 }} className="small-muted">{new Date(m.ts || Date.now()).toLocaleString()}</div>
              </div>
            </div>
          ))}

          {isTyping && (
            <div style={{ display: "flex", justifyContent: "flex-start" }}>
              <div className="bubble ai typing" aria-hidden>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div className="dot" /><div className="dot" /><div className="dot" />
                </div>
              </div>
            </div>
          )}
        </div>

        {newMessagesAvailable && (
          <div className="new-msg-btn" onClick={() => {
            const sc = scrollContainerRef.current;
            sc?.scrollTo({ top: sc.scrollHeight, behavior: "smooth" });
            setNewMessagesAvailable(false);
          }}>
            New messages
          </div>
        )}

        {attachmentPreview && (
          <div style={{ padding: 10, display: "flex", alignItems: "center", gap: 12 }}>
            <img src={attachmentPreview.url} alt="preview" className="attachment-preview" />
            <div style={{ display: "flex", gap: 8 }}>
              <button className="icon-btn" onClick={() => sendAttachment()}>Send Image</button>
              <button className="icon-btn" onClick={() => setAttachmentPreview(null)}>Remove</button>
            </div>
          </div>
        )}
      </div>

      {/* INPUT BAR */}
      <div className="aichat-inputbar">
        <input type="file" accept="image/*" onChange={onFileChange} style={{ display: "none" }} id="aichat-file" />
        <label htmlFor="aichat-file" className="icon-btn" title="Attach image">📷</label>

        <button className="icon-btn" onClick={() => (isRecording ? stopRecording() : startRecording())} title="Record voice" style={{ background: isRecording ? "#ef4444" : undefined }}>
          {isRecording ? "⏹️" : "🎤"}
        </button>

        <div style={{ position: "relative" }}>
          <button className="icon-btn" onClick={() => setShowEmojiPicker((s) => !s)}>😊</button>
          {showEmojiPicker && (
            <div style={{ position: "absolute", bottom: 50, left: 0, zIndex: 40 }}>
              <EmojiPicker onEmojiClick={onEmojiSelect} />
            </div>
          )}
        </div>

        <input
          className="aichat-input"
          placeholder="Ask something..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
        />

        <button style={{ background: "#2563eb", color: "#fff", borderRadius: 10, padding: "10px 16px", border: "none" }} onClick={() => handleSend()}>
          Send
        </button>
      </div>
    </div>
  );
}
