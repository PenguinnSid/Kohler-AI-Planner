export default function BundleResult({ bundle }) {
  if (!bundle) return null;

  return (
    <div>
      <h3>Recommended bundle</h3>
      <ul>
        {Object.entries(bundle.selections || {}).map(([category, item]) => (
          <li key={category}>
            <strong>{category}</strong>: {item.sku_code} — {item.justification}
          </li>
        ))}
      </ul>
      <p>Total: ₹{bundle.total_price_inr}</p>
    </div>
  );
}
