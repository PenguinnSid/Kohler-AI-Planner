const DARK_ORANGE = "#B86A2A";
const PEACH = "#E8B4A0";
const WHITE = "#FFFFFF";

export default function BundleResult({ bundle }) {
  if (!bundle) return null;

  const styles = {
    container: {
      display: "grid",
      gap: "16px",
    },
    card: {
      backgroundColor: WHITE,
      border: `2px solid ${PEACH}`,
      borderRadius: "8px",
      padding: "16px",
      transition: "all 0.2s ease",
    },
    cardHover: {
      borderColor: DARK_ORANGE,
      boxShadow: "0 4px 12px rgba(184, 106, 42, 0.1)",
    },
    category: {
      fontSize: "0.9rem",
      fontWeight: "600",
      color: DARK_ORANGE,
      marginBottom: "4px",
    },
    modelName: {
      fontSize: "1.1rem",
      fontWeight: "600",
      color: "#333",
      marginBottom: "8px",
    },
    justification: {
      fontSize: "0.95rem",
      color: "#666",
      fontStyle: "italic",
    },
    priceContainer: {
      marginTop: "24px",
      padding: "16px",
      backgroundColor: PEACH,
      borderRadius: "6px",
      textAlign: "center",
    },
    priceLabel: {
      fontSize: "0.9rem",
      color: DARK_ORANGE,
      fontWeight: "500",
    },
    priceValue: {
      fontSize: "1.5rem",
      fontWeight: "700",
      color: DARK_ORANGE,
      marginTop: "4px",
    },
  };

  return (
    <div style={styles.container}>
      <h3 style={{ margin: "0 0 16px 0", color: DARK_ORANGE }}>✅ Recommended Bundle</h3>
      {Object.entries(bundle.selections || {}).map(([category, item]) => (
        <div
          key={category}
          style={styles.card}
          onMouseEnter={(e) => Object.assign(e.currentTarget.style, styles.cardHover)}
          onMouseLeave={(e) => Object.assign(e.currentTarget.style, styles.card)}
        >
          <div style={styles.category}>{category.toUpperCase()}</div>
          <div style={styles.modelName}>{item.model_name}</div>
          <div style={styles.justification}>"{item.justification}"</div>
        </div>
      ))}
      <div style={styles.priceContainer}>
        <div style={styles.priceLabel}>Total Budget</div>
        <div style={styles.priceValue}>₹ {bundle.total_price_inr?.toLocaleString('en-IN')}</div>
      </div>
    </div>
  );
}
