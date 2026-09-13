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

// Helper to generate dynamic floor textures matching the chosen theme
function createFloorTexture(theme) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");

  const isZen = theme === "Japanese Zen";
  const isClassic = theme === "Classic Luxury";

  if (isZen) {
    // Warm natural wood/bamboo plank floor
    ctx.fillStyle = "#C59B6D";
    ctx.fillRect(0, 0, 512, 512);

    ctx.strokeStyle = "#B38758";
    ctx.lineWidth = 3;
    for (let y = 0; y < 512; y += 64) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(512, y); ctx.stroke();
    }
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(120, 80, 40, 0.15)";
    for (let y = 8; y < 512; y += 16) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(512, y); ctx.stroke();
    }
  } else if (isClassic) {
    // Polished Carrara Marble floor tile
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
  } else {
    // Minimalist Modern light matte grey ceramic tile
    ctx.fillStyle = "#E5E7EB";
    ctx.fillRect(0, 0, 512, 512);

    ctx.lineWidth = 4;
    ctx.strokeStyle = "#D1D5DB";
    const tileSize = 256;
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

function Floor({ width, depth, theme }) {
  const texture = useMemo(() => {
    const tex = createFloorTexture(theme);
    tex.repeat.set(Math.max(1, width / 24), Math.max(1, depth / 24));
    return tex;
  }, [width, depth, theme]);

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[width / 2, -0.1, depth / 2]} receiveShadow>
      <planeGeometry args={[width + 60, depth + 60]} />
      <meshStandardMaterial map={texture} roughness={0.2} metalness={0.05} />
    </mesh>
  );
}



