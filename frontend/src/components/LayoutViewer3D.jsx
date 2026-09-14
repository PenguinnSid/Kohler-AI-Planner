import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Html } from "@react-three/drei";
import { useEffect, useRef, useState, useMemo } from "react";
import * as THREE from "three";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { BASE_URL } from "../api/client";

const ORANGE = "#D97E3A";
const DARK_ORANGE = "#B86A2A";
const WHITE = "#FFFFFF";

// Product finish & PBR material mapper based on Kohler catalogue colours and finishes
export function getProductMaterialProps(placement) {
  if (!placement) return { color: "#FFFFFF", roughness: 0.15, metalness: 0.05 };

  const colorStr = (placement.colour || placement.color || placement.model_name || placement.sku_code || "").toLowerCase();

  if (colorStr.includes("honed_black") || colorStr.includes("matte_black") || colorStr.includes("black")) {
    return { color: "#18181B", roughness: 0.45, metalness: 0.1 };
  }
  if (colorStr.includes("brushed_bronze") || colorStr.includes("bronze")) {
    return { color: "#A76D38", roughness: 0.25, metalness: 0.85 };
  }
  if (colorStr.includes("gold")) {
    return { color: "#E2B04E", roughness: 0.2, metalness: 0.9 };
  }
  if (colorStr.includes("polished_chrome") || colorStr.includes("chrome")) {
    return { color: "#E2E8F0", roughness: 0.08, metalness: 0.95 };
  }
  if (colorStr.includes("modernlife") || colorStr.includes("21226")) {
    return { color: "#0F4C5C", roughness: 0.3, metalness: 0.1 };
  }
  if (colorStr.includes("wood") || colorStr.includes("walnut")) {
    return { color: "#6E4729", roughness: 0.4, metalness: 0.05 };
  }
  return { color: "#FFFFFF", roughness: 0.15, metalness: 0.05 };
}

