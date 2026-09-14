const GOLD = "#FFFFFF";
const DARK_BG = "#08090C";
const DARK_CARD = "#10141D";
const BORDER_COLOR = "#232D3F";
const TEXT_MUTED = "#94A3B8";

export default function BundleResult({ bundle }) {
  if (!bundle) return null;

  const styles = {
    container: {
      display: "grid",
      gap: "12px",
    },
    card: {
      backgroundColor: DARK_BG,
      border: `1px solid ${BORDER_COLOR}`,
      borderRadius: "8px",
      padding: "16px",
      transition: "all 0.2s ease",
    },
    cardHover: {
      borderColor: GOLD,
      boxShadow: "0 4px 12px rgba(0, 0, 0, 0.4)",
    },
    category: {
      fontSize: "0.75rem",
      fontWeight: "700",
      color: GOLD,
      marginBottom: "4px",
      textTransform: "uppercase",
      letterSpacing: "0.5px",
    },
    modelName: {
      fontSize: "1rem",
      fontWeight: "700",
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
      padding: "16px",
      backgroundColor: DARK_BG,
      border: `1px dashed ${GOLD}`,
      borderRadius: "8px",
      textAlign: "center",
    },
    priceLabel: {
      fontSize: "0.8rem",
      color: TEXT_MUTED,
      fontWeight: "600",
      textTransform: "uppercase",
    },
    priceValue: {
      fontSize: "1.35rem",
      fontWeight: "800",
      color: GOLD,
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
        <div style={styles.priceLabel}>Estimated Total Price</div>
        <div style={styles.priceValue}>₹ {bundle.total_price_inr?.toLocaleString('en-IN')}</div>
      </div>
    </div>
  );
}
