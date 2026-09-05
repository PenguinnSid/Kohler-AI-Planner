import { useState } from "react";

export default function DesignForm({ onSubmit }) {
  const [form, setForm] = useState({
    room_width_ft: 8,
    room_depth_ft: 6,
    budget_inr: 200000,
    aesthetic_theme: "Minimalist Modern",
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit}>
      <label>
        Room width (ft)
        <input name="room_width_ft" type="number" value={form.room_width_ft} onChange={handleChange} />
      </label>
      <label>
        Room depth (ft)
        <input name="room_depth_ft" type="number" value={form.room_depth_ft} onChange={handleChange} />
      </label>
      <label>
        Budget (INR)
        <input name="budget_inr" type="number" value={form.budget_inr} onChange={handleChange} />
      </label>
      <label>
        Aesthetic theme
        <select name="aesthetic_theme" value={form.aesthetic_theme} onChange={handleChange}>
          <option>Minimalist Modern</option>
          <option>Classic Luxury</option>
          <option>Japanese Zen</option>
        </select>
      </label>
      <button type="submit">Generate design</button>
    </form>
  );
}
