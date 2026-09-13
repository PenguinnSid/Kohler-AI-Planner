import { useEffect, useState } from "react";
import { getProducts } from "../api/client";

const ORANGE = "#D97E3A";
const DARK_ORANGE = "#B86A2A";
const PEACH = "#E8B4A0";
const WHITE = "#FFFFFF";
const LIGHT_GRAY = "#F5F5F5";

export default function CatalogBrowser({ onSelect }) {
  const [products, setProducts] = useState([]);
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    getProducts(category || undefined)
      .then(setProducts)
      .finally(() => setLoading(false));
  }, [category]);

  const styles = {
    filterContainer: {
      marginBottom: "24px",
      display: "flex",
      gap: "16px",
      alignItems: "center",
    },
    select: {
      padding: "10px 16px",
      border: `2px solid ${PEACH}`,
      borderRadius: "6px",
      fontSize: "0.95rem",
      backgroundColor: WHITE,
      cursor: "pointer",
      flex: "0 1 250px",
      fontFamily: "inherit",
    },
    productsGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
      gap: "16px",
    },
    productCard: {
      backgroundColor: WHITE,
      border: `2px solid ${PEACH}`,
      borderRadius: "8px",
      padding: "16px",
      transition: "all 0.2s ease",
      cursor: "pointer",
    },
    productCardHover: {
      borderColor: ORANGE,
      boxShadow: "0 4px 16px rgba(217, 126, 58, 0.2)",
      transform: "translateY(-4px)",
    },
    productName: {
      fontSize: "1.1rem",
      fontWeight: "600",
      color: "#333",
      marginBottom: "8px",
    },
    productCategory: {
      fontSize: "0.85rem",
      color: DARK_ORANGE,
      fontWeight: "600",
      marginBottom: "8px",
      textTransform: "uppercase",
    },
    productPrice: {
      fontSize: "1.2rem",
      fontWeight: "700",
      color: ORANGE,
      marginBottom: "12px",
    },
    productButton: {
      width: "100%",
      padding: "10px",
      backgroundColor: ORANGE,
      color: WHITE,
      border: "none",
      borderRadius: "6px",
      cursor: "pointer",
      fontWeight: "600",
      fontSize: "0.95rem",
      transition: "all 0.2s ease",
    },
    buttonHover: {
      backgroundColor: DARK_ORANGE,
      transform: "scale(1.02)",
    },
    emptyState: {
      textAlign: "center",
      padding: "40px",
      color: "#999",
    },
  };

  return (
    <div>
      <div style={styles.filterContainer}>
        <label style={{ fontSize: "0.95rem", fontWeight: "600", color: DARK_ORANGE }}>
          Filter by category:
        </label>
        <select 
          value={category} 
          onChange={(e) => setCategory(e.target.value)}
          style={styles.select}
        >
          <option value="">All categories</option>
          <option value="toilet">🚽 Toilet</option>
          <option value="mirror">🪞 Mirror</option>
          <option value="washbasin">🧴 Wash Basin</option>
          <option value="faucet">🚰 Faucet</option>
          <option value="shower">🚿 Shower</option>
          <option value="bathtub">🛁 Bathtub</option>
        </select>
      </div>

      {loading && <div style={styles.emptyState}>Loading products...</div>}

      {!loading && products.length === 0 && (
        <div style={styles.emptyState}>No products found in this category.</div>
      )}

      {!loading && products.length > 0 && (
        <div style={styles.productsGrid}>
          {products.map((p) => (
            <div
              key={p.sku_code}
              style={styles.productCard}
              onMouseEnter={(e) => Object.assign(e.currentTarget.style, styles.productCardHover)}
              onMouseLeave={(e) => Object.assign(e.currentTarget.style, styles.productCard)}
            >
              <div style={styles.productCategory}>{p.category}</div>
              <div style={styles.productName}>{p.model_name}</div>
              <div style={styles.productPrice}>₹ {p.price_inr.toLocaleString('en-IN')}</div>
              <button
                onClick={() => onSelect(p.sku_code)}
                style={styles.productButton}
                onMouseEnter={(e) => Object.assign(e.target.style, styles.buttonHover)}
                onMouseLeave={(e) => Object.assign(e.target.style, styles.productButton)}
              >
                👀 See Matches
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
