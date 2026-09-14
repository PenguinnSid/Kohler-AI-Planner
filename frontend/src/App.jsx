import React, { useState, useEffect, Component, useRef, useMemo } from "react";
import LayoutPlanner2D from "./components/LayoutPlanner2D";
import CatalogBrowser from "./components/CatalogBrowser";
import LayoutViewer3D from "./components/LayoutViewer3D";
import BundleResult from "./components/BundleResult";
import { createDesign, getProducts } from "./api/client";

const GOLD = "#FFFFFF";
const DARK_BG = "#08090C";
const DARK_CARD = "#10141D";
const BORDER_COLOR = "#232D3F";
const TEXT_MUTED = "#94A3B8";

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("3D Scene Error boundary caught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: "40px", color: "#F8FAFC", backgroundColor: "#0F131D", borderRadius: "12px", border: `1px solid ${BORDER_COLOR}`, textAlign: "center" }}>
          <h3 style={{ margin: "0 0 12px 0", color: GOLD }}>3D Scene Render Notice</h3>
          <p style={{ color: TEXT_MUTED, fontSize: "0.9rem", marginBottom: "12px" }}>
            The 3D viewer adjusted geometry. Click below to reload:
          </p>
          {this.state.error && (
            <pre style={{ color: "#EF4444", backgroundColor: "#08090C", padding: "12px", borderRadius: "6px", fontSize: "0.75rem", textAlign: "left", overflowX: "auto", maxLines: 4, marginBottom: "16px" }}>
              {this.state.error.message || String(this.state.error)}
            </pre>
          )}
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{ padding: "10px 24px", backgroundColor: GOLD, color: "#08090C", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "700" }}
          >
            Reload 3D View
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Client-Side 3D Layout Generator Fallback (Ensures 3D scene renders even if API backend is offline)
function generateFallbackLayout(roomWidthFt, roomDepthFt, activeItems) {
  const widthIn = roomWidthFt * 12;
  const depthIn = roomDepthFt * 12;

  const washbasinX = activeItems?.washbasin?.x ?? Math.max(4, widthIn - 32);
  const washbasinY = activeItems?.washbasin?.y ?? 6;
  const washbasinW = activeItems?.washbasin?.w ?? 22;
  const washbasinH = activeItems?.washbasin?.h ?? 18;

  const cabinetW = activeItems?.cabinet?.w ?? 28;
  const cabinetH = activeItems?.cabinet?.h ?? 24;
  const cabinetX = washbasinX - (cabinetW - washbasinW) / 2;
  const cabinetY = washbasinY - (cabinetH - washbasinH) / 2;

  const items = activeItems || {
    toilet: { x: 4, y: Math.max(30, depthIn - 34), w: 16, h: 26, rot: 0 },
    washbasin: { x: washbasinX, y: washbasinY, w: washbasinW, h: washbasinH, rot: 0 },
    cabinet: { x: cabinetX, y: cabinetY, w: cabinetW, h: cabinetH, rot: 0 },
    bathtub: { x: 4, y: 4, w: 50, h: 28, rot: 0 },
    window: { x: Math.max(0, widthIn / 2 - 16), y: 0, w: 32, h: 4, rot: 0 },
    door: { x: Math.max(4, widthIn - 38), y: depthIn - 4, w: 32, h: 4, rot: 180 },
    mirror: { x: Math.max(65, widthIn - 31), y: 0, w: 26, h: 3, rot: 0 },
  };

  return [
    {
      sku_code: "30438IN",
      category: "toilet",
      model_name: "Reach Wall-Hung Round Toilet",
      price_inr: 20000,
      x: items.toilet?.x ?? 4,
      y: items.toilet?.y ?? 38,
      width_in: 14.5,
      depth_in: 21,
      height_in: 18.5,
      rotation_deg: items.toilet?.rot ?? 0,
      obj_file_path: "models/reach_toilet.obj",
      has_3d_model: true,
    },
    {
      sku_code: "21226IN_platform",
      category: "sink_platform",
      model_name: "Counter Platform",
      x: cabinetX,
      y: cabinetY,
      width_in: cabinetW,
      depth_in: cabinetH,
      height_in: 12,
      rotation_deg: items.washbasin?.rot ?? 0,
      is_platform: true,
    },
    {
      sku_code: "21226IN",
      category: "wash_basin",
      model_name: "ModernLife Edge 60cm Vessel Sink",
      price_inr: 38000,
      x: washbasinX,
      y: washbasinY,
      width_in: 23.5,
      depth_in: 15.5,
      height_in: 5.5,
      rotation_deg: items.washbasin?.rot ?? 0,
      platform_height_offset: 12,
      obj_file_path: "models/modernlife_sink.obj",
      has_3d_model: true,
    },
    {
      sku_code: "23475T-4",
      category: "faucet",
      model_name: "Parallel Modern Faucet",
      price_inr: 28000,
      x: washbasinX,
      y: washbasinY,
      width_in: 4,
      depth_in: 6.5,
      height_in: 8.5,
      rotation_deg: items.washbasin?.rot ?? 0,
    },
    {
      sku_code: "bathtub_area",
      category: "bathtub",
      model_name: "Reserved Bathtub Zone",
      x: items.bathtub?.x ?? 4,
      y: items.bathtub?.y ?? 4,
      width_in: items.bathtub?.w ?? 50,
      depth_in: items.bathtub?.h ?? 28,
      rotation_deg: items.bathtub?.rot ?? 0,
      is_placeholder: true,
    },
    {
      sku_code: "custom_window",
      category: "window",
      model_name: "Bathroom Window",
      x: items.window?.x ?? Math.max(0, widthIn / 2 - 16),
      y: 0,
      width_in: items.window?.w ?? 32,
      depth_in: 2,
      rotation_deg: items.window?.rot ?? 0,
    },
    {
      sku_code: "custom_door",
      category: "door",
      model_name: "Bathroom Door",
      x: items.door?.x ?? Math.max(4, widthIn - 38),
      y: items.door?.y ?? depthIn - 4,
      width_in: items.door?.w ?? 32,
      depth_in: items.door?.h ?? 4,
      rotation_deg: items.door?.rot ?? 0,
    },
    {
      sku_code: "custom_mirror",
      category: "mirror",
      model_name: "Vanity Mirror",
      x: items.mirror?.x ?? Math.max(65, widthIn - 31),
      y: items.mirror?.y ?? 0,
      width_in: items.mirror?.w ?? 26,
      depth_in: items.mirror?.h ?? 3,
      rotation_deg: items.mirror?.rot ?? 0,
      wallSnapSide: items.mirror?.wallSnapSide ?? "top",
    },
  ];

  if (items?.towel_bar) {
    placements.push({
      sku_code: "custom_towel_bar",
      category: "towel_bar",
      model_name: "Wall Towel Bar",
      x: items.towel_bar.x,
      y: items.towel_bar.y,
      width_in: items.towel_bar.w,
      depth_in: items.towel_bar.h,
      rotation_deg: items.towel_bar.rot ?? 90,
      wallSnapSide: items.towel_bar.wallSnapSide ?? "left",
    });
  }

  if (items?.dustbin) {
    placements.push({
      sku_code: "custom_dustbin",
      category: "dustbin",
      model_name: "Pedal Dustbin",
      x: items.dustbin.x,
      y: items.dustbin.y,
      width_in: items.dustbin.w,
      depth_in: items.dustbin.h,
      rotation_deg: items.dustbin.rot ?? 0,
    });
  }

  return placements.filter((p) => {
    if (p.sku_code.includes("platform") || p.sku_code.includes("wash_basin") || p.sku_code.includes("faucet")) return true;
    return !!items[p.category];
  });
}

