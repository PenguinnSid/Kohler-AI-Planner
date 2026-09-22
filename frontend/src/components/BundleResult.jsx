import React from "react";
const BORDER = "#232D3F";
const normalise = (category = "") => category.toLowerCase().replace("wash_basin", "washbasin").replace("bath_tub", "bathtub");

export default function BundleResult({ layout, selectedProductsMap }) {
  const products = Object.values(selectedProductsMap || {}).filter(Boolean).reduce((items, product) => !product.sku_code || items.some((item) => item.sku_code === product.sku_code) ? items : [...items, product], []);
  const layoutProducts = (layout || []).filter((item) => item.price_inr && !products.some((product) => product.sku_code === item.sku_code));
  const items = [...products, ...layoutProducts].filter((item) => !item.is_placeholder);
  const total = items.reduce((sum, item) => sum + Number(item.price_inr || 0), 0);
  return <div style={{ background: "#10141D", border: `1px solid ${BORDER}`, borderRadius: 12, padding: 24, width: "100%", boxSizing: "border-box" }}>
    <h3 style={{ margin: "0 0 20px", color: "#F8FAFC" }}>Selected Products Summary</h3>
    <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", color: "#CBD5E1", fontSize: 14 }}>
      <thead><tr style={{ background: "#08090C", color: "#F8FAFC", textAlign: "left" }}><th style={{ padding: 12 }}>Category</th><th>Product</th><th>SKU</th><th>Dimensions</th><th style={{ textAlign: "right", paddingRight: 12 }}>Price</th></tr></thead>
      <tbody>{items.length ? items.map((item) => <tr key={item.sku_code} style={{ borderBottom: `1px solid ${BORDER}` }}><td style={{ padding: 12, textTransform: "capitalize" }}>{normalise(item.category)}</td><td>{item.model_name || "Kohler fixture"}</td><td style={{ fontFamily: "monospace" }}>{item.sku_code}</td><td>{item.width_in && item.depth_in ? `${item.width_in}″ × ${item.depth_in}″${item.height_in ? ` × ${item.height_in}″` : ""}` : "—"}</td><td style={{ textAlign: "right", paddingRight: 12, fontWeight: 700 }}>₹{Number(item.price_inr || 0).toLocaleString("en-IN")}</td></tr>) : <tr><td colSpan="5" style={{ padding: 18 }}>Generate a design to see the complete bundle.</td></tr>}</tbody>
    </table></div>
    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16, padding: 16, border: `1px solid ${BORDER}`, borderRadius: 8, color: "#F8FAFC", fontWeight: 800 }}><span>Bundle total</span><span>₹{total.toLocaleString("en-IN")}</span></div>
  </div>;
}
