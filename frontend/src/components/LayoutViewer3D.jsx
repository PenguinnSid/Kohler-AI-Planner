import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Text } from "@react-three/drei";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

const DARK_ORANGE = "#B86A2A";
const PEACH = "#E8B4A0";

const CATEGORY_COLORS = {
  toilet: 0xe74c3c,
  washbasin: 0x3498db,
  faucet: 0x2ecc71,
  shower: 0x9b59b6,
  bathtub: 0xf39c12,
  mirror: 0x1abc9c,
};

function Floor({ width, depth }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[width / 2, 0, depth / 2]} receiveShadow>
      <planeGeometry args={[width + 48, depth + 48]} />
      <meshStandardMaterial color="#e8e8e8" />
    </mesh>
  );
}

function Product({ placement, onClick }) {
  const { x, y, width_in, depth_in, model_name, category } = placement;
  const color = CATEGORY_COLORS[category] || 0x95a5a6;

  const centerX = x + width_in / 2;
  const centerZ = y + depth_in / 2;
  const height = 18;

  const meshRef = useRef();

  const handleClick = (e) => {
    e.stopPropagation();
    onClick({ ...placement, color });
  };

  return (
    <group onClick={handleClick}>
      {/* Main fixture */}
      <mesh
        ref={meshRef}
        position={[centerX, height / 2, centerZ]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[width_in, height, depth_in]} />
        <meshStandardMaterial color={color} />
      </mesh>

      {/* Click marker - subtle white dot */}
      <mesh position={[centerX, height + 8, centerZ]}>
        <sphereGeometry args={[1.5, 16, 16]} />
        <meshStandardMaterial
          color={0xffffff}
          emissive={0xffffff}
          emissiveIntensity={0.4}
        />
      </mesh>

      {/* Label */}
      <Text
        position={[centerX, height + 16, centerZ]}
        fontSize={3}
        color="black"
        anchorY="bottom"
        maxWidth={width_in + 10}
      >
        {model_name}
      </Text>
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
  const [hoveredProduct, setHoveredProduct] = useState(null);

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

  const styles = {
    container: {
      display: "flex",
      flexDirection: "column",
      height: "100%",
      width: "100%",
    },
    canvas: {
      flex: 1,
      width: "100%",
    },
    controls: {
      padding: "16px 24px",
      backgroundColor: "#F5F5F5",
      borderTop: `2px solid ${PEACH}`,
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
          position: [roomWidthIn / 2, 60, roomDepthIn + 40],
          fov: 60,
        }}
        shadows
      >
        {/* Lighting */}
        <ambientLight intensity={0.7} />
        <directionalLight
          position={[roomWidthIn / 2, 120, 0]}
          intensity={0.8}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
        />

        {/* Scene */}
        <Floor width={roomWidthIn} depth={roomDepthIn} />

        {/* Products */}
        {layoutData.map((placement, idx) => (
          <Product
            key={idx}
            placement={placement}
            onClick={(product) => {
              setHoveredProduct(product);
              onProductClick?.(product);
            }}
          />
        ))}

        {/* Camera Controller */}
        <CameraController />

        {/* Controls */}
        <OrbitControls
          makeDefault
          autoRotate={false}
          autoRotateSpeed={0}
          dampingFactor={0.05}
          enableDamping
        />
      </Canvas>

      {/* Controls Info */}
      <div style={styles.controls}>
        <p style={styles.controlsText}>
          <strong>🎮 Controls:</strong> Scroll to zoom • Mouse drag to rotate • W/A/S/D to move • Space/↓ to move up/down • Click on fixtures to inspect
        </p>
      </div>
    </div>
  );
}
