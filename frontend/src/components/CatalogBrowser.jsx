import { useEffect, useState, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { getProducts, BASE_URL } from "../api/client";
import { FALLBACK_CATALOGUE } from "../fallbackCatalogue";

const GOLD = "#FFFFFF";
const DARK_BG = "#08090C";
const DARK_CARD = "#10141D";
const BORDER_COLOR = "#232D3F";
const TEXT_MUTED = "#94A3B8";

function getCatalogMaterialProps(product) {
  const finish = (product?.colour || product?.finish || "").toLowerCase();
  const name = (product?.model_name || "").toLowerCase();

  if (finish.includes("honed_black") || finish.includes("matte_black") || finish.includes("black")) {
    return { color: "#1A1A1A", roughness: 0.85, metalness: 0.15 };
  }
  if (finish.includes("bronze") || name.includes("bronze")) {
    return { color: "#8C6D46", roughness: 0.3, metalness: 0.85 };
  }
  if (finish.includes("gold") || name.includes("gold") || name.includes("brass")) {
    return { color: "#D4AF37", roughness: 0.25, metalness: 0.9 };
  }
  if (finish.includes("chrome") || name.includes("chrome") || product?.category === "faucet") {
    return { color: "#E2E8F0", roughness: 0.1, metalness: 0.95 };
  }
  if (name.includes("modernlife") && product?.category === "washbasin") {
    return { color: "#0F4C5C", roughness: 0.3, metalness: 0.05 };
  }
  return { color: "#FFFFFF", roughness: 0.15, metalness: 0.05 };
}

// Render 3D Mesh for Kohler Products in Catalogue
function Product3DMesh({ product }) {
  const [model, setModel] = useState(null);
  const { sku_code, category, model_name, obj_file_path, has_3d_model } = product;

  useEffect(() => {
    let active = true;
    if (has_3d_model && sku_code) {
      const loader = new OBJLoader();
      const loadModel = (url) => {
        loader.load(
          url,
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
            const scale = 1.8 / maxDim;
            const center = box.getCenter(new THREE.Vector3());

            object.position.x = -center.x * scale;
            object.position.y = -center.y * scale;
            object.position.z = -center.z * scale;
            object.scale.set(scale, scale, scale);

            const matProps = getCatalogMaterialProps(product);

            object.traverse((child) => {
              if (child.isMesh) {
                child.material = new THREE.MeshStandardMaterial({
                  color: matProps.color,
                  roughness: matProps.roughness,
                  metalness: matProps.metalness,
                });
              }
            });

            const group = new THREE.Group();
            group.add(object);
            if (active) setModel(group);
          },
          undefined,
          (err) => {
            if (url !== `/api/3d/${sku_code}.obj`) {
              loadModel(`/api/3d/${sku_code}.obj`);
            }
          }
        );
      };

      loadModel(`${BASE_URL}/api/3d/${sku_code}.obj`);
    }
    return () => { active = false; };
  }, [sku_code, has_3d_model, category, model_name, product]);

  if (model) {
    return <primitive object={model} />;
  }

  // Fallback 3D Fixture Shapes
  const isToilet = category === "toilet";
  const isSink = category === "washbasin" || category === "wash_basin";
  const isFaucet = category === "faucet";
  const isBathtub = category === "bathtub" || category === "bath_tub";
  const matProps = getCatalogMaterialProps(product);

  return (
    <group>
      {isToilet && (
        <mesh position={[0, 0, 0]}>
          <cylinderGeometry args={[0.65, 0.55, 1.0, 32]} />
          <meshStandardMaterial color={matProps.color} roughness={matProps.roughness} metalness={matProps.metalness} />
        </mesh>
      )}
      {isSink && (
        <mesh position={[0, 0, 0]}>
          <cylinderGeometry args={[0.8, 0.5, 0.5, 32]} />
          <meshStandardMaterial color={matProps.color} roughness={matProps.roughness} metalness={matProps.metalness} />
        </mesh>
      )}
      {isFaucet && (
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[0.3, 0.9, 0.3]} />
          <meshStandardMaterial color={matProps.color} roughness={matProps.roughness} metalness={matProps.metalness} />
        </mesh>
      )}
      {isBathtub && (
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[1.3, 0.6, 0.7]} />
          <meshStandardMaterial color={matProps.color} roughness={matProps.roughness} metalness={matProps.metalness} />
        </mesh>
      )}
      {!isToilet && !isSink && !isFaucet && !isBathtub && (
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[0.9, 0.8, 0.9]} />
          <meshStandardMaterial color={matProps.color} roughness={matProps.roughness} metalness={matProps.metalness} />
        </mesh>
      )}
    </group>
  );
}

