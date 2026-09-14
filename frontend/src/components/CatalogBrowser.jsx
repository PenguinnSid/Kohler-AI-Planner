import { useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { getProducts, BASE_URL } from "../api/client";

const GOLD = "#FFFFFF";
const DARK_BG = "#08090C";
const DARK_CARD = "#10141D";
const BORDER_COLOR = "#232D3F";
const TEXT_MUTED = "#94A3B8";

// Render 3D Mesh for Kohler Products in Catalogue
function Product3DMesh({ product }) {
  const [model, setModel] = useState(null);
  const { sku_code, category, model_name, obj_file_path, has_3d_model } = product;

  useEffect(() => {
    let active = true;
    if (has_3d_model && sku_code) {
      const loader = new OBJLoader();
      loader.load(
        `${BASE_URL}/api/3d/${sku_code}.obj`,
        (object) => {
          if (!active || !object) return;
          if (sku_code.includes("20704")) {
            object.rotation.set(0, 0, 0);
          } else {
            object.rotation.x = -Math.PI / 2;
          }
          object.updateMatrixWorld(true);

          let box = new THREE.Box3().setFromObject(object);
          let size = box.getSize(new THREE.Vector3());
          if (!size || size.x <= 0 || size.z <= 0) return;

          const maxDim = Math.max(size.x, size.y, size.z) || 1;
          const scale = 2.4 / maxDim;
          const center = box.getCenter(new THREE.Vector3());

          object.position.x = -center.x * scale;
          object.position.y = -center.y * scale;
          object.position.z = -center.z * scale;
          object.scale.set(scale, scale, scale);

          const isModernLife = model_name && model_name.toLowerCase().includes("modernlife");
          const matColor = (model_name || "").toLowerCase().includes("modernlife") && category === "washbasin" ? "#0F4C5C" : "#FFFFFF";

          object.traverse((child) => {
            if (child.isMesh) {
              child.material = new THREE.MeshStandardMaterial({
                color: matColor,
                roughness: isModernLife ? 0.3 : 0.15,
                metalness: category === "faucet" ? 0.7 : 0.05,
              });
            }
          });

          const group = new THREE.Group();
          group.add(object);
          if (active) setModel(group);
        },
        undefined,
        () => {}
      );
    }
    return () => { active = false; };
  }, [sku_code, has_3d_model, category, model_name]);

  if (model) {
    return <primitive object={model} />;
  }

  // Fallback 3D Fixture Shapes
  const isToilet = category === "toilet";
  const isSink = category === "washbasin";
  const isFaucet = category === "faucet";

  return (
    <group>
      {isToilet && (
        <mesh position={[0, 0, 0]}>
          <cylinderGeometry args={[0.8, 0.7, 1.2, 32]} />
          <meshStandardMaterial color="#FFFFFF" roughness={0.15} />
        </mesh>
      )}
      {isSink && (
        <mesh position={[0, 0, 0]}>
          <cylinderGeometry args={[1.0, 0.6, 0.6, 32]} />
          <meshStandardMaterial color={model_name?.toLowerCase().includes("modernlife") ? "#0F4C5C" : "#FFFFFF"} roughness={0.15} />
        </mesh>
      )}
      {isFaucet && (
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[0.4, 1.2, 0.4]} />
          <meshStandardMaterial color="#FFFFFF" metalness={0.8} roughness={0.2} />
        </mesh>
      )}
      {!isToilet && !isSink && !isFaucet && (
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[1.2, 1.0, 1.2]} />
          <meshStandardMaterial color="#FFFFFF" roughness={0.2} />
        </mesh>
      )}
    </group>
  );
}

// 3D Canvas Box Component for Catalogue Cards (STILL image, no autoRotate)
function Product3DThumbnail({ product, height = 115, interactive = false }) {
  return (
    <div style={{ width: "100%", height: `${height}px`, borderRadius: "8px", overflow: "hidden", backgroundColor: "#060709", border: `1px solid ${BORDER_COLOR}` }}>
      <Canvas camera={{ position: [1.2, 2.0, 3.2], fov: 42 }}>
        <ambientLight intensity={1.3} />
        <directionalLight position={[5, 10, 5]} intensity={1.6} />
        <pointLight position={[-5, 5, -5]} intensity={0.5} />
        <Product3DMesh product={product} />
        <OrbitControls enableZoom={interactive} enablePan={interactive} autoRotate={false} />
      </Canvas>
    </div>
  );
}

