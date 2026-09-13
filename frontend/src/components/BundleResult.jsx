const DARK_ORANGE = "#B86A2A";
const PEACH = "#E8B4A0";
const WHITE = "#FFFFFF";

export default function BundleResult({ bundle }) {
  if (!bundle) return null;

  const styles = {
    container: {
      display: "grid",
      gap: "12px",
    },
    card: {
      backgroundColor: WHITE,
      border: `2px solid ${PEACH}`,
      borderRadius: "6px",
      padding: "12px",
      transition: "all 0.2s ease",
      cursor: "pointer",
    },
    cardHover: {
      borderColor: DARK_ORANGE,
      boxShadow: "0 2px 8px rgba(184, 106, 42, 0.1)",
    },
    category: {
      fontSize: "0.75rem",
      fontWeight: "700",
      color: DARK_ORANGE,
      marginBottom: "2px",
      textTransform: "uppercase",
      letterSpacing: "0.5px",
    },
    modelName: {
      fontSize: "0.95rem",
      fontWeight: "600",
      color: "#333",
      marginBottom: "6px",
    },
    justification: {
      fontSize: "0.8rem",
      color: "#666",
      fontStyle: "italic",
      lineHeight: "1.4",
    },
    priceContainer: {
      marginTop: "16px",
      padding: "12px",
      backgroundColor: PEACH,
      borderRadius: "6px",
      textAlign: "center",
    },
    priceLabel: {
      fontSize: "0.8rem",
      color: DARK_ORANGE,
      fontWeight: "500",
    },
    priceValue: {
      fontSize: "1.2rem",
      fontWeight: "700",
      color: DARK_ORANGE,
      marginTop: "4px",
    },
  };

  return (
    <div style={styles.container}>
      {Object.entries(bundle.selections || {}).map(([category, item]) => (
        <div
          key={category}
          style={styles.card}
          onMouseEnter={(e) => Object.assign(e.currentTarget.style, styles.cardHover)}
          onMouseLeave={(e) => Object.assign(e.currentTarget.style, styles.card)}
        >
          <div style={styles.category}>{category}</div>
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
