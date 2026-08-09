"use client";

import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";

const WIDTH = 20;
const DEPTH = 20;
const SEGMENTS_X = 64;
const SEGMENTS_Y = 64;

// Deterministic layered-sine height field — reads as rolling contour
// terrain without pulling in a noise library for one hero element.
function heightAt(x: number, y: number) {
  return (
    Math.sin(x * 0.45) * 0.55 +
    Math.cos(y * 0.35) * 0.55 +
    Math.sin((x + y) * 0.22) * 0.4 +
    Math.cos(x * 0.9 - y * 0.6) * 0.15
  );
}

function buildTerrainGeometry() {
  const geometry = new THREE.PlaneGeometry(WIDTH, DEPTH, SEGMENTS_X, SEGMENTS_Y);
  const position = geometry.attributes.position;
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i);
    const y = position.getY(i);
    position.setZ(i, heightAt(x, y));
  }
  geometry.computeVertexNormals();
  return geometry;
}

type Pulse = { point: THREE.Vector3; startedAt: number };

function Terrain({ color, lineColor }: { color: string; lineColor: string }) {
  const geometry = useMemo(() => buildTerrainGeometry(), []);
  const groupRef = useRef<THREE.Group>(null);
  const pulsesRef = useRef<Pulse[]>([]);
  const ringRefs = useRef<THREE.Mesh[]>([]);
  const pointer = useRef({ x: 0, y: 0 });
  const { size } = useThree();

  function handlePointerMove(event: ThreeEvent<PointerEvent>) {
    pointer.current.x = (event.clientX / size.width) * 2 - 1;
    pointer.current.y = -(event.clientY / size.height) * 2 + 1;
  }

  function handlePointerDown(event: ThreeEvent<PointerEvent>) {
    if (!event.point) return;
    pulsesRef.current.push({ point: event.point.clone(), startedAt: performance.now() });
  }

  // Fires one ripple shortly after mount, unprompted, so the terrain
  // demonstrates its own interactivity instead of waiting for a visitor
  // to discover it by accident.
  useEffect(() => {
    const timer = setTimeout(() => {
      pulsesRef.current.push({ point: new THREE.Vector3(0, 0, 0), startedAt: performance.now() });
    }, 700);
    return () => clearTimeout(timer);
  }, []);

  useFrame((state) => {
    const group = groupRef.current;
    if (group) {
      // Gentle idle drift keeps the terrain visibly alive even before a
      // visitor's cursor ever reaches it — otherwise it reads as a still
      // image until touched. Pointer tilt is layered on top of it.
      const elapsed = state.clock.getElapsedTime();
      const idleX = Math.sin(elapsed * 0.35) * 0.06;
      const idleY = Math.sin(elapsed * 0.22) * 0.1 + Math.cos(elapsed * 0.13) * 0.05;
      const targetX = pointer.current.y * 0.18 + idleX;
      const targetY = pointer.current.x * 0.28 + idleY;
      group.rotation.x += (targetX - group.rotation.x) * 0.04;
      group.rotation.y += (targetY - group.rotation.y) * 0.04;
    }

    const now = performance.now();
    pulsesRef.current = pulsesRef.current.filter((p) => now - p.startedAt < 1400);

    ringRefs.current.forEach((mesh, i) => {
      const pulse = pulsesRef.current[i];
      if (!mesh) return;
      if (!pulse) {
        mesh.visible = false;
        return;
      }
      const t = (now - pulse.startedAt) / 1400;
      mesh.visible = true;
      mesh.position.copy(pulse.point);
      mesh.position.y += 0.02;
      const scale = 0.3 + t * 3.2;
      mesh.scale.set(scale, scale, scale);
      const material = mesh.material as THREE.MeshBasicMaterial;
      material.opacity = Math.max(0, 1 - t);
    });
  });

  return (
    <group
      ref={groupRef}
      rotation={[-1.15, 0, 0.15]}
      onPointerMove={handlePointerMove}
      onPointerDown={handlePointerDown}
    >
      <mesh geometry={geometry}>
        {/* Unlit on purpose — wireframe lines on a lit material dim out
            wherever a face normal points away from the light, which made
            the terrain nearly invisible in places. Flat color reads
            consistently regardless of viewing angle. */}
        <meshBasicMaterial color={color} wireframe transparent opacity={0.85} />
      </mesh>
      {[0, 1, 2].map((i) => (
        <mesh
          key={i}
          ref={(el) => {
            if (el) ringRefs.current[i] = el;
          }}
          rotation={[-Math.PI / 2, 0, 0]}
          visible={false}
        >
          <ringGeometry args={[0.9, 1, 48]} />
          <meshBasicMaterial color={lineColor} transparent opacity={0} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}

export function TerrainScene({
  color,
  lineColor,
  onReady,
}: {
  color: string;
  lineColor: string;
  onReady?: () => void;
}) {
  return (
    <Canvas
      camera={{ position: [0, 3.4, 8], fov: 42 }}
      gl={{ antialias: true, alpha: true }}
      dpr={[1, 1.75]}
      onCreated={() => onReady?.()}
    >
      <ambientLight intensity={0.6} />
      <directionalLight position={[3, 5, 2]} intensity={0.5} />
      <Terrain color={color} lineColor={lineColor} />
    </Canvas>
  );
}
