import React, { useState } from "react";
import { useClassroom } from "../../context/ClassroomContext";
import {
  Folder,
  FileText,
  FileCode,
  Download,
  Check,
  HardDrive,
  Upload,
  Search,
  WifiOff,
  Wifi,
  ExternalLink,
  X,
} from "lucide-react";
import { StudyMaterial } from "../../types";

export const OfflineRepository: React.FC = () => {
  const {
    materials,
    toggleMaterialDownload,
    isOfflineMode,
    toggleOfflineMode,
    currentRole,
  } = useClassroom();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [activeMaterial, setActiveMaterial] = useState<StudyMaterial | null>(materials[0]);
  const [uploadToast, setUploadToast] = useState(false);

  const categories = ["all", "Quantum Physics", "Linear Algebra", "Laboratory Guide", "Computer Science"];

  const filteredMaterials = materials.filter((m) => {
    const matchesSearch =
      m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = selectedCategory === "all" || m.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const handleSimulatedUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setUploadToast(true);
      setTimeout(() => setUploadToast(false), 3000);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#080c14] overflow-hidden select-none">
      {/* Top Bar for Materials View */}
      <div className="min-h-14 py-2 border-b border-slate-800 bg-slate-900/90 px-3 sm:px-6 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <HardDrive className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-bold text-white truncate">STEM Cloud Repository & Offline Cache</h1>
            <p className="hidden sm:block text-[11px] text-slate-400">
              Synchronized course slides, laboratory notebooks, and encrypted offline study decks
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Offline Mode Toggle Banner */}
          <button
            onClick={toggleOfflineMode}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
              isOfflineMode
                ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                : "bg-slate-900 text-slate-300 border-slate-800 hover:text-white hover:bg-slate-800"
            }`}
          >
            {isOfflineMode ? <WifiOff className="w-4 h-4 text-amber-400" /> : <Wifi className="w-4 h-4 text-emerald-400" />}
            <span>{isOfflineMode ? "Offline Mode (Simulated)" : "Online Cloud Sync"}</span>
          </button>

          {/* Upload Button */}
          {currentRole === "instructor" && (
            <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-500 transition-colors cursor-pointer shadow-sm">
              <Upload className="w-4 h-4" />
              <span>Upload Material</span>
              <input type="file" onChange={handleSimulatedUpload} className="hidden" />
            </label>
          )}
        </div>
      </div>

      {uploadToast && (
        <div className="bg-emerald-950/80 border-b border-emerald-800 text-emerald-300 px-6 py-2 text-xs flex items-center justify-between">
          <span>Encrypted file uploaded & synced to student cloud repositories.</span>
          <button onClick={() => setUploadToast(false)} className="text-emerald-400 hover:text-emerald-300 p-0.5" aria-label="Close toast">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main split area: File list on left, preview on right */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Filter & File List */}
        <div className="w-full md:w-1/2 lg:w-5/12 border-r border-slate-800 p-4 flex flex-col gap-3 overflow-y-auto">
          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search lectures, code, and formula guides..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 placeholder:text-slate-600"
            />
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-1">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setSelectedCategory(c)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md whitespace-nowrap capitalize transition-colors ${
                  selectedCategory === c
                    ? "bg-indigo-600 text-white"
                    : "text-slate-400 hover:text-slate-200 bg-slate-900 border border-slate-800"
                }`}
              >
                {c === "all" ? "All Files" : c}
              </button>
            ))}
          </div>

          {/* Materials Cards List */}
          <div className="flex flex-col gap-2 mt-1">
            {filteredMaterials.map((mat) => {
              const isSelected = activeMaterial?.id === mat.id;
              return (
                <div
                  key={mat.id}
                  onClick={() => setActiveMaterial(mat)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? "bg-indigo-950/40 border-indigo-500/60 shadow-lg"
                      : "bg-slate-900/80 border-slate-800 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center text-indigo-400 shrink-0">
                        {mat.format === "code" ? (
                          <FileCode className="w-4 h-4" />
                        ) : (
                          <FileText className="w-4 h-4" />
                        )}
                      </div>
                      <div>
                        <h4 className="text-xs font-semibold text-white leading-tight line-clamp-1">
                          {mat.title}
                        </h4>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5 font-mono">
                          <span>{mat.category}</span>
                          <span>·</span>
                          <span>{mat.size}</span>
                        </div>
                      </div>
                    </div>

                    {/* Offline Toggle Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleMaterialDownload(mat.id);
                      }}
                      title={mat.downloadedOffline ? "Available Offline (Cached)" : "Click to Cache Offline"}
                      className={`p-1.5 rounded-lg text-xs transition-colors shrink-0 ${
                        mat.downloadedOffline
                          ? "bg-emerald-950/60 text-emerald-400 border border-emerald-800/60 hover:bg-emerald-900"
                          : "bg-slate-950 text-slate-400 border border-slate-800 hover:text-white"
                      }`}
                    >
                      {mat.downloadedOffline ? (
                        <Check className="w-3.5 h-3.5" />
                      ) : (
                        <Download className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Selected File Reader & Offline Inspector */}
        <div className="hidden md:flex flex-1 flex-col p-6 overflow-y-auto">
          {activeMaterial ? (
            <div className="flex flex-col gap-4 max-w-3xl">
              <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-4">
                <div>
                  <div className="flex items-center gap-2 text-xs font-mono text-indigo-400 mb-1">
                    <span>{activeMaterial.category}</span>
                    <span>·</span>
                    <span>{activeMaterial.size}</span>
                    <span>·</span>
                    <span className="text-emerald-400">
                      {activeMaterial.downloadedOffline ? "Cached in Local Vault" : "Cloud Only"}
                    </span>
                  </div>
                  <h2 className="text-lg font-bold text-white">{activeMaterial.title}</h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Updated {activeMaterial.updatedAt} · AES-256 Encrypted Academic Asset
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 sm:gap-2 md:shrink-0">
                  <button
                    onClick={() => toggleMaterialDownload(activeMaterial.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      activeMaterial.downloadedOffline
                        ? "bg-emerald-950/60 text-emerald-300 border-emerald-800/80"
                        : "bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800 hover:text-white"
                    }`}
                  >
                    {activeMaterial.downloadedOffline ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Available Offline</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-3.5 h-3.5" />
                        <span>Save for Offline</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Document Content Viewer */}
              <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-6 font-mono text-xs text-slate-300 leading-relaxed whitespace-pre-wrap shadow-xl">
                {activeMaterial.content}
              </div>

              {/* Drive Integration & Sharing Links */}
              <div className="rounded-xl bg-slate-950 border border-slate-800/80 p-4 flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <ExternalLink className="w-4 h-4 text-indigo-400" />
                  <span>Google Drive / Local NAS Direct Mirror:</span>
                  <span className="font-mono text-slate-300">/shared/curriculum/{activeMaterial.id}</span>
                </div>
                <button
                  onClick={() => alert(`Simulated: Downloaded ${activeMaterial.title} to local device.`)}
                  className="text-indigo-400 hover:underline"
                >
                  Direct Export
                </button>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-slate-500">
              Select a study deck or laboratory guide to preview
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
