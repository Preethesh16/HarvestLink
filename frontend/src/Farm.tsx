import { Canvas, useFrame } from "@react-three/fiber";
import { Component, Suspense, useRef, useState, useEffect } from "react";
import type { ReactNode } from "react";
import type { Group } from "three";
function Scene({ still }: { still: boolean }) {
  const ref = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (ref.current && !still)
      ref.current.rotation.y = Math.sin(clock.elapsedTime * 0.16) * 0.055;
  });
  return (
    <group ref={ref} rotation={[0, -0.35, 0]}>
      <ambientLight intensity={2} />
      <directionalLight position={[4, 8, 5]} intensity={2.5} />
      <mesh position={[0, -0.2, 0]}>
        <cylinderGeometry args={[3.4, 3.2, 0.4, 8]} />
        <meshStandardMaterial color="#ced6af" />
      </mesh>
      <mesh position={[0, 0.04, 0]}>
        <boxGeometry args={[5.1, 0.12, 0.48]} />
        <meshStandardMaterial color="#efe4c5" />
      </mesh>
      {[-1.65, -0.9, 0.8, 1.5].map((z, i) => (
        <group key={z} position={[i < 2 ? -0.45 : 0.6, 0, z]}>
          <mesh position={[0, 0.08, 0]}>
            <boxGeometry args={[3.7, 0.14, 0.5]} />
            <meshStandardMaterial color="#776544" />
          </mesh>
          {Array.from({ length: 9 }, (_, j) => (
            <group key={j} position={[-1.65 + j * 0.4, 0.18, 0]}>
              <mesh>
                <sphereGeometry args={[0.18, 6, 5]} />
                <meshStandardMaterial color={i % 2 ? "#68964d" : "#a5b56a"} />
              </mesh>
              {i === 0 && (
                <mesh position={[0.07, 0.05, 0.12]}>
                  <sphereGeometry args={[0.075, 7, 6]} />
                  <meshStandardMaterial color="#d5764d" />
                </mesh>
              )}
            </group>
          ))}
        </group>
      ))}
      <group position={[-1.7, 0, 1.3]}>
        <mesh position={[0, 0.5, 0]}>
          <boxGeometry args={[1.15, 1, 0.9]} />
          <meshStandardMaterial color="#f2e6c8" />
        </mesh>
        <mesh position={[0, 1.2, 0]} rotation={[0, Math.PI / 4, 0]}>
          <coneGeometry args={[0.95, 0.6, 4]} />
          <meshStandardMaterial color="#48785c" />
        </mesh>
        <mesh position={[0, 0.32, 0.46]}>
          <boxGeometry args={[0.32, 0.65, 0.025]} />
          <meshStandardMaterial color="#355644" />
        </mesh>
      </group>
      {[
        [2.2, 1.5],
        [-2.25, -1.5],
        [2.3, -1.1],
      ].map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh position={[0, 0.4, 0]}>
            <cylinderGeometry args={[0.07, 0.1, 0.8, 6]} />
            <meshStandardMaterial color="#866a45" />
          </mesh>
          <mesh position={[0, 1, 0]}>
            <icosahedronGeometry args={[0.52, 1]} />
            <meshStandardMaterial color="#577d43" />
          </mesh>
          <mesh position={[0.15, 1.32, 0]}>
            <icosahedronGeometry args={[0.35, 0]} />
            <meshStandardMaterial color="#779757" />
          </mesh>
        </group>
      ))}
      <group position={[1.8, 0.28, 0.06]}>
        <mesh>
          <boxGeometry args={[0.8, 0.35, 0.43]} />
          <meshStandardMaterial color="#dba557" />
        </mesh>
        <mesh position={[-0.15, 0.3, 0]}>
          <boxGeometry args={[0.32, 0.33, 0.4]} />
          <meshStandardMaterial color="#315e48" />
        </mesh>
        {[-0.27, 0.27].flatMap((x) =>
          [-0.24, 0.24].map((z) => (
            <mesh
              key={`${x}${z}`}
              position={[x, -0.13, z]}
              rotation={[Math.PI / 2, 0, 0]}
            >
              <cylinderGeometry args={[0.16, 0.16, 0.1, 10]} />
              <meshStandardMaterial color="#294336" />
            </mesh>
          )),
        )}
      </group>
    </group>
  );
}
class Boundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <div className="farm-fallback">
        🌱<span>Good things grow together.</span>
      </div>
    ) : (
      this.props.children
    );
  }
}
export default function Farm() {
  const [ready, setReady] = useState(false);
  const [still, setStill] = useState(true);
  useEffect(() => {
    setStill(matchMedia("(prefers-reduced-motion: reduce)").matches);
    try {
      const c = document.createElement("canvas");
      setReady(!!(c.getContext("webgl2") || c.getContext("webgl")));
    } catch {
      setReady(false);
    }
  }, []);
  return (
    <div
      className="farm-scene"
      aria-label="Illustrated farm with crops, a barn and collection vehicle"
      role="img"
    >
      <Boundary>
        {ready ? (
          <Suspense fallback={<span>Growing your view…</span>}>
            <Canvas
              dpr={[1, 1.5]}
              camera={{ position: [7, 6, 8], fov: 36 }}
              frameloop={still ? "demand" : "always"}
            >
              <Scene still={still} />
            </Canvas>
          </Suspense>
        ) : (
          <div className="farm-fallback">
            🌱<span>Good things grow together.</span>
          </div>
        )}
      </Boundary>
    </div>
  );
}
