import React, { useState, useEffect, Component, useRef } from "react";
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
  const items = activeItems || {
    toilet: { x: 4, y: 4, w: 16, h: 26, rot: 0 },
    washbasin: { x: Math.max(4, widthIn - 32), y: 6, w: 22, h: 18, rot: 0 },
    cabinet: { x: Math.max(1, widthIn - 38), y: 3, w: 28, h: 24, rot: 0 },
    bathtub: { x: 4, y: Math.max(4, depthIn - 36), w: 60, h: 32, rot: 0 },
    window: { x: Math.max(0, widthIn / 2 - 20), y: 0, w: 40, h: 4, rot: 0 },
    door: { x: Math.max(4, widthIn / 2 - 16), y: depthIn - 4, w: 32, h: 4, rot: 180 },
    mirror: { x: Math.max(1, widthIn - 38), y: 0, w: 28, h: 3, rot: 0 },
  };

  return [
    {
      sku_code: "K-29172IN-0",
      category: "toilet",
      model_name: "Reach One-Piece Toilet",
      price_inr: 45000,
      x: items.toilet?.x ?? 4,
      y: items.toilet?.y ?? 4,
      width_in: items.toilet?.w ?? 16,
      depth_in: items.toilet?.h ?? 26,
      height_in: 18,
      rotation_deg: items.toilet?.rot ?? 0,
      obj_file_path: "models/reach_toilet.obj",
      has_3d_model: true,
      seat_included: true,
    },
    {
      sku_code: "K-21226IN-0_platform",
      category: "sink_platform",
      model_name: "Counter Platform",
      x: items.cabinet?.x ?? Math.max(1, widthIn - 38),
      y: items.cabinet?.y ?? 3,
      width_in: items.cabinet?.w ?? 28,
      depth_in: items.cabinet?.h ?? 24,
      height_in: 12,
      rotation_deg: items.washbasin?.rot ?? 0,
      is_platform: true,
    },
    {
      sku_code: "K-21226IN-0",
      category: "washbasin",
      model_name: "ModernLife Vessel Washbasin",
      price_inr: 28000,
      x: items.washbasin?.x ?? Math.max(4, widthIn - 32),
      y: items.washbasin?.y ?? 6,
      width_in: items.washbasin?.w ?? 22,
      depth_in: items.washbasin?.h ?? 18,
      rotation_deg: items.washbasin?.rot ?? 0,
      platform_height_offset: 12,
      obj_file_path: "models/modernlife_sink.obj",
      has_3d_model: true,
    },
    {
      sku_code: "bathtub_area",
      category: "bathtub",
      model_name: "Reserved Bathtub Zone",
      x: items.bathtub?.x ?? 4,
      y: items.bathtub?.y ?? Math.max(4, depthIn - 36),
      width_in: items.bathtub?.w ?? 60,
      depth_in: items.bathtub?.h ?? 32,
      rotation_deg: items.bathtub?.rot ?? 0,
      is_placeholder: true,
    },
    {
      sku_code: "custom_window",
      category: "window",
      model_name: "Bathroom Window",
      x: items.window?.x ?? Math.max(0, widthIn / 2 - 20),
      y: 0,
      width_in: items.window?.w ?? 40,
      depth_in: 2,
      rotation_deg: items.window?.rot ?? 0,
    },
    {
      sku_code: "custom_door",
      category: "door",
      model_name: "Bathroom Door",
      x: items.door?.x ?? Math.max(4, widthIn / 2 - 16),
      y: items.door?.y ?? depthIn - 4,
      width_in: items.door?.w ?? 32,
      depth_in: items.door?.h ?? 4,
      rotation_deg: items.door?.rot ?? 0,
    },
    {
      sku_code: "custom_mirror",
      category: "mirror",
      model_name: "Vanity Mirror",
      x: items.mirror?.x ?? Math.max(1, widthIn - 38),
      y: items.mirror?.y ?? 0,
      width_in: items.mirror?.w ?? 28,
      depth_in: items.mirror?.h ?? 3,
      rotation_deg: items.mirror?.rot ?? 0,
      wallSnapSide: items.mirror?.wallSnapSide ?? "top",
    },
  ];
}

