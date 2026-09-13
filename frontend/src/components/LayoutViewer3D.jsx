import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Html } from "@react-three/drei";
import { useEffect, useRef, useState, useMemo } from "react";
import * as THREE from "three";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { BASE_URL } from "../api/client";

const ORANGE = "#D97E3A";
const DARK_ORANGE = "#B86A2A";
const WHITE = "#FFFFFF";

// Consistent color mapper: Brighter White for all, Dark Turquoise for ModernLife Edge sink
function getProductColor(modelName) {
  const name = (modelName || "").toLowerCase();
  if (name.includes("modernlife") || name.includes("21226")) {
    return "#0F4C5C"; // Dark Turquoise
  }
  return "#FFFFFF"; // Brighter Pure White
}

// Helper to generate a realistic tiled marble bathroom floor texture
function createTileTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");

  // Off-white ceramic tile base
  ctx.fillStyle = "#EAE6DF";
  ctx.fillRect(0, 0, 512, 512);

  // Subtle Marble Veining
  ctx.strokeStyle = "rgba(185, 177, 165, 0.35)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(20, 0); ctx.bezierCurveTo(100, 160, 220, 280, 512, 440);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, 180); ctx.bezierCurveTo(160, 220, 320, 80, 512, 140);
  ctx.stroke();

  // Tile grout lines
  ctx.lineWidth = 6;
  ctx.strokeStyle = "#BDB6AA";

  const tileSize = 128;
  for (let x = 0; x <= 512; x += tileSize) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 512); ctx.stroke();
  }
  for (let y = 0; y <= 512; y += tileSize) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(512, y); ctx.stroke();
  }

  // Inner tile bevel shading
  for (let x = 0; x < 512; x += tileSize) {
    for (let y = 0; y < 512; y += tileSize) {
      ctx.fillStyle = "rgba(255, 255, 255, 0.25)";
      ctx.fillRect(x + 4, y + 4, tileSize - 8, 8);
      ctx.fillRect(x + 4, y + 4, 8, tileSize - 8);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

function Floor({ width, depth }) {
  const texture = useMemo(() => {
    const tex = createTileTexture();
    tex.repeat.set(Math.max(1, width / 24), Math.max(1, depth / 24));
    return tex;
  }, [width, depth]);

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[width / 2, -0.1, depth / 2]} receiveShadow>
      <planeGeometry args={[width + 36, depth + 36]} />
      <meshStandardMaterial map={texture} roughness={0.2} metalness={0.05} />
    </mesh>
  );
}

function RoomWalls({ width, depth }) {
  const wallHeight = 96; // 8 feet tall
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");

    // Luxury Warm Wall Tile Base
    ctx.fillStyle = "#F5F3EE";
    ctx.fillRect(0, 0, 256, 256);

    // Subtle Subway Tile Seams
    ctx.lineWidth = 3;
    ctx.strokeStyle = "#DDD8CE";
    ctx.strokeRect(0, 0, 256, 256);
    ctx.strokeRect(0, 128, 256, 128);

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(Math.max(1, width / 48), wallHeight / 48);
    return tex;
  }, [width, depth]);

  return (
    <group>
      {/* Back Wall */}
      <mesh position={[width / 2, wallHeight / 2, -0.5]} receiveShadow>
        <planeGeometry args={[width + 36, wallHeight]} />
        <meshStandardMaterial map={texture} roughness={0.35} side={THREE.DoubleSide} />
      </mesh>

      {/* Left Wall */}
      <mesh rotation={[0, Math.PI / 2, 0]} position={[-0.5, wallHeight / 2, depth / 2]} receiveShadow>
        <planeGeometry args={[depth + 36, wallHeight]} />
        <meshStandardMaterial map={texture} roughness={0.35} side={THREE.DoubleSide} />
      </mesh>

      {/* Skirting / Baseboard Border along floor bottom */}
      <mesh position={[width / 2, 2, 0.2]}>
        <boxGeometry args={[width + 36, 4, 1]} />
        <meshStandardMaterial color="#D3CDC2" roughness={0.3} />
      </mesh>
      <mesh rotation={[0, Math.PI / 2, 0]} position={[0.2, 2, depth / 2]}>
        <boxGeometry args={[depth + 36, 4, 1]} />
        <meshStandardMaterial color="#D3CDC2" roughness={0.3} />
      </mesh>
    </group>
  );
}

