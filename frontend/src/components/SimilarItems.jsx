import { useEffect, useState } from "react";
import LayoutViewer3D from "./LayoutViewer3D";
import { getSimilarProducts } from "../api/client";

const DARK_ORANGE = "#B86A2A";
const PEACH = "#E8B4A0";
const ORANGE = "#D97E3A";
const WHITE = "#FFFFFF";

export default function SimilarItems({ skuCode }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!skuCode) return;
    setLoading(true);
    setError(null);
    getSimilarProducts(skuCode)
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [skuCode]);

  if (!skuCode) return null;

  const styles = {
    emptyState: {
      padding: "24px",
      textAlign: "center",
      color: "#999",
    },
    heading: {
      color: DARK_ORANGE,
      marginBottom: "20px",
    },
    categorySection: {
      marginBottom: "24px",
    },
    categoryTitle: {
      fontSize: "1.1rem",
      fontWeight: "600",
      color: DARK_ORANGE,
      marginBottom: "12px",
      textTransform: "uppercase",
    },
    itemsList: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
      gap: "12px",
    },
    itemCard: {
      backgroundColor: WHITE,
      border: `2px solid ${PEACH}`,
      borderRadius: "6px",
      padding: "12px",
      transition: "all 0.2s ease",
    },
    itemCardHover: {
      borderColor: ORANGE,
      boxShadow: "0 2px 8px rgba(217, 126, 58, 0.15)",
    },
    itemName: {
      fontSize: "0.95rem",
      fontWeight: "600",
      color: "#333",
      marginBottom: "4px",
    },
    itemPrice: {
      fontSize: "1rem",
      fontWeight: "700",
      color: ORANGE,
    },
    emptyCategory: {
      padding: "12px",
      backgroundColor: "#f0f0f0",
      borderRadius: "6px",
      color: "#999",
      fontSize: "0.9rem",
    },
  };

  if (loading) return <div style={styles.emptyState}>🔍 Finding the perfect matches...</div>;
  if (error) return <div style={styles.emptyState}>❌ Error: {error}</div>;
  if (!data) return <div style={styles.emptyState}>No data available</div>;

  return (
    <div>
      <h3 style={styles.heading}>💎 Matches for "{data.anchor.model_name}"</h3>
      
      {Object.entries(data.recommendations).map(([category, items]) => (
        <div key={category} style={styles.categorySection}>
          <div style={styles.categoryTitle}>{category}</div>
          {items.length === 0 ? (
            <div style={styles.emptyCategory}>No strong matches found in this category.</div>
          ) : (
            <div style={styles.itemsList}>
              {items.map((p) => (
                <div
                  key={p.sku_code}
                  style={styles.itemCard}
                  onMouseEnter={(e) => Object.assign(e.currentTarget.style, styles.itemCardHover)}
                  onMouseLeave={(e) => Object.assign(e.currentTarget.style, styles.itemCard)}
                >
                  <div style={styles.itemName}>{p.model_name}</div>
                  <div style={styles.itemPrice}>₹ {p.price_inr.toLocaleString('en-IN')}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      {/* 3D Layout Viewer */}
      {data.layout && (
        <div style={{ marginTop: "32px" }}>
          <h3 style={styles.heading}>🎨 3D Layout Preview</h3>
          <LayoutViewer3D
            layoutData={data.layout}
            roomWidth={data.room_width_ft}
            roomDepth={data.room_depth_ft}
          />
        </div>
      )}
    </div>
  );
}
