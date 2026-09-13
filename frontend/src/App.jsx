import { useState } from "react";
import DesignForm from "./components/DesignForm";
import BundleResult from "./components/BundleResult";
import LayoutViewer3D from "./components/LayoutViewer3D";
import CatalogBrowser from "./components/CatalogBrowser";
import SimilarItems from "./components/SimilarItems";
import { createDesign } from "./api/client";

const PEACH = "#E8B4A0";
const ORANGE = "#D97E3A";
const DARK_ORANGE = "#B86A2A";
const WHITE = "#FFFFFF";
const LIGHT_GRAY = "#F5F5F5";

export default function App() {
  const [mode, setMode] = useState("generate");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedSku, setSelectedSku] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [formData, setFormData] = useState({
    room_width_ft: 8,
    room_depth_ft: 6,
    budget_inr: 200000,
    aesthetic_theme: "Minimalist Modern",
  });

  const handleSubmit = async (data) => {
    setFormData(data);
    setLoading(true);
    try {
      const res = await createDesign(data);
      setResult(res);
    } catch (error) {
      alert("Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const styles = {
    app: {
      display: "flex",
      flexDirection: "column",
      minHeight: "100vh",
      backgroundColor: WHITE,
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    },
    header: {
      backgroundColor: ORANGE,
      color: WHITE,
      padding: "24px 40px",
      boxShadow: "0 4px 12px rgba(217, 126, 58, 0.2)",
      flex: "0 0 auto",
    },
    headerTitle: {
      fontSize: "2rem",
      fontWeight: "700",
      margin: "0",
      letterSpacing: "0.5px",
    },
    headerSubtitle: {
      fontSize: "0.9rem",
      margin: "6px 0 0 0",
      opacity: 0.95,
      fontWeight: "300",
    },
    body: {
      display: "flex",
      flex: "1",
      overflow: "hidden",
    },
    leftPanel: {
      width: "400px",
      borderRight: `2px solid ${LIGHT_GRAY}`,
      overflowY: "auto",
      padding: "40px 24px",
      backgroundColor: WHITE,
    },
    mainViewer: {
      flex: "1",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
    },
    fullWidthContainer: {
      flex: "1",
      overflowY: "auto",
      backgroundColor: WHITE,
    },
    section: {
      marginBottom: "32px",
    },
    sectionTitle: {
      fontSize: "1.1rem",
      fontWeight: "600",
      color: DARK_ORANGE,
      marginBottom: "16px",
      margin: "0 0 16px 0",
    },
    loadingBox: {
      padding: "16px",
      backgroundColor: PEACH,
      borderRadius: "8px",
      color: DARK_ORANGE,
      fontWeight: "500",
      textAlign: "center",
    },
    tabs: {
      display: "flex",
      gap: "0",
      borderBottom: `2px solid ${LIGHT_GRAY}`,
      backgroundColor: LIGHT_GRAY,
    },
    tabButton: (active) => ({
      padding: "12px 24px",
      border: "none",
      background: active ? WHITE : "none",
      cursor: "pointer",
      fontSize: "0.95rem",
      fontWeight: active ? "600" : "500",
      color: active ? ORANGE : "#666",
      borderBottom: active ? `3px solid ${ORANGE}` : "none",
      marginBottom: active ? "-2px" : "-2px",
      transition: "all 0.2s ease",
      flex: "0 1 auto",
    }),
    modalBackdrop: {
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1000,
      padding: "20px",
    },
    modalContent: {
      backgroundColor: WHITE,
      borderRadius: "8px",
      padding: "32px",
      maxWidth: "800px",
      width: "90%",
      maxHeight: "85vh",
      overflowY: "auto",
      boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
      position: "relative",
    },
    closeButton: {
      position: "absolute",
      top: "16px",
      right: "16px",
      backgroundColor: LIGHT_GRAY,
      border: "none",
      borderRadius: "50%",
      width: "32px",
      height: "32px",
      cursor: "pointer",
      fontWeight: "700",
      fontSize: "1rem",
      color: "#666",
    },
  };

  return (
    <div style={styles.app}>
      {/* Header - Full Width */}
      <div style={styles.header}>
        <h1 style={styles.headerTitle}>Kohler Bathroom Designer</h1>
        <p style={styles.headerSubtitle}>
          Interactive 3D bathroom design and product recommendations
        </p>
      </div>

      {/* Tabs */}
      <div style={styles.tabs}>
        <button
          style={styles.tabButton(mode === "generate")}
          onClick={() => {
            setMode("generate");
            setSelectedSku(null);
          }}
        >
          Generate Design
        </button>
        <button
          style={styles.tabButton(mode === "browse")}
          onClick={() => {
            setMode("browse");
            setResult(null);
          }}
        >
          Browse Catalogue
        </button>
      </div>

      {/* Main Body */}
      <div style={styles.body}>
        {mode === "generate" && (
          <>
            {/* Left Panel - Form & Info */}
            <div style={styles.leftPanel}>
              <div style={styles.section}>
                <h3 style={styles.sectionTitle}>Design Parameters</h3>
                <DesignForm onSubmit={handleSubmit} />
              </div>

              {result && result.bundle && (
                <div style={styles.section}>
                  <h3 style={styles.sectionTitle}>Recommended Bundle</h3>
                  <BundleResult bundle={result.bundle} />
                </div>
              )}

              {selectedProduct && (
                <div style={{
                  backgroundColor: LIGHT_GRAY,
                  padding: "20px",
                  borderRadius: "8px",
                  marginBottom: "20px",
                }}>
                  <h4 style={{ margin: "0 0 12px 0", color: DARK_ORANGE }}>
                    {selectedProduct.model_name}
                  </h4>
                  <div style={{ fontSize: "0.9rem", color: "#666", lineHeight: "1.6" }}>
                    <div><strong>Category:</strong> {selectedProduct.category}</div>
                    <div><strong>Price:</strong> ₹ {selectedProduct.price_inr?.toLocaleString('en-IN')}</div>
                    {selectedProduct.width_in && <div><strong>Width:</strong> {selectedProduct.width_in}"</div>}
                    {selectedProduct.depth_in && <div><strong>Depth:</strong> {selectedProduct.depth_in}"</div>}
                    {selectedProduct.collection && <div><strong>Collection:</strong> {selectedProduct.collection}</div>}
                    {selectedProduct.style_tags && (
                      <div><strong>Style:</strong> {selectedProduct.style_tags.join(", ")}</div>
                    )}
                  </div>
                  <button
                    onClick={() => setSelectedProduct(null)}
                    style={{
                      marginTop: "12px",
                      padding: "8px 12px",
                      backgroundColor: ORANGE,
                      color: WHITE,
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontSize: "0.85rem",
                      fontWeight: "600",
                    }}
                  >
                    Close
                  </button>
                </div>
              )}
            </div>

            {/* Right Panel - 3D Viewer */}
            <div style={styles.mainViewer}>
              {loading && (
                <div style={{ ...styles.loadingBox, margin: "40px", alignSelf: "center" }}>
                  Generating your design... Please wait.
                </div>
              )}

              {result && result.layout && (
                <LayoutViewer3D
                  layoutData={result.layout}
                  roomWidth={result.room_width_ft}
                  roomDepth={result.room_depth_ft}
                  onProductClick={setSelectedProduct}
                />
              )}

              {!result && !loading && (
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "100%",
                  color: "#999",
                  fontSize: "1.1rem",
                }}>
                  Enter your room dimensions and click Generate Design to see the 3D layout
                </div>
              )}
            </div>
          </>
        )}

        {mode === "browse" && (
          <div style={styles.fullWidthContainer}>
            <CatalogBrowser onSelect={setSelectedSku} />
          </div>
        )}
      </div>

      {/* Modal Overlay for Matching Items in Browse Mode */}
      {selectedSku && (
        <div style={styles.modalBackdrop} onClick={() => setSelectedSku(null)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button style={styles.closeButton} onClick={() => setSelectedSku(null)}>
              ✕
            </button>
            <SimilarItems skuCode={selectedSku} />
          </div>
        </div>
      )}
    </div>
  );
}