// 2D Video-Game Interactive Hotspot Dot & Floating Callout (Invisible Background)
function HotspotCallout({ position, placement, isSelected, onClick }) {
  const [hovered, setHovered] = useState(false);

  return (
    <Html position={position} center style={{ pointerEvents: "none", userSelect: "none" }}>
      <div style={{ position: "relative", pointerEvents: "auto" }}>
        {/* Concentric 2D Hotspot Dot */}
        <div
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          style={{
            position: "relative",
            width: "28px",
            height: "28px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* Outer Ring: Pops out / expands slightly on hover or selection */}
          <div
            style={{
              position: "absolute",
              width: hovered || isSelected ? "28px" : "18px",
              height: hovered || isSelected ? "28px" : "18px",
              borderRadius: "50%",
              border: "2.5px solid #D97E3A",
              boxShadow: hovered ? "0 0 10px rgba(217,126,58,0.8)" : "none",
              transition: "all 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
            }}
          />
          {/* Inner Solid Dot */}
          <div
            style={{
              width: "7px",
              height: "7px",
              borderRadius: "50%",
              backgroundColor: "#D97E3A",
              zIndex: 2,
            }}
          />
        </div>

        {/* Floating Callout Text & Diagonal SVG Leader Line (Invisible Background) */}
        {isSelected && (
          <div
            style={{
              position: "absolute",
              left: "22px",
              bottom: "14px",
              display: "flex",
              alignItems: "flex-end",
              pointerEvents: "auto",
              minWidth: "220px",
            }}
          >
            {/* Diagonal SVG Leader Line */}
            <svg width="45" height="35" style={{ overflow: "visible", flexShrink: 0 }}>
              <polyline
                points="0,35 25,8 45,8"
                fill="none"
                stroke="#D97E3A"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>

            {/* Floating Specs Text (Invisible Background) */}
            <div
              style={{
                marginLeft: "6px",
                color: "#111111",
                fontFamily: "'Segoe UI', Roboto, sans-serif",
                textShadow: "0 1px 4px rgba(255,255,255,0.95), 0 0 8px rgba(255,255,255,0.95)",
                lineHeight: "1.4",
              }}
            >
              <div
                style={{
                  fontSize: "1.1rem",
                  fontWeight: "700",
                  color: "#B86A2A",
                  textTransform: "capitalize",
                  borderBottom: "2px solid #D97E3A",
                  paddingBottom: "2px",
                  marginBottom: "4px",
                  letterSpacing: "0.5px",
                }}
              >
                {placement.category ? placement.category.replace("_", " ") : "Fixture"}
              </div>
              <div style={{ fontSize: "0.95rem", fontWeight: "700", color: "#333" }}>
                Name: <span style={{ fontWeight: "500", color: "#111" }}>{placement.model_name}</span>
              </div>
              {placement.price_inr && (
                <div style={{ fontSize: "0.95rem", fontWeight: "700", color: "#333" }}>
                  Price: <span style={{ fontWeight: "500", color: "#111" }}>₹ {placement.price_inr.toLocaleString("en-IN")}</span>
                </div>
              )}
              {placement.width_in && placement.depth_in && (
                <div style={{ fontSize: "0.95rem", fontWeight: "700", color: "#333" }}>
                  Dimensions: <span style={{ fontWeight: "500", color: "#111" }}>{placement.width_in}" x {placement.depth_in}"</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Html>
  );
}

function OBJProduct({ placement, isSelected, onClick }) {
  const { sku_code, category, x, y, width_in, depth_in, model_name, obj_file_path, platform_height_offset } = placement;
  const [model, setModel] = useState(null);

  const centerX = x + width_in / 2;
  const centerZ = y + depth_in / 2;
  const platformOffset = platform_height_offset || 0;

  useEffect(() => {
    if (obj_file_path) {
      const loader = new OBJLoader();
      loader.load(
        `${BASE_URL}/api/3d/${sku_code}.obj`,
        (object) => {
          const isVeil = (sku_code && (sku_code.includes("20704") || sku_code.includes("20703"))) || 
                         (model_name && model_name.toLowerCase().includes("veil"));

          if (isVeil) {
            // Veil 20704 is natively Y-up. No X rotation, align long axis on Y
            object.rotation.set(0, Math.PI / 2, 0);
          } else {
            // Standard CAD Z-up models (Reach, Span, etc.) rotate -90 deg on X
            object.rotation.x = -Math.PI / 2;
          }
          object.updateMatrixWorld(true);

          let box = new THREE.Box3().setFromObject(object);
          let size = box.getSize(new THREE.Vector3());

          if (!isVeil && category === 'washbasin' && size.x < size.z) {
            object.rotation.y += Math.PI / 2;
            object.updateMatrixWorld(true);
            box = new THREE.Box3().setFromObject(object);
            size = box.getSize(new THREE.Vector3());
          }

          const scale = Math.min(width_in / (size.x || 1), depth_in / (size.z || 1));
          object.scale.multiplyScalar(scale);

          const matColor = getProductColor(model_name);
          const isModernLife = model_name && model_name.toLowerCase().includes("modernlife");

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
        (error) => console.error(`Error loading ${obj_file_path}:`, error)
      );
    }
  }, [obj_file_path, sku_code, category, width_in, depth_in, model_name]);

  const handleClick = (e) => {
    e.stopPropagation();
    onClick(placement);
  };

  if (model) {
    return (
      <group position={[centerX, platformOffset, centerZ]} onClick={handleClick}>
        <primitive object={model} />
        {/* Hotspot dot with floating video-game callout */}
        <HotspotCallout
          position={[0, 22, 0]}
          placement={placement}
          isSelected={isSelected}
          onClick={() => onClick(placement)}
        />
      </group>
    );
  }

  return null;
}

function SimpleProduct({ placement, isSelected, onClick }) {
  const { x, y, width_in, depth_in, model_name, is_platform, is_placeholder, platform_height_offset } = placement;

  const centerX = x + width_in / 2;
  const centerZ = y + depth_in / 2;
  const platformOffset = platform_height_offset || 0;
  const height = is_platform ? (placement.height_in || 12) : (is_placeholder ? 2 : 18);

  const color = getProductColor(model_name);

  const handleClick = (e) => {
    e.stopPropagation();
    onClick(placement);
  };

  return (
    <group onClick={handleClick}>
      <mesh
        position={[centerX, platformOffset + height / 2, centerZ]}
        castShadow={!is_placeholder}
        receiveShadow
      >
        <boxGeometry args={[width_in, height, depth_in]} />
        <meshStandardMaterial
          color={is_placeholder ? "#D0CECB" : color}
          transparent={is_placeholder}
          opacity={is_placeholder ? 0.35 : 1.0}
        />
      </mesh>

      {/* Hotspot dot with floating video-game callout */}
      {!is_placeholder && (
        <HotspotCallout
          position={[centerX, platformOffset + height + 6, centerZ]}
          placement={placement}
          isSelected={isSelected}
          onClick={() => onClick(placement)}
        />
      )}
    </group>
  );
}

function CameraController() {
  const { camera } = useThree();
  const keysPressed = useRef({});
  const moveSpeed = 0.5;

  useEffect(() => {
    const handleKeyDown = (e) => {
      keysPressed.current[e.key.toLowerCase()] = true;
    };
    const handleKeyUp = (e) => {
      keysPressed.current[e.key.toLowerCase()] = false;
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  useFrame(() => {
    const keys = keysPressed.current;
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);

    if (keys["w"]) camera.position.addScaledVector(forward, moveSpeed);
    if (keys["s"]) camera.position.addScaledVector(forward, -moveSpeed);
    if (keys["a"]) camera.position.addScaledVector(right, -moveSpeed);
    if (keys["d"]) camera.position.addScaledVector(right, moveSpeed);
    if (keys["arrowup"] || keys[" "]) camera.position.y += moveSpeed;
    if (keys["arrowdown"]) camera.position.y -= moveSpeed;
  });

  return null;
}

export default function LayoutViewer3D({ layoutData, roomWidth, roomDepth, onProductClick }) {
  const [selectedSku, setSelectedSku] = useState(null);

  if (!layoutData || layoutData.length === 0) {
    return (
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        color: "#999",
      }}>
        No layout data available
      </div>
    );
  }

  const roomWidthIn = roomWidth * 12;
  const roomDepthIn = roomDepth * 12;

  const handleSelectProduct = (product) => {
    setSelectedSku(prev => (prev === product.sku_code ? null : product.sku_code));
    onProductClick?.(product);
  };

  const styles = {
    container: {
      display: "flex",
      flexDirection: "column",
      height: "100%",
      width: "100%",
      position: "relative",
    },
    canvas: {
      flex: 1,
      width: "100%",
    },
    controls: {
      padding: "14px 24px",
      backgroundColor: "#F5F5F5",
      borderTop: `2px solid #E8B4A0`,
      fontSize: "0.85rem",
      color: "#666",
    },
    controlsText: {
      margin: "0",
      lineHeight: "1.6",
    },
  };

  return (
    <div style={styles.container}>
      <Canvas
        style={styles.canvas}
        camera={{
          position: [roomWidthIn / 2, 70, roomDepthIn + 50],
          fov: 55,
        }}
        shadows
        onClick={() => setSelectedSku(null)}
      >
        {/* Lighting */}
        <ambientLight intensity={1.1} />
        <directionalLight
          position={[roomWidthIn / 2, 140, 40]}
          intensity={1.0}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
        />
        <directionalLight position={[-40, 60, -40]} intensity={0.4} />

        {/* Realistic Tiled Floor & Room Walls */}
        <Floor width={roomWidthIn} depth={roomDepthIn} />
        <RoomWalls width={roomWidthIn} depth={roomDepthIn} />

        {/* Products in 3D scene */}
        {layoutData.map((placement, idx) => {
          if (placement.category === 'faucet') return null; // Exclude faucets entirely from 3D visual scene
          const hasOBJ = placement.obj_file_path && placement.has_3d_model;
          const isSelected = selectedSku === placement.sku_code;

          return hasOBJ ? (
            <OBJProduct
              key={`obj-${idx}`}
              placement={placement}
              isSelected={isSelected}
              onClick={handleSelectProduct}
            />
          ) : (
            <SimpleProduct
              key={`simple-${idx}`}
              placement={placement}
              isSelected={isSelected}
              onClick={handleSelectProduct}
            />
          );
        })}

        {/* Camera Controller */}
        <CameraController />

        {/* Orbit Controls with Zoom Out Limits */}
        <OrbitControls
          makeDefault
          autoRotate={false}
          minDistance={20}
          maxDistance={180}
          maxPolarAngle={Math.PI / 2 - 0.02}
          dampingFactor={0.05}
          enableDamping
        />
      </Canvas>

      {/* Controls Info */}
      <div style={styles.controls}>
        <p style={styles.controlsText}>
          <strong>🎮 Controls:</strong> Click on any dot to pop open floating specs • Scroll to zoom (limited) • Mouse drag to rotate • W/A/S/D to move
        </p>
      </div>
    </div>
  );
}


