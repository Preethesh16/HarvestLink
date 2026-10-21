import { useLocale } from "./Locale";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  Component,
  Suspense,
  useRef,
  useState,
  useEffect,
  useMemo,
  useLayoutEffect,
} from "react";
import type { ReactNode } from "react";
import { Group, InstancedMesh, Object3D, Shape } from "three";

function roundedPlot(width: number, height: number, r: number) {
  const s = new Shape();
  const x = -width / 2,
    y = -height / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + width - r, y);
  s.quadraticCurveTo(x + width, y, x + width, y + r);
  s.lineTo(x + width, y + height - r);
  s.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  s.lineTo(x + r, y + height);
  s.quadraticCurveTo(x, y + height, x, y + height - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}
function CropRows({
  position,
  color,
  fruit = false,
}: {
  position: [number, number, number];
  color: string;
  fruit?: boolean;
}) {
  const leaves = useRef<InstancedMesh>(null);
  const fruits = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const o = new Object3D();
    for (let r = 0; r < 4; r++)
      for (let c = 0; c < 7; c++) {
        const i = r * 7 + c;
        o.position.set(
          c * 0.29 - 0.88,
          0.13 + (i % 3) * 0.015,
          r * 0.31 - 0.46,
        );
        o.scale.set(0.15, 0.17 + (i % 3) * 0.02, 0.15);
        o.rotation.set(0.1, i * 0.7, 0.1);
        o.updateMatrix();
        leaves.current?.setMatrixAt(i, o.matrix);
        o.position.x += 0.065;
        o.position.y += 0.05;
        o.position.z += 0.06;
        o.scale.setScalar(0.075);
        o.updateMatrix();
        fruits.current?.setMatrixAt(i, o.matrix);
      }
    if (leaves.current) leaves.current.instanceMatrix.needsUpdate = true;
    if (fruits.current) fruits.current.instanceMatrix.needsUpdate = true;
  }, []);
  return (
    <group position={position}>
      <mesh receiveShadow position={[0, -0.025, 0]}>
        <boxGeometry args={[2.3, 0.1, 1.65]} />
        <meshStandardMaterial color="#786044" roughness={1} />
      </mesh>
      {[-0.6, -0.3, 0, 0.3, 0.6].map((z) => (
        <mesh key={z} position={[0, 0.025, z]}>
          <boxGeometry args={[2.16, 0.06, 0.12]} />
          <meshStandardMaterial color="#a28455" />
        </mesh>
      ))}
      <instancedMesh ref={leaves} args={[undefined, undefined, 28]} castShadow>
        <icosahedronGeometry args={[1, 1]} />
        <meshStandardMaterial color={color} roughness={0.9} />
      </instancedMesh>
      {fruit && (
        <instancedMesh ref={fruits} args={[undefined, undefined, 28]}>
          <sphereGeometry args={[1, 7, 6]} />
          <meshStandardMaterial color="#ef6d3c" />
        </instancedMesh>
      )}
    </group>
  );
}
function Tree({
  position,
  scale = 1,
}: {
  position: [number, number, number];
  scale?: number;
}) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.4, 0]} castShadow>
        <cylinderGeometry args={[0.055, 0.1, 0.8, 7]} />
        <meshStandardMaterial color="#8b633c" />
      </mesh>
      {[
        [0, 0.9, 0, 0.37],
        [-0.2, 1.05, 0.03, 0.32],
        [0.15, 1.24, -0.03, 0.34],
      ].map(([x, y, z, r], i) => (
        <mesh key={i} position={[x, y, z]} castShadow>
          <icosahedronGeometry args={[r, 1]} />
          <meshStandardMaterial color={["#577b37", "#789b43", "#a1b852"][i]} />
        </mesh>
      ))}
    </group>
  );
}
function Barn() {
  return (
    <group position={[-2.6, 0.08, -1.7]}>
      <mesh position={[0, 0.5, 0]} castShadow>
        <boxGeometry args={[1.5, 1, 1.15]} />
        <meshStandardMaterial color="#f1e3b5" />
      </mesh>
      <mesh position={[0, 1.13, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[1.08, 0.6, 4]} />
        <meshStandardMaterial color="#c97143" />
      </mesh>
      <mesh position={[0.08, 0.33, 0.582]}>
        <boxGeometry args={[0.56, 0.65, 0.025]} />
        <meshStandardMaterial color="#365d40" />
      </mesh>
      <mesh position={[0.08, 0.34, 0.6]} rotation={[0, 0, 0.65]}>
        <boxGeometry args={[0.035, 0.72, 0.025]} />
        <meshStandardMaterial color="#c6d1a0" />
      </mesh>
      <mesh position={[-0.48, 0.67, 0.59]}>
        <boxGeometry args={[0.23, 0.25, 0.025]} />
        <meshStandardMaterial color="#b3d6cf" />
      </mesh>
      <mesh position={[0.55, 1.18, -0.2]} castShadow>
        <boxGeometry args={[0.17, 0.7, 0.18]} />
        <meshStandardMaterial color="#d4b38c" />
      </mesh>
      <group position={[1.16, 0, -0.13]}>
        <mesh position={[0, 0.55, 0]} castShadow>
          <cylinderGeometry args={[0.34, 0.34, 1.1, 16]} />
          <meshStandardMaterial color="#c7cdb5" roughness={0.65} />
        </mesh>
        <mesh position={[0, 1.17, 0]}>
          <coneGeometry args={[0.36, 0.3, 16]} />
          <meshStandardMaterial color="#57735b" />
        </mesh>
        {[0.2, 0.5, 0.8].map((y) => (
          <mesh key={y} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.345, 0.014, 4, 16]} />
            <meshStandardMaterial color="#718571" />
          </mesh>
        ))}
      </group>
    </group>
  );
}
function Tractor() {
  return (
    <group position={[0.7, 0.29, 0.08]} rotation={[0, Math.PI, 0]}>
      <mesh position={[0.12, 0.18, 0]} castShadow>
        <boxGeometry args={[0.65, 0.35, 0.36]} />
        <meshStandardMaterial color="#d5b848" />
      </mesh>
      <mesh position={[-0.28, 0.37, 0]}>
        <boxGeometry args={[0.33, 0.42, 0.4]} />
        <meshStandardMaterial color="#346c50" />
      </mesh>
      <mesh position={[-0.28, 0.63, 0]}>
        <boxGeometry args={[0.48, 0.07, 0.55]} />
        <meshStandardMaterial color="#ead995" />
      </mesh>
      <mesh position={[0.32, 0.53, -0.08]}>
        <cylinderGeometry args={[0.025, 0.025, 0.43, 6]} />
        <meshStandardMaterial color="#4f5141" />
      </mesh>
      {[-0.3, 0.36].flatMap((x, i) =>
        [-0.27, 0.27].map((z) => (
          <group
            key={`${x}${z}`}
            position={[x, 0, z]}
            rotation={[Math.PI / 2, 0, 0]}
          >
            <mesh castShadow>
              <cylinderGeometry
                args={[i ? 0.15 : 0.23, i ? 0.15 : 0.23, 0.12, 12]}
              />
              <meshStandardMaterial color="#303d32" />
            </mesh>
            <mesh position={[0, 0.07, 0]}>
              <cylinderGeometry args={[0.085, 0.085, 0.015, 12]} />
              <meshStandardMaterial color="#caae5a" />
            </mesh>
          </group>
        )),
      )}
    </group>
  );
}
function Scene({
  still,
  rotation,
  dragging,
}: {
  still: boolean;
  rotation: [number, number];
  dragging: boolean;
}) {
  const ref = useRef<Group>(null);
  const shape = useMemo(() => roundedPlot(8.1, 5.8, 0.65), []);
  const drift = useRef(0);
  useEffect(() => {
    if (rotation[0] === 0 && rotation[1] === 0) drift.current = 0;
  }, [rotation]);
  useFrame((_, delta) => {
    if (!still && !dragging) drift.current += Math.min(delta, 0.05) * 0.018;
    if (ref.current && !still) {
      ref.current.rotation.x +=
        (rotation[0] - ref.current.rotation.x) * Math.min(1, delta * 9);
      ref.current.rotation.y +=
        (rotation[1] + drift.current - ref.current.rotation.y) *
        Math.min(1, delta * 9);
    }
  });
  return (
    <group
      ref={ref}
      position={[0, -0.3, 0]}
      rotation={still ? [rotation[0], rotation[1], 0] : undefined}
    >
      <ambientLight intensity={1.5} />
      <hemisphereLight args={["#fff3ce", "#3f6544", 1.3]} />
      <directionalLight
        position={[-4, 9, 5]}
        intensity={2.4}
        color="#fff1d0"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-6}
        shadow-camera-right={6}
        shadow-camera-top={6}
        shadow-camera-bottom={-6}
        shadow-bias={-0.001}
      />
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.4, 0]}
        receiveShadow
      >
        <extrudeGeometry
          args={[
            shape,
            {
              depth: 0.42,
              bevelEnabled: true,
              bevelSize: 0.12,
              bevelThickness: 0.12,
              bevelSegments: 2,
              steps: 1,
            },
          ]}
        />
        <meshStandardMaterial color="#9cab60" roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.68, 0]}>
        <extrudeGeometry
          args={[
            shape,
            {
              depth: 0.22,
              bevelEnabled: true,
              bevelSize: 0.08,
              bevelThickness: 0.08,
              bevelSegments: 1,
              steps: 1,
            },
          ]}
        />
        <meshStandardMaterial color="#796947" />
      </mesh>
      <mesh position={[0, 0.075, 0]} receiveShadow>
        <boxGeometry args={[7.95, 0.055, 0.55]} />
        <meshStandardMaterial color="#deca92" />
      </mesh>
      <mesh position={[1.75, 0.078, 1.05]} receiveShadow>
        <boxGeometry args={[0.5, 0.06, 2.25]} />
        <meshStandardMaterial color="#deca92" />
      </mesh>
      <CropRows position={[-2.25, 0.12, 1.4]} color="#78a24e" fruit />
      <CropRows position={[0.36, 0.12, 1.4]} color="#bac76c" />
      <CropRows position={[0.45, 0.12, -1.5]} color="#809b38" fruit />
      <Barn />
      <Tractor />
      <group position={[2.7, 0.12, -1.8]}>
        <mesh position={[0, 0.35, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry
            args={[0.65, 0.65, 1.4, 12, 1, false, 0, Math.PI]}
          />
          <meshStandardMaterial
            color="#c4e2c0"
            transparent
            opacity={0.55}
            roughness={0.3}
          />
        </mesh>
        {[-0.7, -0.35, 0, 0.35, 0.7].map((z) => (
          <mesh key={z} position={[0, 0.35, z]}>
            <torusGeometry args={[0.66, 0.025, 4, 12, Math.PI]} />
            <meshStandardMaterial color="#f0e6ba" />
          </mesh>
        ))}
        <mesh position={[0, 0.12, 0]}>
          <boxGeometry args={[1.2, 0.2, 1.3]} />
          <meshStandardMaterial color="#72954b" />
        </mesh>
      </group>
      <group position={[2.9, 0.1, 1.5]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} scale={[1, 0.7, 1]}>
          <circleGeometry args={[0.78, 24]} />
          <meshStandardMaterial color="#679c97" roughness={0.35} />
        </mesh>
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0.01, 0]}
          scale={[1, 0.7, 1]}
        >
          <ringGeometry args={[0.74, 0.88, 24]} />
          <meshStandardMaterial color="#c7bd82" />
        </mesh>
        <mesh position={[0.22, 0.03, 0.03]} rotation={[-Math.PI / 2, 0, 0.4]}>
          <circleGeometry args={[0.14, 12]} />
          <meshStandardMaterial color="#9fb96a" />
        </mesh>
      </group>
      {[
        [-3.65, 0.1, 2.1],
        [-3.65, 0.1, -0.75],
        [3.7, 0.1, -0.25],
        [3.5, 0.1, 2.5],
        [-0.7, 0.1, -2.6],
        [1.65, 0.1, -2.5],
      ].map((p, i) => (
        <Tree
          key={i}
          position={p as [number, number, number]}
          scale={i % 2 ? 0.8 : 1}
        />
      ))}
      {Array.from({ length: 13 }, (_, i) => (
        <group key={i} position={[-3.6 + i * 0.59, 0.1, 2.7]}>
          <mesh position={[0, 0.2, 0]}>
            <boxGeometry args={[0.055, 0.4, 0.06]} />
            <meshStandardMaterial color="#e6d5a1" />
          </mesh>
          {[0.15, 0.3].map((y) => (
            <mesh key={y} position={[0.28, y, 0]}>
              <boxGeometry args={[0.57, 0.035, 0.04]} />
              <meshStandardMaterial color="#e6d5a1" />
            </mesh>
          ))}
        </group>
      ))}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.9, 0]}
        receiveShadow
      >
        <planeGeometry args={[30, 30]} />
        <shadowMaterial opacity={0.2} />
      </mesh>
    </group>
  );
}
function Fallback() {
  return (
    <div className="farm-fallback">
      <svg viewBox="0 0 500 300" aria-hidden="true">
        <path
          d="M20 220Q120 70 270 150Q390 80 485 190L485 280H20Z"
          fill="#8eaa5f"
        />
        <path d="M20 245Q170 110 400 250L485 280H20Z" fill="#bacb7c" />
        <path
          d="M20 260Q230 170 380 280M80 280Q250 210 450 280"
          fill="none"
          stroke="#5d803f"
          strokeWidth="10"
        />
        <path d="M260 158h65v60h-65Z" fill="#f1e3b5" />
        <path d="M245 158L292 120L339 158Z" fill="#c97143" />
      </svg>
      <span>A closer connection to the land.</span>
    </div>
  );
}
class Boundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? <Fallback /> : this.props.children;
  }
}
export default function Farm() {
  const { tr } = useLocale();
  const [rotation, setRotation] = useState<[number, number]>([0, 0]);
  const drag = useRef<{
    id: number;
    x: number;
    y: number;
    rotation: [number, number];
  } | null>(null);
  const [dragging, setDragging] = useState(false);
  const clamp = (v: number) => Math.max(-0.3, Math.min(0.3, v));
  const turn = (dx: number, dy = 0) =>
    setRotation(([pitch, yaw]) => [clamp(pitch + dy), yaw + dx]);

  const [ready, setReady] = useState(false);
  const [still, setStill] = useState(true);
  useEffect(() => {
    const m = matchMedia("(prefers-reduced-motion: reduce)");
    setStill(m.matches);
    const changed = () => setStill(m.matches);
    m.addEventListener("change", changed);
    try {
      const c = document.createElement("canvas");
      setReady(!!c.getContext("webgl2"));
    } catch {
      setReady(false);
    }
    return () => m.removeEventListener("change", changed);
  }, []);
  return (
    <div
      role="region"
      tabIndex={0}
      aria-label={tr(
        "Interactive farm. Drag to rotate, or use arrow keys. Press Home to reset.",
      )}
      data-yaw={rotation[1].toFixed(3)}
      data-pitch={rotation[0].toFixed(3)}
      className={`farm-scene ${dragging ? "is-dragging" : ""}`}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return;
        if (
          ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home"].includes(
            e.key,
          )
        ) {
          e.preventDefault();
          if (e.key === "Home") setRotation([0, 0]);
          else
            turn(
              e.key === "ArrowLeft" ? -0.18 : e.key === "ArrowRight" ? 0.18 : 0,
              e.key === "ArrowUp" ? -0.06 : e.key === "ArrowDown" ? 0.06 : 0,
            );
        }
      }}
      onPointerDown={(e) => {
        if (
          (e.target as HTMLElement).closest("button") ||
          !ready ||
          e.button !== 0
        )
          return;
        drag.current = {
          id: e.pointerId,
          x: e.clientX,
          y: e.clientY,
          rotation,
        };
        e.currentTarget.setPointerCapture(e.pointerId);
        setDragging(true);
      }}
      onPointerMove={(e) => {
        const d = drag.current;
        if (!d || d.id !== e.pointerId) return;
        setRotation([
          clamp(d.rotation[0] + (e.clientY - d.y) * 0.003),
          d.rotation[1] + (e.clientX - d.x) * 0.008,
        ]);
      }}
      onPointerUp={(e) => {
        if (drag.current?.id === e.pointerId) {
          drag.current = null;
          setDragging(false);
          if (e.currentTarget.hasPointerCapture(e.pointerId))
            e.currentTarget.releasePointerCapture(e.pointerId);
        }
      }}
      onPointerCancel={() => {
        drag.current = null;
        setDragging(false);
      }}
      onLostPointerCapture={() => {
        drag.current = null;
        setDragging(false);
      }}
    >
      <Boundary>
        {ready ? (
          <Suspense fallback={<Fallback />}>
            <Canvas
              shadows
              dpr={[1, 1.5]}
              camera={{ position: [8, 9, 11], fov: 36 }}
              frameloop={still ? "demand" : "always"}
              gl={{ antialias: true, alpha: true }}
            >
              <Scene still={still} rotation={rotation} dragging={dragging} />
            </Canvas>
          </Suspense>
        ) : (
          <Fallback />
        )}
      </Boundary>
    </div>
  );
}