// Vanity Mirror mounted above Washbasin
function VanityMirror({ washbasinPlacement, roomWidth, roomDepth }) {
  if (!washbasinPlacement) return null;
  const { x, y, width_in, depth_in } = washbasinPlacement;
  const centerX = x + width_in / 2;
  const centerZ = y + depth_in / 2;
  const mirrorWidth = Math.max(20, width_in * 0.9);
  const mirrorHeight = Math.max(28, mirrorWidth * 1.25);
  // Bottom of mirror starts 6" above sink counter top (~30"), so center Y = 36 + mirrorHeight / 2
  const mirrorY = 36 + mirrorHeight / 2;

  // Calculate distance from sink center to each of the 4 walls
  const distBack = centerZ;
  const distFront = roomDepth - centerZ;
  const distLeft = centerX;
  const distRight = roomWidth - centerX;

  const minDist = Math.min(distBack, distFront, distLeft, distRight);

  let posX = centerX;
  let posZ = 0.4;
  let rotY = 0;

  if (minDist === distLeft) {
    // Left Wall
    posX = 0.4;
    posZ = centerZ;
    rotY = Math.PI / 2;
  } else if (minDist === distRight) {
    // Right Wall
    posX = roomWidth - 0.4;
    posZ = centerZ;
    rotY = -Math.PI / 2;
  } else if (minDist === distFront) {
    // Front Wall
    posX = centerX;
    posZ = roomDepth - 0.4;
    rotY = Math.PI;
  } else {
    // Back Wall (default)
    posX = centerX;
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
          color="#F8FAFC"
          roughness={0.03}
          metalness={0.95}
          emissive="#FFFFFF"
          emissiveIntensity={0.08}
        />
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

// Dynamic Wall Texture & Aesthetics matching Theme (Fully Enclosed Room: 4 Walls + Ceiling)
function RoomWalls({ width, depth, theme, washbasinPlacement, doorPlacement, windowPlacement }) {
  const wallHeight = 120; // 10 feet tall
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");

    const isZen = theme === "Japanese Zen";
    const isClassic = theme === "Classic Luxury";

    if (isClassic) {
      ctx.fillStyle = "#F4F2EE";
      ctx.fillRect(0, 0, 512, 512);

      ctx.strokeStyle = "rgba(160, 150, 140, 0.4)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, 50); ctx.bezierCurveTo(150, 120, 300, 400, 512, 480);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(100, 0); ctx.bezierCurveTo(200, 200, 350, 100, 512, 300);
      ctx.stroke();

      ctx.lineWidth = 3;
      ctx.strokeStyle = "rgba(180, 172, 160, 0.6)";
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
    } else if (isZen) {
      ctx.fillStyle = "#D8C4B6";
      ctx.fillRect(0, 0, 512, 512);

      ctx.fillStyle = "#8B5E34";
      for (let x = 0; x < 512; x += 128) {
        ctx.fillRect(x, 0, 12, 512);
      }
      ctx.lineWidth = 2;
      ctx.strokeStyle = "rgba(100, 70, 40, 0.15)";
      for (let y = 0; y < 512; y += 32) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(512, y); ctx.stroke();
      }
    } else {
      ctx.fillStyle = "#FAFAFA";
      ctx.fillRect(0, 0, 512, 512);

      ctx.lineWidth = 2;
      ctx.strokeStyle = "#E5E7EB";
      for (let y = 0; y <= 512; y += 128) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(512, y); ctx.stroke();
      }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(Math.max(1, (width + 100) / 48), wallHeight / 48);
    return tex;
  }, [width, depth, theme]);

  const baseboardColor = theme === "Japanese Zen" ? "#6E4729" : (theme === "Classic Luxury" ? "#E2E8F0" : "#FFFFFF");

  return (
    <group>
      {/* Back Wall */}
      <mesh position={[width / 2, wallHeight / 2, -0.5]} receiveShadow>
        <planeGeometry args={[width + 40, wallHeight]} />
        <meshStandardMaterial map={texture} roughness={0.4} side={THREE.DoubleSide} />
      </mesh>

      {/* Front Wall */}
      <mesh rotation={[0, Math.PI, 0]} position={[width / 2, wallHeight / 2, depth + 0.5]} receiveShadow>
        <planeGeometry args={[width + 40, wallHeight]} />
        <meshStandardMaterial map={texture} roughness={0.4} side={THREE.DoubleSide} />
      </mesh>

      {/* Left Wall */}
      <mesh rotation={[0, Math.PI / 2, 0]} position={[-0.5, wallHeight / 2, depth / 2]} receiveShadow>
        <planeGeometry args={[depth + 40, wallHeight]} />
        <meshStandardMaterial map={texture} roughness={0.4} side={THREE.DoubleSide} />
      </mesh>

      {/* Right Wall */}
      <mesh rotation={[0, -Math.PI / 2, 0]} position={[width + 0.5, wallHeight / 2, depth / 2]} receiveShadow>
        <planeGeometry args={[depth + 40, wallHeight]} />
        <meshStandardMaterial map={texture} roughness={0.4} side={THREE.DoubleSide} />
      </mesh>

      {/* Enclosed Ceiling */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[width / 2, wallHeight + 0.5, depth / 2]}>
        <planeGeometry args={[width + 40, depth + 40]} />
        <meshStandardMaterial color="#FAFAFA" roughness={0.3} side={THREE.DoubleSide} />
      </mesh>

      {/* Baseboard Border around 4 walls */}
      <mesh position={[width / 2, 2, 0.2]}>
        <boxGeometry args={[width + 40, 4, 1]} />
        <meshStandardMaterial color={baseboardColor} roughness={0.3} />
      </mesh>
      <mesh rotation={[0, Math.PI / 2, 0]} position={[0.2, 2, depth / 2]}>
        <boxGeometry args={[depth + 40, 4, 1]} />
        <meshStandardMaterial color={baseboardColor} roughness={0.3} />
      </mesh>

      {/* Dynamic Fake Bathroom Window */}
      <FakeWindow windowPlacement={windowPlacement} roomWidth={width} roomDepth={depth} />

      {/* Vanity Mirror mounted above Washbasin */}
      <VanityMirror washbasinPlacement={washbasinPlacement} roomWidth={width} roomDepth={depth} />

      {/* Architectural 3D Door */}
      <BathroomDoor doorPlacement={doorPlacement} roomWidth={width} roomDepth={depth} />
    </group>
  );
}

