import { Canvas } from "@react-three/fiber";
import { OrbitControls, Text } from "@react-three/drei";
import { useState } from "react";

const DARK_ORANGE = "#B86A2A";
const PEACH = "#E8B4A0";

// Color mapping for product categories
const CATEGORY_COLORS = {
  toilet: "#e74c3c",      // red
  washbasin: "#3498db",   // blue
  faucet: "#2ecc71",      // green
  shower: "#9b59b6",      // purple
  bathtub: "#f39c12",     // orange
  mirror: "#1abc9c",      // teal
};

function Floor({ width, depth }) {
  // Convert inches to Three.js units (1 inch ≈ 1 unit for simplicity)
  // We'll render at scale where floor is slightly larger than room for visibility
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[width / 2, 0, depth / 2]}>
      <planeGeometry args={[width + 24, depth + 24]} />
      <meshStandardMaterial color="#e8e8e8" />
    </mesh>
  );
}

function Product({ placement }) {
  const { x, y, width_in, depth_in, model_name, category } = placement;
  const color = CATEGORY_COLORS[category] || "#95a5a6";

  // Convert to Three.js coordinates (y is height in 3D, z is depth in floor plane)
  // Position at center of the fixture's footprint
  const centerX = x + width_in / 2;
  const centerZ = y + depth_in / 2;

  // Height of the fixture (arbitrary but reasonable)
  const height = 18; // ~1.5 feet

  return (
    <group>
      {/* Main fixture box */}
      <mesh position={[centerX, height / 2, centerZ]}>
        <boxGeometry args={[width_in, height, depth_in]} />
        <meshStandardMaterial color={color} />
      </mesh>

      {/* Label above the fixture */}
      <Text position={[centerX, height + 12, centerZ]} fontSize={4} color="black" anchorY="bottom">
        {model_name}
      </Text>
    </group>
  );
}

export default function LayoutViewer3D({ layoutData, roomWidth, roomDepth }) {
  console.log("LayoutViewer3D rendered with:", { layoutData, roomWidth, roomDepth });
  
  if (!layoutData || layoutData.length === 0) {
    return <div style={{ textAlign: "center", padding: "20px", color: "#999" }}>No layout data available</div>;
  }

  // Convert feet to inches for rendering
  const roomWidthIn = roomWidth * 12;
  const roomDepthIn = roomDepth * 12;

  const styles = {
    container: {
      width: "100%",
      height: 600,
      border: `2px solid ${PEACH}`,
      borderRadius: "8px",
      overflow: "hidden",
      marginTop: 12,
    },
    legend: {
      marginTop: 16,
      padding: 16,
      backgroundColor: "#F5F5F5",
      borderRadius: "6px",
    },
    legendTitle: {
      fontWeight: "600",
      color: DARK_ORANGE,
      marginBottom: "12px",
      fontSize: "0.95rem",
    },
    legendGrid: {
      display: "flex",
      flexWrap: "wrap",
      gap: 16,
    },
    legendItem: {
      display: "flex",
      alignItems: "center",
      gap: 8,
    },
    legendColor: {
      width: 16,
      height: 16,
      borderRadius: 2,
    },
    legendLabel: {
      fontSize: "0.9rem",
      color: "#666",
      textTransform: "capitalize",
    },
  };

  return (
    <div>
      <div style={styles.container}>
        <Canvas 
          camera={{ position: [roomWidthIn / 2, 80, roomDepthIn + 50], fov: 50 }}
          onCreated={() => console.log("Canvas initialized")}
        >
          {/* Lighting */}
          <ambientLight intensity={0.6} />
          <directionalLight position={[roomWidthIn / 2, 100, 0]} intensity={0.8} />

          {/* Scene */}
          <Floor width={roomWidthIn} depth={roomDepthIn} />

          {/* Products */}
          {layoutData.map((placement, idx) => (
            <Product key={idx} placement={placement} />
          ))}

          {/* Controls */}
          <OrbitControls />
        </Canvas>
      </div>

      {/* Legend */}
      <div style={styles.legend}>
        <div style={styles.legendTitle}>🎨 Category Colors</div>
        <div style={styles.legendGrid}>
          {Object.entries(CATEGORY_COLORS).map(([category, color]) => (
            <div key={category} style={styles.legendItem}>
              <div
                style={{
                  ...styles.legendColor,
                  backgroundColor: color,
                }}
              />
              <span style={styles.legendLabel}>{category}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