// Lazy Wrapper to mount WebGL Canvas only when scrolled into view (prevents WebGL context limits)
function Lazy3DCanvas({ children, height = 85 }) {
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { threshold: 0.05, rootMargin: "150px" }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      if (containerRef.current) {
        observer.unobserve(containerRef.current);
      }
      observer.disconnect();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: `${height}px`,
        position: "relative",
        overflow: "hidden",
        borderRadius: "6px",
        backgroundColor: "#060709",
      }}
    >
      {isVisible ? (
        children
      ) : (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: TEXT_MUTED,
            fontSize: "0.65rem",
            fontWeight: "600",
          }}
        >
          3D Preview
        </div>
      )}
    </div>
  );
}

// 3D Object Model Thumbnail Badge for Grid Cards showcasing the item in fixed orientation with finish color
function ProductThumbnailPreview({ product, height = 120 }) {
  const finish = product.colour
    ? product.colour.replace("_", " ")
    : product.finish
    ? product.finish.replace("_", " ")
    : "white";

  return (
    <div
      style={{
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        backgroundColor: "#060709",
        borderRadius: "8px",
        border: `1px solid ${BORDER_COLOR}`,
        overflow: "hidden",
        padding: "4px",
        boxSizing: "border-box",
        boxShadow: "inset 0 0 12px rgba(0,0,0,0.8)",
      }}
    >
      <Lazy3DCanvas height={90}>
        <Canvas
          camera={{ position: [1.8, 1.8, 2.4], fov: 42 }}
          gl={{ powerPreference: "low-power", preserveDrawingBuffer: false }}
          style={{ width: "100%", height: "100%", background: "#060709" }}
        >
          <ambientLight intensity={1.4} />
          <directionalLight position={[5, 8, 5]} intensity={1.8} />
          <pointLight position={[-4, 4, -4]} intensity={0.5} />
          <Product3DMesh product={product} />
          <OrbitControls enableZoom={false} enablePan={false} enableRotate={false} />
        </Canvas>
      </Lazy3DCanvas>

      <div style={{ marginTop: "4px", textAlign: "center", paddingBottom: "2px" }}>
        <div
          style={{
            fontSize: "0.62rem",
            fontWeight: "600",
            color: TEXT_MUTED,
            textTransform: "capitalize",
          }}
        >
          {finish}
        </div>
      </div>
    </div>
  );
}