export default function App() {
  // Room Specification & Design Parameters State
  const [roomWidthFt, setRoomWidthFt] = useState(8);
  const [roomDepthFt, setRoomDepthFt] = useState(6);
  const [roomHeightFt, setRoomHeightFt] = useState(9);
  const [budgetInr, setBudgetInr] = useState(200000);
  const [aestheticTheme, setAestheticTheme] = useState("Minimalist Modern");
  const [floorTheme, setFloorTheme] = useState("marble");
  const [wallTheme, setWallTheme] = useState("subway");
  const [cohesionScore, setCohesionScore] = useState(0.8);

  // 2D Planner & Product Catalogue State
  const [itemsState, setItemsState] = useState(null);
  const [allProducts, setAllProducts] = useState([]);
  const [selectedProductsMap, setSelectedProductsMap] = useState({});
  const [selectedProductDetails, setSelectedProductDetails] = useState(null);
  const [isCatalogueOpen, setIsCatalogueOpen] = useState(false);
  const [isHeaderHidden, setIsHeaderHidden] = useState(false);

  // Design Results & Loading
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  // Section Refs
  const plannerRef = useRef(null);
  const catalogueRef = useRef(null);
  const design3DRef = useRef(null);

  // Fetch all products on mount for instant in-3D cycling
  useEffect(() => {
    getProducts()
      .then((data) => setAllProducts(data))
      .catch((err) => console.error("Error fetching all products:", err));
  }, []);

  // Scroll listener to hide top header bar when viewing the full 3D visualizer
  useEffect(() => {
    const handleScroll = () => {
      if (design3DRef.current) {
        const rect = design3DRef.current.getBoundingClientRect();
        if (rect.top <= 120) {
          setIsHeaderHidden(true);
        } else {
          setIsHeaderHidden(false);
        }
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Helper to trigger 3D design generation with fallback support and smooth scroll
  const handleGenerateDesign = async (overrideItems = null, shouldScroll = false) => {
    setLoading(true);
    try {
      const activeItems = overrideItems || itemsState;
      const customLayoutPayload = activeItems
        ? {
          toilet: activeItems.toilet ? { x: activeItems.toilet.x, y: activeItems.toilet.y, w: activeItems.toilet.w, h: activeItems.toilet.h, rot: activeItems.toilet.rot || 0 } : undefined,
          washbasin: activeItems.washbasin ? { x: activeItems.washbasin.x, y: activeItems.washbasin.y, w: activeItems.washbasin.w, h: activeItems.washbasin.h, rot: activeItems.washbasin.rot || 0 } : undefined,
          cabinet: activeItems.cabinet ? { x: activeItems.cabinet.x, y: activeItems.cabinet.y, w: activeItems.cabinet.w, h: activeItems.cabinet.h, rot: activeItems.cabinet.rot || 0 } : undefined,
          bathtub: activeItems.bathtub ? { x: activeItems.bathtub.x, y: activeItems.bathtub.y, w: activeItems.bathtub.w, h: activeItems.bathtub.h, rot: activeItems.bathtub.rot || 0 } : undefined,
          window: activeItems.window ? { x: activeItems.window.x, y: activeItems.window.y, w: activeItems.window.w, h: activeItems.window.h, rot: activeItems.window.rot || 0 } : undefined,
          door: activeItems.door ? { x: activeItems.door.x, y: activeItems.door.y, w: activeItems.door.w, h: activeItems.door.h, rot: activeItems.door.rot || 0 } : undefined,
          mirror: activeItems.mirror ? { x: activeItems.mirror.x, y: activeItems.mirror.y, w: activeItems.mirror.w, h: activeItems.mirror.h, rot: activeItems.mirror.rot || 0, wallSnapSide: activeItems.mirror.wallSnapSide } : undefined,
        }
        : null;

      const payload = {
        room_width_ft: roomWidthFt,
        room_depth_ft: roomDepthFt,
        budget_inr: budgetInr,
        aesthetic_theme: aestheticTheme,
        cohesion_score: cohesionScore,
        custom_layout: customLayoutPayload,
      };

      let res = null;
      try {
        res = await createDesign(payload);
      } catch (apiErr) {
        console.warn("Backend API not reachable, using client layout generator fallback:", apiErr);
        res = {
          layout: generateFallbackLayout(roomWidthFt, roomDepthFt, activeItems),
          bundle: {
            bundle_name: `${aestheticTheme} Luxury Collection`,
            total_price_inr: 185000,
            cohesion_score: 0.92,
          },
        };
      }

      // Apply any user-selected product overrides
      if (res && res.layout && Object.keys(selectedProductsMap).length > 0) {
        res.layout = res.layout.map((placement) => {
          const customProd = selectedProductsMap[placement.category];
          if (customProd) {
            return {
              ...placement,
              sku_code: customProd.sku_code,
              model_name: customProd.model_name,
              price_inr: customProd.price_inr,
              has_3d_model: customProd.has_3d_model,
              obj_file_path: customProd.obj_file_path,
            };
          }
          return placement;
        });
      }

      setResult(res);

      if (shouldScroll && design3DRef.current) {
        setTimeout(() => {
          design3DRef.current.scrollIntoView({ behavior: "smooth" });
        }, 150);
      }
    } catch (err) {
      console.error("Error generating design:", err);
    } finally {
      setLoading(false);
    }
  };

  // Generate initial design on mount
  useEffect(() => {
    handleGenerateDesign();
  }, []);

  const DEFAULT_PRODUCTS = [
    {
      sku_code: "K-29172IN-0",
      category: "toilet",
      model_name: "Reach One-Piece Toilet",
      price_inr: 45000,
      width_in: 16,
      depth_in: 26,
      height_in: 18,
      has_3d_model: true,
      obj_file_path: "models/reach_toilet.obj",
      seat_included: true,
      description: "Sleek compact one-piece design with Quiet-Close seat and dual flush technology.",
    },
    {
      sku_code: "K-20704IN-0",
      category: "toilet",
      model_name: "Veil Wall-Hung Intelligent Toilet",
      price_inr: 65000,
      width_in: 15,
      depth_in: 22,
      height_in: 16,
      has_3d_model: true,
      obj_file_path: "models/veil_toilet.obj",
      seat_included: true,
      description: "Minimalist wall-hung bowl with sculpted curves and automatic cleansing functions.",
    },
    {
      sku_code: "K-77725IN-0",
      category: "toilet",
      model_name: "ModernLife Edge Wall-Hung Toilet",
      price_inr: 38000,
      width_in: 14.5,
      depth_in: 21,
      height_in: 15,
      has_3d_model: true,
      obj_file_path: "models/modernlife_toilet.obj",
      seat_included: true,
      description: "Ultra-thin rimless profile for effortless hygiene and modern aesthetics.",
    },
    {
      sku_code: "K-21226IN-0",
      category: "washbasin",
      model_name: "ModernLife Vessel Washbasin",
      price_inr: 28000,
      width_in: 22,
      depth_in: 18,
      height_in: 6,
      has_3d_model: true,
      obj_file_path: "models/modernlife_sink.obj",
      description: "Sophisticated vessel basin with dark accents and smooth ceramic curvature.",
    },
    {
      sku_code: "K-20703IN-0",
      category: "washbasin",
      model_name: "Veil Rectangular Vessel Basin",
      price_inr: 48000,
      width_in: 24,
      depth_in: 16,
      height_in: 5,
      has_3d_model: true,
      obj_file_path: "models/veil_sink.obj",
      description: "Seamless fluid design crafted with Supramic technology for slender walls.",
    },
    {
      sku_code: "K-2660IN-0",
      category: "washbasin",
      model_name: "Forefront Rectangular Basin",
      price_inr: 32000,
      width_in: 23,
      depth_in: 17,
      height_in: 6,
      has_3d_model: true,
      obj_file_path: "models/forefront_sink.obj",
      description: "Clean geometric symmetry with a soft rectangular inner bowl.",
    },
  ];

  // In-3D Product Cycle Arrow Handler (< and >)
  const handleCycleProduct = (category, direction) => {
    if (!result || !result.layout) return;

    const normCat = category.toLowerCase().replace("wash_basin", "washbasin");
    const productsPool = (allProducts && allProducts.length > 0) ? allProducts : DEFAULT_PRODUCTS;

    const categoryProducts = productsPool.filter((p) => {
      const pCat = p.category.toLowerCase().replace("wash_basin", "washbasin");
      return pCat === normCat;
    });

    if (categoryProducts.length === 0) return;

    const currentPlacement = result.layout.find((p) => {
      const pCat = p.category.toLowerCase().replace("wash_basin", "washbasin");
      return pCat === normCat;
    });

    if (!currentPlacement) return;

    const currentIndex = categoryProducts.findIndex((p) => p.sku_code === currentPlacement.sku_code);
    const nextIndex = (currentIndex + direction + categoryProducts.length) % categoryProducts.length;
    const nextProduct = categoryProducts[nextIndex];

    // Swap layout data in result state
    const updatedLayout = result.layout.map((item) => {
      const itemCat = item.category.toLowerCase().replace("wash_basin", "washbasin");
      if (itemCat === normCat) {
        return {
          ...item,
          sku_code: nextProduct.sku_code,
          model_name: nextProduct.model_name,
          price_inr: nextProduct.price_inr,
          has_3d_model: nextProduct.has_3d_model,
          obj_file_path: nextProduct.obj_file_path,
          width_in: nextProduct.width_in || item.width_in,
          depth_in: nextProduct.depth_in || item.depth_in,
          description: nextProduct.description,
          seat_included: nextProduct.seat_included,
        };
      }
      return item;
    });

    setResult({ ...result, layout: updatedLayout });
    setSelectedProductDetails(nextProduct);
    setSelectedProductsMap({ ...selectedProductsMap, [category]: nextProduct, [normCat]: nextProduct });
  };

  // Select catalog product
  const handleSelectCatalogProduct = (product) => {
    const nextMap = { ...selectedProductsMap, [product.category]: product };
    setSelectedProductsMap(nextMap);
    setSelectedProductDetails(product);

    if (result && result.layout) {
      const updatedLayout = result.layout.map((item) => {
        if (item.category === product.category) {
          return {
            ...item,
            sku_code: product.sku_code,
            model_name: product.model_name,
            price_inr: product.price_inr,
            has_3d_model: product.has_3d_model,
            obj_file_path: product.obj_file_path,
            width_in: product.width_in || item.width_in,
            depth_in: product.depth_in || item.depth_in,
          };
        }
        return item;
      });
      setResult({ ...result, layout: updatedLayout });
    }
  };

  return (
    <div style={{ backgroundColor: DARK_BG, color: "#F8FAFC", minHeight: "100vh", display: "flex", flexDirection: "column", overflowX: "hidden" }}>
      {/* White Top Header Bar */}
      <header style={{
        position: "sticky",
        top: 0,
        zIndex: 100,
        backgroundColor: "#FFFFFF",
        borderBottom: `1px solid #E2E8F0`,
        padding: "14px 40px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
        transform: isHeaderHidden ? "translateY(-100%)" : "translateY(0)",
        opacity: isHeaderHidden ? 0 : 1,
        transition: "transform 0.35s ease, opacity 0.35s ease",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div style={{
            width: "36px",
            height: "36px",
            borderRadius: "8px",
            backgroundColor: "#000000",
            color: "#FFFFFF",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: "900",
            fontSize: "1.2rem",
            boxShadow: `0 0 12px rgba(0,0,0,0.25)`,
          }}>
            K
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: "1.25rem", fontWeight: "800", letterSpacing: "0.5px", color: "#000000" }}>
              Kohler AI planner
            </h1>
            <div style={{ fontSize: "0.75rem", color: "#64748B" }}>
              Architectural 2D Layout and Immersive 3D Visualization
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main style={{ flex: 1, padding: "30px 40px 60px 40px", maxWidth: "1500px", width: "100%", margin: "0 auto" }}>

        {/* SECTION 1: 2D BATHROOM PLANNER */}
        <section ref={plannerRef} id="planner2d" style={{ marginBottom: "50px" }}>
          <div style={{ marginBottom: "20px" }}>
            <h2 style={{ fontSize: "1.8rem", fontWeight: "800", color: "#F8FAFC", margin: 0 }}>
              2D Layout Planner
            </h2>
          </div>


          <div style={{
            backgroundColor: DARK_CARD,
            border: `1px solid ${BORDER_COLOR}`,
            borderRadius: "12px",
            padding: "20px",
            marginBottom: "24px",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "16px",
            boxShadow: "0 8px 30px rgba(0,0,0,0.4)",
          }}>
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: "700", color: GOLD, marginBottom: "4px" }}>
                Room Width (X): {roomWidthFt} ft
              </label>
              <input
                type="range"
                min="4"
                max="20"
                step="0.5"
                value={roomWidthFt}
                onChange={(e) => setRoomWidthFt(parseFloat(e.target.value))}
                style={{ width: "100%", accentColor: GOLD }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: "700", color: GOLD, marginBottom: "4px" }}>
                Room Length (Y): {roomDepthFt} ft
              </label>
              <input
                type="range"
                min="4"
                max="20"
                step="0.5"
                value={roomDepthFt}
                onChange={(e) => setRoomDepthFt(parseFloat(e.target.value))}
                style={{ width: "100%", accentColor: GOLD }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: "700", color: GOLD, marginBottom: "4px" }}>
                Ceiling Height (Z): {roomHeightFt} ft
              </label>
              <input
                type="range"
                min="7"
                max="14"
                step="0.5"
                value={roomHeightFt}
                onChange={(e) => setRoomHeightFt(parseFloat(e.target.value))}
                style={{ width: "100%", accentColor: GOLD }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: "700", color: GOLD, marginBottom: "4px" }}>
                Budget (INR)
              </label>
              <input
                type="number"
                step="10000"
                min="50000"
                value={budgetInr}
                onChange={(e) => setBudgetInr(parseInt(e.target.value) || 100000)}
                style={{
                  width: "100%",
                  padding: "6px 10px",
                  backgroundColor: DARK_BG,
                  border: `1px solid ${BORDER_COLOR}`,
                  borderRadius: "6px",
                  color: "#F8FAFC",
                  fontSize: "0.85rem",
                  outline: "none",
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: "700", color: GOLD, marginBottom: "4px" }}>
                Aesthetic Theme
              </label>
              <select
                value={aestheticTheme}
                onChange={(e) => setAestheticTheme(e.target.value)}
                style={{
                  width: "100%",
                  padding: "6px 10px",
                  backgroundColor: DARK_BG,
                  border: `1px solid ${BORDER_COLOR}`,
                  borderRadius: "6px",
                  color: "#F8FAFC",
                  fontSize: "0.85rem",
                  outline: "none",
                  cursor: "pointer",
                }}
              >
                <option>Minimalist Modern</option>
                <option>Classic Luxury</option>
                <option>Japanese Zen</option>
              </select>
            </div>
          </div>

          <LayoutPlanner2D
            roomWidthFt={roomWidthFt}
            roomDepthFt={roomDepthFt}
            roomHeightFt={roomHeightFt}
            floorTheme={floorTheme}
            wallTheme={wallTheme}
            onFloorThemeChange={setFloorTheme}
            onWallThemeChange={setWallTheme}
            itemsState={itemsState}
            onItemsStateChange={setItemsState}
            onReset={() => setItemsState(null)}
          />
        </section>

        {/* SECTION 2: CATALOGUE DROPDOWN MENU */}
        <section ref={catalogueRef} id="catalogue" style={{ marginBottom: "50px" }}>
          <div style={{ textAlign: "center", marginBottom: isCatalogueOpen ? "20px" : "0" }}>
            <button
              type="button"
              onClick={() => setIsCatalogueOpen(!isCatalogueOpen)}
              style={{
                padding: "14px 36px",
                backgroundColor: DARK_CARD,
                border: `1.5px solid ${GOLD}`,
                color: GOLD,
                borderRadius: "30px",
                fontSize: "0.95rem",
                fontWeight: "700",
                cursor: "pointer",
                boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
                transition: "all 0.25s ease",
              }}
            >
              Browse full catalogue
            </button>
          </div>

          {isCatalogueOpen && (
            <div className="animate-fade-in" style={{ marginTop: "20px" }}>
              <CatalogBrowser
                selectedProductsMap={selectedProductsMap}
                onSelectProduct={handleSelectCatalogProduct}
              />
            </div>
          )}
        </section>

        {/* SECTION 3: IMMERSIVE FULL-WIDTH 3D VISUALIZER */}
        <section ref={design3DRef} id="design3d" style={{ position: "relative" }}>

          {/* Centered Generate Button right above 3D Visualizer */}
          <div style={{ textAlign: "center", marginBottom: "24px" }}>
            <button
              type="button"
              onClick={() => handleGenerateDesign(null, true)}
              style={{
                padding: "16px 48px",
                backgroundColor: "#D97E3A",
                color: "#FFFFFF",
                border: "none",
                borderRadius: "32px",
                fontSize: "1.1rem",
                fontWeight: "800",
                cursor: "pointer",
                boxShadow: `0 8px 32px rgba(217, 126, 58, 0.45)`,
                transition: "all 0.25s ease",
                letterSpacing: "0.3px",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "scale(1.04)";
                e.currentTarget.style.backgroundColor = "#F5B054";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "scale(1)";
                e.currentTarget.style.backgroundColor = "#D97E3A";
              }}
            >
              Generate Visualization
            </button>
          </div>

          {/* Full Screen Width Edge-to-Edge Immersive 3D Box Container with Guaranteed Height */}
          <div style={{
            width: "100vw",
            marginLeft: "calc(50% - 50vw)",
            marginRight: "calc(50% - 50vw)",
            height: "750px",
            minHeight: "750px",
            backgroundColor: "#060709",
            position: "relative",
            boxShadow: "0 20px 60px rgba(0,0,0,0.9)",
            borderTop: `1px solid ${BORDER_COLOR}`,
            borderBottom: `1px solid ${BORDER_COLOR}`,
            display: "block",
          }}>
            {loading && (
              <div style={{
                position: "absolute",
                inset: 0,
                backgroundColor: "rgba(8, 9, 12, 0.9)",
                backdropFilter: "blur(8px)",
                zIndex: 30,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                color: GOLD,
                fontWeight: "800",
                fontSize: "1.2rem",
                gap: "12px",
              }}>
                <div>Rendering Kohler 3D Architectural Scene...</div>
                <div style={{ fontSize: "0.85rem", color: TEXT_MUTED, fontWeight: "400" }}>
                  Aligning fixtures, geometry, lighting, and textures
                </div>
              </div>
            )}

            {result && result.layout ? (
              <ErrorBoundary>
                <LayoutViewer3D
                  layoutData={result.layout}
                  roomWidth={roomWidthFt}
                  roomDepth={roomDepthFt}
                  roomHeight={roomHeightFt}
                  aestheticTheme={aestheticTheme}
                  floorTheme={floorTheme}
                  wallTheme={wallTheme}
                  onProductClick={setSelectedProductDetails}
                  onCycleProduct={handleCycleProduct}
                />
              </ErrorBoundary>
            ) : (
              <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: TEXT_MUTED, fontSize: "1.1rem" }}>
                Click "Generate Visualization" above to render your 3D view.
              </div>
            )}
          </div>

          {/* Bundle & Specs Summary Drawer Below 3D View */}
          {result && result.bundle && (
            <div style={{ marginTop: "40px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "28px" }}>
              <div style={{
                backgroundColor: DARK_CARD,
                border: `1px solid ${BORDER_COLOR}`,
                borderRadius: "12px",
                padding: "24px",
                boxShadow: "0 8px 30px rgba(0,0,0,0.4)",
              }}>
                <h3 style={{ fontSize: "1.2rem", fontWeight: "800", color: GOLD, margin: "0 0 16px 0" }}>
                  Selected Fixtures and Recommended Bundle
                </h3>
                <BundleResult bundle={result.bundle} />
              </div>

              {/* Selected Product Specifications Card */}
              {selectedProductDetails && (
                <div style={{
                  backgroundColor: DARK_CARD,
                  border: `1.5px solid ${GOLD}`,
                  borderRadius: "12px",
                  padding: "24px",
                  boxShadow: `0 8px 30px rgba(218, 157, 73, 0.25)`,
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                    <div style={{ fontSize: "0.8rem", fontWeight: "800", color: GOLD, textTransform: "uppercase", letterSpacing: "1px" }}>
                      Active Fixture Inspection
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedProductDetails(null)}
                      style={{ background: "none", border: "none", color: TEXT_MUTED, cursor: "pointer", fontSize: "1.1rem" }}
                    >
                      ✕
                    </button>
                  </div>
                  <h3 style={{ fontSize: "1.3rem", fontWeight: "800", color: "#F8FAFC", margin: "0 0 10px 0" }}>
                    {selectedProductDetails.model_name}
                  </h3>
                  <div style={{ fontSize: "0.9rem", color: "#CBD5E1", lineHeight: "1.6" }}>
                    <div><strong>Category:</strong> {selectedProductDetails.category}</div>
                    <div><strong>Price:</strong> <span style={{ color: GOLD, fontWeight: "700" }}>₹ {selectedProductDetails.price_inr?.toLocaleString('en-IN')}</span></div>
                    {selectedProductDetails.width_in && (
                      <div><strong>Dimensions:</strong> {selectedProductDetails.width_in}" W × {selectedProductDetails.depth_in}" D</div>
                    )}
                    {selectedProductDetails.description && (
                      <div style={{ marginTop: "12px", padding: "12px", backgroundColor: DARK_BG, borderRadius: "6px", border: `1px solid ${BORDER_COLOR}`, fontStyle: "italic", fontSize: "0.85rem", color: TEXT_MUTED }}>
                        "{selectedProductDetails.description}"
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
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
        Kohler AI Luxury Bathroom Planner • Immersive 100vw 3D Visualization and Real-time Product Swap Engine
      </footer>
    </div>
  );
}
