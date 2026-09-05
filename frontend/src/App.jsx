import { useState } from "react";
import DesignForm from "./components/DesignForm";
import BundleResult from "./components/BundleResult";
import LayoutViewer from "./components/LayoutViewer";
import CatalogBrowser from "./components/CatalogBrowser";
import SimilarItems from "./components/SimilarItems";
import { createDesign } from "./api/client";

export default function App() {
  const [mode, setMode] = useState("generate"); // "generate" | "browse"
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedSku, setSelectedSku] = useState(null);

  const handleSubmit = async (formData) => {
    setLoading(true);
    try {
      const data = await createDesign(formData);
      setResult(data);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 700, margin: "40px auto", fontFamily: "sans-serif" }}>
      <h1>Kohler AI Bathroom Designer</h1>

      <div style={{ marginBottom: 20 }}>
        <button onClick={() => setMode("generate")} disabled={mode === "generate"}>
          Generate a design
        </button>
        <button onClick={() => setMode("browse")} disabled={mode === "browse"} style={{ marginLeft: 8 }}>
          Browse catalogue
        </button>
      </div>

      {mode === "generate" && (
        <>
          <DesignForm onSubmit={handleSubmit} />
          {loading && <p>Generating design...</p>}
          {result && (
            <>
              <BundleResult bundle={result.bundle} />
              <LayoutViewer layoutSvg={result.layout_svg} />
            </>
          )}
        </>
      )}

      {mode === "browse" && (
        <>
          <CatalogBrowser onSelect={setSelectedSku} />
          <SimilarItems skuCode={selectedSku} />
        </>
      )}
    </div>
  );
}
