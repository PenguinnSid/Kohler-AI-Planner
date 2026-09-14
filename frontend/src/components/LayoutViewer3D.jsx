import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Html } from "@react-three/drei";
import { useEffect, useRef, useState, useMemo } from "react";
import * as THREE from "three";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { BASE_URL } from "../api/client";

const ORANGE = "#D97E3A";
const DARK_ORANGE = "#B86A2A";
const WHITE = "#FFFFFF";

// Product finish mapper: Pristine Pure White porcelain by default, Dark Turquoise for ModernLife Edge sink
function getProductColor(modelName) {
  const name = (modelName || "").toLowerCase();
  if (name.includes("modernlife") || name.includes("21226")) {
    return "#0F4C5C"; // Dark Turquoise accent
  }
  return "#FFFFFF"; // High-gloss Kohler Pure White Porcelain
}

// Helper to generate dynamic floor textures matching chosen floor theme
function createFloorTexture(floorTheme) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");

  const theme = (floorTheme || "").toLowerCase();

  if (theme.includes("slate")) {
    // Charcoal Slate Tile
    ctx.fillStyle = "#1E293B";
    ctx.fillRect(0, 0, 512, 512);
    ctx.strokeStyle = "#0F172A";
    ctx.lineWidth = 4;
    const tileSize = 256;
    for (let x = 0; x <= 512; x += tileSize) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 512); ctx.stroke();
    }
    for (let y = 0; y <= 512; y += tileSize) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(512, y); ctx.stroke();
    }
  } else if (theme.includes("wood")) {
    // Warm Bamboo Planks
    ctx.fillStyle = "#C59B6D";
    ctx.fillRect(0, 0, 512, 512);
    ctx.strokeStyle = "#9A7144";
    ctx.lineWidth = 3;
    for (let y = 0; y < 512; y += 64) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(512, y); ctx.stroke();
    }
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(100, 60, 20, 0.15)";
    for (let y = 8; y < 512; y += 16) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(512, y); ctx.stroke();
    }
  } else if (theme.includes("hex")) {
    // Hexagon Ceramic Tile
    ctx.fillStyle = "#E2E8F0";
    ctx.fillRect(0, 0, 512, 512);
    ctx.strokeStyle = "#CBD5E1";
    ctx.lineWidth = 2;
    const r = 32;
    for (let y = 0; y < 512 + r; y += r * 1.5) {
      for (let x = 0; x < 512 + r; x += r * Math.sqrt(3)) {
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const angle = (i * Math.PI) / 3;
          const px = x + r * Math.cos(angle);
          const py = y + r * Math.sin(angle);
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.stroke();
      }
    }
  } else if (theme.includes("concrete")) {
    // Matte Concrete
    ctx.fillStyle = "#64748B";
    ctx.fillRect(0, 0, 512, 512);
    ctx.fillStyle = "rgba(255,255,255,0.05)";
    for (let i = 0; i < 500; i++) {
      ctx.fillRect(Math.random() * 512, Math.random() * 512, 2, 2);
    }
  } else {
    // Carrara Marble floor tile (Default)
    ctx.fillStyle = "#EAE6DF";
    ctx.fillRect(0, 0, 512, 512);
    ctx.strokeStyle = "rgba(160, 150, 140, 0.35)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(20, 0); ctx.bezierCurveTo(100, 160, 220, 280, 512, 440);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, 180); ctx.bezierCurveTo(160, 220, 320, 80, 512, 140);
    ctx.stroke();

    ctx.lineWidth = 5;
    ctx.strokeStyle = "#C8C2B7";
    const tileSize = 128;
    for (let x = 0; x <= 512; x += tileSize) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 512); ctx.stroke();
    }
    for (let y = 0; y <= 512; y += tileSize) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(512, y); ctx.stroke();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

function Floor({ width, depth, floorTheme }) {
  const texture = useMemo(() => {
    const tex = createFloorTexture(floorTheme);
    tex.repeat.set(Math.max(1, width / 24), Math.max(1, depth / 24));
    return tex;
  }, [width, depth, floorTheme]);

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[width / 2, -0.1, depth / 2]} receiveShadow>
      <planeGeometry args={[width, depth]} />
      <meshStandardMaterial map={texture} roughness={0.2} metalness={0.05} />
    </mesh>
  );
}