function getProductColor(modelName) {
  return getProductMaterialProps({ model_name: modelName }).color;
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
function VanityMirror({ washbasinPlacement, cabinetPlacement, mirrorPlacement, windowPlacement, roomWidth, roomDepth }) {
  const targetObj = mirrorPlacement || cabinetPlacement || washbasinPlacement;
  if (!targetObj) return null;

  const targetX = targetObj.x || 0;
  const targetY = targetObj.y || 0;
  const targetW = targetObj.width_in || targetObj.w || 26;
  const targetH = targetObj.depth_in || targetObj.h || 3;

  let mirrorWidth = Math.max(14, targetW);
  const mirrorHeight = Math.max(20, mirrorWidth * 0.9);
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

    // Check window intersection on back wall
    if (windowPlacement) {
      const winW = windowPlacement.width_in || windowPlacement.w || 32;
      const winX = windowPlacement.x ?? Math.max(0, roomWidth / 2 - winW / 2);
      const winRight = winX + winW;
      const mirLeft = posX - mirrorWidth / 2;
      const mirRight = posX + mirrorWidth / 2;

      if (mirLeft < winRight && mirRight > winX) {
        const newLeft = winRight + 1;
        if (newLeft + mirrorWidth > roomWidth) {
          mirrorWidth = Math.max(14, roomWidth - newLeft - 1);
        }
        posX = newLeft + mirrorWidth / 2;
      }
    }
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

      {/* Backlit Soft LED Frame Glow & Ambient Point Light */}
      <pointLight position={[0, 0, 2]} color="#FFE8D6" intensity={1.8} distance={70} />
      <mesh position={[0, 0, -0.05]}>
        <boxGeometry args={[mirrorWidth + 3, mirrorHeight + 3, 0.4]} />
        <meshStandardMaterial color="#FFB86C" emissive="#FFB86C" emissiveIntensity={0.8} transparent opacity={0.45} />
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

// Faucet Fixture: Base-Mount vs Wall-Mount positioning aligned with sink & mirror center
function FaucetFixture({ faucetPlacement, washbasinPlacement, isSelected, onClick, onCycleProduct, hideHotspots }) {
  const fPlacement = faucetPlacement || { sku_code: "23475T-4", category: "faucet", subcategory: "base-mount", model_name: "Parallel Modern Faucet", price_inr: 28000, width_in: 4, depth_in: 6.5, height_in: 8.5 };
  const isWallMount = (fPlacement.subcategory || fPlacement.model_name || "").toLowerCase().includes("wall-mount") || (fPlacement.category || "").includes("wall");
  const matProps = getProductMaterialProps(fPlacement);

  const wbX = washbasinPlacement?.x ?? 64;
  const wbY = washbasinPlacement?.y ?? 6;
  const wbW = washbasinPlacement?.width_in ?? 22;
  const platformOffset = washbasinPlacement?.platform_height_offset ?? 12;
  const basinHeight = 6;

  const centerX = wbX + wbW / 2;

  if (isWallMount) {
    // Wall-mount faucet: mounted centrally on wall directly above washbasin bowl
    const posZ = 0.6;
    const posY = platformOffset + basinHeight + 7; // Elevated 7 inches above basin rim to prevent collision

    return (
      <group position={[centerX, posY, posZ]}>
        {/* Wall Trim Escutcheon Plate */}
        <mesh castShadow receiveShadow position={[0, 0, 0]}>
          <boxGeometry args={[7, 4, 0.4]} />
          <meshStandardMaterial color={matProps.color} roughness={matProps.roughness} metalness={matProps.metalness} />
        </mesh>
        {/* Wall Spout Extrusion pointing forward into sink */}
        <mesh castShadow receiveShadow position={[0, -0.5, 3]}>
          <boxGeometry args={[1.5, 1.2, 5.5]} />
          <meshStandardMaterial color={matProps.color} roughness={matProps.roughness} metalness={matProps.metalness} />
        </mesh>
        {/* Single Lever Handle Control */}
        <mesh castShadow receiveShadow position={[2.2, 0.5, 1.5]}>
          <boxGeometry args={[1.2, 3, 1]} />
          <meshStandardMaterial color={matProps.color} roughness={matProps.roughness} metalness={matProps.metalness} />
        </mesh>

        {!hideHotspots && (
          <OrangeHotspotStub
            position={[0, 6, 2]}
            placement={fPlacement}
            isSelected={isSelected}
            onClick={() => onClick(fPlacement)}
            onCycleProduct={onCycleProduct}
            hideHotspots={hideHotspots}
          />
        )}
      </group>
    );
  }

  // Base-mount faucet: positioned centrally on deck/platform behind washbasin bowl
  const posZ = Math.max(2, wbY - 2.5);
  const posY = platformOffset + basinHeight + 4;

  return (
    <group position={[centerX, posY, posZ]}>
      {/* Faucet Base Column */}
      <mesh castShadow receiveShadow position={[0, 0, 0]}>
        <cylinderGeometry args={[1.2, 1.4, 8, 16]} />
        <meshStandardMaterial color={matProps.color} roughness={matProps.roughness} metalness={matProps.metalness} />
      </mesh>
      {/* Arching Spout facing forward */}
      <mesh castShadow receiveShadow position={[0, 4.5, 2]}>
        <boxGeometry args={[1.4, 1.5, 5]} />
        <meshStandardMaterial color={matProps.color} roughness={matProps.roughness} metalness={matProps.metalness} />
      </mesh>
      {/* Single Handle Lever */}
      <mesh castShadow receiveShadow position={[0, 5, -0.5]} rotation={[0.2, 0, 0]}>
        <boxGeometry args={[1.2, 3, 0.8]} />
        <meshStandardMaterial color={matProps.color} roughness={matProps.roughness} metalness={matProps.metalness} />
      </mesh>

      {!hideHotspots && (
        <OrangeHotspotStub
          position={[0, 10, 0]}
          placement={fPlacement}
          isSelected={isSelected}
          onClick={() => onClick(fPlacement)}
          onCycleProduct={onCycleProduct}
          hideHotspots={hideHotspots}
        />
      )}
    </group>
  );
}

// Bathtub Fixture: Freestanding vs Drop-In Platform
function BathtubFixture({ bathtubPlacement, isSelected, onClick, onCycleProduct, hideHotspots }) {
  if (!bathtubPlacement) return null;

  const subcat = (bathtubPlacement.subcategory || bathtubPlacement.model_name || "").toLowerCase();
  const isDropIn = subcat.includes("drop_in") || subcat.includes("drop-in") || subcat.includes("drop");
  const matProps = getProductMaterialProps(bathtubPlacement);

  const wIn = Number(bathtubPlacement.width_in) || 50;
  const dIn = Number(bathtubPlacement.depth_in) || 28;
  const hIn = Number(bathtubPlacement.height_in) || 20;

  const posX = bathtubPlacement.x + wIn / 2;
  const posZ = bathtubPlacement.y + dIn / 2;
  const rotY = ((bathtubPlacement.rotation_deg || 0) * Math.PI) / 180;

  const handleBathtubClick = (e) => {
    e.stopPropagation();
    onClick?.(bathtubPlacement);
  };

  if (isDropIn) {
    // Drop-In Tub: Built inside a raised tiled platform with an exact 1-inch border on all sides!
    const platformW = wIn + 2; // 1-inch border left & right
    const platformD = dIn + 2; // 1-inch border front & back
    const platformH = hIn;

    return (
      <group position={[posX, 0, posZ]} rotation={[0, rotY, 0]} onClick={handleBathtubClick}>
        {/* Tiled Platform Enclosure (1-inch overhang border on all sides) */}
        <mesh position={[0, platformH / 2, 0]} receiveShadow castShadow>
          <boxGeometry args={[platformW, platformH, platformD]} />
          <meshStandardMaterial color="#EAE6DF" roughness={0.35} metalness={0.05} />
        </mesh>
        {/* Tiled Top Deck Edge Surface */}
        <mesh position={[0, platformH - 0.2, 0]} receiveShadow>
          <boxGeometry args={[platformW + 0.5, 0.4, platformD + 0.5]} />
          <meshStandardMaterial color="#CBD5E1" roughness={0.2} metalness={0.1} />
        </mesh>
        {/* Sunken Porcelain Tub Inner Rim */}
        <mesh position={[0, platformH - 1, 0]} castShadow receiveShadow>
          <boxGeometry args={[wIn, 2, dIn]} />
          <meshStandardMaterial color={matProps.color} roughness={matProps.roughness} metalness={matProps.metalness} />
        </mesh>
        {/* Deep Water Basin Interior Hollow */}
        <mesh position={[0, platformH / 2 + 1, 0]}>
          <boxGeometry args={[wIn - 4, platformH - 3, dIn - 4]} />
          <meshStandardMaterial color="#38BDF8" roughness={0.05} opacity={0.65} transparent />
        </mesh>

        {!hideHotspots && (
          <OrangeHotspotStub
            position={[0, platformH + 4, 0]}
            placement={bathtubPlacement}
            isSelected={isSelected}
            onClick={() => onClick(bathtubPlacement)}
            onCycleProduct={onCycleProduct}
            hideHotspots={hideHotspots}
          />
        )}
      </group>
    );
  }

  // Freestanding Bathtub: Sits directly on the bathroom floor
  return (
    <group position={[posX, hIn / 2, posZ]} rotation={[0, rotY, 0]} onClick={handleBathtubClick}>
      {/* Main Tub Body */}
      <mesh castShadow receiveShadow position={[0, 0, 0]}>
        <boxGeometry args={[wIn, hIn, dIn]} />
        <meshStandardMaterial color={matProps.color} roughness={matProps.roughness} metalness={matProps.metalness} />
      </mesh>
      {/* Bath Interior Water */}
      <mesh position={[0, 2, 0]}>
        <boxGeometry args={[wIn - 4, hIn - 4, dIn - 4]} />
        <meshStandardMaterial color="#0284C7" roughness={0.05} opacity={0.6} transparent />
      </mesh>

      {!hideHotspots && (
        <OrangeHotspotStub
          position={[0, hIn / 2 + 4, 0]}
          placement={bathtubPlacement}
          isSelected={isSelected}
          onClick={() => onClick(bathtubPlacement)}
          onCycleProduct={onCycleProduct}
          hideHotspots={hideHotspots}
        />
      )}
    </group>
  );
}

// Walk-In Shower Enclosure (Default Bath Section option without bathtub)
function WalkInShowerEnclosure({ bathPlacement, roomWidth, roomDepth, isSelected, onClick, onCycleProduct, hideHotspots }) {
  if (!bathPlacement) return null;

  const wIn = Number(bathPlacement.width_in) || 50;
  const dIn = Number(bathPlacement.depth_in) || 28;
  const heightIn = 84; // 7 feet tall glass walls

  const posX = bathPlacement.x + wIn / 2;
  const posZ = bathPlacement.y + dIn / 2;

  const isCorner = bathPlacement.x <= 8 || (bathPlacement.x + wIn >= roomWidth - 8);
  const isFullWidth = wIn >= roomWidth - 12;

  const matGlass = new THREE.MeshStandardMaterial({
    color: "#E0F2FE",
    roughness: 0.1,
    metalness: 0.1,
    transparent: true,
    opacity: 0.35,
    side: THREE.DoubleSide,
  });

  const matFrame = new THREE.MeshStandardMaterial({
    color: "#CBD5E1",
    metalness: 0.9,
    roughness: 0.1,
  });

  const handleShowerClick = (e) => {
    e.stopPropagation();
    onClick?.(bathPlacement);
  };

  return (
    <group position={[posX, 0, posZ]} onClick={handleShowerClick}>
      {/* Non-Slip Shower Base Tray */}
      <mesh position={[0, 1.5, 0]} receiveShadow>
        <boxGeometry args={[wIn, 3, dIn]} />
        <meshStandardMaterial color="#F1F5F9" roughness={0.6} />
      </mesh>
      {/* Stainless Drain Grid */}
      <mesh position={[0, 3.1, 0]}>
        <boxGeometry args={[6, 0.2, 6]} />
        <meshStandardMaterial color="#64748B" metalness={0.9} roughness={0.2} />
      </mesh>

      {/* Front Glass Enclosure Panel with Hinged Glass Shower Door */}
      <group position={[0, heightIn / 2 + 3, dIn / 2]}>
        {/* Left Fixed Glass Pane */}
        <mesh position={[-wIn / 4, 0, 0]} material={matGlass}>
          <planeGeometry args={[wIn / 2 - 2, heightIn]} />
        </mesh>
        {/* Top Chrome Header Rail */}
        <mesh position={[0, heightIn / 2 - 1, 0]}>
          <boxGeometry args={[wIn, 2, 1]} material={matFrame} />
        </mesh>
        {/* Hinged Glass Shower Door Panel */}
        <mesh position={[wIn / 4, 0, 0]} material={matGlass}>
          <planeGeometry args={[wIn / 2 - 2, heightIn]} />
        </mesh>
        {/* Door Lever Handle */}
        <mesh position={[2, 0, 1.5]}>
          <boxGeometry args={[1.5, 8, 2]} material={matFrame} />
        </mesh>
      </group>

      {/* Side Glass Wall Panel (Corner Shower Setup) */}
      {!isFullWidth && isCorner && (
        <group position={[wIn / 2, heightIn / 2 + 3, 0]} rotation={[0, Math.PI / 2, 0]}>
          <mesh material={matGlass}>
            <planeGeometry args={[dIn, heightIn]} />
          </mesh>
          <mesh position={[0, heightIn / 2 - 1, 0]}>
            <boxGeometry args={[dIn, 2, 1]} material={matFrame} />
          </mesh>
        </group>
      )}

      {/* Wall-Mounted Kohler Overhead Shower Head Panel & Thermostatic Column at comfortable Y=68 height */}
      <group position={[0, 68, -dIn / 2 + 1]}>
        <mesh position={[0, 0, 6]} castShadow>
          <boxGeometry args={[10, 1.5, 10]} />
          <meshStandardMaterial color="#E2E8F0" metalness={0.9} roughness={0.1} />
        </mesh>
        <mesh position={[0, -18, 1]} castShadow material={matFrame}>
          <boxGeometry args={[3, 36, 1.5]} />
        </mesh>
        <mesh position={[0, -32, 2.5]} castShadow material={matFrame}>
          <boxGeometry args={[8, 4, 2]} />
        </mesh>
      </group>

      {!hideHotspots && (
        <OrangeHotspotStub
          position={[0, 76, -dIn / 2 + 6]}
          placement={{ ...bathPlacement, category: "shower_head", model_name: "Walk-In Shower Enclosure" }}
          isSelected={isSelected}
          onClick={() => onClick(bathPlacement)}
          onCycleProduct={onCycleProduct}
          hideHotspots={hideHotspots}
        />
      )}
    </group>
  );
}

// Towel Bar / Arm Component at Ergonomic Height (46 inches above floor)
function TowelBarFixture({ placement, isSelected, onClick, onCycleProduct, hideHotspots }) {
  if (!placement) return null;
  const wIn = Number(placement.width_in) || 24;
  const dIn = Number(placement.depth_in) || 3;
  const matProps = getProductMaterialProps(placement);

  const posX = placement.x + wIn / 2;
  const posZ = placement.y + dIn / 2;
  const rotY = ((placement.rotation_deg || 0) * Math.PI) / 180;
  const heightY = 46;

  return (
    <group position={[posX, heightY, posZ]} rotation={[0, rotY, 0]}>
      {/* Wall Mount Escutcheon Plates */}
      <mesh position={[-wIn / 2 + 1, 0, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[1.5, 1.5, 1, 16]} rotation={[Math.PI / 2, 0, 0]} />
        <meshStandardMaterial color={matProps.color} metalness={matProps.metalness} roughness={matProps.roughness} />
      </mesh>
      <mesh position={[wIn / 2 - 1, 0, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[1.5, 1.5, 1, 16]} rotation={[Math.PI / 2, 0, 0]} />
        <meshStandardMaterial color={matProps.color} metalness={matProps.metalness} roughness={matProps.roughness} />
      </mesh>
      {/* Metallic Towel Rail Bar */}
      <mesh castShadow receiveShadow position={[0, 0, 1.5]}>
        <cylinderGeometry args={[0.6, 0.6, wIn - 2, 16]} rotation={[0, 0, Math.PI / 2]} />
        <meshStandardMaterial color={matProps.color} metalness={matProps.metalness} roughness={matProps.roughness} />
      </mesh>
      {/* Hanging White Towel */}
      <mesh position={[0, -6, 1.5]} castShadow receiveShadow>
        <boxGeometry args={[wIn - 6, 12, 1]} />
        <meshStandardMaterial color="#FAFAFA" roughness={0.75} />
      </mesh>

      {!hideHotspots && (
        <OrangeHotspotStub
          position={[0, 6, 2]}
          placement={placement}
          isSelected={isSelected}
          onClick={() => onClick(placement)}
          onCycleProduct={onCycleProduct}
          hideHotspots={hideHotspots}
        />
      )}
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
      <VanityMirror washbasinPlacement={washbasinPlacement} cabinetPlacement={cabinetPlacement} mirrorPlacement={mirrorPlacement} windowPlacement={windowPlacement} roomWidth={width} roomDepth={depth} />

      {/* Architectural 3D Door */}
      <BathroomDoor doorPlacement={doorPlacement} roomWidth={width} roomDepth={depth} />
    </group>
  );
}

// Orange Hotspot Stub with Price Tag & Floating Callout + Left/Right Product Cycle Arrows
function OrangeHotspotStub({ position, placement, isSelected, onClick, onCycleProduct, hideHotspots }) {
  const [hovered, setHovered] = useState(false);

  if (hideHotspots) return null;

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
        {isSelected && !hideHotspots && (() => {
          const catNorm = (placement?.category || "").toLowerCase();
          const isBelow = catNorm === "bathtub";

          return (
            <div
              style={{
                position: "absolute",
                left: "14px",
                ...(isBelow ? { top: "14px" } : { bottom: "12px" }),
                display: "flex",
                alignItems: isBelow ? "flex-start" : "flex-end",
                pointerEvents: "auto",
                zIndex: 30,
              }}
            >
              {/* SVG Pointer Bar starting OUTSIDE the circle and merging seamlessly into category title underline */}
              <svg width="46" height="38" style={{ overflow: "visible", flexShrink: 0, display: "block" }}>
                <polyline
                  points={isBelow ? "4,4 24,28 46,28" : "4,34 24,6 46,6"}
                  fill="none"
                  stroke="#D97E3A"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>

              <div
                style={{
                  marginLeft: "-1px",
                  marginTop: isBelow ? "21px" : "0",
                  marginBottom: isBelow ? "0" : "1px",
                  color: "#FFFFFF",
                  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                  lineHeight: "1.45",
                  backgroundColor: "transparent",
                  border: "none",
                  padding: "0 0 0 4px",
                  minWidth: "220px",
                }}
              >
                {/* Category Header Title in Orange merged directly with pointer bar */}
                <div
                  style={{
                    borderBottom: "2px solid #D97E3A",
                    paddingBottom: "4px",
                    marginBottom: "6px",
                  }}
                >
                  <div
                    style={{
                      fontSize: "0.9rem",
                      fontWeight: "800",
                      color: "#D97E3A",
                      textTransform: "uppercase",
                      letterSpacing: "1px",
                    }}
                  >
                    {placement.category ? (
                      placement.category.toLowerCase().includes("washbasin") || placement.category.toLowerCase().includes("wash_basin")
                        ? "Wash Basin"
                        : placement.category.replace("_", " ")
                    ) : "Fixture"}
                  </div>
                </div>

                <div style={{ fontSize: "0.85rem", fontWeight: "600", color: "#FFFFFF", marginBottom: "3px" }}>
                  Name: <span style={{ fontWeight: "400", color: "#FFFFFF" }}>{placement.model_name}</span>
                </div>
                {placement.price_inr && (
                  <div style={{ fontSize: "0.85rem", fontWeight: "600", color: "#FFFFFF", marginBottom: "3px" }}>
                    Price: <span style={{ fontWeight: "400", color: "#FFFFFF" }}>₹ {placement.price_inr.toLocaleString("en-IN")}</span>
                  </div>
                )}
                {placement.width_in && placement.depth_in && (
                  <div style={{ fontSize: "0.85rem", fontWeight: "600", color: "#FFFFFF" }}>
                    Dimensions: <span style={{ fontWeight: "400", color: "#FFFFFF" }}>{placement.width_in}" W x {placement.depth_in}" D</span>
                  </div>
                )}
              </div>
            </div>
          );
        })()}
      </div>
    </Html>
  );
}

function OBJProduct({ placement, isSelected, onClick, onCycleProduct, layoutData, hideHotspots }) {
  const { sku_code, category, x, y, width_in, depth_in, model_name, obj_file_path, platform_height_offset } = placement;
  const [model, setModel] = useState(null);

  const wIn = Number(width_in) || 16;
  const dIn = Number(depth_in) || 16;
  let centerX = (Number(x) || 0) + wIn / 2;
  let centerZ = (Number(y) || 0) + dIn / 2;

  // Lock counter platform center to washbasin center for exact 3D alignment
  if ((category || '').toLowerCase() === 'sink_platform' || (category || '').toLowerCase() === 'cabinet') {
    const washbasinItem = layoutData?.find(p => (p.category || '').toLowerCase() === 'washbasin' || (p.category || '').toLowerCase() === 'wash_basin');
    if (washbasinItem) {
      const wbW = Number(washbasinItem.width_in) || 22;
      const wbD = Number(washbasinItem.depth_in) || 18;
      centerX = (Number(washbasinItem.x) || 0) + wbW / 2;
      centerZ = (Number(washbasinItem.y) || 0) + wbD / 2;
    }
  }

  const platformOffset = Number(platform_height_offset) || 0;
  const isCatalogueItem = ['toilet', 'washbasin', 'wash_basin', 'bathtub'].includes((category || '').toLowerCase());

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
        {isCatalogueItem && !hideHotspots && (
          <OrangeHotspotStub
            position={(category || '').toLowerCase().includes('wash') ? [0, 6, 2] : [0, 20, 0]}
            placement={placement}
            isSelected={isSelected}
            onClick={() => onClick(placement)}
            onCycleProduct={onCycleProduct}
            hideHotspots={hideHotspots}
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
      hideHotspots={hideHotspots}
    />
  );
}

function SimpleProduct({ placement, isSelected, onClick, onCycleProduct, layoutData, hideHotspots }) {
  const { x, y, width_in, depth_in, model_name, is_platform, is_placeholder, platform_height_offset, rotation_deg, category } = placement;

  let centerX = x + width_in / 2;
  let centerZ = y + depth_in / 2;

  // Lock counter platform center to washbasin center for exact 3D alignment
  if (is_platform || (category || '').toLowerCase() === 'sink_platform' || (category || '').toLowerCase() === 'cabinet') {
    const washbasinItem = layoutData?.find(p => (p.category || '').toLowerCase() === 'washbasin' || (p.category || '').toLowerCase() === 'wash_basin');
    if (washbasinItem) {
      const wbW = Number(washbasinItem.width_in) || 22;
      const wbD = Number(washbasinItem.depth_in) || 18;
      centerX = (Number(washbasinItem.x) || 0) + wbW / 2;
      centerZ = (Number(washbasinItem.y) || 0) + wbD / 2;
    }
  }

  const platformOffset = platform_height_offset || 0;
  const isCatalogueItem = ['toilet', 'washbasin', 'wash_basin', 'bathtub'].includes((category || '').toLowerCase());

  const handleClick = (e) => {
    e.stopPropagation();
    if (isCatalogueItem) {
      onClick(placement);
    }
  };

  const isToilet = category === 'toilet';
  const isWashbasin = category === 'washbasin' || category === 'wash_basin';
  const isBathtub = category === 'bathtub';
  const isDustbin = category === 'dustbin';
  const isTowelBar = category === 'towel_bar';

  let geom = <boxGeometry args={[width_in, 16, depth_in]} />;
  let matColor = getProductColor(model_name);

  if (is_platform) {
    geom = <boxGeometry args={[width_in, 12, depth_in]} />;
    matColor = "#1E293B";
  } else if (isWashbasin) {
    geom = <boxGeometry args={[width_in, 6, depth_in]} />;
  } else if (isToilet) {
    geom = <boxGeometry args={[width_in, 18, depth_in]} />;
  } else if (isBathtub) {
    geom = <boxGeometry args={[width_in, 20, depth_in]} />;
  } else if (isDustbin) {
    geom = <cylinderGeometry args={[width_in / 2, width_in / 2.2, 16, 20]} />;
    matColor = "#475569";
  } else if (isTowelBar) {
    geom = <boxGeometry args={[width_in, 3, Math.max(2, depth_in)]} />;
    matColor = "#94A3B8";
  }

  return (
    <group
      position={[centerX, platformOffset + (is_platform ? 6 : 9), centerZ]}
      rotation={[0, ((rotation_deg || 0) * Math.PI) / 180, 0]}
      onClick={handleClick}
    >
      <mesh castShadow receiveShadow>
        {geom}
        <meshStandardMaterial
          color={matColor}
          roughness={is_platform ? 0.4 : 0.15}
          metalness={0.05}
        />
      </mesh>
      {isCatalogueItem && !hideHotspots && (
        <OrangeHotspotStub
          position={isWashbasin ? [0, 6, 2] : [0, 20, 0]}
          placement={placement}
          isSelected={isSelected}
          onClick={() => onClick(placement)}
          onCycleProduct={onCycleProduct}
          hideHotspots={hideHotspots}
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
      const activeControls = controls || camera.controls;
      const currentTarget = activeControls?.target ? activeControls.target.clone() : defaultOrbitTarget.clone();

      animRef.current = {
        startPos: camera.position.clone(),
        startTarget: currentTarget,
        endPos: targetCamera.pos.clone(),
        endTarget: targetCamera.target.clone(),
        startTime: performance.now(),
        duration: 950, // 0.95s crisp smooth transition
        isResetting: !!targetCamera.isResetting,
      };
    }
  }, [targetCamera, camera, controls, defaultOrbitTarget]);

  useFrame(() => {
    if (!animRef.current) return;

    const { startPos, startTarget, endPos, endTarget, startTime, duration, isResetting } = animRef.current;
    const elapsed = performance.now() - startTime;
    const progress = Math.min(1, Math.max(0, elapsed / duration));

    // Smooth cubic ease-in-out transition curve
    const easeT = progress < 0.5 ? 4 * progress * progress * progress : 1 - Math.pow(-2 * progress + 2, 3) / 2;

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
          activeControls.target.copy(endTarget);
          activeControls.update();
        }
        onResetComplete?.();
      }
    }
  });

  return null;
}

// Sub-component inside Canvas to access Three.js camera & controls refs
function SceneContent({ layoutData, roomWidthIn, roomDepthIn, aestheticTheme, floorTheme, wallTheme, bathSectionMode = "shower", budgetInr = "", isZoomLocked, selectedCategory, selectedSku, customCameraTarget, handleSelectProduct, onCycleProduct, onResetComplete, hideHotspots }) {
  const { camera, controls } = useThree();

  const washbasinPlacement = layoutData.find(p => p.category === 'washbasin' || p.category === 'wash_basin');
  const cabinetPlacement = layoutData.find(p => p.category === 'sink_platform' || p.category === 'cabinet');
  const doorPlacement = layoutData.find(p => p.category === 'door');
  const windowPlacement = layoutData.find(p => p.category === 'window');
  const mirrorPlacement = layoutData.find(p => p.category === 'mirror');
  const faucetPlacement = layoutData.find(p => p.category === 'faucet');
  const bathtubPlacement = layoutData.find(p => p.category === 'bathtub' || p.category === 'bath_tub');
  const towelBarPlacement = layoutData.find(p => p.category === 'towel_bar' || p.category === 'towel_arm');

  const userBudgetNum = Number(budgetInr);
  const bathtubPrice = bathtubPlacement?.price_inr || 34000;
  const bathtubFitsInBudget = !userBudgetNum || userBudgetNum <= 0 || userBudgetNum >= bathtubPrice;

  const defaultOrbitTarget = useMemo(() => {
    return new THREE.Vector3(roomWidthIn / 2, 26, roomDepthIn / 2);
  }, [roomWidthIn, roomDepthIn]);

  const defaultCameraPos = useMemo(() => {
    return new THREE.Vector3(roomWidthIn / 2, 105, roomDepthIn * 2.2);
  }, [roomWidthIn, roomDepthIn]);

  const isInspecting = customCameraTarget && !customCameraTarget.isResetting;

  useEffect(() => {
    if (controls && controls.target && !customCameraTarget) {
      controls.target.copy(defaultOrbitTarget);
      controls.update();
    }
  }, [controls, defaultOrbitTarget, customCameraTarget]);

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

      {/* Render specialized fixtures */}
      <FaucetFixture
        faucetPlacement={faucetPlacement}
        washbasinPlacement={washbasinPlacement}
        isSelected={selectedCategory === 'faucet'}
        onClick={(p) => handleSelectProduct(p, camera, controls)}
        onCycleProduct={onCycleProduct}
        hideHotspots={hideHotspots}
      />
      <TowelBarFixture
        placement={towelBarPlacement}
        isSelected={selectedCategory === 'towel_bar' || selectedCategory === 'towel_arm'}
        onClick={(p) => handleSelectProduct(p, camera, controls)}
        onCycleProduct={onCycleProduct}
        hideHotspots={hideHotspots}
      />

      {bathSectionMode === "bathtub" ? (
        bathtubFitsInBudget ? (
          <BathtubFixture
            bathtubPlacement={bathtubPlacement}
            isSelected={selectedCategory === 'bathtub'}
            onClick={(p) => handleSelectProduct(p, camera, controls)}
            onCycleProduct={onCycleProduct}
            hideHotspots={hideHotspots}
          />
        ) : null
      ) : bathSectionMode === "shower" ? (
        <WalkInShowerEnclosure
          bathPlacement={bathtubPlacement || { x: 12, y: 12, width_in: 60, depth_in: 32, category: 'bathtub' }}
          roomWidth={roomWidthIn}
          roomDepth={roomDepthIn}
          isSelected={selectedCategory === 'bathtub' || selectedCategory === 'shower_head'}
          onClick={(p) => handleSelectProduct(p, camera, controls)}
          onCycleProduct={onCycleProduct}
          hideHotspots={hideHotspots}
        />
      ) : null}

      {layoutData.map((placement, idx) => {
        const catLower = (placement.category || "").toLowerCase();
        if (['faucet', 'door', 'window', 'mirror', 'toilet_seat', 'bathtub', 'bath_tub', 'towel_bar', 'towel_arm'].includes(catLower)) return null;
        const hasOBJ = placement.obj_file_path && placement.has_3d_model;

        const pCat = catLower.replace("wash_basin", "washbasin");
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
            layoutData={layoutData}
            hideHotspots={hideHotspots}
          />
        ) : (
          <SimpleProduct
            key={`simple-${idx}`}
            placement={placementWithRot}
            isSelected={isSelected}
            onClick={(p) => handleSelectProduct(p, camera, controls)}
            onCycleProduct={onCycleProduct}
            layoutData={layoutData}
            hideHotspots={hideHotspots}
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
        autoRotate={false}
        enableZoom={!isInspecting && !isZoomLocked}
        enablePan={true}
        enableRotate={true}
        rotateSpeed={-0.5}
        minDistance={10}
        maxDistance={450}
        minPolarAngle={0.01}
        maxPolarAngle={Math.PI / 2 + 0.35}
      />
    </>
  );
}

export default function LayoutViewer3D({ layoutData, roomWidth, roomDepth, roomHeight, aestheticTheme, floorTheme, wallTheme, bathSectionMode = "shower", budgetInr = "", onProductClick, onCycleProduct, hideHotspots }) {
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedSku, setSelectedSku] = useState(null);
  const [isZoomLocked, setIsZoomLocked] = useState(false);
  const [customCameraTarget, setCustomCameraTarget] = useState(null);
  const originCameraRef = useRef(null);

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
    const origin = originCameraRef.current;
    const targetPos = origin ? origin.pos : defaultCameraPos;
    const targetOrbit = origin ? origin.target : defaultOrbitTarget;

    setSelectedCategory(null);
    setSelectedSku(null);
    setCustomCameraTarget({
      pos: targetPos,
      target: targetOrbit,
      isResetting: true,
    });
    onProductClick?.(null);
  };

  const handleSelectProduct = (product, camera, controls) => {
    if (!product || typeof product !== "object" || product.isObject3D || product.nativeEvent || !product.category) return;
    const cat = (product.category || "").toLowerCase();
    const normCat = cat.replace("wash_basin", "washbasin").replace("bath_tub", "bathtub");

    if (selectedCategory === normCat) {
      handleResetCamera();
      return;
    }

    // Save initial room overview camera position prior to inspection session
    const activeControls = controls || (camera ? camera.controls : null);
    if (!originCameraRef.current) {
      originCameraRef.current = {
        pos: camera ? camera.position.clone() : defaultCameraPos.clone(),
        target: activeControls?.target ? activeControls.target.clone() : defaultOrbitTarget.clone(),
      };
    }

    const cX = (product.x ?? (roomWidthIn / 2)) + ((Number(product.width_in) || 20) / 2);
    let cZ = (product.y ?? (roomDepthIn / 2)) + ((Number(product.depth_in) || 20) / 2);
    const pOffset = product.platform_height_offset || 0;

    let targetY = pOffset + 12;
    let eyeHeight = pOffset + 26;
    let camOffsetDist = 44;

    if (cat.includes("shower") || product.is_shower_head) {
      const showerTarget = new THREE.Vector3(cX, 56, cZ);
      const showerPos = new THREE.Vector3(cX, 66, Math.min(roomDepthIn * 1.05, cZ + 68));
      setSelectedCategory(normCat);
      setSelectedSku(product.sku_code);
      setCustomCameraTarget({
        pos: showerPos,
        target: showerTarget,
        isResetting: false,
      });
      onProductClick?.(product);
      return;
    }

    let target = new THREE.Vector3(cX, targetY, cZ);

    const distBack = cZ;
    const distFront = roomDepthIn - cZ;
    const distLeft = cX;
    const distRight = roomWidthIn - cX;
    const minDist = Math.min(distBack, distFront, distLeft, distRight);

    let pos;
    if (minDist === distFront) {
      pos = new THREE.Vector3(cX, eyeHeight, Math.max(12, cZ - camOffsetDist));
    } else if (minDist === distLeft) {
      pos = new THREE.Vector3(Math.min(roomWidthIn - 12, cX + camOffsetDist), eyeHeight, cZ);
    } else if (minDist === distRight) {
      pos = new THREE.Vector3(Math.max(12, cX - camOffsetDist), eyeHeight, cZ);
    } else {
      pos = new THREE.Vector3(cX, eyeHeight, Math.min(roomDepthIn - 12, cZ + camOffsetDist));
    }

    setSelectedCategory(normCat);
    setSelectedSku(product.sku_code);
    setCustomCameraTarget({
      pos,
      target,
      isResetting: false,
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
          bathSectionMode={bathSectionMode}
          budgetInr={budgetInr}
          isZoomLocked={isZoomLocked}
          selectedCategory={selectedCategory}
          selectedSku={selectedSku}
          customCameraTarget={customCameraTarget}
          handleSelectProduct={handleSelectProduct}
          onCycleProduct={onCycleProduct}
          onResetComplete={() => {
            setCustomCameraTarget(null);
            originCameraRef.current = null;
          }}
          hideHotspots={hideHotspots}
        />
      </Canvas>

      {/* Floating Left & Right Screen Orange Arrows to Cycle Product Designs */}
      {selectedCategory && !hideHotspots && (
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
      {!hideHotspots && (
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
      )}
    </div>
  );
}
