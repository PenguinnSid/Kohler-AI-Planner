import { useEffect, useState } from "react";
import { getProducts, BASE_URL } from "../api/client";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";

const ORANGE = "#D97E3A";
const DARK_ORANGE = "#B86A2A";
const PEACH = "#E8B4A0";
const WHITE = "#FFFFFF";
const LIGHT_GRAY = "#F5F5F5";

// 3D model viewer for product cards
function ProductModelViewer({ objPath, category, modelName }) {
  const [model, setModel] = useState(null);

  useEffect(() => {
    if (objPath) {
      const loader = new OBJLoader();
      const fileName = objPath.split('/').pop();
      loader.load(
        `${BASE_URL}/api/3d/${fileName}`,
        (object) => {
          const isVeil20704 = fileName.includes("20704");
          const isVeil20703 = fileName.includes("20703");

          if (isVeil20704) {
            // Veil (20704, 48k): natural mid-point orientation (0 degrees)
            object.rotation.set(0, 0, 0);
          } else {
            // 1st Veil (20703, 80k) & standard CAD Z-up models: rotate -90 deg on X to stand upright
            object.rotation.x = -Math.PI / 2;
          }
          object.updateMatrixWorld(true);

          let box = new THREE.Box3().setFromObject(object);
          let size = box.getSize(new THREE.Vector3());

          // Adjust alignment if length is depth-wise for other washbasins
          if (!isVeil20704 && !isVeil20703 && category === 'washbasin' && size.x < size.z) {
            object.rotation.y += Math.PI / 2;
            object.updateMatrixWorld(true);
            box = new THREE.Box3().setFromObject(object);
            size = box.getSize(new THREE.Vector3());
          }

          const center = box.getCenter(new THREE.Vector3());
          const maxDim = Math.max(size.x, size.y, size.z) || 1;
          const scale = 2.6 / maxDim; // Fills screen area cleanly
          
          // Center geometry nicely inside viewer
          object.position.x = -center.x * scale;
          object.position.y = -center.y * scale;
          object.position.z = -center.z * scale;
          
          object.scale.set(scale, scale, scale);

          // Brighter White for all standard fixtures, Dark Turquoise for ModernLife Edge sink
          const isModernLife = modelName && modelName.toLowerCase().includes("modernlife");
          const matColor = isModernLife ? "#0F4C5C" : "#FFFFFF";

          object.traverse((child) => {
            if (child.isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
              child.material = new THREE.MeshStandardMaterial({
                color: matColor,
                roughness: isModernLife ? 0.3 : 0.1,
                metalness: category === 'faucet' ? 0.7 : 0.05,
                side: THREE.DoubleSide,
              });
            }
          });
          
          const group = new THREE.Group();
          group.add(object);
          setModel(group);
        },
        undefined,
        (error) => console.warn(`Could not load ${objPath}:`, error)
      );
    }
  }, [objPath, category, modelName]);

  if (!objPath) {
    return (
      <div style={{ height: "260px", backgroundColor: LIGHT_GRAY, display: "flex", alignItems: "center", justifyContent: "center", color: "#999" }}>
        No 3D Model
      </div>
    );
  }

  return (
    <Canvas style={{ height: "260px", width: "100%", backgroundColor: "#FAFAFA" }} camera={{ position: [2.5, 1.8, 2.5], fov: 45 }}>
      <ambientLight intensity={1.1} />
      <directionalLight position={[5, 10, 5]} intensity={1.0} />
      <directionalLight position={[-5, -2, -5]} intensity={0.4} />
      {model && <primitive object={model} />}
      <OrbitControls enableZoom={false} autoRotate={false} />
    </Canvas>
  );
}