// Orange Hotspot Stub with Price Tag & Floating Callout
function OrangeHotspotStub({ position, placement, isSelected, onClick }) {
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

          {placement.price_inr && (
            <div
              style={{
                backgroundColor: "#D97E3A",
                color: "#FFFFFF",
                fontSize: "0.8rem",
                fontWeight: "700",
                padding: "3px 8px",
                borderRadius: "12px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
                whiteSpace: "nowrap",
                fontFamily: "'Segoe UI', Roboto, sans-serif",
                transition: "all 0.2s ease",
                transform: hovered || isSelected ? "scale(1.08)" : "scale(1)",
              }}
            >
              ₹ {placement.price_inr.toLocaleString("en-IN")}
            </div>
          )}
        </div>

        {isSelected && (
          <div
            style={{
              position: "absolute",
              left: "24px",
              bottom: "16px",
              display: "flex",
              alignItems: "flex-end",
              pointerEvents: "auto",
              minWidth: "220px",
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
                textShadow: "0 2px 8px rgba(0,0,0,0.95), 0 0 12px rgba(0,0,0,0.9)",
                lineHeight: "1.5",
              }}
            >
              <div
                style={{
                  fontSize: "1.1rem",
                  fontWeight: "700",
                  color: "#FFD166",
                  textTransform: "uppercase",
                  borderBottom: "2px solid #D97E3A",
                  paddingBottom: "2px",
                  marginBottom: "4px",
                  letterSpacing: "0.8px",
                }}
              >
                {placement.category ? (
                  placement.category.toLowerCase().includes("washbasin") || placement.category.toLowerCase().includes("wash_basin")
                    ? "Wash Basin"
                    : placement.category.replace("_", " ")
                ) : "Fixture"}
              </div>
              <div style={{ fontSize: "0.95rem", fontWeight: "700" }}>
                Name: <span style={{ fontWeight: "400", color: "#FFFFFF" }}>{placement.model_name}</span>
              </div>
              {placement.price_inr && (
                <div style={{ fontSize: "0.95rem", fontWeight: "700" }}>
                  Price: <span style={{ fontWeight: "400", color: "#FFFFFF" }}>₹ {placement.price_inr.toLocaleString("en-IN")}</span>
                </div>
              )}
              {placement.width_in && placement.depth_in && (
                <div style={{ fontSize: "0.95rem", fontWeight: "700" }}>
                  Dimensions: <span style={{ fontWeight: "400", color: "#FFFFFF" }}>{placement.width_in}" W x {placement.depth_in}" D</span>
                </div>
              )}
              {placement.seat_included && (
                <div style={{ fontSize: "0.85rem", color: "#6EE7B7", fontWeight: "600", marginTop: "2px" }}>
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

function OBJProduct({ placement, isSelected, onClick }) {
  const { sku_code, category, x, y, width_in, depth_in, model_name, obj_file_path, platform_height_offset } = placement;
  const [model, setModel] = useState(null);

  const centerX = x + width_in / 2;
  const centerZ = y + depth_in / 2;
  const platformOffset = platform_height_offset || 0;
  const isCatalogueItem = ['toilet', 'toilet_seat', 'washbasin', 'wash_basin', 'bathtub'].includes((category || '').toLowerCase());

  useEffect(() => {
    if (obj_file_path) {
      const loader = new OBJLoader();
      loader.load(
        `${BASE_URL}/api/3d/${sku_code}.obj`,
        (object) => {
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

          if (!isVeil20704 && !isVeil20703 && category === 'washbasin' && size.x < size.z) {
            object.rotation.y += Math.PI / 2;
            object.updateMatrixWorld(true);
            box = new THREE.Box3().setFromObject(object);
            size = box.getSize(new THREE.Vector3());
          }

          const scale = Math.min(width_in / (size.x || 1), depth_in / (size.z || 1));

          const center = box.getCenter(new THREE.Vector3());
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
          setModel(group);
        },
        undefined,
        (error) => console.error(`Error loading ${obj_file_path}:`, error)
      );
    }
  }, [obj_file_path, sku_code, category, width_in, depth_in, model_name]);

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
          />
        )}
      </group>
    );
  }

  return null;
}

function SimpleProduct({ placement, isSelected, onClick }) {
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
        />
      )}
    </group>
  );
}

