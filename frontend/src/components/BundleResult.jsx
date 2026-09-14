import React from "react";

const GOLD = "#FFFFFF";
const DARK_BG = "#08090C";
const DARK_CARD = "#10141D";
const BORDER_COLOR = "#232D3F";
const TEXT_MUTED = "#94A3B8";

// Full CSV dataset extracted directly from catalogue.csv
export const FULL_CSV_PRODUCTS = [
  { sku_code: "30438IN", category: "toilet", subcategory: "wall-hung", model_name: "Reach Wall-Hung Round Toilet", price_inr: 20000, height_in: 18.5, width_in: 14.5, depth_in: 21 },
  { sku_code: "30439IN", category: "toilet", subcategory: "wall-hung, bidet", model_name: "Reach Eco Bidet Toilet", price_inr: 26500, height_in: 20, width_in: 17, depth_in: 21.5 },
  { sku_code: "6088IN", category: "toilet", subcategory: "wall-hung", model_name: "Replay Square-Front Toilet", price_inr: 16500, height_in: 16, width_in: 14.5, depth_in: 21.5 },
  { sku_code: "19045IN-SS", category: "toilet", subcategory: "wall-hung", model_name: "Escale Sculptural Toilet", price_inr: 45000, height_in: 16, width_in: 15, depth_in: 24 },
  { sku_code: "29172IN", category: "toilet", subcategory: "wall-hung", model_name: "Span Geometric Toilet", price_inr: 9200, height_in: 16, width_in: 14.5, depth_in: 21.5 },
  { sku_code: "29278IN", category: "toilet", subcategory: "wall-hung", model_name: "APT Compact Round Toilet", price_inr: 10500, height_in: 16, width_in: 14.5, depth_in: 21.5 },

  { sku_code: "4417IN", category: "toilet_seat", subcategory: "seat", model_name: "Escale Quiet-Close Seat", price_inr: 6400, height_in: 2, width_in: 15, depth_in: 24 },
  { sku_code: "29173IN", category: "toilet_seat", subcategory: "seat", model_name: "Span Minimalist Seat", price_inr: 4800, height_in: 2, width_in: 14.5, depth_in: 21.5 },
  { sku_code: "23107IN-UF", category: "toilet_seat", subcategory: "seat", model_name: "Replay Slim Seat", price_inr: 12500, height_in: 2, width_in: 14.5, depth_in: 21.5 },

  { sku_code: "20703", category: "wash_basin", subcategory: "vessel", model_name: "Veil 16\" Round Tall Vessel Sink", price_inr: 80000, height_in: 15, width_in: 16, depth_in: 16 },
  { sku_code: "21226IN", category: "wash_basin", subcategory: "vessel", model_name: "ModernLife Edge 60cm Vessel Sink", price_inr: 38000, height_in: 5.5, width_in: 23.5, depth_in: 15.5 },
  { sku_code: "31461IN", category: "wash_basin", subcategory: "corner", model_name: "Span Corner Wall-Mount Sink", price_inr: 6000, height_in: 5.5, width_in: 16, depth_in: 16 },
  { sku_code: "34229IN", category: "wash_basin", subcategory: "wall-mount", model_name: "APT Compact Wall-Mount Sink", price_inr: 7500, height_in: 5.5, width_in: 22, depth_in: 18.5 },
  { sku_code: "20704", category: "wash_basin", subcategory: "vessel", model_name: "Veil Oval Vessel Sink", price_inr: 48000, height_in: 8, width_in: 21, depth_in: 14 },
  { sku_code: "31458IN", category: "wash_basin", subcategory: "wall-mount", model_name: "Span Oval Wall-Mount Sink", price_inr: 6000, height_in: 7, width_in: 19, depth_in: 18.5 },

  { sku_code: "72275IN-4ND", category: "faucet", subcategory: "single-handle", model_name: "Aleo Single-Handle Faucet", price_inr: 19000, height_in: 8, width_in: 4, depth_in: 6 },
  { sku_code: "14402IN-4A", category: "faucet", subcategory: "single-handle", model_name: "Purist Architectural Faucet", price_inr: 35000, height_in: 9, width_in: 4, depth_in: 6 },
  { sku_code: "23475T-4", category: "faucet", subcategory: "single-handle", model_name: "Parallel Modern Faucet", price_inr: 28000, height_in: 8.5, width_in: 4, depth_in: 6.5 },
  { sku_code: "25759IN-4ND", category: "faucet", subcategory: "wall-mount", model_name: "ModernLife Edge Wall-Mount Faucet", price_inr: 28000, height_in: 4, width_in: 8, depth_in: 8 },
  { sku_code: "27489IN-4ND", category: "faucet", subcategory: "wall-mount", model_name: "Fore Arc Wall-Mount Cold Faucet", price_inr: 3940, height_in: 4, width_in: 6, depth_in: 7 },
  { sku_code: "27477IN-4ND", category: "faucet", subcategory: "single-handle", model_name: "Fore Tri Bathroom Faucet", price_inr: 6400, height_in: 7.5, width_in: 4, depth_in: 6 }
];

