import { useState, useEffect } from "react";

export default function DesignAssistant({ onSend, isBusy }) {
  const [text, setText] = useState("");
  const [messages, setMessages] = useState([{ role: "assistant", text: "Tell me what you want to change. I'll refresh the matching products and surfaces." }]);
  const [isOpen, setIsOpen] = useState(true);

  useEffect(() => {
    document.documentElement.style.setProperty('--assistant-height', '100vh');
  }, []);

  const submit = async (event) => {
    event.preventDefault();
    if (!text.trim() || isBusy) return;
    const question = text.trim();
    setText("");
    setMessages((items) => [...items, { role: "user", text: question }]);
    try {
      const result = await onSend(question);
      const assistantText =
        typeof result === "string"
          ? result
          : result?.message || "I couldn't update the design right now. Please try again.";
      setMessages((items) => [
        ...items,
        { role: "assistant", text: assistantText, changes: result?.changes || {} },
      ]);
    } catch {
      setMessages((items) => [
        ...items,
        { role: "assistant", text: "I couldn't update the design right now. Please try again." },
      ]);
    }
  };

  return (
    <>
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          style={{
            position: "fixed", left: 0, top: "50%",
            transform: "translateY(-50%) rotate(-90deg)",
            background: "rgba(8,9,12,.56)", border: "1px solid #232D3F",
            borderRadius: "8px 0 0 8px", padding: "8px 4px", cursor: "pointer",
            color: "#F8FAFC", fontWeight: 800, zIndex: 120, whiteSpace: "nowrap",
            boxShadow: "0 14px 40px rgba(0,0,0,.45)",
          }}
        >
          Design Assistant
        </button>
      )}
      <aside
        style={{
          position: "fixed", right: isOpen ? 20 : -360, top: 0,
          height: "100vh", width: 340, zIndex: 120,
          boxShadow: "0 14px 40px rgba(0,0,0,.45)",
          transition: "right 0.3s ease-in-out",
          background: "rgba(8,9,12,.56)",
          border: "1px solid #232D3F",
          borderRadius: "12px 0 0 12px",
          display: "flex", flexDirection: "column", overflow: "hidden",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: "1px solid #232D3F" }}>
          <span style={{ fontWeight: 800, color: "#F8FAFC" }}>Design Assistant</span>
          <button onClick={() => setIsOpen(false)} style={{ background: "none", border: "none", color: "#CBD5E1", cursor: "pointer", padding: "4px 8px", borderRadius: "4px", fontSize: "16px" }}>✕</button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", display: "grid", gap: 10, padding: "16px" }}>
          {messages.map((message, i) => (
            <div key={i} style={{ padding: 10, borderRadius: 8, background: message.role === "user" ? "#1E293B" : "#08090C", fontSize: 13, lineHeight: 1.45, color: "#F8FAFC" }}>
              <div>{message.text}</div>
              {message.changes && Object.keys(message.changes).length > 0 && (
                <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid #232D3F", color: "#CBD5E1", fontSize: 12 }}>
                  {message.changes.products_updated && <div><b>Products updated:</b> {message.changes.products_updated.length || 0}</div>}
                  {message.changes.aesthetic_theme && <div><b>Style:</b> {message.changes.aesthetic_theme}</div>}
                  {message.changes.floor_theme && message.changes.wall_theme && <div><b>Surfaces:</b> {message.changes.floor_theme} floor · {message.changes.wall_theme} wall</div>}
                  {message.changes.room_width_ft && <div><b>Dimensions:</b> {message.changes.room_width_ft}' × {message.changes.room_depth_ft}'</div>}
                  {message.changes.budget_inr && <div><b>Budget:</b> ₹{Number(message.changes.budget_inr).toLocaleString("en-IN")}</div>}
                  {message.changes.bath_section_mode && <div><b>Bath zone:</b> {message.changes.bath_section_mode}</div>}
                  {message.changes.total_price_inr && <div><b>Bundle total:</b> ₹{Number(message.changes.total_price_inr).toLocaleString("en-IN")}</div>}
                </div>
              )}
            </div>
          ))}
        </div>
        <form onSubmit={submit} style={{ display: "flex", gap: 8, padding: "16px", borderTop: "1px solid #232D3F" }}>
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="e.g. 5x8 ft, warm style, bathtub, budget 900000" style={{ flex: 1, minWidth: 0, padding: 10, background: "#08090C", border: "1px solid #334155", borderRadius: 7, color: "#F8FAFC", fontSize: 13 }} />
          <button type="submit" disabled={isBusy} style={{ border: 0, borderRadius: 7, padding: "0 12px", fontWeight: 800, cursor: isBusy ? "not-allowed" : "pointer", background: isBusy ? "#64748B" : "#000000", color: isBusy ? "#94A3B8" : "#F8FAFC" }}>
            {isBusy ? "…" : "Send"}
          </button>
        </form>
      </aside>
    </>
  );
}