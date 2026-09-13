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
      backgroundColor: "#1C2541",
      border: `1px solid #334155`,
      borderRadius: "6px",
      padding: "14px",
      transition: "all 0.2s ease",
      cursor: "pointer",
    },
    cardHover: {
      borderColor: "#D97E3A",
      boxShadow: "0 4px 12px rgba(0, 0, 0, 0.4)",
    },
    category: {
      fontSize: "0.75rem",
      fontWeight: "700",
      color: "#FFD166",
      marginBottom: "4px",
      textTransform: "uppercase",
      letterSpacing: "0.5px",
    },
    modelName: {
      fontSize: "0.95rem",
      fontWeight: "600",
      color: "#F8FAFC",
      marginBottom: "6px",
    },
    justification: {
      fontSize: "0.8rem",
      color: "#CBD5E1",
      fontStyle: "italic",
      lineHeight: "1.4",
    },
    priceContainer: {
      marginTop: "16px",
      padding: "14px",
      backgroundColor: "#0F172A",
      border: "1px solid #334155",
      borderRadius: "6px",
      textAlign: "center",
    },
    priceLabel: {
      fontSize: "0.8rem",
      color: "#FFD166",
      fontWeight: "700",
    },
    priceValue: {
      fontSize: "1.25rem",
      fontWeight: "700",
      color: "#D97E3A",
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
