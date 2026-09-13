import { useState, useRef, useEffect } from "react";

const ORANGE = "#D97E3A";
const DARK_ORANGE = "#B86A2A";
const PEACH = "#E8B4A0";
const WHITE = "#FFFFFF";

function isColliding(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export default function LayoutPlanner2D({ roomWidthFt, roomDepthFt, customLayout, onChange, onReset }) {
  const roomWidthIn = roomWidthFt * 12;
  const roomDepthIn = roomDepthFt * 12;

  // Scale 2D room box to fit 340px container max width
  const maxDisplayWidth = 340;
  const scale = maxDisplayWidth / roomWidthIn;
  const displayWidth = maxDisplayWidth;
  const displayHeight = roomDepthIn * scale;

  const containerRef = useRef(null);
  const [selectedItemKey, setSelectedItemKey] = useState("washbasin");
  const [draggingItem, setDraggingItem] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Default positions & dimensions in inches
  const [itemsState, setItemsState] = useState({
    toilet: { x: 2, y: 2, w: 16, h: 24, rot: 0, label: "Toilet", color: "#2563EB", minW: 14, maxW: 24, minH: 18, maxH: 32 },
    washbasin: { x: Math.max(2, roomWidthIn - 28), y: 6, w: 20, h: 16, rot: 0, label: "Washbasin", color: "#059669", minW: 14, maxW: 36, minH: 12, maxH: 26 },
    cabinet: { x: Math.max(0, roomWidthIn - 34), y: 3, w: 26, h: 22, rot: 0, label: "Cabinet (+3\" Margin)", color: "#3B82F6", minW: 20, maxW: 48, minH: 18, maxH: 32 },
    bathtub: { x: 2, y: Math.max(2, roomDepthIn - 34), w: 60, h: 30, rot: 0, label: "Bathtub / Shower", color: "#7C3AED", minW: 30, maxW: 72, minH: 30, maxH: 72 },
    window: { x: Math.max(0, roomWidthIn / 2 - 20), y: 0, w: 40, h: 3, rot: 0, label: "Window", color: "#0284C7", minW: 20, maxW: 60, minH: 3, maxH: 3 },
    door: { x: Math.max(2, roomWidthIn / 2 - 16), y: roomDepthIn - 3, w: 32, h: 3, rot: 180, label: "Door", color: "#B45309", minW: 24, maxW: 42, minH: 3, maxH: 3 },
  });

  // Sync custom layout prop if provided
  useEffect(() => {
    if (customLayout) {
      setItemsState((prev) => {
        const next = { ...prev };
        Object.keys(customLayout).forEach((key) => {
          if (next[key]) {
            next[key] = {
              ...next[key],
              x: customLayout[key].x ?? next[key].x,
              y: customLayout[key].y ?? next[key].y,
              w: customLayout[key].w ?? next[key].w,
              h: customLayout[key].h ?? next[key].h,
              rot: customLayout[key].rot ?? next[key].rot ?? 0,
            };
          }
        });
        return next;
      });
    }
  }, [customLayout]);

  // Helper to notify parent form of layout changes with 3-inch cabinet rule enforced
  const emitChange = (newState) => {
    const sinkW = newState.washbasin.w;
    const sinkH = newState.washbasin.h;
    const minCabW = sinkW + 6;
    const minCabH = sinkH + 6;

    const cabW = Math.max(minCabW, newState.cabinet.w);
    const cabH = Math.max(minCabH, newState.cabinet.h);

    const payload = {
      toilet: { x: newState.toilet.x, y: newState.toilet.y, w: newState.toilet.w, h: newState.toilet.h, rot: newState.toilet.rot || 0 },
      washbasin: { x: newState.washbasin.x, y: newState.washbasin.y, w: newState.washbasin.w, h: newState.washbasin.h, rot: newState.washbasin.rot || 0 },
      cabinet: { x: newState.washbasin.x - 3, y: Math.max(0, newState.washbasin.y - 3), w: cabW, h: cabH, rot: newState.washbasin.rot || 0 },
      bathtub: { x: newState.bathtub.x, y: newState.bathtub.y, w: newState.bathtub.w, h: newState.bathtub.h, rot: newState.bathtub.rot || 0 },
      window: { x: newState.window.x, y: newState.window.y, w: newState.window.w, h: newState.window.h, rot: newState.window.rot || 0 },
      door: { x: newState.door.x, y: newState.door.y, w: newState.door.w, h: newState.door.h, rot: newState.door.rot || 0 },
    };

    onChange?.(payload);
  };

  const handleMouseDown = (key, e) => {
    e.preventDefault();
    setSelectedItemKey(key);
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const item = itemsState[key];
    const mouseXIn = (e.clientX - rect.left) / scale;
    const mouseYIn = (e.clientY - rect.top) / scale;

    setDraggingItem(key);
    setDragOffset({
      x: mouseXIn - item.x,
      y: mouseYIn - item.y,
    });
  };

  const handleMouseMove = (e) => {
    if (!draggingItem || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const mouseXIn = (e.clientX - rect.left) / scale;
    const mouseYIn = (e.clientY - rect.top) / scale;

    const currentItem = itemsState[draggingItem];
    let newX = Math.max(0, Math.min(roomWidthIn - currentItem.w, mouseXIn - dragOffset.x));
    let newY = Math.max(0, Math.min(roomDepthIn - currentItem.h, mouseYIn - dragOffset.y));

    // Snap wall fixtures (window, door) to nearest wall edge and make them thin along that wall
    let newRot = currentItem.rot || 0;
    let newW = currentItem.w;
    let newH = currentItem.h;

    if (draggingItem === "window" || draggingItem === "door") {
      const distTop = newY;
      const distBottom = roomDepthIn - (newY + currentItem.h);
      const distLeft = newX;
      const distRight = roomWidthIn - (newX + currentItem.w);

      const minDist = Math.min(distTop, distBottom, distLeft, distRight);
      const span = Math.max(currentItem.w, currentItem.h);

      if (minDist === distTop && distTop < 24) {
        newY = 0;
        newW = span;
        newH = 3;
        newRot = 0;
      } else if (minDist === distBottom && distBottom < 24) {
        newY = roomDepthIn - 3;
        newW = span;
        newH = 3;
        newRot = 180;
      } else if (minDist === distLeft && distLeft < 24) {
        newX = 0;
        newW = 3;
        newH = span;
        newRot = 90;
      } else if (minDist === distRight && distRight < 24) {
        newX = roomWidthIn - 3;
        newW = 3;
        newH = span;
        newRot = 270;
      }
    }

    const roundX = Math.round(newX * 10) / 10;
    const roundY = Math.round(newY * 10) / 10;

    const proposedState = {
      ...itemsState,
      [draggingItem]: {
        ...currentItem,
        x: roundX,
        y: roundY,
        w: newW,
        h: newH,
        rot: newRot,
      },
    };

    // If washbasin moves, sync cabinet automatically to same wall
    if (draggingItem === "washbasin") {
      proposedState.cabinet = {
        ...proposedState.cabinet,
        x: Math.max(0, roundX - 3),
        y: Math.max(0, roundY - 3),
        rot: currentItem.rot || 0,
      };
    }

    // Overlap Validation: No fixtures other than Washbasin & Cabinet may overlap!
    let hasIllegalOverlap = false;
    const keys = Object.keys(proposedState);

    for (let i = 0; i < keys.length; i++) {
      for (let j = i + 1; j < keys.length; j++) {
        const kA = keys[i];
        const kB = keys[j];

        // Sink and Cabinet Counter Platform ARE allowed to overlap
        if ((kA === "washbasin" && kB === "cabinet") || (kA === "cabinet" && kB === "washbasin")) continue;
        // Mirror and Sink/Cabinet ARE allowed to align on wall
        if (kA === "mirror" || kB === "mirror") {
          if (kA === "washbasin" || kB === "washbasin" || kA === "cabinet" || kB === "cabinet") continue;
        }

        if (isColliding(proposedState[kA], proposedState[kB])) {
          hasIllegalOverlap = true;
          break;
        }
      }
      if (hasIllegalOverlap) break;
    }

    // If valid non-overlapping position, apply state update
    if (!hasIllegalOverlap) {
      setItemsState(proposedState);
      emitChange(proposedState);
    }
  };

  const handleMouseUp = () => {
    setDraggingItem(null);
  };

  useEffect(() => {
    if (draggingItem) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [draggingItem, dragOffset, itemsState]);

  const handleDimensionChange = (key, dim, val) => {
    const numVal = parseFloat(val) || 0;
    const current = itemsState[key];
    const updated = {
      ...itemsState,
      [key]: {
        ...current,
        [dim]: numVal,
      },
    };

    // If washbasin size changes, enforce cabinet is at least 3" bigger on each side & update mirror width
    if (key === "washbasin") {
      const minCabW = updated.washbasin.w + 6;
      const minCabH = updated.washbasin.h + 6;
      updated.cabinet.w = Math.max(minCabW, updated.cabinet.w);
      updated.cabinet.h = Math.max(minCabH, updated.cabinet.h);
      updated.mirror.w = updated.washbasin.w;
      updated.mirror.x = updated.washbasin.x;
      updated.mirror.y = 0;
      updated.mirror.h = 3;
    }

    setItemsState(updated);
    emitChange(updated);
  };

  const selectedItem = itemsState[selectedItemKey];

  return (
    <div style={{ marginTop: "12px", marginBottom: "16px", backgroundColor: "#1E293B", borderRadius: "8px", border: `1px solid #334155`, padding: "14px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
        <span style={{ fontSize: "0.85rem", fontWeight: "700", color: "#FFD166" }}>
          Interactive 2D Room & Dimension Painter
        </span>
        <button
          type="button"
          onClick={onReset}
          style={{
            fontSize: "0.75rem",
            color: ORANGE,
            background: "none",
            border: "none",
            textDecoration: "underline",
            cursor: "pointer",
            fontWeight: "600",
          }}
        >
          Reset All
        </button>
      </div>

      <div style={{ fontSize: "0.75rem", color: "#94A3B8", marginBottom: "10px" }}>
        Drag blocks to position fixtures. Click any item to adjust size or rotate orientation:
      </div>

      {/* 2D Canvas Floorplan Grid */}
      <div
        ref={containerRef}
        style={{
          position: "relative",
          width: `${displayWidth}px`,
          height: `${displayHeight}px`,
          backgroundColor: "#0F172A",
          border: `2px dashed ${ORANGE}`,
          borderRadius: "6px",
          overflow: "hidden",
          margin: "0 auto 12px auto",
          backgroundImage: `
            linear-gradient(to right, rgba(255,255,255,0.08) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255,255,255,0.08) 1px, transparent 1px)
          `,
          backgroundSize: `${12 * scale}px ${12 * scale}px`, // 1-foot grid lines
          userSelect: "none",
          boxShadow: "inset 0 2px 6px rgba(0,0,0,0.4)",
        }}
      >
        <div style={{ position: "absolute", top: 2, left: "50%", transform: "translateX(-50%)", fontSize: "0.6rem", color: "#64748B", fontWeight: "700" }}>
          BACK WALL
        </div>

        {/* Render 2D Fixture Blocks */}
        {Object.keys(itemsState).map((key) => {
          const item = itemsState[key];
          const isSelected = selectedItemKey === key;
          const isCabinet = key === "cabinet";
          const isMirror = key === "mirror";

          return (
            <div
              key={key}
              onMouseDown={(e) => handleMouseDown(key, e)}
              onClick={() => setSelectedItemKey(key)}
              style={{
                position: "absolute",
                left: `${item.x * scale}px`,
                top: `${item.y * scale}px`,
                width: `${Math.max(10, item.w) * scale}px`,
                height: `${Math.max(isMirror ? 3 : 10, item.h) * scale}px`,
                backgroundColor: item.color,
                color: "#FFFFFF",
                borderRadius: isCabinet ? "2px" : (isMirror ? "1px" : "4px"),
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.6rem",
                fontWeight: "700",
                cursor: draggingItem === key ? "grabbing" : "grab",
                boxShadow: isSelected ? "0 0 0 3px #D97E3A, 0 4px 12px rgba(0,0,0,0.5)" : "0 2px 6px rgba(0,0,0,0.3)",
                transform: `rotate(${item.rot || 0}deg) ${draggingItem === key ? "scale(1.04)" : "scale(1)"}`,
                transition: draggingItem === key ? "none" : "transform 0.2s ease, box-shadow 0.15s ease",
                border: isSelected ? "2px solid #FFD166" : "1px solid rgba(255,255,255,0.4)",
                zIndex: isSelected ? 10 : (isMirror ? 4 : (isCabinet ? 1 : 3)),
                textAlign: "center",
                padding: "2px",
                boxSizing: "border-box",
                opacity: isCabinet ? 0.85 : 1.0,
              }}
            >
              {/* Front Edge Indicator Bar (Gold Accent along front facing edge) */}
              {(key === "washbasin" || key === "toilet" || key === "bathtub") && (
                <div
                  style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: "3.5px",
                    backgroundColor: "#FFD166",
                    boxShadow: "0 0 8px rgba(255, 209, 102, 0.9)",
                    borderRadius: "0 0 3px 3px",
                    pointerEvents: "none",
                  }}
                />
              )}

              {/* Counter-rotate text so labels remain perfectly upright and horizontal */}
              <div
                style={{
                  transform: `rotate(${- (item.rot || 0)}deg)`,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  pointerEvents: "none",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                }}
              >
                <div>{item.label}</div>
                {!isMirror && (
                  <div style={{ fontSize: "0.55rem", opacity: 0.9, fontWeight: "400" }}>
                    {Math.round(item.w)}" x {Math.round(item.h)}" {item.rot ? `(${item.rot}°)` : ""}
                  </div>
                )}
                {(key === "washbasin" || key === "toilet" || key === "bathtub") && (
                  <div style={{ fontSize: "0.5rem", color: "#FFD166", fontWeight: "800", marginTop: "1px" }}>
                    FRONT ▼
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Element Controls (Dimensions & Rotation Button) */}
      {selectedItem && (
        <div style={{ backgroundColor: "#0F172A", padding: "12px", borderRadius: "6px", border: "1px solid #334155" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <span style={{ fontSize: "0.8rem", fontWeight: "700", color: "#FFD166" }}>
              Adjust {selectedItem.label} Details:
            </span>
            {/* Rotation Button for selected 2D element */}
            <button
              type="button"
              onClick={() => {
                const nextRot = ((selectedItem.rot || 0) + 90) % 360;
                handleDimensionChange(selectedItemKey, "rot", nextRot);
              }}
              style={{
                backgroundColor: ORANGE,
                color: WHITE,
                border: "none",
                borderRadius: "4px",
                padding: "4px 10px",
                fontSize: "0.75rem",
                fontWeight: "700",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
            >
              Rotate 90° ({selectedItem.rot || 0}°)
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <div>
              <label style={{ fontSize: "0.75rem", fontWeight: "600", color: "#CBD5E1" }}>
                Width: {selectedItem.w}"
              </label>
              <input
                type="range"
                min={selectedItem.minW}
                max={selectedItem.maxW}
                value={selectedItem.w}
                onChange={(e) => handleDimensionChange(selectedItemKey, "w", e.target.value)}
                style={{ width: "100%", accentColor: ORANGE }}
              />
            </div>

            <div>
              <label style={{ fontSize: "0.75rem", fontWeight: "600", color: "#CBD5E1" }}>
                Depth / Height: {selectedItem.h}"
              </label>
              <input
                type="range"
                min={selectedItem.minH}
                max={selectedItem.maxH}
                value={selectedItem.h}
                onChange={(e) => handleDimensionChange(selectedItemKey, "h", e.target.value)}
                style={{ width: "100%", accentColor: ORANGE }}
              />
            </div>
          </div>

          {selectedItemKey === "washbasin" && (
            <div style={{ fontSize: "0.7rem", color: ORANGE, fontWeight: "600", marginTop: "6px" }}>
              ✓ Cabinet margin auto-enforced at minimum 3 inches bigger on each side (Cabinet: {Math.max(selectedItem.w + 6, itemsState.cabinet.w)}" W x {Math.max(selectedItem.h + 6, itemsState.cabinet.h)}" D)
            </div>
          )}
        </div>
      )}
    </div>
  );
}