export default function CatalogBrowser({ onSelect }) {
  const [products, setProducts] = useState([]);
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    getProducts(category || undefined)
      .then(setProducts)
      .finally(() => setLoading(false));
  }, [category]);

  const styles = {
    container: {
      padding: "32px 40px",
      maxWidth: "1400px",
      margin: "0 auto",
      backgroundColor: "#0B132B",
      color: "#F8FAFC",
    },
    headerRow: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: "28px",
      borderBottom: `2px solid #1E293B`,
      paddingBottom: "16px",
    },
    titleSection: {
      display: "flex",
      alignItems: "baseline",
      gap: "12px",
    },
    title: {
      fontSize: "1.8rem",
      fontWeight: "700",
      color: "#FFD166",
      margin: "0",
    },
    subtitle: {
      fontSize: "0.95rem",
      color: "#94A3B8",
    },
    filterContainer: {
      display: "flex",
      alignItems: "center",
      gap: "12px",
    },
    filterLabel: {
      fontSize: "0.9rem",
      fontWeight: "700",
      color: "#FFD166",
    },
    select: {
      padding: "8px 14px",
      border: `1px solid #334155`,
      borderRadius: "6px",
      fontSize: "0.9rem",
      backgroundColor: "#0F172A",
      color: "#F8FAFC",
      cursor: "pointer",
      fontFamily: "inherit",
      minWidth: "180px",
      outline: "none",
    },
    productsGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(3, 1fr)",
      gap: "24px",
    },
    productCard: {
      backgroundColor: "#1C2541",
      border: `1px solid #334155`,
      borderRadius: "8px",
      padding: "18px",
      transition: "all 0.2s ease",
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
    },
    productCardHover: {
      borderColor: ORANGE,
      boxShadow: "0 8px 24px rgba(0, 0, 0, 0.5)",
      transform: "translateY(-4px)",
    },
    modelViewer: {
      height: "260px",
      marginBottom: "14px",
      borderRadius: "6px",
      overflow: "hidden",
      backgroundColor: "#0F172A",
    },
    cardContent: {
      display: "flex",
      flexDirection: "column",
      flex: 1,
    },
    productCategory: {
      fontSize: "0.75rem",
      color: "#FFD166",
      fontWeight: "700",
      marginBottom: "6px",
      textTransform: "uppercase",
      letterSpacing: "0.5px",
    },
    productName: {
      fontSize: "1.05rem",
      fontWeight: "600",
      color: "#F8FAFC",
      marginBottom: "8px",
      lineHeight: "1.3",
    },
    productPrice: {
      fontSize: "1.2rem",
      fontWeight: "700",
      color: ORANGE,
      marginBottom: "16px",
      marginTop: "auto",
    },
    productButton: {
      width: "100%",
      padding: "10px",
      backgroundColor: ORANGE,
      color: WHITE,
      border: "none",
      borderRadius: "6px",
      cursor: "pointer",
      fontWeight: "700",
      fontSize: "0.9rem",
      transition: "all 0.2s ease",
    },
    buttonHover: {
      backgroundColor: DARK_ORANGE,
    },
    emptyState: {
      textAlign: "center",
      padding: "60px 20px",
      color: "#94A3B8",
      fontSize: "1.05rem",
    },
  };

  return (
    <div style={styles.container}>
      {/* Top Header Row with Filter on Top Right */}
      <div style={styles.headerRow}>
        <div style={styles.titleSection}>
          <h2 style={styles.title}>Product Catalogue</h2>
          <span style={styles.subtitle}>
            ({products.length} {products.length === 1 ? 'item' : 'items'})
          </span>
        </div>

        <div style={styles.filterContainer}>
          <label htmlFor="category-filter" style={styles.filterLabel}>
            Category:
          </label>
          <select 
            id="category-filter"
            value={category} 
            onChange={(e) => setCategory(e.target.value)}
            style={styles.select}
          >
            <option value="">All Categories</option>
            <option value="toilet">Toilet</option>
            <option value="toilet_seat">Toilet Seat</option>
            <option value="washbasin">Wash Basin</option>
            <option value="faucet">Faucet</option>
          </select>
        </div>
      </div>

      {loading && <div style={styles.emptyState}>Loading products...</div>}

      {!loading && products.length === 0 && (
        <div style={styles.emptyState}>No products found in this category.</div>
      )}

      {!loading && products.length > 0 && (
        <div style={styles.productsGrid}>
          {products.map((p) => {
            const has3D = p.has_3d_model && p.obj_file_path && p.category !== 'faucet';
            return (
              <div
                key={p.sku_code}
                style={styles.productCard}
                onMouseEnter={(e) => Object.assign(e.currentTarget.style, styles.productCardHover)}
                onMouseLeave={(e) => Object.assign(e.currentTarget.style, styles.productCard)}
              >
                <div>
                  <div style={styles.modelViewer}>
                    {has3D ? (
                      <ProductModelViewer objPath={p.obj_file_path} category={p.category} modelName={p.model_name} />
                    ) : (
                      <div style={{
                        height: "100%",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: "#f9f9f9",
                        color: "#888",
                        fontSize: "0.85rem",
                      }}>
                        <span>{p.category === 'faucet' ? 'Faucet Item' : 'Catalogue Item'}</span>
                      </div>
                    )}
                  </div>
                  <div style={styles.productCategory}>{p.category.replace('_', ' ')}</div>
                  <div style={styles.productName}>{p.model_name}</div>
                </div>

                <div>
                  <div style={styles.productPrice}>
                    ₹ {p.price_inr ? p.price_inr.toLocaleString('en-IN') : 'N/A'}
                  </div>
                  <button
                    onClick={() => onSelect(p.sku_code)}
                    style={styles.productButton}
                    onMouseEnter={(e) => Object.assign(e.target.style, styles.buttonHover)}
                    onMouseLeave={(e) => Object.assign(e.target.style, styles.productButton)}
                  >
                    View Matching Items
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