// Smooth Time-Based Camera Animation Controller (Exact Negative-Velocity Trajectory Retracing)
function CameraRig({ targetCamera, onResetComplete }) {
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
        const currentTarget = activeControls?.target ? activeControls.target.clone() : new THREE.Vector3();
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
  }, [targetCamera, camera, controls]);

  useFrame(() => {
    if (!animRef.current) return;

    const { startPos, startTarget, endPos, endTarget, startTime, duration, isResetting } = animRef.current;
    const elapsed = performance.now() - startTime;
    const progress = Math.min(1, Math.max(0, elapsed / duration));

    // Evaluate parameter t along the IN trajectory:
    // Going IN: t goes 0 -> 1 (startPos -> endPos)
    // Going OUT: t goes 1 -> 0 (endPos -> startPos, exact negative velocity retracing!)
    const t = isResetting ? (1 - progress) : progress;

    // Smooth cubic ease-in-out curve
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
        onResetComplete?.();
      }
    }
  });

  return null;
}

// Sub-component inside Canvas to access Three.js camera & controls refs
function SceneContent({ layoutData, roomWidthIn, roomDepthIn, aestheticTheme, selectedSku, customCameraTarget, handleSelectProduct, onResetComplete }) {
  const { camera, controls } = useThree();

  const washbasinPlacement = layoutData.find(p => p.category === 'washbasin' || p.category === 'wash_basin');
  const doorPlacement = layoutData.find(p => p.category === 'door');
  const windowPlacement = layoutData.find(p => p.category === 'window');

  const defaultOrbitTarget = useMemo(() => new THREE.Vector3(roomWidthIn / 2, 42, roomDepthIn / 2 - 1), [roomWidthIn, roomDepthIn]);
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

      <Floor width={roomWidthIn} depth={roomDepthIn} theme={aestheticTheme} />
      <RoomWalls
        width={roomWidthIn}
        depth={roomDepthIn}
        theme={aestheticTheme}
        washbasinPlacement={washbasinPlacement}
        doorPlacement={doorPlacement}
        windowPlacement={windowPlacement}
      />

      {layoutData.map((placement, idx) => {
        if (placement.category === 'faucet' || placement.category === 'door' || placement.category === 'window') return null;
        const hasOBJ = placement.obj_file_path && placement.has_3d_model;
        const isSelected = selectedSku === placement.sku_code;

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
          />
        ) : (
          <SimpleProduct
            key={`simple-${idx}`}
            placement={placementWithRot}
            isSelected={isSelected}
            onClick={(p) => handleSelectProduct(p, camera, controls)}
          />
        );
      })}

      <CameraRig
        targetCamera={customCameraTarget}
        onResetComplete={onResetComplete}
      />

      <OrbitControls
        makeDefault
        target={isInspecting ? customCameraTarget.target : defaultOrbitTarget}
        autoRotate={false}
        enableZoom={false}
        enablePan={false}
        enableRotate={!isInspecting}
        rotateSpeed={-0.5}
        minDistance={0.5}
        maxDistance={350}
        minPolarAngle={0.05}
        maxPolarAngle={Math.PI / 2 + 0.1}
      />
    </>
  );
}

