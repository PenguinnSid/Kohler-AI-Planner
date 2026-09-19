import { useState, useRef, useEffect } from "react";

const GOLD = "#FFFFFF";
const DARK_CARD = "#10141D";
const BORDER_COLOR = "#232D3F";
const TEXT_MUTED = "#94A3B8";

// Theme Swatch Preset Definitions
export const FLOOR_THEMES = [
  { id: "marble", name: "Carrara Marble", color: "#EAE6DF", border: "#CCCCCC", accent: "#B0A89C" },
  { id: "slate", name: "Dark Slate Tile", color: "#1F2937", border: "#374151", accent: "#4B5563" },
  { id: "wood", name: "Warm Bamboo", color: "#C59B6D", border: "#A07648", accent: "#805528" },
  { id: "hex", name: "Hexagon Ceramic", color: "#E2E8F0", border: "#CBD5E1", accent: "#94A3B8" },
  { id: "concrete", name: "Matte Concrete", color: "#64748B", border: "#475569", accent: "#334155" },
];

export const WALL_THEMES = [
  { id: "subway", name: "White Subway", color: "#F8FAFC", border: "#E2E8F0", pattern: "subway" },
  { id: "marble", name: "Italian Marble", color: "#F1F5F9", border: "#CBD5E1", pattern: "veins" },
  { id: "wood", name: "Wood Paneling", color: "#D8C4B6", border: "#B89D88", pattern: "wood" },
  { id: "slate", name: "Charcoal Slate", color: "#1E293B", border: "#334155", pattern: "slate" },
  { id: "travertine", name: "Sandstone", color: "#E5D3B3", border: "#C8B28C", pattern: "stone" },
];

