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

export const INITIAL_REMOTE_SESSIONS: RemoteAccessSession[] = [];