// 3D Canvas Box Component for Expanded Inspection View (1 active Canvas at a time)
function Product3DThumbnail({ product, height = 190, interactive = true }) {
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
  const [products, setProducts] = useState(FALLBACK_CATALOGUE);
  const [category, setCategory] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [expandedSku, setExpandedSku] = useState(null);

  useEffect(() => {
    setLoading(true);
    getProducts(category || undefined)
      .then((data) => {
        if (data && data.length > 0) {
          setProducts(data);
        } else {
          setProducts(FALLBACK_CATALOGUE);
        }
      })
      .catch((err) => {
        console.warn("Using fallback catalogue data:", err);
        setProducts(FALLBACK_CATALOGUE);
      })
      .finally(() => setLoading(false));
  }, [category]);

  const filteredProducts = products.filter((p) => {
    const pCat = (p.category || "").toLowerCase().replace("wash_basin", "washbasin").replace("bath_tub", "bathtub");
    const selCat = (category || "").toLowerCase().replace("wash_basin", "washbasin").replace("bath_tub", "bathtub");

    if (selCat) {
      if (selCat === "washbasin" && pCat !== "washbasin") return false;
      if (selCat === "bathtub" && pCat !== "bathtub") return false;
      if (selCat === "toilet" && pCat !== "toilet" && pCat !== "toilet_seat") return false;
      if (selCat === "towel_arm" && pCat !== "towel_arm" && pCat !== "towel_bar") return false;
      if (selCat === "faucet" && pCat !== "faucet") return false;
      if (selCat === "shower_head" && pCat !== "shower_head") return false;
      if (selCat === "shower_fitting" && pCat !== "shower_fitting") return false;
    }

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const tagsStr = Array.isArray(p.style_tags) ? p.style_tags.join(" ") : (p.style_tags || "");
    return (
      (p.model_name || "").toLowerCase().includes(q) ||
      (p.sku_code || "").toLowerCase().includes(q) ||
      (p.colour || "").toLowerCase().includes(q) ||
      (p.subcategory || "").toLowerCase().includes(q) ||
      tagsStr.toLowerCase().includes(q)
    );
  });

  return (
    <div style={{
      backgroundColor: "transparent",
      padding: "0",
      boxShadow: "none",
    }}>
      {/* Header & Filter Controls Bar */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "16px",
        marginBottom: "28px",
        padding: "20px 24px",
        paddingRight: "54px",
        backgroundColor: "rgba(10, 14, 24, 0.35)",
        borderRadius: "12px",
        border: `1px solid rgba(255, 255, 255, 0.18)`,
      }}>
        <div>
          <h2 style={{ fontSize: "1.6rem", fontWeight: "800", color: "#F8FAFC", margin: 0 }}>
            Product Catalogue
          </h2>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          {/* Search Box */}
          <input
            type="text"
            placeholder="Search fixtures, models, finishes..."
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
            <option value="washbasin">Wash Basins / Sinks</option>
            <option value="faucet">Faucets & Brassware</option>
            <option value="bathtub">Bathtubs</option>
            <option value="towel_arm">Towel Bars & Arms</option>
            <option value="shower_head">Shower Heads & Panels</option>
            <option value="shower_fitting">Shower Fittings</option>
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
                  backgroundColor: "rgba(10, 14, 24, 0.35)",
                  border: `1.5px solid ${isExpanded ? GOLD : (isSelectedInPlan ? "#38BDF8" : "rgba(255,255,255,0.18)")}`,
                  borderRadius: "12px",
                  padding: "20px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  transition: "all 0.25s ease",
                  boxShadow: isExpanded ? `0 8px 30px rgba(255, 255, 255, 0.15)` : (isSelectedInPlan ? `0 0 20px rgba(2, 132, 199, 0.35)` : "none"),
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
                    backgroundColor: "#0284C7",
                    color: "#FFFFFF",
                    padding: "3px 10px",
                    borderRadius: "12px",
                    fontSize: "0.7rem",
                    fontWeight: "800",
                    letterSpacing: "0.5px",
                    textTransform: "uppercase",
                    zIndex: 2,
                    boxShadow: "0 2px 8px rgba(2, 132, 199, 0.6)",
                  }}>
                    Already Added
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

                  {/* Thumbnail Swatch Preview Badge */}
                  <div style={{ width: "115px", flexShrink: 0, marginTop: "2px" }}>
                    <ProductThumbnailPreview product={product} height={115} />
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
                        backgroundColor: isSelectedInPlan ? "#0284C7" : GOLD,
                        color: isSelectedInPlan ? "#FFFFFF" : "#08090C",
                        border: `1px solid ${isSelectedInPlan ? "#38BDF8" : GOLD}`,
                        borderRadius: "6px",
                        fontSize: "0.85rem",
                        fontWeight: "700",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                        boxShadow: isSelectedInPlan ? "0 4px 14px rgba(2, 132, 199, 0.45)" : `0 4px 14px rgba(255, 255, 255, 0.25)`,
                      }}
                    >
                      {isSelectedInPlan ? "Already Added" : "Add to Layout"}
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
