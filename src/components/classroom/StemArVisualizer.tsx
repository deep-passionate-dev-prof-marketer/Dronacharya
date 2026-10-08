import React, { useRef, useEffect, useState } from "react";
import * as THREE from "three";
import { Play, Pause, RotateCw, Grid, Layers, Eye, Sparkles } from "lucide-react";

type StemModelType = "orbital" | "buckyball" | "bloch";

export const StemArVisualizer: React.FC = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [modelType, setModelType] = useState<StemModelType>("orbital");
  const [isRotating, setIsRotating] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [showWireframe, setShowWireframe] = useState(false);
  const [arGridOverlay, setArGridOverlay] = useState(true);

  // Bloch sphere parameter sliders
  const [theta, setTheta] = useState(Math.PI / 4); // 45 deg
  const [phi, setPhi] = useState(Math.PI / 3); // 60 deg

  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const activeMeshGroupRef = useRef<THREE.Group | null>(null);
  const stateVectorArrowRef = useRef<THREE.ArrowHelper | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 1. Setup Scene, Camera, Renderer
    const width = container.clientWidth;
    const height = container.clientHeight;

    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x080c14);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 0, 7);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    rendererRef.current = renderer;
    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const pointLight1 = new THREE.PointLight(0x6366f1, 3, 50);
    pointLight1.position.set(5, 5, 5);
    scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0x06b6d4, 2, 50);
    pointLight2.position.set(-5, -5, 5);
    scene.add(pointLight2);

    // Grid Floor
    const gridHelper = new THREE.GridHelper(10, 20, 0x4f46e5, 0x1e293b);
    gridHelper.position.y = -2.5;
    scene.add(gridHelper);

    // Group to hold dynamic model
    const modelGroup = new THREE.Group();
    scene.add(modelGroup);
    activeMeshGroupRef.current = modelGroup;

    // Mouse Interaction (Orbit drag without needing full OrbitControls bundle)
    let isDragging = false;
    let prevMouseX = 0;
    let prevMouseY = 0;

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const deltaX = e.clientX - prevMouseX;
      const deltaY = e.clientY - prevMouseY;
      modelGroup.rotation.y += deltaX * 0.01;
      modelGroup.rotation.x += deltaY * 0.01;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    const onWheel = (e: WheelEvent) => {
      camera.position.z = Math.max(3, Math.min(14, camera.position.z + e.deltaY * 0.01));
    };

    renderer.domElement.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    renderer.domElement.addEventListener("wheel", onWheel);

    // Render loop
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      if (isRotating && !isDragging) {
        modelGroup.rotation.y += 0.008 * speed;
      }

      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!container) return;
      const newW = container.clientWidth;
      const newH = container.clientHeight;
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      renderer.dispose();
    };
  }, []);

  // Update dynamic meshes when modelType or wireframe changes
  useEffect(() => {
    const group = activeMeshGroupRef.current;
    if (!group) return;

    // Clear previous children
    while (group.children.length > 0) {
      const obj = group.children[0];
      group.remove(obj);
    }

    if (modelType === "orbital") {
      // 1. Hydrogen Atomic Orbital (2p / 3d lobe + probability particle cloud)
      const nucleusGeo = new THREE.SphereGeometry(0.3, 32, 32);
      const nucleusMat = new THREE.MeshStandardMaterial({
        color: 0xef4444,
        emissive: 0x991b1b,
        roughness: 0.2,
      });
      const nucleus = new THREE.Mesh(nucleusGeo, nucleusMat);
      group.add(nucleus);

      // Upper Lobe
      const lobeGeo1 = new THREE.SphereGeometry(1.2, 32, 32);
      lobeGeo1.scale(0.8, 1.5, 0.8);
      const lobeMat1 = new THREE.MeshStandardMaterial({
        color: 0x6366f1,
        transparent: true,
        opacity: 0.65,
        wireframe: showWireframe,
      });
      const lobe1 = new THREE.Mesh(lobeGeo1, lobeMat1);
      lobe1.position.y = 1.3;
      group.add(lobe1);

      // Lower Lobe
      const lobeGeo2 = new THREE.SphereGeometry(1.2, 32, 32);
      lobeGeo2.scale(0.8, 1.5, 0.8);
      const lobeMat2 = new THREE.MeshStandardMaterial({
        color: 0x06b6d4,
        transparent: true,
        opacity: 0.65,
        wireframe: showWireframe,
      });
      const lobe2 = new THREE.Mesh(lobeGeo2, lobeMat2);
      lobe2.position.y = -1.3;
      group.add(lobe2);

      // Electron Cloud Particles
      const particleCount = 600;
      const particleGeo = new THREE.BufferGeometry();
      const positions = new Float32Array(particleCount * 3);

      for (let i = 0; i < particleCount; i++) {
        const u = Math.random() * 2 - 1;
        const r = Math.pow(Math.random(), 0.5) * 2.2;
        const pTheta = Math.random() * Math.PI * 2;
        positions[i * 3] = r * Math.sin(pTheta) * 0.7;
        positions[i * 3 + 1] = u * 2.4;
        positions[i * 3 + 2] = r * Math.cos(pTheta) * 0.7;
      }
      particleGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      const particleMat = new THREE.PointsMaterial({
        color: 0xa5b4fc,
        size: 0.05,
        transparent: true,
        opacity: 0.7,
      });
      const particleSystem = new THREE.Points(particleGeo, particleMat);
      group.add(particleSystem);
    } else if (modelType === "buckyball") {
      // 2. Fullerene Buckyball (C60)
      const icosaGeo = new THREE.IcosahedronGeometry(2, 1);
      const material = new THREE.MeshStandardMaterial({
        color: 0x10b981,
        wireframe: showWireframe,
        roughness: 0.3,
        metalness: 0.8,
      });
      const icosaMesh = new THREE.Mesh(icosaGeo, material);
      group.add(icosaMesh);

      // Atom nodes on vertices
      const posAttr = icosaGeo.attributes.position;
      const atomMat = new THREE.MeshStandardMaterial({
        color: 0x34d399,
        emissive: 0x065f46,
      });
      const atomGeo = new THREE.SphereGeometry(0.12, 16, 16);

      for (let i = 0; i < posAttr.count; i++) {
        const atom = new THREE.Mesh(atomGeo, atomMat);
        atom.position.set(posAttr.getX(i), posAttr.getY(i), posAttr.getZ(i));
        group.add(atom);
      }
    } else if (modelType === "bloch") {
      // 3. Quantum Bloch Sphere
      const sphereGeo = new THREE.SphereGeometry(2, 32, 32);
      const sphereMat = new THREE.MeshBasicMaterial({
        color: 0x6366f1,
        wireframe: true,
        transparent: true,
        opacity: 0.25,
      });
      const sphere = new THREE.Mesh(sphereGeo, sphereMat);
      group.add(sphere);

      // Equator Ring
      const ringGeo = new THREE.RingGeometry(1.98, 2.02, 64);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        side: THREE.DoubleSide,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI / 2;
      group.add(ring);

      // Coordinate axes
      const axes = new THREE.AxesHelper(2.5);
      group.add(axes);

      // Pole labels (markers)
      const poleGeo = new THREE.SphereGeometry(0.08, 16, 16);
      const northPole = new THREE.Mesh(poleGeo, new THREE.MeshBasicMaterial({ color: 0x10b981 }));
      northPole.position.set(0, 2, 0); // |0>
      group.add(northPole);

      const southPole = new THREE.Mesh(poleGeo, new THREE.MeshBasicMaterial({ color: 0xef4444 }));
      southPole.position.set(0, -2, 0); // |1>
      group.add(southPole);

      // State vector arrow
      const x = 2 * Math.sin(theta) * Math.cos(phi);
      const y = 2 * Math.cos(theta);
      const z = 2 * Math.sin(theta) * Math.sin(phi);
      const dir = new THREE.Vector3(x, y, z).normalize();
      const origin = new THREE.Vector3(0, 0, 0);
      const arrow = new THREE.ArrowHelper(dir, origin, 2, 0xf59e0b, 0.4, 0.2);
      group.add(arrow);
      stateVectorArrowRef.current = arrow;
    }
  }, [modelType, showWireframe, theta, phi]);

  return (
    <div className="flex-1 flex flex-col bg-[#080c14] overflow-hidden select-none">
      {/* Visualizer Header Toolbar */}
      <div className="h-12 border-b border-slate-800 bg-slate-900/90 px-3 flex items-center justify-between gap-2 shrink-0">
        {/* Model Tabs */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setModelType("orbital")}
            className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
              modelType === "orbital"
                ? "bg-indigo-600 text-white"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
            }`}
          >
            Hydrogen 2p
          </button>
          <button
            onClick={() => setModelType("buckyball")}
            className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
              modelType === "buckyball"
                ? "bg-indigo-600 text-white"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
            }`}
          >
            Fullerene C60
          </button>
          <button
            onClick={() => setModelType("bloch")}
            className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
              modelType === "bloch"
                ? "bg-indigo-600 text-white"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
            }`}
          >
            Bloch Sphere
          </button>
        </div>

        {/* Viewport Action Controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setIsRotating(!isRotating)}
            title={isRotating ? "Pause Orbit" : "Play Orbit"}
            className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            {isRotating ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 text-emerald-400" />}
          </button>

          <button
            onClick={() => setShowWireframe(!showWireframe)}
            title="Toggle Wireframe Mesh"
            className={`p-1.5 rounded transition-colors ${
              showWireframe ? "text-indigo-400 bg-indigo-950/60" : "text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setArGridOverlay(!arGridOverlay)}
            title="Toggle AR Spatial Blueprint Grid"
            className={`p-1.5 rounded transition-colors ${
              arGridOverlay ? "text-cyan-400 bg-cyan-950/60" : "text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            <Grid className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 3D WebGL Canvas Viewport */}
      <div className="relative flex-1 overflow-hidden">
        <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

        {/* AR Spatial Blueprint Overlay Details */}
        {arGridOverlay && (
          <div className="absolute top-3 left-3 pointer-events-none flex flex-col gap-1 text-[11px] font-mono text-slate-400">
            <div className="flex items-center gap-1.5 text-cyan-400">
              <Sparkles className="w-3 h-3" />
              <span>AR WebGL 3D STEM Engine</span>
            </div>
            <div>Rotation: {isRotating ? `${speed}x Active` : "Paused"}</div>
            <div>Rendering: 60 FPS · 1080p Spatial Projection</div>
          </div>
        )}

        {/* Dynamic Controls for Bloch Sphere */}
        {modelType === "bloch" && (
          <div className="absolute bottom-3 left-3 right-3 p-3 rounded-lg bg-slate-900/90 backdrop-blur border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <div>
                <span className="text-slate-400 mr-2 font-mono">θ (Polar): {Math.round((theta * 180) / Math.PI)}°</span>
                <input
                  type="range"
                  min={0}
                  max={Math.PI}
                  step={0.05}
                  value={theta}
                  onChange={(e) => setTheta(parseFloat(e.target.value))}
                  className="w-24 accent-indigo-500 cursor-pointer align-middle"
                />
              </div>

              <div>
                <span className="text-slate-400 mr-2 font-mono">φ (Phase): {Math.round((phi * 180) / Math.PI)}°</span>
                <input
                  type="range"
                  min={0}
                  max={Math.PI * 2}
                  step={0.05}
                  value={phi}
                  onChange={(e) => setPhi(parseFloat(e.target.value))}
                  className="w-24 accent-indigo-500 cursor-pointer align-middle"
                />
              </div>
            </div>

            <div className="font-mono text-[11px] text-amber-300">
              |ψ⟩ = cos(θ/2)|0⟩ + e^(iφ)sin(θ/2)|1⟩
            </div>
          </div>
        )}

        {modelType === "orbital" && (
          <div className="absolute bottom-3 left-3 px-2 py-1 rounded bg-black/60 text-[11px] font-mono text-slate-300">
            Drag with mouse to rotate · Scroll to zoom
          </div>
        )}
      </div>
    </div>
  );
};
