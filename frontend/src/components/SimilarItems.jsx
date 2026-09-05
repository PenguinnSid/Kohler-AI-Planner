import { useEffect, useState } from "react";
import { getSimilarProducts } from "../api/client";

export default function SimilarItems({ skuCode }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!skuCode) return;
    getSimilarProducts(skuCode).then(setData);
  }, [skuCode]);

  if (!skuCode) return null;
  if (!data) return <p>Finding matches...</p>;

  return (
    <div>
      <h3>Matches for {data.anchor.model_name}</h3>
      {Object.entries(data.recommendations).map(([category, items]) => (
        <div key={category}>
          <h4>{category}</h4>
          {items.length === 0 ? (
            <p>No strong matches found in this category.</p>
          ) : (
            <ul>
              {items.map((p) => (
                <li key={p.sku_code}>
                  {p.model_name} — ₹{p.price_inr.toLocaleString()}
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}
