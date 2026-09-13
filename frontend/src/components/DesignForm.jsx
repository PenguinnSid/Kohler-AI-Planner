import { useState } from "react";

const ORANGE = "#D97E3A";
const DARK_ORANGE = "#B86A2A";
const PEACH = "#E8B4A0";
const WHITE = "#FFFFFF";

export default function DesignForm({ onSubmit }) {
  const [form, setForm] = useState({
    room_width_ft: 8,
    room_depth_ft: 6,
    budget_inr: 200000,
    aesthetic_theme: "Minimalist Modern",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ 
      ...form, 
      [name]: name === "aesthetic_theme" ? value : (name.includes("_ft") ? parseFloat(value) : parseInt(value))
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(form);
  };

  const styles = {
    form: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
      gap: "24px",
      marginBottom: "24px",
    },
    formGroup: {
      display: "flex",
      flexDirection: "column",
      gap: "8px",
    },
    label: {
      fontSize: "0.95rem",
      fontWeight: "600",
      color: DARK_ORANGE,
    },
    input: {
      padding: "12px",
      border: `2px solid ${PEACH}`,
      borderRadius: "6px",
      fontSize: "1rem",
      transition: "border-color 0.2s ease",
      fontFamily: "inherit",
    },
    inputFocus: {
      borderColor: ORANGE,
      outline: "none",
      boxShadow: `0 0 0 3px rgba(217, 126, 58, 0.1)`,
    },
    select: {
      padding: "12px",
      border: `2px solid ${PEACH}`,
      borderRadius: "6px",
      fontSize: "1rem",
      backgroundColor: WHITE,
      cursor: "pointer",
      transition: "border-color 0.2s ease",
      fontFamily: "inherit",
    },
    button: {
      padding: "12px 32px",
      backgroundColor: ORANGE,
      color: WHITE,
      border: "none",
      borderRadius: "6px",
      fontSize: "1rem",
      fontWeight: "600",
      cursor: "pointer",
      transition: "all 0.2s ease",
      gridColumn: "1 / -1",
      marginTop: "8px",
    },
    buttonHover: {
      backgroundColor: DARK_ORANGE,
      transform: "translateY(-2px)",
      boxShadow: "0 4px 12px rgba(184, 106, 42, 0.25)",
    },
  };

  return (
    <form onSubmit={handleSubmit} style={styles.form}>
      <div style={styles.formGroup}>
        <label style={styles.label}>Room Width (ft)</label>
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
        <label style={styles.label}>Room Depth (ft)</label>
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
        <label style={styles.label}>Budget (₹ INR)</label>
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
        <label style={styles.label}>Aesthetic Theme</label>
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

      <button
        type="submit"
        style={styles.button}
        onMouseEnter={(e) => Object.assign(e.target.style, styles.buttonHover)}
        onMouseLeave={(e) => Object.assign(e.target.style, styles.button)}
      >
        🎨 Generate Design
      </button>
    </form>
  );
}