export default function LayoutViewer3D({ layoutData, roomWidth, roomDepth, aestheticTheme, onProductClick }) {
  const [selectedSku, setSelectedSku] = useState(null);
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

  const defaultCameraPos = useMemo(() => new THREE.Vector3(roomWidthIn / 2, 42, roomDepthIn / 2), [roomWidthIn, roomDepthIn]);
  const defaultOrbitTarget = useMemo(() => new THREE.Vector3(roomWidthIn / 2, 42, roomDepthIn / 2 - 1), [roomWidthIn, roomDepthIn]);

  const handleResetCamera = () => {
    setSelectedSku(null);
    const restorePos = inspectionPathRef.current?.startPos || defaultCameraPos;
    const restoreTarget = inspectionPathRef.current?.startTarget || defaultOrbitTarget;

    setCustomCameraTarget({
      pos: restorePos,
      target: restoreTarget,
      isResetting: true,
      inspectionPath: inspectionPathRef.current,
    });
    onProductClick?.(null);
  };

  const handleSelectProduct = (product, camera, controls) => {
    const isCatalogueItem = ['toilet', 'toilet_seat', 'washbasin', 'wash_basin', 'bathtub'].includes((product.category || '').toLowerCase());
    if (!isCatalogueItem) return;

    if (selectedSku === product.sku_code) {
      handleResetCamera();
      return;
    }

    const cat = (product.category || "").toLowerCase();
    const cX = product.x + (product.width_in / 2);
    const cZ = product.y + (product.depth_in / 2);
    const pOffset = product.platform_height_offset || 0;

    let target = new THREE.Vector3(cX, pOffset + 12, cZ);

    // Calculate nearest wall to position camera in front of the fixture from inside the room
    const distBack = cZ;
    const distFront = roomDepthIn - cZ;
    const distLeft = cX;
    const distRight = roomWidthIn - cX;
    const minDist = Math.min(distBack, distFront, distLeft, distRight);

    let pos;
    const camOffsetDist = cat === 'bathtub' ? 36 : 28;
    const eyeHeight = pOffset + (cat === 'bathtub' ? 32 : 26);

    if (minDist === distFront) {
      // Front Wall (near door): Front faces -Z into room
      pos = new THREE.Vector3(cX, eyeHeight, Math.max(12, cZ - camOffsetDist));
    } else if (minDist === distLeft) {
      // Left Wall: Front faces +X into room
      pos = new THREE.Vector3(Math.min(roomWidthIn - 12, cX + camOffsetDist), eyeHeight, cZ);
    } else if (minDist === distRight) {
      // Right Wall: Front faces -X into room
      pos = new THREE.Vector3(Math.max(12, cX - camOffsetDist), eyeHeight, cZ);
    } else {
      // Back Wall (default): Front faces +Z into room
      pos = new THREE.Vector3(cX, eyeHeight, Math.min(roomDepthIn - 12, cZ + camOffsetDist));
    }

    // Save exact inspection trajectory path (start -> end)
    const startPos = camera ? camera.position.clone() : defaultCameraPos.clone();
    const startTarget = (controls && controls.target) ? controls.target.clone() : defaultOrbitTarget.clone();

    inspectionPathRef.current = {
      startPos,
      startTarget,
      endPos: pos,
      endTarget: target,
    };

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
      height: "100%",
      width: "100%",
      position: "relative",
      backgroundColor: "#0B132B",
    },
    canvas: {
      flex: 1,
      width: "100%",
    },
    controls: {
      padding: "12px 24px",
      backgroundColor: "#1C2541",
      borderTop: `2px solid ${ORANGE}`,
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
          position: [roomWidthIn / 2, 42, roomDepthIn / 2],
          fov: 65,
        }}
        shadows
      >
        <SceneContent
          layoutData={layoutData}
          roomWidthIn={roomWidthIn}
          roomDepthIn={roomDepthIn}
          aestheticTheme={aestheticTheme}
          selectedSku={selectedSku}
          customCameraTarget={customCameraTarget}
          handleSelectProduct={handleSelectProduct}
          onResetComplete={() => setCustomCameraTarget(null)}
        />
      </Canvas>

      {/* Floating Semi-Transparent Reset View Button (Bottom Right) */}
      {customCameraTarget && (
        <button
          type="button"
          onClick={handleResetCamera}
          style={{
            position: "absolute",
            bottom: "60px",
            right: "24px",
            zIndex: 10,
            backgroundColor: "rgba(15, 23, 42, 0.75)",
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
            e.currentTarget.style.backgroundColor = "rgba(15, 23, 42, 0.75)";
          }}
        >
          ↺ Reset View
        </button>
      )}

      {/* Controls Footer */}
      <div style={styles.controls}>
        <p style={styles.controlsText}>
          {isInspecting
            ? "Inspecting Fixture (Camera Locked) • Click Reset View button (bottom-right) to return to previous orientation"
            : "Free 360° Room Rotation • Drag mouse to rotate • Click pulsating stubs to inspect fixture"}
        </p>
      </div>
    </div>
  );
}
