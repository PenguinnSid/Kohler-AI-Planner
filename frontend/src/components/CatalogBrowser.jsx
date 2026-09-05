import { useEffect, useState } from "react";
import { getProducts } from "../api/client";

export default function CatalogBrowser({ onSelect }) {
  const [products, setProducts] = useState([]);
  const [category, setCategory] = useState("");

  useEffect(() => {
    getProducts(category || undefined).then(setProducts);
  }, [category]);

  return (
    <div>
      <h3>Browse the catalogue</h3>
      <select value={category} onChange={(e) => setCategory(e.target.value)}>
        <option value="">All categories</option>
        <option value="toilet">Toilet</option>
        <option value="mirror">Mirror</option>
        <option value="washbasin">Wash Basin</option>
        <option value="faucet">Faucet</option>
        <option value="shower">Shower</option>
        <option value="bathtub">Bathtub</option>
      </select>

      <ul>
        {products.map((p) => (
          <li key={p.sku_code}>
            <strong>{p.model_name}</strong> ({p.category}) — ₹{p.price_inr.toLocaleString()}
            <button onClick={() => onSelect(p.sku_code)} style={{ marginLeft: 8 }}>
              See matching items
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