// Dynamic 3D Vanity Mirror component (moves and auto-aligns to any wall based on 2D placement)
function VanityMirror({ washbasinPlacement, cabinetPlacement, mirrorPlacement, roomWidth, roomDepth }) {
  const targetObj = mirrorPlacement || cabinetPlacement || washbasinPlacement;
  if (!targetObj) return null;

  const targetX = targetObj.x || 0;
  const targetY = targetObj.y || 0;
  const targetW = targetObj.width_in || targetObj.w || 28;
  const targetH = targetObj.depth_in || targetObj.h || 3;

  const mirrorWidth = Math.max(16, targetW);
  const mirrorHeight = Math.max(22, mirrorWidth * 0.9);
  const mirrorY = 36 + mirrorHeight / 2;

  let posX = targetX + targetW / 2;
  let posZ = 0.4;
  let rotY = 0;

  const rotDeg = targetObj.rotation_deg || targetObj.rot || 0;
  const wallSnapSide = targetObj.wallSnapSide;

  const distTop = targetY;
  const distBottom = roomDepth - (targetY + targetH);
  const distLeft = targetX;
  const distRight = roomWidth - (targetX + targetW);

  const minDist = Math.min(distTop, distBottom, distLeft, distRight);

  if (wallSnapSide === "bottom" || rotDeg === 180 || (!wallSnapSide && minDist === distBottom && distBottom < 20)) {
    posX = targetX + targetW / 2;
    posZ = roomDepth - 0.4;
    rotY = Math.PI;
  } else if (wallSnapSide === "left" || rotDeg === 90 || (!wallSnapSide && minDist === distLeft && distLeft < 20)) {
    posX = 0.4;
    posZ = targetY + targetH / 2;
    rotY = Math.PI / 2;
  } else if (wallSnapSide === "right" || rotDeg === 270 || (!wallSnapSide && minDist === distRight && distRight < 20)) {
    posX = roomWidth - 0.4;
    posZ = targetY + targetH / 2;
    rotY = -Math.PI / 2;
  } else {
    // Back wall default
    posX = targetX + targetW / 2;
    posZ = 0.4;
    rotY = 0;
  }

  return (
    <group position={[posX, mirrorY, posZ]} rotation={[0, rotY, 0]}>
      {/* Metallic Silver Frame / Backing */}
      <mesh receiveShadow castShadow>
        <boxGeometry args={[mirrorWidth + 1.2, mirrorHeight + 1.2, 0.8]} />
        <meshStandardMaterial color="#CBD5E1" roughness={0.2} metalness={0.8} />
      </mesh>

      {/* High Reflection Mirror Glass Pane */}
      <mesh position={[0, 0, 0.45]}>
        <planeGeometry args={[mirrorWidth, mirrorHeight]} />
        <meshStandardMaterial
          color="#E2E8F0"
          roughness={0.01}
          metalness={0.98}
          emissive="#F1F5F9"
          emissiveIntensity={0.12}
        />
      </mesh>

      {/* Diagonal Specular Reflection Sheen Overlay */}
      <mesh position={[0, 0, 0.46]} rotation={[0, 0, -Math.PI / 6]}>
        <planeGeometry args={[mirrorWidth * 0.4, mirrorHeight * 1.3]} />
        <meshBasicMaterial
          color="#FFFFFF"
          transparent
          opacity={0.18}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Backlit Soft LED Frame Glow */}
      <mesh position={[0, 0, -0.05]}>
        <boxGeometry args={[mirrorWidth + 2.5, mirrorHeight + 2.5, 0.3]} />
        <meshBasicMaterial color="#DA9D49" transparent opacity={0.25} />
      </mesh>
    </group>
  );
}

// Backlit 3D Fake Bathroom Window
function FakeWindow({ windowPlacement, roomWidth, roomDepth }) {
  const widthIn = windowPlacement?.width_in || 40;
  const heightIn = 30;
  const posX = windowPlacement ? (windowPlacement.x + widthIn / 2) : (roomWidth / 2);
  const posZ = windowPlacement ? (windowPlacement.y + (windowPlacement.depth_in || 2) / 2) : 0.4;
  const rotY = ((windowPlacement?.rotation_deg || 0) * Math.PI) / 180;

  return (
    <group position={[posX, 56, posZ]} rotation={[0, rotY, 0]}>
      {/* Crisp Pure White Window Frame */}
      <mesh receiveShadow>
        <boxGeometry args={[widthIn + 4, heightIn + 4, 1]} />
        <meshStandardMaterial color="#FFFFFF" roughness={0.2} />
      </mesh>
      {/* Backlit Daylit Glass Pane */}
      <mesh position={[0, 0, 0.6]}>
        <planeGeometry args={[widthIn, heightIn]} />
        <meshStandardMaterial
          color="#E0F2FE"
          emissive="#7DD3FC"
          emissiveIntensity={0.8}
          roughness={0.1}
        />
      </mesh>
      {/* Window Grid Mullions */}
      <mesh position={[0, 0, 0.8]}>
        <boxGeometry args={[2, heightIn, 0.4]} />
        <meshStandardMaterial color="#FFFFFF" roughness={0.2} />
      </mesh>
      <mesh position={[0, 0, 0.8]}>
        <boxGeometry args={[widthIn, 2, 0.4]} />
        <meshStandardMaterial color="#FFFFFF" roughness={0.2} />
      </mesh>
    </group>
  );
}

// Architectural 3D Bathroom Door Component
function BathroomDoor({ doorPlacement, roomWidth, roomDepth }) {
  const widthIn = doorPlacement?.width_in || 32;
  const depthIn = doorPlacement?.depth_in || 4;
  const doorHeight = 84; // 7 feet tall
  const posX = doorPlacement ? (doorPlacement.x + widthIn / 2) : (roomWidth / 2);
  const posZ = doorPlacement ? (doorPlacement.y + depthIn / 2) : (roomDepth - 0.4);
  const rotY = ((doorPlacement?.rotation_deg || 0) * Math.PI) / 180;

  return (
    <group position={[posX, 0, posZ]} rotation={[0, rotY, 0]}>
      {/* Outer Walnut Wood Door Frame */}
      <mesh position={[0, doorHeight / 2, 0]} receiveShadow castShadow>
        <boxGeometry args={[widthIn + 4, doorHeight + 4, depthIn + 2]} />
        <meshStandardMaterial color="#3D2314" roughness={0.4} />
      </mesh>
      {/* Inner Smooth Wood Panel */}
      <mesh position={[0, doorHeight / 2, 0]} receiveShadow castShadow>
        <boxGeometry args={[widthIn, doorHeight, depthIn]} />
        <meshStandardMaterial color="#6E4729" roughness={0.3} />
      </mesh>
      {/* Brass Door Handle Lever */}
      <mesh position={[widthIn / 2 - 4, 42, depthIn / 2 + 1.2]} castShadow>
        <boxGeometry args={[4, 2, 3]} />
        <meshStandardMaterial color="#D97E3A" metalness={0.85} roughness={0.2} />
      </mesh>
    </group>
  );
}

