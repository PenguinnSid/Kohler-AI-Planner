import { useState } from "react";
import LayoutPlanner2D from "./LayoutPlanner2D";

const ORANGE = "#D97E3A";
const DARK_ORANGE = "#B86A2A";
const PEACH = "#E8B4A0";
const WHITE = "#FFFFFF";

export default function DesignForm({ onSubmit }) {
  const [form, setForm] = useState({
    room_width_ft: 8,
    room_depth_ft: 6,
    budget_inr: 0,
    aesthetic_theme: "Minimalist Modern",
    cohesion_score: 0.5,
  });

  const [useCustom2D, setUseCustom2D] = useState(false);
  const [customLayout, setCustomLayout] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ 
      ...form, 
      [name]: name === "aesthetic_theme" 
        ? value 
        : (name === "cohesion_score" ? parseFloat(value) : (name.includes("_ft") ? parseFloat(value) : parseInt(value)))
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      custom_layout: useCustom2D && customLayout ? customLayout : null,
    };
    onSubmit(payload);
  };

  const styles = {
    form: {
      display: "grid",
      gridTemplateColumns: "1fr",
      gap: "16px",
      marginBottom: "16px",
    },
    formGroup: {
      display: "flex",
      flexDirection: "column",
      gap: "6px",
    },
    label: {
      fontSize: "0.85rem",
      fontWeight: "700",
      color: "#FFD166",
    },
    input: {
      padding: "8px 10px",
      border: `1px solid #334155`,
      borderRadius: "4px",
      fontSize: "0.9rem",
      backgroundColor: "#0F172A",
      color: "#F8FAFC",
      transition: "border-color 0.2s ease",
      fontFamily: "inherit",
    },
    inputFocus: {
      borderColor: ORANGE,
      outline: "none",
      boxShadow: `0 0 0 3px rgba(217, 126, 58, 0.25)`,
    },
    select: {
      padding: "8px 10px",
      border: `1px solid #334155`,
      borderRadius: "4px",
      fontSize: "0.9rem",
      backgroundColor: "#0F172A",
      color: "#F8FAFC",
      cursor: "pointer",
      transition: "border-color 0.2s ease",
      fontFamily: "inherit",
    },
    toggleBtn: {
      padding: "10px 14px",
      backgroundColor: useCustom2D ? "#1E293B" : "#0F172A",
      border: `1px dashed ${ORANGE}`,
      borderRadius: "6px",
      color: "#FFD166",
      fontSize: "0.85rem",
      fontWeight: "700",
      cursor: "pointer",
      textAlign: "center",
      transition: "all 0.2s ease",
    },
    button: {
      padding: "12px 18px",
      backgroundColor: ORANGE,
      color: WHITE,
      border: "none",
      borderRadius: "6px",
      fontSize: "0.95rem",
      fontWeight: "700",
      cursor: "pointer",
      transition: "all 0.2s ease",
      gridColumn: "1 / -1",
      marginTop: "6px",
      boxShadow: "0 4px 12px rgba(217, 126, 58, 0.3)",
    },
    buttonHover: {
      backgroundColor: DARK_ORANGE,
      transform: "translateY(-1px)",
      boxShadow: "0 6px 16px rgba(184, 106, 42, 0.4)",
    },
  };

  return (
    <form onSubmit={handleSubmit} style={styles.form}>
      <div style={styles.formGroup}>
        <label style={styles.label}>Width (ft)</label>
        <input
          style={styles.input}
          name="room_width_ft"
          type="number"
          step="0.5"
          min="3"
          value={form.room_width_ft}
          onChange={handleChange}
          onFocus={(e) => Object.assign(e.target.style, styles.inputFocus)}
          onBlur={(e) => Object.assign(e.target.style, { ...styles.input })}
        />
      </div>

      <div style={styles.formGroup}>
        <label style={styles.label}>Depth (ft)</label>
        <input
          style={styles.input}
          name="room_depth_ft"
          type="number"
          step="0.5"
          min="3"
          value={form.room_depth_ft}
          onChange={handleChange}
          onFocus={(e) => Object.assign(e.target.style, styles.inputFocus)}
          onBlur={(e) => Object.assign(e.target.style, { ...styles.input })}
        />
      </div>

      <div style={styles.formGroup}>
        <label style={styles.label}>Budget (₹)</label>
        <input
          style={styles.input}
          name="budget_inr"
          type="number"
          step="10000"
          min="50000"
          value={form.budget_inr}
          onChange={handleChange}
          onFocus={(e) => Object.assign(e.target.style, styles.inputFocus)}
          onBlur={(e) => Object.assign(e.target.style, { ...styles.input })}
        />
      </div>

      <div style={styles.formGroup}>
        <label style={styles.label}>Theme</label>
        <select
          style={styles.select}
          name="aesthetic_theme"
          value={form.aesthetic_theme}
          onChange={handleChange}
          onFocus={(e) => Object.assign(e.target.style, styles.inputFocus)}
          onBlur={(e) => Object.assign(e.target.style, { ...styles.select })}
        >
          <option>Minimalist Modern</option>
          <option>Classic Luxury</option>
          <option>Japanese Zen</option>
        </select>
      </div>

      {/* Theme Cohesion Slider */}
      <div style={styles.formGroup}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <label style={styles.label}>Theme Cohesion</label>
          <span style={{ fontSize: "0.85rem", fontWeight: "700", color: DARK_ORANGE }}>
            {form.cohesion_score.toFixed(1)} {form.cohesion_score === 0 ? "(No Cohesion)" : form.cohesion_score === 0.5 ? "(Medium)" : form.cohesion_score === 1 ? "(Very High)" : ""}
          </span>
        </div>
        <input
          style={{ width: "100%", accentColor: ORANGE, cursor: "pointer", height: "6px" }}
          name="cohesion_score"
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={form.cohesion_score}
          onChange={handleChange}
        />
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "#777" }}>
          <span>0 (None)</span>
          <span>0.5 (Medium)</span>
          <span>1.0 (High)</span>
        </div>
      </div>

      {/* 2D Drag-and-Drop Room Painter Section (Optional / Skippable) */}
      <div style={styles.formGroup}>
        <div
          onClick={() => setUseCustom2D(!useCustom2D)}
          style={styles.toggleBtn}
        >
          {useCustom2D ? "✓ 2D Painter Enabled (Click to Skip)" : "+ Open 2D Floorplan Painter (Optional)"}
        </div>

        {useCustom2D && (
          <LayoutPlanner2D
            roomWidthFt={form.room_width_ft}
            roomDepthFt={form.room_depth_ft}
            customLayout={customLayout}
            onChange={setCustomLayout}
            onReset={() => setCustomLayout(null)}
          />
        )}
      </div>

      <button
        type="submit"
        style={styles.button}
        onMouseEnter={(e) => Object.assign(e.target.style, styles.buttonHover)}
        onMouseLeave={(e) => Object.assign(e.target.style, styles.button)}
      >
        Generate Design
      </button>
    </form>
  );
}