export default function BundleResult({ bundle, layout, selectedProductsMap }) {
  // Define official categories present in catalogue.csv
  const csvCategories = ["toilet", "toilet_seat", "wash_basin", "faucet"];

  const itemsList = csvCategories.map((catKey) => {
    // 1. Check custom selection map for this category
    let custom = selectedProductsMap?.[catKey] || selectedProductsMap?.[catKey === "wash_basin" ? "washbasin" : catKey];

    // 2. Check layout array if not found in selectedProductsMap
    if (!custom && Array.isArray(layout)) {
      const foundInLayout = layout.find((p) => {
        const pCat = (p.category || "").toLowerCase();
        if (catKey === "wash_basin") return pCat === "wash_basin" || pCat === "washbasin";
        return pCat === catKey;
      });
      if (foundInLayout) {
        custom = foundInLayout;
      }
    }

    // 3. Find matching product from CSV dataset
    let matchedProd = null;
    if (custom) {
      matchedProd = FULL_CSV_PRODUCTS.find(
        (p) => p.sku_code === custom.sku_code || p.model_name === custom.model_name
      );
    }

    // 4. Default fallback matching product from CSV dataset
    if (!matchedProd) {
      if (custom && custom.price_inr) {
        matchedProd = {
          sku_code: custom.sku_code || "N/A",
          category: catKey,
          model_name: custom.model_name || catKey,
          price_inr: custom.price_inr,
          width_in: custom.width_in || custom.w,
          depth_in: custom.depth_in || custom.h,
          height_in: custom.height_in || custom.height,
        };
      } else {
        matchedProd = FULL_CSV_PRODUCTS.find((p) => p.category === catKey) || {
          sku_code: "30438IN",
          category: catKey,
          model_name: "Kohler Fixture",
          price_inr: 20000,
        };
      }
    }

    const w = matchedProd.width_in;
    const d = matchedProd.depth_in;
    const h = matchedProd.height_in;

    let dimsStr = "-";
    if (w && d && h) {
      dimsStr = `${w}" × ${d}" × ${h}"`;
    } else if (w && d) {
      dimsStr = `${w}" × ${d}"`;
    }

    return {
      category: matchedProd.category,
      model_name: matchedProd.model_name,
      sku_code: matchedProd.sku_code,
      dimensions: dimsStr,
      price_inr: matchedProd.price_inr,
    };
  });

  const totalCost = itemsList.reduce((sum, item) => sum + (item.price_inr || 0), 0);

  return (
    <div style={{
      backgroundColor: DARK_CARD,
      border: `1px solid ${BORDER_COLOR}`,
      borderRadius: "12px",
      padding: "24px",
      boxShadow: "0 12px 36px rgba(0,0,0,0.5)",
      width: "100%",
      boxSizing: "border-box",
    }}>
      {/* Title on Top */}
      <div style={{ marginBottom: "20px" }}>
        <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: "800", color: "#F8FAFC" }}>
          Selected Products Summary
        </h3>
      </div>

      {/* Tabular Header Line */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1.2fr 2.2fr 1.2fr 1.5fr 1.2fr",
        padding: "12px 16px",
        backgroundColor: "#060709",
        border: `1px solid ${BORDER_COLOR}`,
        borderRadius: "6px 6px 0 0",
        fontSize: "0.75rem",
        fontWeight: "800",
        color: GOLD,
        textTransform: "uppercase",
        letterSpacing: "0.5px",
        gap: "12px",
      }}>
        <div>Category</div>
        <div>Name</div>
        <div>SKU</div>
        <div>Dimensions</div>
        <div style={{ textAlign: "right" }}>Price</div>
      </div>

      {/* Tabular Data Rows */}
      <div style={{ display: "flex", flexDirection: "column", borderLeft: `1px solid ${BORDER_COLOR}`, borderRight: `1px solid ${BORDER_COLOR}` }}>
        {itemsList.map((item, idx) => (
          <div
            key={idx}
            style={{
              display: "grid",
              gridTemplateColumns: "1.2fr 2.2fr 1.2fr 1.5fr 1.2fr",
              padding: "14px 16px",
              backgroundColor: idx % 2 === 0 ? DARK_BG : "#0B0E14",
              borderBottom: `1px solid ${BORDER_COLOR}`,
              alignItems: "center",
              gap: "12px",
              fontSize: "0.88rem",
            }}
          >
            {/* Category */}
            <div>
              <span style={{
                fontSize: "0.7rem",
                fontWeight: "800",
                color: "#FFFFFF",
                backgroundColor: "#1E2638",
                padding: "4px 8px",
                borderRadius: "4px",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                display: "inline-block",
              }}>
                {item.category}
              </span>
            </div>

            {/* Name */}
            <div style={{ fontWeight: "700", color: "#F8FAFC" }}>
              {item.model_name}
            </div>

            {/* SKU */}
            <div style={{ color: TEXT_MUTED, fontFamily: "monospace", fontSize: "0.82rem" }}>
              {item.sku_code || "-"}
            </div>

            {/* Dimensions */}
            <div style={{ color: "#CBD5E1", fontSize: "0.82rem" }}>
              {item.dimensions}
            </div>

            {/* Price at the end of the line */}
            <div style={{ textAlign: "right", fontWeight: "800", color: GOLD, fontSize: "0.95rem" }}>
              ₹ {item.price_inr.toLocaleString("en-IN")}
            </div>
          </div>
        ))}
      </div>

      {/* Total Cost at the Bottom */}
      <div style={{
        marginTop: "16px",
        padding: "18px 20px",
        backgroundColor: "#060709",
        border: `1.5px solid ${BORDER_COLOR}`,
        borderRadius: "8px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}>
        <div style={{ fontSize: "1rem", fontWeight: "800", color: "#F8FAFC", textTransform: "uppercase", letterSpacing: "1px" }}>
          Total Cost
        </div>
        <div style={{ fontSize: "1.6rem", fontWeight: "900", color: GOLD }}>
          ₹ {totalCost.toLocaleString("en-IN")}
        </div>
      </div>
    </div>
  );
}