// Dynamic Wall Texture & Aesthetics (Exact Room Square/Rectangular Box Geometry)
function RoomWalls({ width, depth, theme, wallTheme, wallSide, washbasinPlacement, cabinetPlacement, doorPlacement, windowPlacement, mirrorPlacement }) {
  const wallHeight = 120; // 10 feet tall
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");

    const wTheme = (wallTheme || theme || "").toLowerCase();

    if (wTheme.includes("marble")) {
      ctx.fillStyle = "#F4F2EE";
      ctx.fillRect(0, 0, 512, 512);

      ctx.strokeStyle = "rgba(160, 150, 140, 0.4)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, 50); ctx.bezierCurveTo(150, 120, 300, 400, 512, 480);
      ctx.stroke();

      ctx.lineWidth = 2;
      ctx.strokeStyle = "rgba(180, 172, 160, 0.5)";
      const tileH = 128;
      for (let y = 0; y <= 512; y += tileH) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(512, y); ctx.stroke();
      }
    } else if (wTheme.includes("wood")) {
      ctx.fillStyle = "#D8C4B6";
      ctx.fillRect(0, 0, 512, 512);

      ctx.fillStyle = "#8B5E34";
      for (let x = 0; x < 512; x += 64) {
        ctx.fillRect(x, 0, 8, 512);
      }
    } else if (wTheme.includes("slate")) {
      ctx.fillStyle = "#1E293B";
      ctx.fillRect(0, 0, 512, 512);
      ctx.strokeStyle = "#334155";
      ctx.lineWidth = 3;
      for (let y = 0; y <= 512; y += 64) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(512, y); ctx.stroke();
      }
    } else if (wTheme.includes("travertine") || wTheme.includes("stone")) {
      ctx.fillStyle = "#E5D3B3";
      ctx.fillRect(0, 0, 512, 512);
      ctx.strokeStyle = "rgba(180, 150, 110, 0.3)";
      ctx.lineWidth = 2;
      for (let y = 0; y <= 512; y += 96) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(512, y); ctx.stroke();
      }
    } else {
      // White Subway Tile (Default)
      ctx.fillStyle = "#FAFAFA";
      ctx.fillRect(0, 0, 512, 512);

      ctx.lineWidth = 2;
      ctx.strokeStyle = "#E2E8F0";
      const tileW = 128;
      const tileH = 64;
      for (let y = 0; y <= 512; y += tileH) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(512, y); ctx.stroke();
      }
      for (let y = 0; y <= 512; y += tileH) {
        const offsetX = (y / tileH) % 2 === 0 ? 0 : tileW / 2;
        for (let x = offsetX; x <= 512; x += tileW) {
          ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + tileH); ctx.stroke();
        }
      }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(Math.max(1, width / 48), wallHeight / 48);
    return tex;
  }, [width, depth, theme, wallTheme]);

  const baseboardColor = (wallTheme || theme || "").toLowerCase().includes("wood") ? "#6E4729" : ((wallTheme || theme || "").toLowerCase().includes("slate") ? "#334155" : "#FFFFFF");
  const sideMat = wallSide || THREE.FrontSide;

  return (
    <group>
      {/* Back Wall */}
      <mesh position={[width / 2, wallHeight / 2, 0]} receiveShadow>
        <planeGeometry args={[width, wallHeight]} />
        <meshStandardMaterial map={texture} roughness={0.4} side={sideMat} />
      </mesh>

      {/* Front Wall */}
      <mesh rotation={[0, Math.PI, 0]} position={[width / 2, wallHeight / 2, depth]} receiveShadow>
        <planeGeometry args={[width, wallHeight]} />
        <meshStandardMaterial map={texture} roughness={0.4} side={sideMat} />
      </mesh>

      {/* Left Wall */}
      <mesh rotation={[0, Math.PI / 2, 0]} position={[0, wallHeight / 2, depth / 2]} receiveShadow>
        <planeGeometry args={[depth, wallHeight]} />
        <meshStandardMaterial map={texture} roughness={0.4} side={sideMat} />
      </mesh>

      {/* Right Wall */}
      <mesh rotation={[0, -Math.PI / 2, 0]} position={[width, wallHeight / 2, depth / 2]} receiveShadow>
        <planeGeometry args={[depth, wallHeight]} />
        <meshStandardMaterial map={texture} roughness={0.4} side={sideMat} />
      </mesh>

      {/* Enclosed Ceiling */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[width / 2, wallHeight, depth / 2]}>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial color="#FAFAFA" roughness={0.3} side={sideMat} />
      </mesh>

      {/* Baseboard Border Flush with Walls */}
      <mesh position={[width / 2, 2, 0.5]}>
        <boxGeometry args={[width, 4, 1]} />
        <meshStandardMaterial color={baseboardColor} roughness={0.3} />
      </mesh>
      <mesh rotation={[0, Math.PI / 2, 0]} position={[0.5, 2, depth / 2]}>
        <boxGeometry args={[depth, 4, 1]} />
        <meshStandardMaterial color={baseboardColor} roughness={0.3} />
      </mesh>
      <mesh rotation={[0, Math.PI / 2, 0]} position={[width - 0.5, 2, depth / 2]}>
        <boxGeometry args={[depth, 4, 1]} />
        <meshStandardMaterial color={baseboardColor} roughness={0.3} />
      </mesh>

      {/* Dynamic Fake Bathroom Window */}
      <FakeWindow windowPlacement={windowPlacement} roomWidth={width} roomDepth={depth} />

      {/* Vanity Mirror mounted above Washbasin */}
      <VanityMirror washbasinPlacement={washbasinPlacement} cabinetPlacement={cabinetPlacement} roomWidth={width} roomDepth={depth} />

      {/* Architectural 3D Door */}
      <BathroomDoor doorPlacement={doorPlacement} roomWidth={width} roomDepth={depth} />
    </group>
  );
}