// Helper to test rectangular box collisions
function isColliding(a, b) {
  if (!a || !b) return false;
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

// Helper to check if a fixture intersects the 90-degree door swing arc
export function doesInterfereWithDoor(item, door, roomWidthIn, roomDepthIn) {
  if (!item || !door) return false;
  if (item === door) return false;
  if (item.category === "mirror" || item.category === "window") return false;

  const side = door.wallSnapSide || (
    door.y <= 10 ? "top" :
      door.y >= roomDepthIn - 15 ? "bottom" :
        door.x <= 10 ? "left" :
          door.x >= roomWidthIn - 15 ? "right" : "bottom"
  );

  let cx = door.x;
  let cy = door.y;
  let R = door.w;
  let boxX = door.x;
  let boxY = door.y - R;
  let boxW = R;
  let boxH = R;

  if (side === "bottom") {
    cx = door.x;
    cy = door.y;
    R = door.w;
    boxX = door.x;
    boxY = door.y - R;
    boxW = R;
    boxH = R;
  } else if (side === "top") {
    cx = door.x;
    cy = door.y + door.h;
    R = door.w;
    boxX = door.x;
    boxY = door.y + door.h;
    boxW = R;
    boxH = R;
  } else if (side === "left") {
    cx = door.x + door.w;
    cy = door.y;
    R = door.h;
    boxX = door.x + door.w;
    boxY = door.y;
    boxW = R;
    boxH = R;
  } else if (side === "right") {
    cx = door.x;
    cy = door.y;
    R = door.h;
    boxX = door.x - R;
    boxY = door.y;
    boxW = R;
    boxH = R;
  }

  // 1. Quick bounding box check
  const bBox = { x: boxX, y: boxY, w: boxW, h: boxH };
  if (!isColliding(item, bBox)) return false;

  // 2. Exact Circle-Rectangle distance test to hinge (cx, cy)
  const closestX = Math.max(item.x, Math.min(cx, item.x + item.w));
  const closestY = Math.max(item.y, Math.min(cy, item.y + item.h));
  const dx = closestX - cx;
  const dy = closestY - cy;
  return (dx * dx + dy * dy) < (R * R);
}

export function hasIllegalOverlap(proposedState, roomWidthIn, roomDepthIn) {
  const keys = Object.keys(proposedState);

  // 1. Check inter-fixture collisions
  for (let i = 0; i < keys.length; i++) {
    for (let j = i + 1; j < keys.length; j++) {
      const kA = keys[i];
      const kB = keys[j];
      if ((kA === "washbasin" && kB === "cabinet") || (kA === "cabinet" && kB === "washbasin")) continue;
      if (kA === "mirror" || kB === "mirror") continue;
      if (kA === "window" || kB === "window") continue;

      if (isColliding(proposedState[kA], proposedState[kB])) {
        return true;
      }
    }
  }

  // 2. Check door swing arc interference
  const doorItem = proposedState.door;
  if (doorItem) {
    for (const key of keys) {
      if (key === "door" || key === "window" || key === "mirror") continue;
      if (doesInterfereWithDoor(proposedState[key], doorItem, roomWidthIn, roomDepthIn)) {
        return true;
      }
    }
  }

  return false;
}

export function adjustMirrorForWindowOverlap(items, roomWidthIn, roomDepthIn) {
  if (!items || !items.washbasin) return items;
  const washbasin = items.washbasin;
  const mirror = items.mirror;
  const win = items.window;

  let updated = { ...items };

  // 1. Mirror is ALWAYS centered directly behind/above the washbasin!
  if (mirror) {
    const mirX = Math.max(0, Math.min(roomWidthIn - mirror.w, washbasin.x + (washbasin.w - mirror.w) / 2));
    const mirY = washbasin.wallSnapSide === "bottom" ? Math.max(0, roomDepthIn - mirror.h) : 0;
    updated.mirror = {
      ...mirror,
      x: mirX,
      y: mirY,
      wallSnapSide: washbasin.wallSnapSide || "top",
    };
  }

  // 2. Ensure window NEVER intersects with mirror/washbasin on the same wall!
  const curMirror = updated.mirror || mirror;
  if (curMirror && win) {
    const mirSide = curMirror.wallSnapSide || "top";
    const winSide = win.wallSnapSide || "top";

    if (mirSide === winSide) {
      const mirLeft = curMirror.x - 2;
      const mirRight = curMirror.x + curMirror.w + 2;
      const winLeft = win.x;
      const winRight = win.x + win.w;

      if (winLeft < mirRight && winRight > mirLeft) {
        let newWinX = win.x;
        const mirCenter = curMirror.x + curMirror.w / 2;
        if (mirCenter >= roomWidthIn / 2) {
          // Mirror is on right half of wall -> shift window to left of mirror
          newWinX = Math.max(0, mirLeft - win.w - 4);
        } else {
          // Mirror is on left half of wall -> shift window to right of mirror
          newWinX = Math.min(roomWidthIn - win.w, mirRight + 4);
        }
        updated.window = {
          ...win,
          x: newWinX,
        };
      }
    }
  }

  return updated;
}

function findEmptySpaceForItem(item, itemKey, existingPlaced, roomWidthIn, roomDepthIn) {
  const step = 6;
  const candidatePositions = [];

  if (itemKey === "bathtub") {
    candidatePositions.push({ x: 4, y: 4, rot: 0, wallSnapSide: "top" });
    candidatePositions.push({ x: roomWidthIn - item.w - 4, y: 4, rot: 0, wallSnapSide: "top" });
    candidatePositions.push({ x: 4, y: roomDepthIn - item.h - 4, rot: 0, wallSnapSide: "bottom" });
    candidatePositions.push({ x: roomWidthIn - item.w - 4, y: roomDepthIn - item.h - 4, rot: 0, wallSnapSide: "bottom" });
  } else if (itemKey === "washbasin") {
    for (let x = 4; x <= roomWidthIn - item.w - 4; x += step) {
      candidatePositions.push({ x, y: 4, rot: 0, wallSnapSide: "top" });
    }
    for (let y = 4; y <= roomDepthIn - item.h - 4; y += step) {
      candidatePositions.push({ x: roomWidthIn - item.w - 4, y, rot: 270, wallSnapSide: "right" });
      candidatePositions.push({ x: 4, y, rot: 90, wallSnapSide: "left" });
    }
    for (let x = 4; x <= roomWidthIn - item.w - 4; x += step) {
      candidatePositions.push({ x, y: roomDepthIn - item.h - 4, rot: 180, wallSnapSide: "bottom" });
    }
  } else if (itemKey === "toilet") {
    // Prioritize bottom-left wall placement clear of top bathtub zone, then bottom wall, then right wall
    const minYForToilet = existingPlaced.bathtub ? Math.max(34, existingPlaced.bathtub.y + existingPlaced.bathtub.h + 6) : 34;
    for (let y = roomDepthIn - item.h - 4; y >= minYForToilet; y -= step) {
      candidatePositions.push({ x: 0, y, rot: 90, wallSnapSide: "left" });
    }
    for (let x = 4; x <= roomWidthIn - item.w - 4; x += step) {
      candidatePositions.push({ x, y: roomDepthIn - item.h - 4, rot: 180, wallSnapSide: "bottom" });
    }
    for (let y = 4; y <= roomDepthIn - item.h - 4; y += step) {
      candidatePositions.push({ x: roomWidthIn - item.w - 4, y, rot: 270, wallSnapSide: "right" });
    }
  } else {
    for (let y = 0; y <= roomDepthIn - item.h; y += step) {
      for (let x = 0; x <= roomWidthIn - item.w; x += step) {
        candidatePositions.push({ x, y });
      }
    }
  }

  for (const pos of candidatePositions) {
    if (pos.x < 0 || pos.y < 0 || (pos.x + item.w) > roomWidthIn || (pos.y + item.h) > roomDepthIn) {
      continue;
    }
    const testItem = { ...item, ...pos };
    const testState = { ...existingPlaced, [itemKey]: testItem };

    if (!hasIllegalOverlap(testState, roomWidthIn, roomDepthIn)) {
      return pos;
    }
  }
  return null;
}

export function autoArrangeLayout(currentItems, roomWidthIn, roomDepthIn, mode = "shower") {
  let itemsCopy = { ...currentItems };

  const bathZoneLabel = mode === "shower" ? "Shower Zone" : "Bathtub Zone";
  const bathZoneColor = mode === "shower" ? "#0EA5E9" : "#8B5CF6";
  const bathZoneCategory = mode === "shower" ? "shower" : "bathtub";
  const bathZoneHeight = mode === "shower" ? 84 : 22;

  const rawBathW = currentItems.bathtub?.w || 50;
  const rawBathH = currentItems.bathtub?.h || 28;
  const bathW = Math.max(rawBathW, rawBathH);
  const bathH = Math.min(rawBathW, rawBathH);

  itemsCopy.bathtub = {
    x: 4,
    y: 4,
    w: bathW,
    h: bathH,
    heightIn: bathZoneHeight,
    rot: 0,
    label: bathZoneLabel,
    color: bathZoneColor,
    minW: 30,
    maxW: 78,
    minH: 28,
    maxH: 72,
    category: bathZoneCategory,
    wallSnapSide: "top",
  };

  const placementOrder = ["door", "bathtub", "washbasin", "cabinet", "mirror", "window", "toilet", "towel_bar", "dustbin"];
  const placedState = {};
  const unfittedKeys = [];

  for (const key of placementOrder) {
    if (!itemsCopy[key]) continue;
    const item = itemsCopy[key];

    if (key === "cabinet" && placedState.washbasin) {
      const cabW = placedState.washbasin.w + 6;
      const cabH = placedState.washbasin.h + 6;
      const cabX = Math.max(0, placedState.washbasin.x - 3);
      const cabY = Math.max(0, placedState.washbasin.y - 3);
      placedState.cabinet = {
        ...item,
        x: cabX,
        y: cabY,
        w: cabW,
        h: cabH,
        rot: placedState.washbasin.rot,
        wallSnapSide: placedState.washbasin.wallSnapSide,
      };
      continue;
    }

    if (key === "mirror" && placedState.washbasin) {
      const mirX = Math.max(0, Math.min(roomWidthIn - item.w, placedState.washbasin.x + (placedState.washbasin.w - item.w) / 2));
      const mirY = placedState.washbasin.wallSnapSide === "bottom" ? Math.max(0, roomDepthIn - item.h) : 0;
      placedState.mirror = {
        ...item,
        x: mirX,
        y: mirY,
        wallSnapSide: placedState.washbasin.wallSnapSide || "top",
      };
      continue;
    }

    const fitsAsIs = !hasIllegalOverlap({ ...placedState, [key]: item }, roomWidthIn, roomDepthIn) &&
      item.x >= 0 && item.y >= 0 && (item.x + item.w) <= roomWidthIn && (item.y + item.h) <= roomDepthIn;

    if (fitsAsIs) {
      placedState[key] = { ...item };
      continue;
    }

    const newPos = findEmptySpaceForItem(item, key, placedState, roomWidthIn, roomDepthIn);
    if (newPos) {
      placedState[key] = { ...item, ...newPos };
    } else {
      unfittedKeys.push(key);
    }
  }

  for (const unfittedKey of unfittedKeys) {
    if (["towel_bar", "dustbin", "cabinet"].includes(unfittedKey)) {
      delete placedState[unfittedKey];
    }
  }

  let warningMsg = null;
  const majorUnfitted = unfittedKeys.filter((k) => !["towel_bar", "dustbin", "cabinet"].includes(k));

  if (majorUnfitted.length > 0) {
    const labels = majorUnfitted.map((k) => itemsCopy[k]?.label || k).join(", ");
    warningMsg = `Warning: Room dimensions (${Math.round(roomWidthIn / 12)}' × ${Math.round(roomDepthIn / 12)}') are too small to fit: ${labels}. Please expand room size or adjust layout.`;
  }

  return { arrangedItems: placedState, warningMsg, fitsSuccessfully: majorUnfitted.length === 0 };
}

export default function LayoutPlanner2D({
  roomWidthFt = 8,
  setRoomWidthFt,
  roomDepthFt = 6,
  setRoomDepthFt,
  roomHeightFt = 9,
  setRoomHeightFt,
  budgetInr = "",
  setBudgetInr,
  aestheticTheme = "Minimalist Modern",
  setAestheticTheme,
  floorTheme = "marble",
  wallTheme = "subway",
  onFloorThemeChange,
  onWallThemeChange,
  bathSectionMode = "shower",
  setBathSectionMode,
  itemsState,
  onItemsStateChange,
  onReset,
  onReloadGeneration,
}) {
  const roomWidthIn = Math.max(36, roomWidthFt * 12);
  const roomDepthIn = Math.max(36, roomDepthFt * 12);

  // Helper to adjust wall-snapped and bounded items when room width or depth increases or decreases
  useEffect(() => {
    if (!itemsState) return;
    let changed = false;
    const updated = { ...itemsState };

    Object.keys(updated).forEach((key) => {
      const item = updated[key];
      let newX = item.x;
      let newY = item.y;
      let wallSnapSide = item.wallSnapSide;

      const isBottom = wallSnapSide === "bottom" || (item.y + item.h >= roomDepthIn - 14);
      const isRight = wallSnapSide === "right" || (item.x + item.w >= roomWidthIn - 14);
      const isTop = wallSnapSide === "top" || item.y <= 4;
      const isLeft = wallSnapSide === "left" || item.x <= 4;

      if (isBottom) {
        const targetY = Math.max(0, roomDepthIn - item.h);
        if (newY !== targetY) {
          newY = targetY;
          changed = true;
        }
        wallSnapSide = "bottom";
      } else if (isTop) {
        if (newY !== 0) {
          newY = 0;
          changed = true;
        }
        wallSnapSide = "top";
      } else if (newY + item.h > roomDepthIn) {
        newY = Math.max(0, roomDepthIn - item.h);
        changed = true;
      }

      if (isRight) {
        const targetX = Math.max(0, roomWidthIn - item.w);
        if (newX !== targetX) {
          newX = targetX;
          changed = true;
        }
        wallSnapSide = "right";
      } else if (isLeft) {
        if (newX !== 0) {
          newX = 0;
          changed = true;
        }
        wallSnapSide = "left";
      } else if (newX + item.w > roomWidthIn) {
        newX = Math.max(0, roomWidthIn - item.w);
        changed = true;
      }

      if (changed) {
        updated[key] = { ...item, x: newX, y: newY, wallSnapSide };
      }
    });

    if (changed) {
      onItemsStateChange?.(updated);
    }
  }, [roomWidthIn, roomDepthIn]);

  // Scaled display canvas sizing with generous margins
  const maxDisplayWidth = 440;
  const scale = maxDisplayWidth / roomWidthIn;
  const displayWidth = maxDisplayWidth;
  const displayHeight = roomDepthIn * scale;

  const containerRef = useRef(null);
  const [selectedKey, setSelectedKey] = useState("washbasin");
  const [draggingKey, setDraggingKey] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Toggles for bathroom engineering & planning features
  const [showWetDryZones, setShowWetDryZones] = useState(true);
  const [showClearances, setShowClearances] = useState(true);
  const [showPlumbing, setShowPlumbing] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [fitWarning, setFitWarning] = useState(null);

  // Default fixture state dictionary (in inches)
  const defaultItems = {
    toilet: { x: 0, y: Math.max(34, roomDepthIn - 34), w: 16, h: 26, heightIn: 18, rot: 90, label: "Toilet", color: "#3B82F6", minW: 14, maxW: 24, minH: 18, maxH: 34, category: "toilet", wallSnapSide: "left" },
    washbasin: { x: Math.max(4, roomWidthIn - 32), y: 6, w: 22, h: 18, heightIn: 32, rot: 0, label: "Washbasin", color: "#10B981", minW: 14, maxW: 42, minH: 12, maxH: 28, category: "washbasin", wallSnapSide: "top" },
    cabinet: { x: Math.max(1, roomWidthIn - 35), y: 3, w: 28, h: 24, heightIn: 28, rot: 0, label: "Vanity Cabinet", color: "#2563EB", minW: 18, maxW: 60, minH: 16, maxH: 36, category: "cabinet", wallSnapSide: "top" },
    bathtub: { x: 4, y: 4, w: 50, h: 28, heightIn: 22, rot: 0, label: "Bathtub / Shower", color: "#8B5CF6", minW: 30, maxW: 78, minH: 28, maxH: 72, category: "bathtub", wallSnapSide: "top" },
    window: { x: Math.max(0, roomWidthIn / 2 - 16), y: 0, w: 32, h: 4, heightIn: 30, elevationIn: 54, rot: 0, label: "Window", color: "#0EA5E9", minW: 20, maxW: 72, minH: 3, maxH: 6, category: "window", isWallItem: true, wallSnapSide: "top" },
    door: { x: Math.max(4, roomWidthIn - 38), y: roomDepthIn - 4, w: 32, h: 4, heightIn: 84, rot: 180, label: "Door", color: "#F59E0B", minW: 24, maxW: 42, minH: 3, maxH: 6, category: "door", isWallItem: true, wallSnapSide: "bottom" },
    mirror: { x: Math.max(65, roomWidthIn - 31), y: 0, w: 26, h: 3, heightIn: 30, elevationIn: 40, rot: 0, label: "Vanity Mirror", color: "#EC4899", minW: 14, maxW: 48, minH: 2, maxH: 4, category: "mirror", isWallItem: true, wallSnapSide: "top" },
    towel_bar: { x: 0, y: Math.max(4, roomDepthIn / 2 - 12), w: 3, h: 24, heightIn: 4, elevationIn: 44, rot: 90, label: "Towel Bar", color: "#14B8A6", minW: 3, maxW: 4, minH: 12, maxH: 36, category: "towel_bar", isWallItem: true, wallSnapSide: "left" },
  };

  const items = itemsState || defaultItems;

  const updateItemsState = (nextState) => {
    const adjusted = adjustMirrorForWindowOverlap(nextState, roomWidthIn, roomDepthIn);
    onItemsStateChange?.(adjusted);
  };

  const handleBathModeSwitch = (newMode) => {
    setBathSectionMode?.(newMode);
    const { arrangedItems, warningMsg } = autoArrangeLayout(items || defaultItems, roomWidthIn, roomDepthIn, newMode);
    updateItemsState(arrangedItems);

    const userBudget = Number(budgetInr);
    if (newMode === "bathtub" && userBudget > 0 && userBudget < 34000) {
      setFitWarning(`Warning: Bathtub fixture (₹34,000) exceeds specified budget of ₹${userBudget.toLocaleString("en-IN")}.`);
    } else {
      setFitWarning(warningMsg);
    }
  };

  const handleReloadGeneration = () => {
    // Reload 3D scene & product bundle with respect to changes in 2D layout (without resetting 2D layout positions)
    onReloadGeneration?.();
  };

  // Drag start handler
  const handleMouseDown = (key, e) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedKey(key);
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const item = items[key];
    if (!item) return;

    const mouseXIn = (e.clientX - rect.left) / scale;
    const mouseYIn = (e.clientY - rect.top) / scale;

    setDraggingKey(key);
    setDragOffset({
      x: mouseXIn - item.x,
      y: mouseYIn - item.y,
    });
  };

  // Mouse move drag handler with logical wall snapping & wall orientation alignment
  const handleMouseMove = (e) => {
    if (!draggingKey || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const mouseXIn = (e.clientX - rect.left) / scale;
    const mouseYIn = (e.clientY - rect.top) / scale;

    const currentItem = items[draggingKey];
    if (!currentItem) return;

    let newX = mouseXIn - dragOffset.x;
    let newY = mouseYIn - dragOffset.y;

    if (snapToGrid) {
      newX = Math.round(newX / 6) * 6;
      newY = Math.round(newY / 6) * 6;
    }

    let newRot = currentItem.rot || 0;
    let newW = currentItem.w;
    let newH = currentItem.h;
    let wallSnapSide = currentItem.wallSnapSide || null;

    // Wall Snapping check for wall items as well as washbasin, cabinet, and toilet
    const isWallSnappable = currentItem.isWallItem || draggingKey === "door" || draggingKey === "window" || draggingKey === "washbasin" || draggingKey === "cabinet" || draggingKey === "mirror" || draggingKey === "toilet";

    if (isWallSnappable) {
      const isNarrowWallItem = currentItem.isWallItem || draggingKey === "door" || draggingKey === "window";
      const wallThickness = 4;
      const distTop = newY;
      const distBottom = roomDepthIn - (newY + currentItem.h);
      const distLeft = newX;
      const distRight = roomWidthIn - (newX + currentItem.w);
      const minDist = Math.min(distTop, distBottom, distLeft, distRight);
      const span = Math.max(currentItem.w, currentItem.h);

      if (minDist === distTop && (distTop < 20 || draggingKey === "toilet")) {
        newY = 0;
        if (isNarrowWallItem) { newW = span; newH = wallThickness; }
        newRot = 0;
        wallSnapSide = "top";
      } else if (minDist === distBottom && (distBottom < 20 || draggingKey === "toilet")) {
        newY = roomDepthIn - (isNarrowWallItem ? wallThickness : currentItem.h);
        if (isNarrowWallItem) { newW = span; newH = wallThickness; }
        newRot = 180;
        wallSnapSide = "bottom";
      } else if (minDist === distLeft && (distLeft < 20 || draggingKey === "toilet")) {
        newX = 0;
        if (isNarrowWallItem) { newW = wallThickness; newH = span; }
        newRot = 90;
        wallSnapSide = "left";
      } else if (minDist === distRight && (distRight < 20 || draggingKey === "toilet")) {
        newX = roomWidthIn - (isNarrowWallItem ? wallThickness : currentItem.w);
        if (isNarrowWallItem) { newW = wallThickness; newH = span; }
        newRot = 270;
        wallSnapSide = "right";
      }
    }

    newX = Math.max(0, Math.min(roomWidthIn - newW, newX));
    newY = Math.max(0, Math.min(roomDepthIn - newH, newY));

    if (!currentItem.isWallItem && draggingKey !== "cabinet" && draggingKey !== "toilet") {
      if (draggingKey === "bathtub") {
        if (newY <= 14) {
          newRot = 0;
          wallSnapSide = "top";
        } else if (newX <= 14) {
          newRot = 90;
          wallSnapSide = "left";
        } else if (newX >= roomWidthIn - newW - 14) {
          newRot = 270;
          wallSnapSide = "right";
        }
      } else {
        const cX = newX + newW / 2;
        const cY = newY + newH / 2;
        const distTop = cY;
        const distBottom = roomDepthIn - cY;
        const distLeft = cX;
        const distRight = roomWidthIn - cX;
        const minDist = Math.min(distTop, distBottom, distLeft, distRight);

        if (minDist === distTop) newRot = 0;
        else if (minDist === distBottom) newRot = 180;
        else if (minDist === distLeft) newRot = 90;
        else if (minDist === distRight) newRot = 270;
      }
    }

    const proposedState = {
      ...items,
      [draggingKey]: {
        ...currentItem,
        x: Math.round(newX * 10) / 10,
        y: Math.round(newY * 10) / 10,
        w: newW,
        h: newH,
        rot: newRot,
        wallSnapSide,
      },
    };

    if (draggingKey === "washbasin" && proposedState.cabinet) {
      const cabW = proposedState.washbasin.w + 6;
      const cabH = proposedState.washbasin.h + 6;
      proposedState.cabinet = {
        ...proposedState.cabinet,
        x: Math.max(0, proposedState.washbasin.x - 3),
        y: Math.max(0, proposedState.washbasin.y - 3),
        w: cabW,
        h: cabH,
        rot: proposedState.washbasin.rot,
        wallSnapSide: proposedState.washbasin.wallSnapSide,
      };
    } else if (draggingKey === "cabinet" && proposedState.washbasin) {
      const wbW = proposedState.washbasin.w;
      const wbH = proposedState.washbasin.h;
      proposedState.washbasin = {
        ...proposedState.washbasin,
        x: Math.max(0, proposedState.cabinet.x + (proposedState.cabinet.w - wbW) / 2),
        y: Math.max(0, proposedState.cabinet.y + (proposedState.cabinet.h - wbH) / 2),
        rot: proposedState.cabinet.rot,
        wallSnapSide: proposedState.cabinet.wallSnapSide,
      };
    }

    let illegalOverlap = false;
    const keys = Object.keys(proposedState);

    for (let i = 0; i < keys.length; i++) {
      for (let j = i + 1; j < keys.length; j++) {
        const kA = keys[i];
        const kB = keys[j];
        if ((kA === "washbasin" && kB === "cabinet") || (kA === "cabinet" && kB === "washbasin")) continue;
        if (kA === "mirror" || kB === "mirror") continue;
        if (kA === "window" || kB === "window") continue;

        if (isColliding(proposedState[kA], proposedState[kB])) {
          illegalOverlap = true;
          break;
        }
      }
      if (illegalOverlap) break;
    }

    if (!illegalOverlap) {
      updateItemsState(proposedState);
    }
  };

  const handleMouseUp = () => {
    setDraggingKey(null);
  };

  useEffect(() => {
    if (draggingKey) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [draggingKey, dragOffset, items, snapToGrid]);

  const handlePropChange = (key, prop, val) => {
    const numVal = parseFloat(val) || 0;
    const item = items[key];
    if (!item) return;

    let updatedItem = { ...item, [prop]: numVal };

    // Wall Attachment Adjustment when element dimensions change
    const isSnappedBottom = item.wallSnapSide === "bottom" || (item.y + item.h >= roomDepthIn - 4);
    const isSnappedRight = item.wallSnapSide === "right" || (item.x + item.w >= roomWidthIn - 4);
    const isSnappedTop = item.wallSnapSide === "top" || item.y <= 2;
    const isSnappedLeft = item.wallSnapSide === "left" || item.x <= 2;

    if (prop === "h") {
      if (isSnappedBottom) {
        updatedItem.y = Math.max(0, roomDepthIn - numVal);
      } else if (isSnappedTop) {
        updatedItem.y = 0;
      }
    } else if (prop === "w") {
      if (isSnappedRight) {
        updatedItem.x = Math.max(0, roomWidthIn - numVal);
      } else if (isSnappedLeft) {
        updatedItem.x = 0;
      }
    }

    let updatedItems = { ...items, [key]: updatedItem };

    if (key === "washbasin" && updatedItems.cabinet) {
      const cabW = updatedItem.w + 6;
      const cabH = updatedItem.h + 6;
      let cabX = Math.max(0, updatedItem.x - 3);
      let cabY = Math.max(0, updatedItem.y - 3);

      if (isSnappedBottom) cabY = Math.max(0, roomDepthIn - cabH);
      if (isSnappedTop) cabY = 0;
      if (isSnappedRight) cabX = Math.max(0, roomWidthIn - cabW);
      if (isSnappedLeft) cabX = 0;

      updatedItems.cabinet = {
        ...updatedItems.cabinet,
        w: cabW,
        h: cabH,
        x: cabX,
        y: cabY,
        wallSnapSide: updatedItem.wallSnapSide,
      };
    }

    updateItemsState(updatedItems);
  };

  const removeItem = (key) => {
    if (key === "washbasin" || key === "toilet" || key === "door") return;
    const copy = { ...items };
    delete copy[key];
    updateItemsState(copy);
    setSelectedKey("washbasin");
  };

  const handleAddOrSelectElement = (key) => {
    if (items[key]) {
      setSelectedKey(key);
      return;
    }

    const elementTemplates = {
      mirror: { x: Math.max(65, roomWidthIn - 31), y: 0, w: 26, h: 3, heightIn: 30, elevationIn: 40, rot: 0, label: "Vanity Mirror", color: "#EC4899", minW: 14, maxW: 48, minH: 2, maxH: 4, category: "mirror", isWallItem: true, wallSnapSide: "top" },
      window: { x: Math.max(0, roomWidthIn / 2 - 16), y: 0, w: 32, h: 4, heightIn: 30, elevationIn: 54, rot: 0, label: "Window", color: "#0EA5E9", minW: 20, maxW: 72, minH: 3, maxH: 6, category: "window", isWallItem: true, wallSnapSide: "top" },
      towel_bar: { x: 0, y: Math.max(4, roomDepthIn / 2 - 12), w: 3, h: 24, heightIn: 4, elevationIn: 44, rot: 90, label: "Towel Bar", color: "#14B8A6", minW: 3, maxW: 4, minH: 12, maxH: 36, category: "towel_bar", isWallItem: true, wallSnapSide: "left" },
      dustbin: { x: Math.max(4, roomWidthIn - 18), y: Math.max(4, roomDepthIn - 18), w: 12, h: 12, heightIn: 16, rot: 0, label: "Dustbin", color: "#64748B", minW: 8, maxW: 24, minH: 8, maxH: 24, category: "dustbin" },
      cabinet: { x: Math.max(1, roomWidthIn - 35), y: 3, w: 28, h: 24, heightIn: 28, rot: 0, label: "Vanity Cabinet", color: "#2563EB", minW: 18, maxW: 60, minH: 16, maxH: 36, category: "cabinet", wallSnapSide: "top" },
      bathtub: { x: 4, y: 4, w: 50, h: 28, heightIn: 22, rot: 0, label: "Bathtub / Shower", color: "#8B5CF6", minW: 30, maxW: 78, minH: 28, maxH: 72, category: "bathtub", wallSnapSide: "top" },
    };

    const template = elementTemplates[key];
    if (!template) return;

    const updated = { ...items, [key]: template };
    updateItemsState(updated);
    setSelectedKey(key);
  };

  const selectedItem = items[selectedKey];
  const selectedFloorObj = FLOOR_THEMES.find((t) => t.id === floorTheme) || FLOOR_THEMES[0];
  const selectedWallObj = WALL_THEMES.find((t) => t.id === wallTheme) || WALL_THEMES[0];

  return (
    <div style={{
      backgroundColor: "transparent",
      padding: "0",
      boxShadow: "none",
    }}>
      {/* Top Header Bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <div>
          <h3 style={{ margin: "0 0 4px 0", color: "#F8FAFC", fontSize: "1.3rem", fontWeight: "800" }}>
            2D Layout Planner
          </h3>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button
            type="button"
            onClick={handleReloadGeneration}
            style={{
              padding: "6px 14px",
              backgroundColor: GOLD,
              border: `1px solid ${GOLD}`,
              color: "#08090C",
              borderRadius: "6px",
              fontSize: "0.8rem",
              fontWeight: "700",
              cursor: "pointer",
              boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
            }}
          >
            Reload Generation
          </button>
          <button
            type="button"
            onClick={() => onReset?.()}
            style={{
              padding: "6px 14px",
              backgroundColor: "rgba(0, 0, 0, 0.5)",
              border: `1px solid ${GOLD}`,
              color: GOLD,
              borderRadius: "6px",
              fontSize: "0.8rem",
              fontWeight: "600",
              cursor: "pointer",
              marginRight: "54px",
            }}
          >
            Reset Layout
          </button>
        </div>
      </div>

      {/* Fit Warning Alert Message */}
      {fitWarning && (
        <div style={{
          backgroundColor: "rgba(239, 68, 68, 0.18)",
          border: "1.5px solid #EF4444",
          borderRadius: "8px",
          padding: "10px 16px",
          marginBottom: "16px",
          color: "#FCA5A5",
          fontSize: "0.85rem",
          fontWeight: "700",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          boxShadow: "0 4px 12px rgba(239, 68, 68, 0.25)",
        }}>
          <span style={{ fontSize: "1.2rem" }}>⚠️</span>
          <span>{fitWarning}</span>
        </div>
      )}

      {/* Side-by-Side Main Grid: 2D Canvas & Tool Dimensions Left, Room Specs & Controls Right */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: "24px", alignItems: "start" }}>

        {/* Left Column: 2D Interactive Canvas & Selected Tool Dimensions Below */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

          {/* 2D Interactive Canvas Box */}
          <div style={{
            position: "relative",
            width: "100%",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            padding: "40px 52px",
            backgroundColor: "rgba(6, 7, 9, 0.35)",
            borderRadius: "12px",
            border: `1px solid rgba(255, 255, 255, 0.2)`,
            boxSizing: "border-box",
            minHeight: "480px",
            boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
          }}>
            <div
              ref={containerRef}
              style={{
                position: "relative",
                width: `${displayWidth}px`,
                height: `${displayHeight}px`,
                backgroundColor: "#0F131D",
                border: `3px solid ${GOLD}`,
                borderRadius: "4px",
                overflow: "visible",
                backgroundImage: `
                  linear-gradient(to right, rgba(255,255,255,0.06) 1px, transparent 1px),
                  linear-gradient(to bottom, rgba(255,255,255,0.06) 1px, transparent 1px)
                `,
                backgroundSize: `${12 * scale}px ${12 * scale}px`,
                userSelect: "none",
                boxShadow: "0 8px 30px rgba(0,0,0,0.7), inset 0 0 20px rgba(0,0,0,0.5)",
              }}
            >
              {/* Wall Label Indicators */}
              <div style={{ position: "absolute", top: -26, left: "50%", transform: "translateX(-50%)", fontSize: "0.65rem", fontWeight: "700", color: GOLD, letterSpacing: "1px" }}>
                BACK WALL ({roomWidthFt} ft)
              </div>
              <div style={{ position: "absolute", bottom: -26, left: "50%", transform: "translateX(-50%)", fontSize: "0.65rem", fontWeight: "700", color: GOLD, letterSpacing: "1px" }}>
                FRONT WALL
              </div>
              <div style={{ position: "absolute", left: -56, top: "50%", transform: "translateY(-50%) rotate(-90deg)", fontSize: "0.65rem", fontWeight: "700", color: GOLD, letterSpacing: "1px", whiteSpace: "nowrap" }}>
                LEFT WALL
              </div>
              <div style={{ position: "absolute", right: -58, top: "50%", transform: "translateY(-50%) rotate(90deg)", fontSize: "0.65rem", fontWeight: "700", color: GOLD, letterSpacing: "1px", whiteSpace: "nowrap" }}>
                RIGHT WALL
              </div>

              {/* Wet Zone Overlay */}
              {showWetDryZones && items.bathtub && (() => {
                const isShowerMode = bathSectionMode === "shower" || items.bathtub.category === "shower";
                const wetLeftIn = Math.max(0, items.bathtub.x - 6);
                const wetTopIn = Math.max(0, items.bathtub.y - 6);
                const wetRightIn = Math.min(roomWidthIn, items.bathtub.x + items.bathtub.w + 12);
                const wetBottomIn = Math.min(roomDepthIn, items.bathtub.y + items.bathtub.h + 12);
                const wetWidthIn = Math.max(1, wetRightIn - wetLeftIn);
                const wetHeightIn = Math.max(1, wetBottomIn - wetTopIn);

                return (
                  <div
                    style={{
                      position: "absolute",
                      left: `${wetLeftIn * scale}px`,
                      top: `${wetTopIn * scale}px`,
                      width: `${wetWidthIn * scale}px`,
                      height: `${wetHeightIn * scale}px`,
                      backgroundColor: isShowerMode ? "rgba(14, 165, 233, 0.14)" : "rgba(139, 92, 246, 0.14)",
                      border: `1.5px dashed ${isShowerMode ? "#0EA5E9" : "#8B5CF6"}`,
                      borderRadius: "6px",
                      pointerEvents: "none",
                      display: "flex",
                      alignItems: "flex-end",
                      justifyContent: "flex-end",
                      padding: "4px 8px",
                      fontSize: "0.6rem",
                      color: isShowerMode ? "#0EA5E9" : "#C4B5FD",
                      fontWeight: "800",
                      letterSpacing: "0.5px",
                    }}
                  >
                    {isShowerMode ? "SHOWER WET ZONE" : "BATHTUB WET ZONE"}
                  </div>
                );
              })()}

              {/* Plumbing Lines */}
              {showPlumbing && items.washbasin && items.toilet && (
                <svg style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 2 }}>
                  <line
                    x1={(items.toilet.x + items.toilet.w / 2) * scale}
                    y1={(items.toilet.y + items.toilet.h / 2) * scale}
                    x2={(items.washbasin.x + items.washbasin.w / 2) * scale}
                    y2={(items.washbasin.y + items.washbasin.h / 2) * scale}
                    stroke="rgba(218, 157, 73, 0.3)"
                    strokeWidth="2"
                    strokeDasharray="4,4"
                  />
                </svg>
              )}

              {/* Render 2D Fixture Blocks */}
              {Object.keys(items).map((key) => {
                const item = items[key];
                const isSelected = selectedKey === key;
                const isDoor = key === "door" || item.category === "door";
                const isWindow = key === "window" || item.category === "window";
                const isCabinet = key === "cabinet";

                return (
                  <div key={key} style={{ position: "relative" }}>
                    {showClearances && !isDoor && !isWindow && !isCabinet && (
                      <div
                        style={{
                          position: "absolute",
                          left: `${(item.x - 8) * scale}px`,
                          top: `${(item.y - 8) * scale}px`,
                          width: `${(item.w + 16) * scale}px`,
                          height: `${(item.h + 16) * scale}px`,
                          border: "1px dashed rgba(245, 158, 11, 0.35)",
                          borderRadius: "6px",
                          pointerEvents: "none",
                          zIndex: 1,
                        }}
                      />
                    )}

                    {isDoor && showClearances && (() => {
                      const side = item.wallSnapSide || (
                        item.y <= 10 ? "top" :
                          item.y >= roomDepthIn - 15 ? "bottom" :
                            item.x <= 10 ? "left" :
                              item.x >= roomWidthIn - 15 ? "right" : "bottom"
                      );

                      let svgLeft = item.x * scale;
                      let svgTop = (item.y - item.w) * scale;
                      let svgW = item.w * scale;
                      let svgH = item.w * scale;
                      let pathD = `M 0 ${item.w * scale} A ${item.w * scale} ${item.w * scale} 0 0 1 ${item.w * scale} 0 L 0 ${item.w * scale} Z`;

                      if (side === "top") {
                        svgTop = (item.y + item.h) * scale;
                        pathD = `M 0 0 A ${item.w * scale} ${item.w * scale} 0 0 0 ${item.w * scale} ${item.w * scale} L 0 0 Z`;
                      } else if (side === "left") {
                        svgLeft = (item.x + item.w) * scale;
                        svgTop = item.y * scale;
                        svgW = item.h * scale;
                        svgH = item.h * scale;
                        pathD = `M 0 0 A ${item.h * scale} ${item.h * scale} 0 0 1 ${item.h * scale} ${item.h * scale} L 0 0 Z`;
                      } else if (side === "right") {
                        svgLeft = (item.x - item.h) * scale;
                        svgTop = item.y * scale;
                        svgW = item.h * scale;
                        svgH = item.h * scale;
                        pathD = `M ${item.h * scale} 0 A ${item.h * scale} ${item.h * scale} 0 0 0 0 ${item.h * scale} L ${item.h * scale} 0 Z`;
                      }

                      return (
                        <svg
                          style={{
                            position: "absolute",
                            left: `${svgLeft}px`,
                            top: `${svgTop}px`,
                            width: `${svgW}px`,
                            height: `${svgH}px`,
                            pointerEvents: "none",
                            zIndex: 2,
                          }}
                        >
                          <path
                            d={pathD}
                            fill="rgba(245, 158, 11, 0.08)"
                            stroke="#F59E0B"
                            strokeWidth="1.5"
                            strokeDasharray="3,3"
                          />
                        </svg>
                      );
                    })()}

                    <div
                      onMouseDown={(e) => handleMouseDown(key, e)}
                      onClick={() => setSelectedKey(key)}
                      style={{
                        position: "absolute",
                        left: `${item.x * scale}px`,
                        top: `${item.y * scale}px`,
                        width: `${Math.max(8, item.w) * scale}px`,
                        height: `${Math.max(8, item.h) * scale}px`,
                        backgroundColor: item.color,
                        color: "#FFFFFF",
                        borderRadius: isCabinet ? "2px" : (isDoor || isWindow ? "1px" : "6px"),
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "0.65rem",
                        fontWeight: "700",
                        cursor: draggingKey === key ? "grabbing" : "grab",
                        boxShadow: isSelected ? `0 0 0 3px ${GOLD}, 0 6px 16px rgba(0,0,0,0.6)` : "0 3px 8px rgba(0,0,0,0.4)",
                        transform: `rotate(${item.rot || 0}deg) ${draggingKey === key ? "scale(1.05)" : "scale(1)"}`,
                        transition: draggingKey === key ? "none" : "transform 0.15s ease, box-shadow 0.15s ease",
                        border: isSelected ? "2px solid #FFFFFF" : "1px solid rgba(255,255,255,0.3)",
                        zIndex: isSelected ? 20 : (isCabinet ? 2 : 10),
                        textAlign: "center",
                        padding: "2px",
                        boxSizing: "border-box",
                      }}
                    >
                      {!isDoor && !isWindow && (
                        <div
                          style={{
                            position: "absolute",
                            bottom: 0,
                            left: 0,
                            right: 0,
                            height: "4px",
                            backgroundColor: GOLD,
                            borderRadius: "0 0 4px 4px",
                            pointerEvents: "none",
                          }}
                        />
                      )}

                      <div style={{ transform: `rotate(${- (item.rot || 0)}deg)`, pointerEvents: "none", whiteSpace: "nowrap" }}>
                        <div>{item.label}</div>
                        <div style={{ fontSize: "0.55rem", opacity: 0.85, fontWeight: "400" }}>
                          {Math.round(item.w)}" × {Math.round(item.h)}"
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* SELECTED TOOL DIMENSIONS & CONTROLS MENU (BELOW 2D PLANNER CANVAS AREA) */}
          <div style={{
            padding: "18px 22px",
            backgroundColor: "rgba(10, 14, 24, 0.35)",
            borderRadius: "12px",
            border: `1px solid rgba(255, 255, 255, 0.2)`,
            boxShadow: "0 6px 20px rgba(0,0,0,0.3)",
          }}>
            {selectedItem ? (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "10px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span style={{ width: "12px", height: "12px", borderRadius: "50%", backgroundColor: selectedItem.color, boxShadow: "0 0 8px currentColor" }} />
                    <span style={{ fontSize: "0.95rem", fontWeight: "800", color: "#F8FAFC", letterSpacing: "0.5px" }}>
                      Selected Tool: {selectedItem.label}
                    </span>
                  </div>

                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      type="button"
                      onClick={() => {
                        const nextRot = ((selectedItem.rot || 0) + 90) % 360;
                        handlePropChange(selectedKey, "rot", nextRot);
                      }}
                      style={{
                        padding: "6px 14px",
                        backgroundColor: GOLD,
                        color: "#08090C",
                        border: "none",
                        borderRadius: "6px",
                        fontSize: "0.78rem",
                        fontWeight: "800",
                        cursor: "pointer",
                      }}
                    >
                      Rotate 90° ({selectedItem.rot || 0}°)
                    </button>

                    {!["washbasin", "toilet", "door"].includes(selectedKey) && (
                      <button
                        type="button"
                        onClick={() => removeItem(selectedKey)}
                        style={{
                          padding: "6px 14px",
                          backgroundColor: "rgba(239, 68, 68, 0.2)",
                          color: "#EF4444",
                          border: "1px solid #EF4444",
                          borderRadius: "6px",
                          fontSize: "0.78rem",
                          fontWeight: "700",
                          cursor: "pointer",
                        }}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "20px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.78rem", fontWeight: "700", color: GOLD, marginBottom: "4px" }}>
                      Width (inches): {selectedItem.w}"
                    </label>
                    <input
                      type="range"
                      min={selectedItem.minW || 10}
                      max={selectedItem.maxW || 80}
                      value={selectedItem.w}
                      onChange={(e) => handlePropChange(selectedKey, "w", e.target.value)}
                      style={{ width: "100%", accentColor: GOLD }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "0.78rem", fontWeight: "700", color: GOLD, marginBottom: "4px" }}>
                      Depth / Length (inches): {selectedItem.h}"
                    </label>
                    <input
                      type="range"
                      min={selectedItem.minH || 10}
                      max={selectedItem.maxH || 80}
                      value={selectedItem.h}
                      onChange={(e) => handlePropChange(selectedKey, "h", e.target.value)}
                      style={{ width: "100%", accentColor: GOLD }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "0.78rem", fontWeight: "700", color: GOLD, marginBottom: "4px" }}>
                      Height (inches): {selectedItem.heightIn || 30}"
                    </label>
                    <input
                      type="range"
                      min="10"
                      max="96"
                      value={selectedItem.heightIn || 30}
                      onChange={(e) => handlePropChange(selectedKey, "heightIn", e.target.value)}
                      style={{ width: "100%", accentColor: GOLD }}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ fontSize: "0.85rem", color: TEXT_MUTED, textAlign: "center", padding: "10px 0" }}>
                Select an element on the 2D layout canvas above to inspect and adjust its dimensions.
              </div>
            )}
          </div>

          {/* SURFACE THEMES CARD (FLOOR & WALL SURFACE THEMES BELOW SELECTED TOOL AT THE BOTTOM) */}
          <div style={{
            padding: "16px 22px",
            backgroundColor: "rgba(10, 14, 24, 0.35)",
            borderRadius: "12px",
            border: `1px solid rgba(255, 255, 255, 0.2)`,
            boxShadow: "0 6px 20px rgba(0,0,0,0.3)",
          }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
              {/* Floor Surface Theme Dropdown */}
              <div>
                <label style={{ display: "block", fontSize: "0.75rem", fontWeight: "700", color: GOLD, marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Floor Surface Theme
                </label>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", backgroundColor: "#161B26", border: `1.5px solid ${BORDER_COLOR}`, borderRadius: "6px", padding: "4px 10px" }}>
                  <span style={{ width: "16px", height: "16px", borderRadius: "3px", backgroundColor: selectedFloorObj.color, border: `1px solid ${selectedFloorObj.border}`, flexShrink: 0 }} />
                  <select
                    value={floorTheme}
                    onChange={(e) => onFloorThemeChange?.(e.target.value)}
                    style={{
                      flex: 1,
                      padding: "6px 0",
                      backgroundColor: "transparent",
                      border: "none",
                      color: "#FFFFFF",
                      fontSize: "0.85rem",
                      fontWeight: "600",
                      outline: "none",
                      cursor: "pointer",
                    }}
                  >
                    {FLOOR_THEMES.map((theme) => (
                      <option key={theme.id} value={theme.id} style={{ backgroundColor: "#161B26", color: "#FFFFFF" }}>
                        {theme.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Wall Tile Theme Dropdown */}
              <div>
                <label style={{ display: "block", fontSize: "0.75rem", fontWeight: "700", color: GOLD, marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Wall Tile / Surface Theme
                </label>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", backgroundColor: "#161B26", border: `1.5px solid ${BORDER_COLOR}`, borderRadius: "6px", padding: "4px 10px" }}>
                  <span style={{ width: "16px", height: "16px", borderRadius: "3px", backgroundColor: selectedWallObj.color, border: `1px solid ${selectedWallObj.border}`, flexShrink: 0 }} />
                  <select
                    value={wallTheme}
                    onChange={(e) => onWallThemeChange?.(e.target.value)}
                    style={{
                      flex: 1,
                      padding: "6px 0",
                      backgroundColor: "transparent",
                      border: "none",
                      color: "#FFFFFF",
                      fontSize: "0.85rem",
                      fontWeight: "600",
                      outline: "none",
                      cursor: "pointer",
                    }}
                  >
                    {WALL_THEMES.map((theme) => (
                      <option key={theme.id} value={theme.id} style={{ backgroundColor: "#161B26", color: "#FFFFFF" }}>
                        {theme.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Right Column: Controls Sidebar */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

          {/* Bath Section Setup Options (Walk-In Shower Enclosure vs Bathtub Zone) */}
          <div style={{
            padding: "16px",
            backgroundColor: "rgba(10, 14, 24, 0.35)",
            borderRadius: "10px",
            border: "1px solid rgba(255, 255, 255, 0.18)",
          }}>
            <div style={{ fontSize: "0.78rem", fontWeight: "800", color: "#FFFFFF", marginBottom: "10px", textTransform: "uppercase", letterSpacing: "0.6px" }}>
              Bath Section Setup
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              <button
                type="button"
                onClick={() => handleBathModeSwitch("shower")}
                style={{
                  padding: "9px 12px",
                  backgroundColor: bathSectionMode === "shower" ? "#D97E3A" : "rgba(0, 0, 0, 0.4)",
                  color: "#FFFFFF",
                  border: bathSectionMode === "shower" ? "1.5px solid #FFD166" : "1px solid rgba(255, 255, 255, 0.2)",
                  borderRadius: "6px",
                  fontSize: "0.78rem",
                  fontWeight: "800",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  boxShadow: bathSectionMode === "shower" ? "0 4px 12px rgba(217, 126, 58, 0.4)" : "none",
                }}
              >
                Shower Enclosure
              </button>
              <button
                type="button"
                onClick={() => handleBathModeSwitch("bathtub")}
                style={{
                  padding: "9px 12px",
                  backgroundColor: bathSectionMode === "bathtub" ? "#D97E3A" : "rgba(0, 0, 0, 0.4)",
                  color: "#FFFFFF",
                  border: bathSectionMode === "bathtub" ? "1.5px solid #FFD166" : "1px solid rgba(255, 255, 255, 0.2)",
                  borderRadius: "6px",
                  fontSize: "0.78rem",
                  fontWeight: "800",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  boxShadow: bathSectionMode === "bathtub" ? "0 4px 12px rgba(217, 126, 58, 0.4)" : "none",
                }}
              >
                Bathtub Zone
              </button>
            </div>
          </div>

          {/* Add Basic Elements Menu */}
          <div style={{
            padding: "16px",
            backgroundColor: "rgba(10, 14, 24, 0.35)",
            borderRadius: "10px",
            border: "1px solid rgba(255, 255, 255, 0.18)",
          }}>
            <div style={{ fontSize: "0.78rem", fontWeight: "800", color: "#FFFFFF", marginBottom: "12px", textTransform: "uppercase", letterSpacing: "0.6px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span>Add Basic Elements</span>
              <span style={{ fontSize: "0.7rem", color: "#94A3B8", textTransform: "none", fontWeight: "400" }}>Click to insert</span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              {[
                { key: "mirror", label: "Mirror", color: "#EC4899" },
                { key: "window", label: "Window", color: "#0EA5E9" },
                { key: "towel_bar", label: "Towel Bar", color: "#14B8A6" },
                { key: "dustbin", label: "Dustbin", color: "#64748B" },
                { key: "cabinet", label: "Cabinet", color: "#2563EB" },
                { key: "bathtub", label: "Bathtub", color: "#8B5CF6" },
              ].map((elem) => {
                const isPresent = !!items[elem.key];
                return (
                  <button
                    key={elem.key}
                    type="button"
                    onClick={() => handleAddOrSelectElement(elem.key)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "8px 10px",
                      backgroundColor: isPresent ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.4)",
                      border: isPresent ? `1.5px solid ${elem.color}` : "1px solid rgba(255, 255, 255, 0.15)",
                      borderRadius: "6px",
                      color: "#FFFFFF",
                      fontSize: "0.78rem",
                      fontWeight: "700",
                      cursor: "pointer",
                      transition: "all 0.18s ease",
                      textAlign: "left",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.15)";
                      e.currentTarget.style.borderColor = elem.color;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = isPresent ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.4)";
                      e.currentTarget.style.borderColor = isPresent ? elem.color : "rgba(255, 255, 255, 0.15)";
                    }}
                  >
                    <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: elem.color, flexShrink: 0 }} />
                    <span style={{ flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{elem.label}</span>
                    {isPresent ? (
                      <span style={{ fontSize: "0.65rem", color: elem.color, fontWeight: "800" }}>✓</span>
                    ) : (
                      <span style={{ fontSize: "0.75rem", color: "#94A3B8", fontWeight: "700" }}>+</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Room Dimensions & Specifications Card */}
          <div style={{
            padding: "16px",
            backgroundColor: "rgba(10, 14, 24, 0.35)",
            borderRadius: "10px",
            border: "1px solid rgba(255, 255, 255, 0.18)",
          }}>
            <div style={{ fontSize: "0.75rem", fontWeight: "700", color: GOLD, marginBottom: "12px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Room Dimensions & Specs
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {setRoomWidthFt && (
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", color: TEXT_MUTED, marginBottom: "4px" }}>
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
              )}

              {setRoomDepthFt && (
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", color: TEXT_MUTED, marginBottom: "4px" }}>
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
              )}

              {setRoomHeightFt && (
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", color: TEXT_MUTED, marginBottom: "4px" }}>
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
              )}

              {setBudgetInr && (
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", color: TEXT_MUTED, marginBottom: "4px" }}>
                    Budget (INR)
                  </label>
                  <input
                    type="number"
                    step="10000"
                    min="0"
                    value={budgetInr === 0 || budgetInr === null || budgetInr === undefined ? "" : budgetInr}
                    onChange={(e) => setBudgetInr?.(e.target.value)}
                    placeholder="Enter budget in INR"
                    style={{
                      width: "100%",
                      padding: "6px 10px",
                      backgroundColor: "#161B26",
                      border: `1px solid ${BORDER_COLOR}`,
                      borderRadius: "6px",
                      color: "#F8FAFC",
                      fontSize: "0.85rem",
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              )}

              {setAestheticTheme && (
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", color: TEXT_MUTED, marginBottom: "4px" }}>
                    Aesthetic Style Theme
                  </label>
                  <select
                    value={aestheticTheme || "Minimalist Modern"}
                    onChange={(e) => setAestheticTheme(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "6px 10px",
                      backgroundColor: "#161B26",
                      border: `1px solid ${BORDER_COLOR}`,
                      borderRadius: "6px",
                      color: "#F8FAFC",
                      fontSize: "0.85rem",
                      outline: "none",
                      cursor: "pointer",
                      boxSizing: "border-box",
                    }}
                  >
                    <option value="Minimalist Modern">Minimalist Modern</option>
                    <option value="Classic Luxury">Classic Luxury</option>
                    <option value="Japanese Zen">Japanese Zen</option>
                  </select>
                </div>
              )}
            </div>
          </div>



          {/* Feature Toggles */}
          <div style={{
            padding: "14px 16px",
            backgroundColor: "rgba(10, 14, 24, 0.35)",
            borderRadius: "10px",
            border: "1px solid rgba(255, 255, 255, 0.18)",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            fontSize: "0.78rem",
            color: TEXT_MUTED,
          }}>
            <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", userSelect: "none" }}>
              <input
                type="checkbox"
                checked={showWetDryZones}
                onChange={(e) => setShowWetDryZones(e.target.checked)}
                style={{ accentColor: GOLD }}
              />
              Wet & Dry Zone Overlays
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", userSelect: "none" }}>
              <input
                type="checkbox"
                checked={showClearances}
                onChange={(e) => setShowClearances(e.target.checked)}
                style={{ accentColor: GOLD }}
              />
              Fixture Clearance Boundaries
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", userSelect: "none" }}>
              <input
                type="checkbox"
                checked={showPlumbing}
                onChange={(e) => setShowPlumbing(e.target.checked)}
                style={{ accentColor: GOLD }}
              />
              Plumbing Drain Lines
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", userSelect: "none" }}>
              <input
                type="checkbox"
                checked={snapToGrid}
                onChange={(e) => setSnapToGrid(e.target.checked)}
                style={{ accentColor: GOLD }}
              />
              Snap to Grid (6")
            </label>
          </div>

        </div>

      </div>
    </div>
  );
}
