import { useState } from "react";

export default function DesignAssistant({ onSend, isBusy }) {
  const [isOpen, setIsOpen] = useState(true);
  const [text, setText] = useState("");
  const [messages, setMessages] = useState([{ role: "assistant", text: "I can update the room size, budget, style, surfaces, shower or bathtub zone, then refresh the complete product bundle." }]);
  const submit = async (event) => {
    event.preventDefault();
    if (!text.trim() || isBusy) return;
    const question = text.trim(); setText("");
    setMessages((items) => [...items, { role: "user", text: question }]);
    try { const result = await onSend(question); setMessages((items) => [...items, { role: "assistant", text: result.message, changes: result.changes }]); }
    catch { setMessages((items) => [...items, { role: "assistant", text: "I couldn’t update the design right now. Please try again." }]); }
  };
  if (!isOpen) return <button onClick={() => setIsOpen(true)} title="Open design assistant" style={{ position: "fixed", right: 0, top: "45%", zIndex: 120, padding: "14px 10px", border: "1px solid #64748B", borderRight: 0, borderRadius: "9px 0 0 9px", background: "rgba(8,9,12,.72)", backdropFilter: "blur(10px)", color: "#F8FAFC", cursor: "pointer", writingMode: "vertical-rl", fontWeight: 800 }}>Design assistant</button>;
  return <aside style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: "min(380px, 92vw)", zIndex: 120, display: "flex", flexDirection: "column", boxSizing: "border-box", padding: "20px 16px", color: "#F8FAFC", background: "rgba(8,9,12,.56)", backdropFilter: "blur(12px)", borderLeft: "1px solid rgba(148,163,184,.35)", boxShadow: "-16px 0 42px rgba(0,0,0,.2)" }}>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: 15, borderBottom: "1px solid rgba(148,163,184,.32)" }}><div style={{ fontWeight: 800, fontSize: 17 }}>Design assistant</div><button onClick={() => setIsOpen(false)} aria-label="Close design assistant" style={{ color: "#F8FAFC", background: "transparent", border: 0, fontSize: 24, cursor: "pointer" }}>×</button></div>
    <div style={{ flex: 1, minHeight: 0, overflowY: "auto", display: "grid", alignContent: "start", gap: 12, padding: "16px 2px" }}>
      {messages.map((message, i) => <div key={i} style={{ padding: 12, borderRadius: 9, background: message.role === "user" ? "rgba(30,41,59,.8)" : "rgba(8,9,12,.48)", border: "1px solid rgba(148,163,184,.18)", fontSize: 13, lineHeight: 1.5 }}>
        <div>{message.text}</div>{message.changes && <div style={{ marginTop: 9, paddingTop: 9, borderTop: "1px solid rgba(148,163,184,.25)", color: "#E2E8F0", display: "grid", gap: 3 }}>
          <div><b>Room:</b> {message.changes.room_width_ft} × {message.changes.room_depth_ft} ft · {message.changes.bath_section_mode}</div><div><b>Budget:</b> ₹{Number(message.changes.budget_inr || 0).toLocaleString("en-IN")}</div><div><b>Style:</b> {message.changes.aesthetic_theme}</div><div><b>Surfaces:</b> {message.changes.floor_theme} floor · {message.changes.wall_theme} wall</div><div><b>Products updated:</b> {message.changes.products_updated?.length || 0} · <b>Total:</b> ₹{Number(message.changes.total_price_inr || 0).toLocaleString("en-IN")}</div>
        </div>}
      </div>)}
    </div>
    <form onSubmit={submit} style={{ display: "flex", gap: 8, paddingTop: 14, borderTop: "1px solid rgba(148,163,184,.32)" }}><input value={text} onChange={(e) => setText(e.target.value)} placeholder="e.g. 5 x 8 ft, warm luxury, bathtub, budget 900000" style={{ flex: 1, minWidth: 0, padding: 11, background: "rgba(8,9,12,.48)", border: "1px solid #64748B", borderRadius: 7, color: "#F8FAFC" }} /><button type="submit" disabled={isBusy} style={{ border: 0, borderRadius: 7, padding: "0 13px", fontWeight: 800, cursor: "pointer" }}>{isBusy ? "…" : "Send"}</button></form>
  </aside>;
}