// Orange Hotspot Stub with Price Tag & Floating Callout + Left/Right Product Cycle Arrows
function OrangeHotspotStub({ position, placement, isSelected, onClick, onCycleProduct }) {
  const [hovered, setHovered] = useState(false);

  return (
    <Html position={position} center style={{ pointerEvents: "none", userSelect: "none" }}>
      <div style={{ position: "relative", pointerEvents: "auto" }}>
        <div
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          style={{
            position: "relative",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            cursor: "pointer",
          }}
        >
          <style>{`
            @keyframes hotspotPulse {
              0% {
                transform: scale(0.7);
                opacity: 0.95;
              }
              100% {
                transform: scale(2.3);
                opacity: 0;
              }
            }
          `}</style>
          <div
            style={{
              position: "relative",
              width: "28px",
              height: "28px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {!hovered && !isSelected && (
              <div
                style={{
                  position: "absolute",
                  width: "18px",
                  height: "18px",
                  borderRadius: "50%",
                  border: "2px solid #D97E3A",
                  backgroundColor: "rgba(217, 126, 58, 0.35)",
                  animation: "hotspotPulse 1.8s infinite cubic-bezier(0.215, 0.61, 0.355, 1)",
                  pointerEvents: "none",
                }}
              />
            )}
            <div
              style={{
                position: "absolute",
                width: hovered || isSelected ? "30px" : "18px",
                height: hovered || isSelected ? "30px" : "18px",
                borderRadius: "50%",
                border: "2.5px solid #D97E3A",
                backgroundColor: "rgba(217, 126, 58, 0.25)",
                boxShadow: hovered || isSelected ? "0 0 14px rgba(217,126,58,0.9)" : "none",
                transition: "all 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
              }}
            />
            <div
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                backgroundColor: "#D97E3A",
                zIndex: 2,
              }}
            />
          </div>
        </div>

        {/* Floating Callout Card matching screenshot format + Left & Right Cycle Arrows */}
        {isSelected && (
          <div
            style={{
              position: "absolute",
              left: "24px",
              bottom: "16px",
              display: "flex",
              alignItems: "flex-end",
              pointerEvents: "auto",
              minWidth: "250px",
            }}
          >
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

            <div
              style={{
                marginLeft: "6px",
                color: "#FFFFFF",
                fontFamily: "'Segoe UI', Roboto, sans-serif",
                textShadow: "0 2px 8px rgba(0,0,0,0.98), 0 0 12px rgba(0,0,0,0.95)",
                lineHeight: "1.5",
                backgroundColor: "transparent",
                border: "none",
                padding: "2px 6px",
              }}
            >
              {/* Category Header Title in Orange */}
              <div
                style={{
                  borderBottom: "2px solid #D97E3A",
                  paddingBottom: "4px",
                  marginBottom: "6px",
                }}
              >
                <div
                  style={{
                    fontSize: "1.1rem",
                    fontWeight: "800",
                    color: "#D97E3A",
                    textTransform: "uppercase",
                    letterSpacing: "0.8px",
                  }}
                >
                  {placement.category ? (
                    placement.category.toLowerCase().includes("washbasin") || placement.category.toLowerCase().includes("wash_basin")
                      ? "Wash Basin"
                      : placement.category.replace("_", " ")
                  ) : "Fixture"}
                </div>
              </div>

              <div style={{ fontSize: "0.95rem", fontWeight: "700", color: "#FFFFFF" }}>
                Name: <span style={{ fontWeight: "400", color: "#FFFFFF" }}>{placement.model_name}</span>
              </div>
              {placement.price_inr && (
                <div style={{ fontSize: "0.95rem", fontWeight: "700", color: "#FFFFFF" }}>
                  Price: <span style={{ fontWeight: "400", color: "#FFFFFF" }}>₹ {placement.price_inr.toLocaleString("en-IN")}</span>
                </div>
              )}
              {placement.width_in && placement.depth_in && (
                <div style={{ fontSize: "0.95rem", fontWeight: "700", color: "#FFFFFF" }}>
                  Dimensions: <span style={{ fontWeight: "400", color: "#FFFFFF" }}>{placement.width_in}" W x {placement.depth_in}" D</span>
                </div>
              )}
              {placement.seat_included && (
                <div style={{ fontSize: "0.85rem", color: "#FFFFFF", fontWeight: "600", marginTop: "2px" }}>
                  Quiet-Close Seat Included
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Html>
  );
}

function OBJProduct({ placement, isSelected, onClick, onCycleProduct }) {
  const { sku_code, category, x, y, width_in, depth_in, model_name, obj_file_path, platform_height_offset } = placement;
  const [model, setModel] = useState(null);

  const wIn = Number(width_in) || 16;
  const dIn = Number(depth_in) || 16;
  const centerX = (Number(x) || 0) + wIn / 2;
  const centerZ = (Number(y) || 0) + dIn / 2;
  const platformOffset = Number(platform_height_offset) || 0;
  const isCatalogueItem = ['toilet', 'toilet_seat', 'washbasin', 'wash_basin', 'bathtub'].includes((category || '').toLowerCase());

  useEffect(() => {
    let isSubscribed = true;
    if (obj_file_path && sku_code) {
      const loader = new OBJLoader();
      loader.load(
        `${BASE_URL}/api/3d/${sku_code}.obj`,
        (object) => {
          if (!isSubscribed || !object) return;

          const isVeil20704 = sku_code && sku_code.includes("20704");
          const isVeil20703 = sku_code && sku_code.includes("20703");

          if (isVeil20704) {
            object.rotation.set(0, 0, 0);
          } else {
            object.rotation.x = -Math.PI / 2;
          }
          object.updateMatrixWorld(true);

          let box = new THREE.Box3().setFromObject(object);
          let size = box.getSize(new THREE.Vector3());

          // Defensive check against empty/corrupted OBJ models or 404 HTML text parsing
          if (!size || isNaN(size.x) || isNaN(size.z) || size.x <= 0 || size.z <= 0 || !isFinite(size.x) || !isFinite(size.z)) {
            console.warn(`Loaded OBJ model ${sku_code} has invalid geometry bounds. Fallback to procedural 3D block.`);
            return;
          }

          if (!isVeil20704 && (category === 'washbasin' || category === 'wash_basin') && size.x < size.z) {
            object.rotation.y += Math.PI / 2;
            object.updateMatrixWorld(true);
            box = new THREE.Box3().setFromObject(object);
            size = box.getSize(new THREE.Vector3());
          }

          const scale = Math.min(wIn / (size.x || 1), dIn / (size.z || 1));
          const center = box.getCenter(new THREE.Vector3());

          if (isNaN(center.x) || isNaN(center.y) || isNaN(center.z) || !isFinite(center.x)) {
            return;
          }

          object.position.x = -center.x * scale;
          object.position.y = -box.min.y * scale;
          object.position.z = -center.z * scale;

          object.scale.set(scale, scale, scale);

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
          if (isSubscribed) {
            setModel(group);
          }
        },
        undefined,
        (error) => console.warn(`Error loading OBJ model ${sku_code}:`, error)
      );
    }
    return () => { isSubscribed = false; };
  }, [obj_file_path, sku_code, category, wIn, dIn, model_name]);

  const handleClick = (e) => {
    e.stopPropagation();
    if (isCatalogueItem) {
      onClick(placement);
    }
  };

  if (model) {
    return (
      <group
        position={[centerX, platformOffset, centerZ]}
        rotation={[0, ((placement.rotation_deg || 0) * Math.PI) / 180, 0]}
        onClick={handleClick}
      >
        <primitive object={model} />
        {isCatalogueItem && (
          <OrangeHotspotStub
            position={[0, 22, 0]}
            placement={placement}
            isSelected={isSelected}
            onClick={() => onClick(placement)}
            onCycleProduct={onCycleProduct}
          />
        )}
      </group>
    );
  }

  // Fallback to robust procedural 3D block if OBJ model is loading, null, or unavailable
  return (
    <SimpleProduct
      placement={placement}
      isSelected={isSelected}
      onClick={onClick}
      onCycleProduct={onCycleProduct}
    />
  );
}

function SimpleProduct({ placement, isSelected, onClick, onCycleProduct }) {
  const { x, y, width_in, depth_in, model_name, is_platform, is_placeholder, platform_height_offset, rotation_deg, category } = placement;

  const centerX = x + width_in / 2;
  const centerZ = y + depth_in / 2;
  const platformOffset = platform_height_offset || 0;
  const height = is_platform ? (placement.height_in || 12) : (is_placeholder ? 2 : 18);
  const isCatalogueItem = ['toilet', 'toilet_seat', 'washbasin', 'wash_basin', 'bathtub'].includes((category || '').toLowerCase());

  const handleClick = (e) => {
    e.stopPropagation();
    if (!is_platform && isCatalogueItem) {
      onClick(placement);
    }
  };

  if (is_platform) {
    const countertopHeight = 1.5;
    const cabinetHeight = Math.max(1, height - countertopHeight);
    return (
      <group
        position={[centerX, platformOffset, centerZ]}
        rotation={[0, ((rotation_deg || 0) * Math.PI) / 180, 0]}
      >
        {/* Off-White Cabinet Base */}
        <mesh
          position={[0, cabinetHeight / 2, 0]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[width_in, cabinetHeight, depth_in]} />
          <meshStandardMaterial color="#F5F5F0" roughness={0.3} />
        </mesh>
        {/* Polished Black Granite / Marble Counter Top Slab */}
        <mesh
          position={[0, cabinetHeight + countertopHeight / 2, 0]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[width_in + 1.2, countertopHeight, depth_in + 1.2]} />
          <meshStandardMaterial color="#111111" roughness={0.12} metalness={0.25} />
        </mesh>
      </group>
    );
  }

  const color = getProductColor(model_name);

  return (
    <group
      position={[centerX, platformOffset, centerZ]}
      rotation={[0, ((rotation_deg || 0) * Math.PI) / 180, 0]}
      onClick={handleClick}
    >
      <mesh
        position={[0, height / 2, 0]}
        castShadow={!is_placeholder}
        receiveShadow
      >
        <boxGeometry args={[width_in, height, depth_in]} />
        <meshStandardMaterial
          color={is_placeholder ? "#313B4A" : color}
          transparent={is_placeholder}
          opacity={is_placeholder ? 0.35 : 1.0}
        />
      </mesh>

      {!is_placeholder && !is_platform && isCatalogueItem && (
        <OrangeHotspotStub
          position={[0, height + 6, 0]}
          placement={placement}
          isSelected={isSelected}
          onClick={() => onClick(placement)}
          onCycleProduct={onCycleProduct}
        />
      )}
    </group>
  );
}

// Smooth Time-Based Camera Animation Controller
function CameraRig({ targetCamera, defaultOrbitTarget, defaultCameraPos, onResetComplete }) {
  const { camera, controls } = useThree();
  const animRef = useRef(null);

  useEffect(() => {
    if (targetCamera && targetCamera.pos && targetCamera.target) {
      const path = targetCamera.inspectionPath;

      if (path && path.startPos && path.endPos) {
        animRef.current = {
          startPos: path.startPos.clone(),
          startTarget: path.startTarget.clone(),
          endPos: path.endPos.clone(),
          endTarget: path.endTarget.clone(),
          startTime: performance.now(),
          duration: 1100, // 1.1s smooth transition
          isResetting: !!targetCamera.isResetting,
        };
      } else {
        const activeControls = controls || camera.controls;
        const currentTarget = activeControls?.target ? activeControls.target.clone() : defaultOrbitTarget.clone();
        animRef.current = {
          startPos: camera.position.clone(),
          startTarget: currentTarget,
          endPos: targetCamera.pos.clone(),
          endTarget: targetCamera.target.clone(),
          startTime: performance.now(),
          duration: 1100,
          isResetting: !!targetCamera.isResetting,
        };
      }
    }
  }, [targetCamera, camera, controls, defaultOrbitTarget]);

  useFrame(() => {
    if (!animRef.current) return;

    const { startPos, startTarget, endPos, endTarget, startTime, duration, isResetting } = animRef.current;
    const elapsed = performance.now() - startTime;
    const progress = Math.min(1, Math.max(0, elapsed / duration));

    const t = isResetting ? (1 - progress) : progress;
    const easeT = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    camera.position.lerpVectors(startPos, endPos, easeT);

    const activeControls = controls || camera.controls;
    if (activeControls && activeControls.target) {
      activeControls.target.lerpVectors(startTarget, endTarget, easeT);
      activeControls.update();
    }

    if (progress >= 1) {
      animRef.current = null;
      if (isResetting) {
        if (activeControls && activeControls.target) {
          activeControls.target.copy(startTarget);
          activeControls.update();
        }
        onResetComplete?.();
      }
    }
  });

  return null;
}

// Sub-component inside Canvas to access Three.js camera & controls refs
function SceneContent({ layoutData, roomWidthIn, roomDepthIn, aestheticTheme, floorTheme, wallTheme, isZoomLocked, selectedCategory, selectedSku, customCameraTarget, handleSelectProduct, onCycleProduct, onResetComplete }) {
  const { camera, controls } = useThree();

  const washbasinPlacement = layoutData.find(p => p.category === 'washbasin' || p.category === 'wash_basin');
  const cabinetPlacement = layoutData.find(p => p.category === 'sink_platform' || p.category === 'cabinet');
  const doorPlacement = layoutData.find(p => p.category === 'door');
  const windowPlacement = layoutData.find(p => p.category === 'window');
  const mirrorPlacement = layoutData.find(p => p.category === 'mirror');

  const defaultOrbitTarget = useMemo(() => {
    return new THREE.Vector3(roomWidthIn / 2, 26, roomDepthIn / 2);
  }, [roomWidthIn, roomDepthIn]);

  const defaultCameraPos = useMemo(() => {
    return new THREE.Vector3(roomWidthIn / 2, 105, roomDepthIn * 2.2);
  }, [roomWidthIn, roomDepthIn]);

  const isInspecting = customCameraTarget && !customCameraTarget.isResetting;

  return (
    <>
      <ambientLight intensity={0.95} color="#FFFFFF" />
      <pointLight
        position={[roomWidthIn * 0.35, 105, roomDepthIn * 0.35]}
        intensity={1.2}
        color="#FFF7ED"
        distance={300}
      />
      <pointLight
        position={[roomWidthIn * 0.65, 105, roomDepthIn * 0.65]}
        intensity={1.2}
        color="#FFF7ED"
        distance={300}
      />
      <directionalLight
        position={[roomWidthIn / 2, 110, roomDepthIn / 2]}
        intensity={0.8}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />

      <Floor width={roomWidthIn} depth={roomDepthIn} floorTheme={floorTheme || aestheticTheme} />
      <RoomWalls
        width={roomWidthIn}
        depth={roomDepthIn}
        theme={aestheticTheme}
        wallTheme={wallTheme}
        wallSide={THREE.FrontSide}
        washbasinPlacement={washbasinPlacement}
        cabinetPlacement={cabinetPlacement}
        doorPlacement={doorPlacement}
        windowPlacement={windowPlacement}
        mirrorPlacement={mirrorPlacement}
      />

      {layoutData.map((placement, idx) => {
        if (placement.category === 'faucet' || placement.category === 'door' || placement.category === 'window' || placement.category === 'mirror') return null;
        const hasOBJ = placement.obj_file_path && placement.has_3d_model;

        const pCat = (placement.category || "").toLowerCase().replace("wash_basin", "washbasin");
        const isSelected = selectedCategory
          ? pCat === selectedCategory
          : selectedSku === placement.sku_code;

        let itemRot = placement.rotation_deg || 0;
        if (!placement.rotation_deg) {
          const cX = placement.x + (placement.width_in / 2);
          const cZ = placement.y + (placement.depth_in / 2);
          const distBack = cZ;
          const distFront = roomDepthIn - cZ;
          const distLeft = cX;
          const distRight = roomWidthIn - cX;
          const minDist = Math.min(distBack, distFront, distLeft, distRight);

          if (minDist === distLeft) itemRot = 90;
          else if (minDist === distRight) itemRot = 270;
          else if (minDist === distFront) itemRot = 180;
          else itemRot = 0;
        }

        const placementWithRot = { ...placement, rotation_deg: itemRot };

        return hasOBJ ? (
          <OBJProduct
            key={`obj-${idx}`}
            placement={placementWithRot}
            isSelected={isSelected}
            onClick={(p) => handleSelectProduct(p, camera, controls)}
            onCycleProduct={onCycleProduct}
          />
        ) : (
          <SimpleProduct
            key={`simple-${idx}`}
            placement={placementWithRot}
            isSelected={isSelected}
            onClick={(p) => handleSelectProduct(p, camera, controls)}
            onCycleProduct={onCycleProduct}
          />
        );
      })}

      <CameraRig
        targetCamera={customCameraTarget}
        defaultOrbitTarget={defaultOrbitTarget}
        defaultCameraPos={defaultCameraPos}
        onResetComplete={onResetComplete}
      />

      <OrbitControls
        makeDefault
        target={isInspecting ? customCameraTarget.target : defaultOrbitTarget}
        autoRotate={false}
        enableZoom={!isInspecting && !isZoomLocked}
        enablePan={false}
        enableRotate={!isInspecting}
        rotateSpeed={-0.5}
        minDistance={10}
        maxDistance={450}
        minPolarAngle={0.05}
        maxPolarAngle={Math.PI / 2 + 0.1}
      />
    </>
  );
}

export default function LayoutViewer3D({ layoutData, roomWidth, roomDepth, roomHeight, aestheticTheme, floorTheme, wallTheme, onProductClick, onCycleProduct }) {
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedSku, setSelectedSku] = useState(null);
  const [isZoomLocked, setIsZoomLocked] = useState(false);
  const [customCameraTarget, setCustomCameraTarget] = useState(null);
  const inspectionPathRef = useRef(null);

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

  const defaultCameraPos = useMemo(() => {
    return new THREE.Vector3(roomWidthIn / 2, 105, roomDepthIn * 2.2);
  }, [roomWidthIn, roomDepthIn]);

  const defaultOrbitTarget = useMemo(() => {
    return new THREE.Vector3(roomWidthIn / 2, 26, roomDepthIn / 2);
  }, [roomWidthIn, roomDepthIn]);

  const handleResetCamera = () => {
    const path = inspectionPathRef.current;
    const targetPos = path ? path.startPos : defaultCameraPos;
    const targetOrbit = path ? path.startTarget : defaultOrbitTarget;

    setSelectedCategory(null);
    setSelectedSku(null);
    setCustomCameraTarget({
      pos: targetPos,
      target: targetOrbit,
      isResetting: true,
      inspectionPath: path,
    });
    onProductClick?.(null);
  };

  const handleSelectProduct = (product, camera, controls) => {
    const isCatalogueItem = ['toilet', 'toilet_seat', 'washbasin', 'wash_basin', 'bathtub'].includes((product.category || '').toLowerCase());
    if (!isCatalogueItem) return;

    const normCat = (product.category || "").toLowerCase().replace("wash_basin", "washbasin");

    if (selectedCategory === normCat) {
      handleResetCamera();
      return;
    }

    const cat = (product.category || "").toLowerCase();
    const cX = product.x + (product.width_in / 2);
    const cZ = product.y + (product.depth_in / 2);
    const pOffset = product.platform_height_offset || 0;

    let target = new THREE.Vector3(cX, pOffset + 12, cZ);

    const distBack = cZ;
    const distFront = roomDepthIn - cZ;
    const distLeft = cX;
    const distRight = roomWidthIn - cX;
    const minDist = Math.min(distBack, distFront, distLeft, distRight);

    let pos;
    const camOffsetDist = cat === 'bathtub' ? 52 : 44;
    const eyeHeight = pOffset + (cat === 'bathtub' ? 32 : 24);

    if (minDist === distFront) {
      pos = new THREE.Vector3(cX, eyeHeight, Math.max(12, cZ - camOffsetDist));
    } else if (minDist === distLeft) {
      pos = new THREE.Vector3(Math.min(roomWidthIn - 12, cX + camOffsetDist), eyeHeight, cZ);
    } else if (minDist === distRight) {
      pos = new THREE.Vector3(Math.max(12, cX - camOffsetDist), eyeHeight, cZ);
    } else {
      pos = new THREE.Vector3(cX, eyeHeight, Math.min(roomDepthIn - 12, cZ + camOffsetDist));
    }

    // Preserve the original pre-inspection camera angle & distance
    const prevPath = inspectionPathRef.current;
    const startPos = prevPath ? prevPath.startPos : (camera ? camera.position.clone() : defaultCameraPos.clone());
    const startTarget = prevPath ? prevPath.startTarget : ((controls && controls.target) ? controls.target.clone() : defaultOrbitTarget.clone());

    inspectionPathRef.current = {
      startPos,
      startTarget,
      endPos: pos,
      endTarget: target,
    };

    setSelectedCategory(normCat);
    setSelectedSku(product.sku_code);
    setCustomCameraTarget({
      pos,
      target,
      isResetting: false,
      inspectionPath: inspectionPathRef.current,
    });
    onProductClick?.(product);
  };

  const isInspecting = customCameraTarget && !customCameraTarget.isResetting;

  const styles = {
    container: {
      display: "flex",
      flexDirection: "column",
      height: "750px",
      minHeight: "750px",
      width: "100%",
      position: "relative",
      backgroundColor: "#08090C",
    },
    canvas: {
      flex: "1 1 auto",
      width: "100%",
      height: "700px",
      minHeight: "700px",
    },
    controls: {
      padding: "12px 24px",
      backgroundColor: "#10141D",
      borderTop: `2px solid #DA9D49`,
      fontSize: "0.85rem",
      color: "#94A3B8",
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
          position: [defaultCameraPos.x, defaultCameraPos.y, defaultCameraPos.z],
          fov: 55,
        }}
        shadows
      >
        <SceneContent
          layoutData={layoutData}
          roomWidthIn={roomWidthIn}
          roomDepthIn={roomDepthIn}
          aestheticTheme={aestheticTheme}
          floorTheme={floorTheme}
          wallTheme={wallTheme}
          isZoomLocked={isZoomLocked}
          selectedCategory={selectedCategory}
          selectedSku={selectedSku}
          customCameraTarget={customCameraTarget}
          handleSelectProduct={handleSelectProduct}
          onCycleProduct={onCycleProduct}
          onResetComplete={() => {
            setCustomCameraTarget(null);
            inspectionPathRef.current = null;
          }}
        />
      </Canvas>

      {/* Floating Left & Right Screen Orange Arrows to Cycle Product Designs */}
      {selectedCategory && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onCycleProduct?.(selectedCategory, -1);
            }}
            title="Previous Design"
            style={{
              position: "absolute",
              left: "24px",
              top: "50%",
              transform: "translateY(-50%)",
              zIndex: 25,
              width: "56px",
              height: "56px",
              borderRadius: "50%",
              backgroundColor: "#D97E3A",
              color: "#FFFFFF",
              border: "2.5px solid #FFD166",
              cursor: "pointer",
              fontSize: "2.2rem",
              fontWeight: "900",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 6px 24px rgba(217, 126, 58, 0.7), 0 0 20px rgba(0,0,0,0.8)",
              transition: "all 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
              userSelect: "none",
              outline: "none",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-50%) scale(1.14)";
              e.currentTarget.style.backgroundColor = "#F5B054";
              e.currentTarget.style.boxShadow = "0 8px 30px rgba(245, 176, 84, 0.9)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(-50%) scale(1)";
              e.currentTarget.style.backgroundColor = "#D97E3A";
              e.currentTarget.style.boxShadow = "0 6px 24px rgba(217, 126, 58, 0.7)";
            }}
          >
            ‹
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onCycleProduct?.(selectedCategory, 1);
            }}
            title="Next Design"
            style={{
              position: "absolute",
              right: "24px",
              top: "50%",
              transform: "translateY(-50%)",
              zIndex: 25,
              width: "56px",
              height: "56px",
              borderRadius: "50%",
              backgroundColor: "#D97E3A",
              color: "#FFFFFF",
              border: "2.5px solid #FFD166",
              cursor: "pointer",
              fontSize: "2.2rem",
              fontWeight: "900",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 6px 24px rgba(217, 126, 58, 0.7), 0 0 20px rgba(0,0,0,0.8)",
              transition: "all 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
              userSelect: "none",
              outline: "none",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-50%) scale(1.14)";
              e.currentTarget.style.backgroundColor = "#F5B054";
              e.currentTarget.style.boxShadow = "0 8px 30px rgba(245, 176, 84, 0.9)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(-50%) scale(1)";
              e.currentTarget.style.backgroundColor = "#D97E3A";
              e.currentTarget.style.boxShadow = "0 6px 24px rgba(217, 126, 58, 0.7)";
            }}
          >
            ›
          </button>
        </>
      )}

      {/* Floating Action Button Group (Bottom Right) */}
      <div style={{
        position: "absolute",
        bottom: "55px",
        right: "24px",
        zIndex: 10,
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        alignItems: "flex-end",
      }}>
        {/* Lock Zoom Toggle Button */}
        <button
          type="button"
          onClick={() => setIsZoomLocked(!isZoomLocked)}
          style={{
            backgroundColor: isZoomLocked ? "#DA9D49" : "rgba(16, 20, 29, 0.9)",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
            color: isZoomLocked ? "#08090C" : "#DA9D49",
            border: "1.5px solid #DA9D49",
            borderRadius: "8px",
            padding: "9px 18px",
            fontSize: "0.85rem",
            fontWeight: "700",
            cursor: "pointer",
            boxShadow: "0 4px 16px rgba(0,0,0,0.6)",
            transition: "all 0.25s ease",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
          onMouseEnter={(e) => {
            if (!isZoomLocked) {
              e.currentTarget.style.backgroundColor = "#DA9D49";
              e.currentTarget.style.color = "#08090C";
            }
          }}
          onMouseLeave={(e) => {
            if (!isZoomLocked) {
              e.currentTarget.style.backgroundColor = "rgba(16, 20, 29, 0.9)";
              e.currentTarget.style.color = "#DA9D49";
            }
          }}
        >
          {isZoomLocked ? "Zoom Locked" : "Lock Zoom"}
        </button>

        {/* Reset View Button */}
        <button
          type="button"
          onClick={handleResetCamera}
          style={{
            backgroundColor: "rgba(15, 23, 42, 0.85)",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
            color: "#FFFFFF",
            border: "1px solid rgba(217, 126, 58, 0.7)",
            borderRadius: "8px",
            padding: "8px 16px",
            fontSize: "0.85rem",
            fontWeight: "700",
            cursor: "pointer",
            boxShadow: "0 4px 14px rgba(0,0,0,0.5)",
            transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "rgba(217, 126, 58, 0.85)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "rgba(15, 23, 42, 0.85)";
          }}
        >
          Reset View
        </button>
      </div>
    </div>
  );
}

