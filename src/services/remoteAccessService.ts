import { RemoteAccessSession, DeviceType, RemoteAccessLevel } from "../types";

export interface DeviceMetadata {
  type: DeviceType;
  label: string;
  defaultModel: string;
  defaultOs: string;
  aspectRatio: string;
  aspectRatioClass: string;
  resolution: { width: number; height: number };
  sampleApps: Array<"worksheet" | "ide" | "terminal" | "browser" | "calculator">;
}

export const DEVICE_METADATA_MAP: Record<DeviceType, DeviceMetadata> = {
  phone: {
    type: "phone",
    label: "Smartphone",
    defaultModel: "Samsung Galaxy S24 Ultra",
    defaultOs: "Android 15 (One UI 7.0)",
    aspectRatio: "9:16",
    aspectRatioClass: "aspect-[9/16] max-w-[340px]",
    resolution: { width: 1080, height: 2340 },
    sampleApps: ["calculator", "worksheet", "terminal"],
  },
  tablet: {
    type: "tablet",
    label: "Tablet",
    defaultModel: "Apple iPad Pro 13\" (M4)",
    defaultOs: "iPadOS 18.2 (Stylus Enabled)",
    aspectRatio: "4:3",
    aspectRatioClass: "aspect-[4/3] max-w-[700px]",
    resolution: { width: 2064, height: 2752 },
    sampleApps: ["worksheet", "calculator", "browser"],
  },
  laptop: {
    type: "laptop",
    label: "Laptop",
    defaultModel: "Lenovo ThinkPad X1 Carbon Gen 12",
    defaultOs: "Ubuntu Linux 24.04 LTS",
    aspectRatio: "16:10",
    aspectRatioClass: "aspect-[16/10] max-w-[860px]",
    resolution: { width: 1920, height: 1200 },
    sampleApps: ["ide", "terminal", "worksheet"],
  },
  desktop: {
    type: "desktop",
    label: "Desktop PC",
    defaultModel: "Dell Precision 7875 Workstation",
    defaultOs: "Windows 11 Pro 64-bit (NVIDIA RTX 4090)",
    aspectRatio: "16:9",
    aspectRatioClass: "aspect-[16/9] max-w-[940px]",
    resolution: { width: 2560, height: 1440 },
    sampleApps: ["ide", "terminal", "browser", "worksheet"],
  },
};