export default function CatalogBrowser({ selectedProductsMap, onSelectProduct }) {
  const [products, setProducts] = useState([]);
  const [category, setCategory] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [expandedSku, setExpandedSku] = useState(null);

  useEffect(() => {
    setLoading(true);
    getProducts(category || undefined)
      .then((data) => setProducts(data))
      .catch((err) => console.error("Error fetching products:", err))
      .finally(() => setLoading(false));
  }, [category]);

  const filteredProducts = products.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.model_name.toLowerCase().includes(q) ||
      p.sku_code.toLowerCase().includes(q) ||
      (p.style_tags && p.style_tags.some((t) => t.toLowerCase().includes(q)))
    );
  });

  return (
    <div style={{
      backgroundColor: DARK_CARD,
      border: `1px solid ${BORDER_COLOR}`,
      borderRadius: "12px",
      padding: "32px",
      boxShadow: "0 12px 36px rgba(0,0,0,0.5)",
    }}>
      {/* Header & Filter Controls Bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px", marginBottom: "28px", borderBottom: `1px solid ${BORDER_COLOR}`, paddingBottom: "20px" }}>
        <div>
          <h2 style={{ fontSize: "1.6rem", fontWeight: "700", color: "#F8FAFC", margin: 0 }}>
            Product Catalogue
          </h2>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          {/* Search Box */}
          <input
            type="text"
            placeholder="Search fixtures, models, tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              padding: "9px 14px",
              backgroundColor: DARK_BG,
              border: `1px solid ${BORDER_COLOR}`,
              borderRadius: "6px",
              color: "#F8FAFC",
              fontSize: "0.85rem",
              minWidth: "220px",
              outline: "none",
            }}
          />

          {/* Category Filter */}
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            style={{
              padding: "9px 14px",
              backgroundColor: DARK_BG,
              border: `1px solid ${BORDER_COLOR}`,
              borderRadius: "6px",
              color: "#F8FAFC",
              fontSize: "0.85rem",
              cursor: "pointer",
              outline: "none",
            }}
          >
            <option value="">All Categories ({products.length})</option>
            <option value="toilet">Toilets</option>
            <option value="toilet_seat">Toilet Seats</option>
            <option value="washbasin">Wash Basins / Sinks</option>
            <option value="faucet">Faucets & Brassware</option>
          </select>
        </div>
      </div>

      {loading && (
        <div style={{ padding: "60px 0", textAlign: "center", color: TEXT_MUTED, fontSize: "1rem" }}>
          Loading Kohler Catalogue...
        </div>
      )}

      {!loading && filteredProducts.length === 0 && (
        <div style={{ padding: "60px 0", textAlign: "center", color: TEXT_MUTED, fontSize: "1rem" }}>
          No products matching your filter criteria.
        </div>
      )}

      {!loading && filteredProducts.length > 0 && (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))",
          gap: "24px",
        }}>
          {filteredProducts.map((product) => {
            const isSelectedInPlan = selectedProductsMap && selectedProductsMap[product.category]?.sku_code === product.sku_code;
            
            // Subcategory check: If subcategory is 'none' or absent, leave it blank
            const subcategoryRaw = product.subcategory || "";
            const subcategory = (subcategoryRaw && subcategoryRaw.toLowerCase().trim() !== "none") ? subcategoryRaw : null;

            const isExpanded = expandedSku === product.sku_code;

            return (
              <div
                key={product.sku_code}
                onClick={() => setExpandedSku(isExpanded ? null : product.sku_code)}
                style={{
                  backgroundColor: "#0B0E14",
                  border: `1.5px solid ${isExpanded ? GOLD : (isSelectedInPlan ? GOLD : BORDER_COLOR)}`,
                  borderRadius: "10px",
                  padding: "20px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  transition: "all 0.25s ease",
                  boxShadow: isExpanded ? `0 8px 30px rgba(255, 255, 255, 0.15)` : (isSelectedInPlan ? `0 0 20px rgba(255, 255, 255, 0.12)` : "none"),
                  position: "relative",
                  cursor: "pointer",
                }}
              >
                {/* Active Selection Badge */}
                {isSelectedInPlan && (
                  <div style={{
                    position: "absolute",
                    top: "12px",
                    right: "12px",
                    backgroundColor: GOLD,
                    color: "#08090C",
                    padding: "3px 10px",
                    borderRadius: "12px",
                    fontSize: "0.7rem",
                    fontWeight: "800",
                    letterSpacing: "0.5px",
                    textTransform: "uppercase",
                    zIndex: 2,
                  }}>
                    Selected in Layout
                  </div>
                )}

                {/* Main Card Grid: Text Details Left, Still 3D Image Right (Slightly Larger) */}
                <div style={{ display: "flex", gap: "16px", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
                  <div style={{ flex: 1 }}>
                    {/* Category Header */}
                    <div style={{ fontSize: "0.75rem", fontWeight: "700", color: GOLD, textTransform: "uppercase", letterSpacing: "1px", marginBottom: "4px" }}>
                      {product.category.replace("_", " ")}
                    </div>
                    {/* Render Subcategory ONLY if it exists and is NOT none */}
                    {subcategory && (
                      <div style={{ fontSize: "0.7rem", fontWeight: "600", color: TEXT_MUTED, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "6px" }}>
                        {subcategory}
                      </div>
                    )}
                    <h3 style={{ fontSize: "1.3rem", fontWeight: "800", color: "#F8FAFC", margin: "0 0 6px 0", lineHeight: "1.2" }}>
                      {product.model_name}
                    </h3>
                    <div style={{ fontSize: "0.8rem", color: TEXT_MUTED, marginBottom: "12px" }}>
                      SKU: <span style={{ color: "#CBD5E1", fontWeight: "600" }}>{product.sku_code}</span>
                    </div>

                    {/* Dimensions Line (Word 'Dimensions:' removed per request) */}
                    {product.width_in && product.depth_in && (
                      <div style={{ fontSize: "0.8rem", fontWeight: "600", color: "#E2E8F0", marginBottom: "8px" }}>
                        {product.width_in}" W × {product.depth_in}" D {product.height_in ? `× ${product.height_in}" H` : ""}
                      </div>
                    )}

                    {/* Style Tags Below Dimension Line */}
                    {product.style_tags && product.style_tags.length > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                        {product.style_tags.map((tag, idx) => (
                          <span key={idx} style={{ fontSize: "0.75rem", padding: "2px 8px", backgroundColor: "rgba(255, 255, 255, 0.1)", color: GOLD, borderRadius: "4px", border: "1px solid rgba(255, 255, 255, 0.25)" }}>
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Still 3D Image (Slightly Larger 115x115) */}
                  <div style={{ width: "115px", flexShrink: 0, marginTop: "2px" }}>
                    <Product3DThumbnail product={product} height={115} interactive={false} />
                  </div>
                </div>

                {/* Expanded Inspection Drawer showing 3D Object Model + Full Description */}
                {isExpanded && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      marginTop: "16px",
                      marginBottom: "16px",
                      paddingTop: "16px",
                      borderTop: `1px dashed ${BORDER_COLOR}`,
                    }}
                  >
                    <div style={{ fontSize: "0.75rem", fontWeight: "800", color: GOLD, textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "8px" }}>
                      3D Model Inspection View
                    </div>
                    <Product3DThumbnail product={product} height={190} interactive={true} />

                    {/* Product Description Below 3D Model */}
                    <div style={{ marginTop: "12px", padding: "12px", backgroundColor: "#161B26", borderRadius: "6px", border: `1px solid ${BORDER_COLOR}`, color: "#E2E8F0", fontSize: "0.85rem", lineHeight: "1.5" }}>
                      <div style={{ fontWeight: "700", color: GOLD, marginBottom: "4px", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                        Product Description
                      </div>
                      <div style={{ color: TEXT_MUTED }}>
                        {product.description || `${product.model_name} combines simple, architectural forms with sensual design lines and high-gloss Kohler porcelain performance.`}
                      </div>
                    </div>
                  </div>
                )}

                {/* Price & Selection Action Button */}
                <div style={{ marginTop: "auto", paddingTop: "12px", borderTop: `1px solid ${BORDER_COLOR}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontSize: "0.7rem", color: TEXT_MUTED }}>Price (INR)</div>
                    <div style={{ fontSize: "1.25rem", fontWeight: "800", color: GOLD }}>
                      ₹ {product.price_inr ? product.price_inr.toLocaleString("en-IN") : "N/A"}
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedSku(isExpanded ? null : product.sku_code);
                      }}
                      style={{
                        padding: "8px 12px",
                        backgroundColor: "transparent",
                        border: `1px solid ${BORDER_COLOR}`,
                        color: TEXT_MUTED,
                        borderRadius: "6px",
                        fontSize: "0.75rem",
                        fontWeight: "600",
                        cursor: "pointer",
                      }}
                    >
                      {isExpanded ? "Hide Details" : "View 3D & Desc"}
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectProduct?.(product);
                      }}
                      style={{
                        padding: "9px 16px",
                        backgroundColor: isSelectedInPlan ? "#161B26" : GOLD,
                        color: isSelectedInPlan ? GOLD : "#08090C",
                        border: `1px solid ${GOLD}`,
                        borderRadius: "6px",
                        fontSize: "0.85rem",
                        fontWeight: "700",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                        boxShadow: isSelectedInPlan ? "none" : `0 4px 14px rgba(255, 255, 255, 0.25)`,
                      }}
                    >
                      {isSelectedInPlan ? "In Layout" : "Add to Layout"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