export default function App() {
  // Room Specification & Design Parameters State (Default budget = 0)
  const [roomWidthFt, setRoomWidthFt] = useState(8);
  const [roomDepthFt, setRoomDepthFt] = useState(6);
  const [roomHeightFt, setRoomHeightFt] = useState(9);
  const [budgetInr, setBudgetInr] = useState(0);
  const [aestheticTheme, setAestheticTheme] = useState("Minimalist Modern");
  const [floorTheme, setFloorTheme] = useState("marble");
  const [wallTheme, setWallTheme] = useState("subway");
  const [cohesionScore, setCohesionScore] = useState(0.8);

  // Floating Overlay States over 3D Scene Background
  const [isPlannerOpen, setIsPlannerOpen] = useState(false);
  const [isCatalogueOpen, setIsCatalogueOpen] = useState(false);
  const [isSpecsOpen, setIsSpecsOpen] = useState(false);

  // 2D Planner & Product Catalogue State
  const [itemsState, setItemsState] = useState(null);
  const [allProducts, setAllProducts] = useState([]);
  const [selectedProductsMap, setSelectedProductsMap] = useState({});
  const [selectedProductDetails, setSelectedProductDetails] = useState(null);

  // Section Refs
  const design3DRef = useRef(null);

  // Fetch all products on mount for instant in-3D cycling
  useEffect(() => {
    getProducts()
      .then((data) => setAllProducts(data))
      .catch((err) => console.error("Error fetching all products:", err));
  }, []);

  // Compute live active layout array for 3D background in real-time
  const activeLayoutData = useMemo(() => {
    const baseLayout = generateFallbackLayout(roomWidthFt, roomDepthFt, itemsState);

    return baseLayout.map((placement) => {
      const pCat = placement.category;
      const customProd = selectedProductsMap[pCat] || selectedProductsMap[pCat === "wash_basin" ? "washbasin" : pCat];
      if (customProd) {
        return {
          ...placement,
          sku_code: customProd.sku_code,
          model_name: customProd.model_name,
          price_inr: customProd.price_inr,
          has_3d_model: customProd.has_3d_model,
          obj_file_path: customProd.obj_file_path,
          width_in: customProd.width_in || placement.width_in,
          depth_in: customProd.depth_in || placement.depth_in,
        };
      }
      return placement;
    });
  }, [roomWidthFt, roomDepthFt, itemsState, selectedProductsMap]);

  const DEFAULT_PRODUCTS = [
    {
      sku_code: "30438IN",
      category: "toilet",
      model_name: "Reach Wall-Hung Round Toilet",
      price_inr: 20000,
      width_in: 14.5,
      depth_in: 21,
      height_in: 18.5,
      has_3d_model: true,
      obj_file_path: "models/reach_toilet.obj",
    },
    {
      sku_code: "21226IN",
      category: "wash_basin",
      model_name: "ModernLife Edge 60cm Vessel Sink",
      price_inr: 38000,
      width_in: 23.5,
      depth_in: 15.5,
      height_in: 5.5,
      has_3d_model: true,
      obj_file_path: "models/modernlife_sink.obj",
    },
    {
      sku_code: "23475T-4",
      category: "faucet",
      model_name: "Parallel Modern Faucet",
      price_inr: 28000,
      width_in: 4,
      depth_in: 6.5,
      height_in: 8.5,
    },
  ];

  // In-3D Product Cycle Arrow Handler (< and >)
  const handleCycleProduct = (category, direction) => {
    const normCat = category.toLowerCase().replace("wash_basin", "washbasin");
    const productsPool = (allProducts && allProducts.length > 0) ? allProducts : DEFAULT_PRODUCTS;

    const categoryProducts = productsPool.filter((p) => {
      const pCat = p.category.toLowerCase().replace("wash_basin", "washbasin");
      return pCat === normCat;
    });

    if (categoryProducts.length === 0) return;

    const currentPlacement = activeLayoutData.find((p) => {
      const pCat = p.category.toLowerCase().replace("wash_basin", "washbasin");
      return pCat === normCat;
    });

    const currentIndex = currentPlacement
      ? categoryProducts.findIndex((p) => p.sku_code === currentPlacement.sku_code)
      : -1;
    const nextIndex = (currentIndex + direction + categoryProducts.length) % categoryProducts.length;
    const nextProduct = categoryProducts[nextIndex];

    setSelectedProductDetails(nextProduct);
    setSelectedProductsMap({ ...selectedProductsMap, [category]: nextProduct, [normCat]: nextProduct });
  };

  // Select catalog product
  const handleSelectCatalogProduct = (product) => {
    const normCat = product.category.toLowerCase().replace("wash_basin", "washbasin");
    const nextMap = { ...selectedProductsMap, [product.category]: product, [normCat]: product };
    setSelectedProductsMap(nextMap);
    setSelectedProductDetails(product);
  };

  return (
    <div style={{ backgroundColor: DARK_BG, color: "#F8FAFC", minHeight: "100vh", display: "flex", flexDirection: "column", overflowX: "hidden" }}>
      {/* Top Header & Persistent Mode Bar */}
      <header style={{
        position: "sticky",
        top: 0,
        zIndex: 100,
        backgroundColor: "#FFFFFF",
        borderBottom: "1px solid #E2E8F0",
        padding: "12px 40px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
      }}>
        {/* Brand / Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div style={{
            width: "38px",
            height: "38px",
            borderRadius: "8px",
            backgroundColor: "#000000",
            color: "#FFFFFF",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: "900",
            fontSize: "1.3rem",
            boxShadow: `0 2px 8px rgba(0,0,0,0.25)`,
          }}>
            K
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: "1.45rem", fontWeight: "900", letterSpacing: "0.5px", color: "#000000" }}>
              Kohler AI planner
            </h1>
          </div>
        </div>

        {/* ALWAYS-ON PERSISTENT MODE BAR ON WHITE HEADER */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          backgroundColor: "#F1F5F9",
          padding: "5px",
          borderRadius: "30px",
          border: "1px solid #CBD5E1",
        }}>
          {/* 2D Layout Planner Button */}
          <button
            type="button"
            onClick={() => {
              setIsPlannerOpen(!isPlannerOpen);
              setIsCatalogueOpen(false);
            }}
            style={{
              padding: "9px 24px",
              backgroundColor: isPlannerOpen ? "#000000" : "transparent",
              color: isPlannerOpen ? "#FFFFFF" : "#0F172A",
              border: "none",
              borderRadius: "24px",
              fontSize: "0.88rem",
              fontWeight: "800",
              cursor: "pointer",
              transition: "all 0.2s ease",
              boxShadow: isPlannerOpen ? "0 2px 8px rgba(0,0,0,0.3)" : "none",
            }}
          >
            2D Layout Planner
          </button>

          {/* Product Catalogue Button */}
          <button
            type="button"
            onClick={() => {
              setIsCatalogueOpen(!isCatalogueOpen);
              setIsPlannerOpen(false);
            }}
            style={{
              padding: "9px 24px",
              backgroundColor: isCatalogueOpen ? "#000000" : "transparent",
              color: isCatalogueOpen ? "#FFFFFF" : "#0F172A",
              border: "none",
              borderRadius: "24px",
              fontSize: "0.88rem",
              fontWeight: "800",
              cursor: "pointer",
              transition: "all 0.2s ease",
              boxShadow: isCatalogueOpen ? "0 2px 8px rgba(0,0,0,0.3)" : "none",
            }}
          >
            Product Catalogue
          </button>
        </div>

        {/* Action Button */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button
            type="button"
            onClick={() => setItemsState(null)}
            style={{
              padding: "8px 16px",
              backgroundColor: "transparent",
              border: "1px solid #000000",
              color: "#000000",
              borderRadius: "6px",
              fontSize: "0.85rem",
              fontWeight: "700",
              cursor: "pointer",
            }}
          >
            Reset Layout
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main style={{ flex: 1, padding: "0 0 40px 0", width: "100%" }}>
        
        {/* CORE SECTION: IMMERSIVE 3D SCENE BACKGROUND WITH TRANSPARENT FULL-SCREEN OVERLAYS */}
        <section ref={design3DRef} id="design3d" style={{ position: "relative", width: "100%" }}>

          {/* Full-Screen Immersive 3D Scene Container */}
          <div style={{
            width: "100vw",
            height: "780px",
            minHeight: "780px",
            backgroundColor: "#060709",
            position: "relative",
            boxShadow: "0 20px 60px rgba(0,0,0,0.9)",
            borderBottom: `1px solid ${BORDER_COLOR}`,
            display: "block",
            overflow: "hidden",
          }}>
            
            {/* 3D Scene Background Rendering Live Active Layout */}
            <ErrorBoundary>
              <LayoutViewer3D
                layoutData={activeLayoutData}
                roomWidth={roomWidthFt}
                roomDepth={roomDepthFt}
                roomHeight={roomHeightFt}
                aestheticTheme={aestheticTheme}
                floorTheme={floorTheme}
                wallTheme={wallTheme}
                onProductClick={setSelectedProductDetails}
                onCycleProduct={handleCycleProduct}
                hideHotspots={isPlannerOpen || isCatalogueOpen}
              />
            </ErrorBoundary>

            {/* FULL-SCREEN TRANSPARENT 2D PLANNER OVERLAY (WITH ROOM & SPECS INCLUDED) */}
            {isPlannerOpen && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  zIndex: 90,
                  overflowY: "auto",
                  backgroundColor: "rgba(0, 0, 0, 0.35)",
                  padding: "32px 40px",
                  boxSizing: "border-box",
                }}
              >
                <div style={{ maxWidth: "1400px", margin: "0 auto", position: "relative" }}>
                  <button
                    type="button"
                    onClick={() => setIsPlannerOpen(false)}
                    title="Close 2D Planner"
                    style={{
                      position: "absolute",
                      top: "2px",
                      right: "0px",
                      backgroundColor: "rgba(0, 0, 0, 0.75)",
                      border: "1.5px solid rgba(255, 255, 255, 0.4)",
                      color: "#FFFFFF",
                      borderRadius: "50%",
                      width: "36px",
                      height: "36px",
                      fontSize: "1.1rem",
                      fontWeight: "700",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      zIndex: 100,
                      boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
                    }}
                  >
                    ✕
                  </button>

                  <LayoutPlanner2D
                    roomWidthFt={roomWidthFt}
                    setRoomWidthFt={setRoomWidthFt}
                    roomDepthFt={roomDepthFt}
                    setRoomDepthFt={setRoomDepthFt}
                    roomHeightFt={roomHeightFt}
                    setRoomHeightFt={setRoomHeightFt}
                    budgetInr={budgetInr}
                    setBudgetInr={setBudgetInr}
                    aestheticTheme={aestheticTheme}
                    setAestheticTheme={setAestheticTheme}
                    floorTheme={floorTheme}
                    wallTheme={wallTheme}
                    onFloorThemeChange={setFloorTheme}
                    onWallThemeChange={setWallTheme}
                    itemsState={itemsState}
                    onItemsStateChange={setItemsState}
                    onReset={() => setItemsState(null)}
                  />
                </div>
              </div>
            )}

            {/* FULL-SCREEN TRANSPARENT PRODUCT CATALOGUE OVERLAY */}
            {isCatalogueOpen && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  zIndex: 90,
                  overflowY: "auto",
                  backgroundColor: "rgba(0, 0, 0, 0.35)",
                  padding: "32px 40px",
                  boxSizing: "border-box",
                }}
              >
                <div style={{ maxWidth: "1300px", margin: "0 auto", position: "relative" }}>
                  <button
                    type="button"
                    onClick={() => setIsCatalogueOpen(false)}
                    title="Close Catalogue"
                    style={{
                      position: "absolute",
                      top: "18px",
                      right: "12px",
                      backgroundColor: "rgba(0, 0, 0, 0.75)",
                      border: "1.5px solid rgba(255, 255, 255, 0.4)",
                      color: "#FFFFFF",
                      borderRadius: "50%",
                      width: "36px",
                      height: "36px",
                      fontSize: "1.1rem",
                      fontWeight: "700",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      zIndex: 100,
                      boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
                    }}
                  >
                    ✕
                  </button>

                  <CatalogBrowser
                    selectedProductsMap={selectedProductsMap}
                    onSelectProduct={handleSelectCatalogProduct}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Tabular CSV Selected Products Summary List and Total Cost at the Bottom */}
          <div style={{ marginTop: "40px", padding: "0 40px", width: "100%", boxSizing: "border-box" }}>
            <BundleResult
              layout={activeLayoutData}
              selectedProductsMap={selectedProductsMap}
            />
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer style={{
        borderTop: `1px solid ${BORDER_COLOR}`,
        padding: "24px 40px",
        backgroundColor: "#060709",
        color: TEXT_MUTED,
        fontSize: "0.85rem",
        textAlign: "center",
      }}>
        Kohler AI Luxury Bathroom Planner • Immersive Real-Time 3D Visualization and Transparent Live Overlays
      </footer>
    </div>
  );
}
