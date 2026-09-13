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

  const handleSubmit = async (formData) => {
    setLoading(true);
    try {
      const data = await createDesign(formData);
      setResult(data);
    } catch (error) {
      alert("Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const styles = {
    container: {
      minHeight: "100vh",
      backgroundColor: WHITE,
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    },
    header: {
      backgroundColor: ORANGE,
      color: WHITE,
      padding: "40px 20px",
      textAlign: "center",
      boxShadow: "0 2px 8px rgba(217, 126, 58, 0.15)",
    },
    headerTitle: {
      fontSize: "2.5rem",
      fontWeight: "600",
      margin: "0",
      letterSpacing: "0.5px",
    },
    headerSubtitle: {
      fontSize: "1rem",
      margin: "8px 0 0 0",
      opacity: 0.95,
      fontWeight: "300",
    },
    content: {
      maxWidth: "1200px",
      margin: "0 auto",
      padding: "40px 20px",
    },
    tabs: {
      display: "flex",
      gap: "12px",
      marginBottom: "40px",
      borderBottom: `2px solid ${LIGHT_GRAY}`,
    },
    tabButton: (active) => ({
      padding: "12px 24px",
      border: "none",
      background: "none",
      cursor: "pointer",
      fontSize: "1rem",
      fontWeight: active ? "600" : "500",
      color: active ? ORANGE : "#666",
      borderBottom: active ? `3px solid ${ORANGE}` : "none",
      marginBottom: "-2px",
      transition: "all 0.2s ease",
    }),
    section: {
      backgroundColor: LIGHT_GRAY,
      borderRadius: "12px",
      padding: "32px",
      marginBottom: "24px",
    },
    loadingBox: {
      padding: "24px",
      backgroundColor: PEACH,
      borderRadius: "8px",
      color: DARK_ORANGE,
      fontWeight: "500",
      marginBottom: "24px",
    },
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.headerTitle}>✨ Kohler AI Bathroom Designer</h1>
        <p style={styles.headerSubtitle}>Create your perfect bathroom with AI-powered design recommendations</p>
      </div>

      {/* Main Content */}
      <div style={styles.content}>
        {/* Tabs */}
        <div style={styles.tabs}>
          <button
            style={styles.tabButton(mode === "generate")}
            onClick={() => {
              setMode("generate");
              setSelectedSku(null);
            }}
          >
            🎨 Generate Design
          </button>
          <button
            style={styles.tabButton(mode === "browse")}
            onClick={() => {
              setMode("browse");
              setResult(null);
            }}
          >
            🔍 Browse Catalogue
          </button>
        </div>

        {/* Generate Mode */}
        {mode === "generate" && (
          <>
            <div style={styles.section}>
              <h2 style={{ margin: "0 0 20px 0", color: DARK_ORANGE }}>Design Parameters</h2>
              <DesignForm onSubmit={handleSubmit} />
            </div>
            
            {loading && (
              <div style={styles.loadingBox}>
                ⏳ Generating your design... This may take a moment.
              </div>
            )}
            
            {result && !loading && (
              <>
                <div style={styles.section}>
                  <BundleResult bundle={result.bundle} />
                </div>
                <div style={styles.section}>
                  <h2 style={{ margin: "0 0 20px 0", color: DARK_ORANGE }}>3D Layout Preview</h2>
                  <LayoutViewer3D 
                    layoutData={result.layout} 
                    roomWidth={result.room_width_ft}
                    roomDepth={result.room_depth_ft}
                  />
                </div>
              </>
            )}
          </>
        )}

        {/* Browse Mode */}
        {mode === "browse" && (
          <>
            <div style={styles.section}>
              <h2 style={{ margin: "0 0 20px 0", color: DARK_ORANGE }}>Browse Products</h2>
              <CatalogBrowser onSelect={setSelectedSku} />
            </div>
            
            {selectedSku && (
              <div style={styles.section}>
                <h2 style={{ margin: "0 0 20px 0", color: DARK_ORANGE }}>Matching Items</h2>
                <SimilarItems skuCode={selectedSku} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