export const INITIAL_REMOTE_SESSIONS: RemoteAccessSession[] = [
  {
    id: "ras-tablet-sophia",
    studentId: "stu-1",
    studentName: "Sophia Chen",
    requesterId: "host-1",
    requesterName: "Dr. Evelyn Vance",
    deviceType: "tablet",
    deviceModel: "Apple iPad Pro 13\" (M4)",
    osName: "iPadOS 18.2",
    accessLevel: "full_control",
    status: "active",
    cursorPosition: { x: 0.46, y: 0.38 },
    activeAnnotationTool: "pen",
    annotations: [
      { x: 0.36, y: 0.32, color: "#00C2E0", size: 4 },
      { x: 0.62, y: 0.52, color: "#FFBB00", size: 6 },
    ],
    worksheetContent:
      "Exercise 4.2: Calculate the density matrix trace for a 2-qubit entangled Bell State |Φ+⟩ = 1/√2 (|00⟩ + |11⟩).\n\nStep 1: Write state vector\nStep 2: Compute outer product ρ = |Φ+⟩⟨Φ+|\nStep 3: Verification: Tr(ρ) = 1/2 + 1/2 = 1.0 (Q.E.D.)",
    screenResolution: { width: 2064, height: 2752 },
    fps: 60,
    latencyMs: 9.8,
    isMutedControl: false,
    interactiveContent: {
      activeApp: "worksheet",
      codeEditorText: `// Quantum Entanglement Density Matrix Matrix\nfunction calculateBellTrace() {\n  const rho = [[0.5, 0, 0, 0.5], [0, 0, 0, 0], [0, 0, 0, 0], [0.5, 0, 0, 0.5]];\n  const trace = rho[0][0] + rho[1][1] + rho[2][2] + rho[3][3];\n  return trace; // Returns 1.0 (Hermitian pure state)\n}`,
      terminalLogs: [
        "[QuantumSim 2.4] Initializing qubit register: q[0], q[1]",
        "[QuantumSim 2.4] Applying Hadamard H -> q[0]",
        "[QuantumSim 2.4] Applying CNOT (ctrl: q[0], tgt: q[1])",
        "[QuantumSim 2.4] State generated: |Φ+⟩. Density matrix trace = 1.0000",
      ],
      worksheetAnswers: {
        q1: "Normalized state vector verified with Frobenius norm 1.0.",
        q2: "Purity = Tr(ρ²) = 1.0 indicates a pure entangled quantum state.",
      },
      notesText: "Dr. Vance advised checking eigenbasis decomposition before quantum teleportation lab tomorrow.",
    },
    actionLog: [
      { timestamp: "09:12 AM", actor: "Dr. Evelyn Vance", description: "Requested Remote Access (Full Control)" },
      { timestamp: "09:12 AM", actor: "Sophia Chen", description: "Granted Full Remote Control on iPad Pro" },
      { timestamp: "09:13 AM", actor: "Dr. Evelyn Vance", description: "Circled Step 2 outer product with cyan stylus" },
    ],
    requestedAt: "09:12 AM",
  },
  {
    id: "ras-laptop-marcus",
    studentId: "stu-2",
    studentName: "Marcus Vance",
    requesterId: "host-1",
    requesterName: "Dr. Evelyn Vance",
    deviceType: "laptop",
    deviceModel: "Lenovo ThinkPad X1 Carbon Gen 12",
    osName: "Ubuntu Linux 24.04 LTS",
    accessLevel: "full_control",
    status: "active",
    cursorPosition: { x: 0.65, y: 0.32 },
    activeAnnotationTool: "pointer",
    annotations: [
      { x: 0.74, y: 0.28, color: "#FF7176", size: 5 },
    ],
    worksheetContent: "Lab 5: Shor's Factorization Algorithm Benchmarks in Python Qiskit",
    screenResolution: { width: 1920, height: 1200 },
    fps: 58,
    latencyMs: 12.4,
    isMutedControl: false,
    interactiveContent: {
      activeApp: "ide",
      codeEditorText: `import numpy as np\nfrom math import gcd\n\ndef quantum_period_finding(a: int, N: int):\n    # Period finding via quantum phase estimation\n    print(f"Finding order r for {a} modulo {N}...")\n    r = 4 # Found period from QPE measurement\n    return r\n\n# Test with N = 15, a = 7\nprint("Period found:", quantum_period_finding(7, 15))\n`,
      terminalLogs: [
        "marcus@thinkpad:~/21k-quantum$ python3 -m pip install qiskit",
        "Requirement already satisfied: qiskit (1.1.0)",
        "marcus@thinkpad:~/21k-quantum$ python3 shor_benchmark.py",
        "Finding order r for 7 modulo 15...",
        "Period found: 4 -> Factors: (7^(4/2) - 1) gcd 15 = 3, 5! Success.",
      ],
      worksheetAnswers: {
        step1: "N = 15, coprime base chosen: a = 7",
        step2: "Period r = 4, gcd(7^2 - 1, 15) = gcd(48, 15) = 3",
      },
      notesText: "Linux kernel 6.8 with low-latency scheduler. Qiskit Aer simulation running locally.",
    },
    actionLog: [
      { timestamp: "09:14 AM", actor: "Marcus Vance", description: "Offered Remote Access (Full Control) on ThinkPad" },
      { timestamp: "09:14 AM", actor: "Dr. Evelyn Vance", description: "Accepted access offer and opened Laptop session tab" },
      { timestamp: "09:15 AM", actor: "Dr. Evelyn Vance", description: "Ran test script in Linux terminal" },
    ],
    requestedAt: "09:14 AM",
  },
  {
    id: "ras-phone-liam",
    studentId: "stu-3",
    studentName: "Liam Patel",
    requesterId: "host-1",
    requesterName: "Dr. Evelyn Vance",
    deviceType: "phone",
    deviceModel: "Samsung Galaxy S24 Ultra",
    osName: "Android 15 (One UI 7.0)",
    accessLevel: "annotate",
    status: "active",
    cursorPosition: { x: 0.51, y: 0.65 },
    activeAnnotationTool: "highlighter",
    annotations: [
      { x: 0.5, y: 0.62, color: "#FFBB00", size: 8 },
    ],
    worksheetContent: "Mobile Micro-Quiz: Quantum Superposition & Bloch Sphere coordinates",
    screenResolution: { width: 1080, height: 2340 },
    fps: 60,
    latencyMs: 14.1,
    isMutedControl: false,
    interactiveContent: {
      activeApp: "calculator",
      codeEditorText: `// Mobile micro-script\nconst theta = Math.PI / 3;\nconst phi = Math.PI / 4;\nconsole.log({ x: Math.sin(theta)*Math.cos(phi), z: Math.cos(theta) });`,
      terminalLogs: [
        "Termux (Android): node -e 'console.log(\"Mobile Bloch coordinates verified\")'",
        "{ x: 0.612, y: 0.612, z: 0.500 }",
      ],
      worksheetAnswers: {
        mcq1: "Bloch Sphere zenith angle: theta = 60 deg",
        mcq2: "Phase shift angle: phi = 45 deg",
      },
      notesText: "Joined via 21K School Mobile PWA on Samsung Dex / 5G network.",
    },
    actionLog: [
      { timestamp: "09:16 AM", actor: "Dr. Evelyn Vance", description: "Requested Remote Access (Annotate Tier)" },
      { timestamp: "09:16 AM", actor: "Liam Patel", description: "Approved Annotate Access on Galaxy S24" },
    ],
    requestedAt: "09:16 AM",
  },
  {
    id: "ras-desktop-ananya",
    studentId: "stu-4",
    studentName: "Ananya Sharma",
    requesterId: "host-1",
    requesterName: "Dr. Evelyn Vance",
    deviceType: "desktop",
    deviceModel: "Dell Precision 7875 Workstation",
    osName: "Windows 11 Pro 64-bit (NVIDIA RTX 4090)",
    accessLevel: "view_only",
    status: "active",
    cursorPosition: { x: 0.34, y: 0.44 },
    activeAnnotationTool: "pointer",
    annotations: [],
    worksheetContent: "3D Quantum Monte Carlo Molecular Dynamics Lattice Simulation",
    screenResolution: { width: 2560, height: 1440 },
    fps: 60,
    latencyMs: 8.5,
    isMutedControl: false,
    interactiveContent: {
      activeApp: "terminal",
      codeEditorText: `// CUDA Kernel for Quantum Monte Carlo\n__global__ void runMonteCarloStep(float* lattice, int N, float temp) {\n    int idx = blockIdx.x * blockDim.x + threadIdx.x;\n    if (idx < N) {\n        // Metropolis-Hastings acceptance probability\n    }\n}`,
      terminalLogs: [
        "PS C:\\21K-Sim> nvcc -O3 mc_lattice.cu -o mc_lattice.exe",
        "PS C:\\21K-Sim> .\\mc_lattice.exe --steps 1000000 --threads 1024",
        "[CUDA Compute] 1,000,000 steps executed in 412ms. Mean energy: -1.742 eV",
        "[CUDA Compute] Converged within 0.001 tolerance. Memory: 1.4 GB / 24 GB",
      ],
      worksheetAnswers: {
        convergence: "Converged at T = 0.85 K after 850k iterations.",
        groundState: "Ground state energy E0 = -1.742 eV verified.",
      },
      notesText: "Dual 4K monitors, Workstation GPU acceleration enabled.",
    },
    actionLog: [
      { timestamp: "09:18 AM", actor: "Ananya Sharma", description: "Offered View Only Screen Feed from Desktop PC" },
      { timestamp: "09:18 AM", actor: "Dr. Evelyn Vance", description: "Opened monitoring view for CUDA simulation" },
    ],
    requestedAt: "09:18 AM",
  },
];
