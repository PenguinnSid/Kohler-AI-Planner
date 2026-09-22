import { useState } from "react";
const card = { background: "#10141D", border: "1px solid #232D3F", borderRadius: 12, padding: 16, color: "#F8FAFC" };
export default function DesignAssistant({ onSend, isBusy }) {
  const [text, setText] = useState("");
  const [messages, setMessages] = useState([{ role: "assistant", text: "Tell me what you want to change. I’ll refresh the matching products and surfaces." }]);
  const submit = async (event) => {
    event.preventDefault();
    if (!text.trim() || isBusy) return;
    const question = text.trim(); setText("");
    setMessages((items) => [...items, { role: "user", text: question }]);
    try { const result = await onSend(question); setMessages((items) => [...items, { role: "assistant", text: result.message, changes: result.changes }]); }
    catch { setMessages((items) => [...items, { role: "assistant", text: "I couldn’t update the design right now. Please try again." }]); }
  };
  return <aside style={{ ...card, position: "fixed", right: 20, bottom: 20, width: 330, zIndex: 120, boxShadow: "0 14px 40px rgba(0,0,0,.45)" }}>
    <div style={{ fontWeight: 800, marginBottom: 12 }}>Design assistant <span style={{ color: "#94A3B8", fontSize: 12 }}>LIVE</span></div>
    <div style={{ maxHeight: 280, overflowY: "auto", display: "grid", gap: 10, paddingRight: 3 }}>
      {messages.map((message, i) => <div key={i} style={{ padding: 10, borderRadius: 8, background: message.role === "user" ? "#1E293B" : "#08090C", fontSize: 13, lineHeight: 1.45 }}>
        <div>{message.text}</div>
        {message.changes && <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid #232D3F", color: "#CBD5E1" }}>
          <div><b>Products updated:</b> {message.changes.products_updated?.length || 0}</div>
          <div><b>Style:</b> {message.changes.aesthetic_theme}</div>
          <div><b>Surfaces:</b> {message.changes.floor_theme} floor · {message.changes.wall_theme} wall</div>
          <div><b>Bundle total:</b> ₹{Number(message.changes.total_price_inr || 0).toLocaleString("en-IN")}</div>
      </div>)}
    </div>
    <form onSubmit={submit} style={{ display: "flex", gap: 8, marginTop: 12 }}>
      <input value={text} onChange={(e) => setText(e.target.value)} placeholder="e.g. make it Japanese Zen" style={{ flex: 1, minWidth: 0, padding: 10, background: "#08090C", border: "1px solid #334155", borderRadius: 7, color: "#F8FAFC" }} />
      <button type="submit" disabled={isBusy} style={{ border: 0, borderRadius: 7, padding: "0 12px", fontWeight: 800, cursor: "pointer" }}>{isBusy ? "…" : "Send"}</button>
    </form>
  </aside>;
}
