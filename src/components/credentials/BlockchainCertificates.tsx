import React, { useState } from "react";
import { SampleNotice } from "../ui";
import {
  Award,
  ShieldCheck,
  CheckCircle,
  Hash,
  Search,
  Plus,
  ExternalLink,
  QrCode,
  Lock,
} from "lucide-react";
import {
  INITIAL_CERTIFICATES,
  issueNewCertificate,
  verifyCertificateHash,
} from "../../services/blockchainService";
import { BlockchainCertificate } from "../../types";

export const BlockchainCertificates: React.FC = () => {
  const [certificates, setCertificates] = useState<BlockchainCertificate[]>(INITIAL_CERTIFICATES);
  const [selectedCert, setSelectedCert] = useState<BlockchainCertificate>(INITIAL_CERTIFICATES[0]);
  const [showIssueModal, setShowIssueModal] = useState(false);

  // Issue modal fields
  const [newStudent, setNewStudent] = useState("");
  const [newCourse, setNewCourse] = useState("Quantum Information & Superconducting Qubits");
  const [newGrade, setNewGrade] = useState("High Honors (95%)");
  const [isIssuing, setIsIssuing] = useState(false);

  // Verification status check
  const [verificationResult, setVerificationResult] = useState<string | null>(null);

  const handleVerify = async (cert: BlockchainCertificate) => {
    const res = await verifyCertificateHash(cert);
    setVerificationResult(res.details);
    setTimeout(() => setVerificationResult(null), 5000);
  };

  const handleIssueCert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudent.trim()) return;
    setIsIssuing(true);
    try {
      const issued = await issueNewCertificate(newStudent, newCourse, newGrade);
      setCertificates((prev) => [issued, ...prev]);
      setSelectedCert(issued);
      setShowIssueModal(false);
      setNewStudent("");
    } finally {
      setIsIssuing(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-canvas overflow-y-auto select-none p-3 sm:p-4 lg:p-6">
      <div className="max-w-6xl w-full mx-auto flex flex-col gap-4 lg:gap-6">
        <SampleNotice>These certificates are examples. Issuing real certificates isn't connected yet.</SampleNotice>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h1 className="text-base font-bold text-white flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-400" />
              <span>Cryptographic Blockchain Diploma Ledger</span>
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Immutable SHA-256 academic accreditation, digital diplomas, and public decentralized verification
            </p>
          </div>

          <button
            onClick={() => setShowIssueModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-500 transition-colors shadow-lg"
          >
            <Plus className="w-4 h-4" />
            <span>Issue New Diploma</span>
          </button>
        </div>

        {verificationResult && (
          <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2 font-mono">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{verificationResult}</span>
          </div>
        )}

        {/* Issue Diploma Modal */}
        {showIssueModal && (
          <div className="p-4 rounded-xl bg-slate-900 border border-indigo-500/40 shadow-2xl flex flex-col gap-3">
            <div className="text-xs font-semibold text-white">
              Issue Blockchain-Verified Digital Academic Diploma
            </div>
            <form onSubmit={handleIssueCert} className="flex flex-col gap-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  type="text"
                  placeholder="Student Full Name (e.g. Elena Rostova)"
                  value={newStudent}
                  onChange={(e) => setNewStudent(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  required
                />
                <input
                  type="text"
                  placeholder="Course Title"
                  value={newCourse}
                  onChange={(e) => setNewCourse(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  required
                />
                <input
                  type="text"
                  placeholder="Grade / Distinction"
                  value={newGrade}
                  onChange={(e) => setNewGrade(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowIssueModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isIssuing}
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-500 transition-colors"
                >
                  {isIssuing ? "Computing Cryptographic Block..." : "Mine & Issue Diploma"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Certificate Display: Split view with list on left and verified diploma on right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Certificate Explorer List */}
          <div className="lg:col-span-5 flex flex-col gap-3">
            <span className="text-xs font-semibold text-slate-300">
              Verified Block Records ({certificates.length})
            </span>

            {certificates.map((cert) => {
              const isSelected = selectedCert.certificateId === cert.certificateId;
              return (
                <div
                  key={cert.certificateId}
                  onClick={() => setSelectedCert(cert)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? "bg-indigo-950/40 border-indigo-500/60 shadow-lg ring-1 ring-indigo-500/30"
                      : "bg-slate-900 border-slate-800 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="font-mono text-2xs text-amber-400 font-semibold">
                      {cert.certificateId}
                    </span>
                    <span className="text-2xs font-mono text-emerald-400 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" /> Block #{cert.blockNumber}
                    </span>
                  </div>

                  <h3 className="text-xs font-semibold text-white">{cert.studentName}</h3>
                  <p className="text-2xs text-slate-400 mt-0.5 line-clamp-1">{cert.courseTitle}</p>

                  <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-2xs text-slate-500 font-mono">
                    <span>{cert.grade}</span>
                    <span className="truncate max-w-[120px]">{cert.blockHash.substring(0, 14)}...</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Certificate Credential Canvas & Hash Explorer */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            {/* Diploma Certificate Preview Card */}
            <div className="rounded-2xl bg-gradient-to-br from-slate-900 via-surface to-slate-950 border-2 border-amber-500/40 p-8 shadow-2xl relative overflow-hidden">
              {/* Decorative background watermark */}
              <div className="absolute top-0 right-0 p-8 opacity-5 text-amber-300 pointer-events-none">
                <Award className="w-48 h-48" />
              </div>

              <div className="relative z-10 flex flex-col gap-6">
                {/* Certificate Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-2xs font-mono tracking-widest text-amber-400 uppercase">
                      NexusStem Institute of Advanced Physics
                    </div>
                    <h2 className="text-xl font-bold text-white mt-1">Certificate of Academic Mastery</h2>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                    <Award className="w-7 h-7" />
                  </div>
                </div>

                {/* Certificate Body */}
                <div className="flex flex-col gap-1 py-4 border-y border-slate-800/80">
                  <span className="text-xs text-slate-400">This is to certify that</span>
                  <div className="text-2xl font-bold text-white tracking-wide font-sans">
                    {selectedCert.studentName}
                  </div>
                  <span className="text-xs text-slate-400 mt-2">
                    has successfully defended coursework and laboratory evaluations with distinction in
                  </span>
                  <div className="text-sm font-semibold text-indigo-300 mt-0.5">
                    {selectedCert.courseTitle}
                  </div>
                  <div className="text-xs font-mono text-amber-400 mt-2">
                    Honors Designation: {selectedCert.grade}
                  </div>
                </div>

                {/* Cryptographic Footer */}
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 text-xs font-mono">
                  <div className="flex flex-col gap-1">
                    <div className="text-2xs text-slate-400">SHA-256 Consensus Block Hash:</div>
                    <div className="text-2xs text-indigo-400 break-all max-w-sm">
                      {selectedCert.blockHash}
                    </div>
                    <div className="text-2xs text-slate-500 mt-1">
                      Digital Signature: {selectedCert.instructorSignature}
                    </div>
                  </div>

                  <button
                    onClick={() => handleVerify(selectedCert)}
                    className="px-3.5 py-2 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-500 transition-colors flex items-center gap-1.5 shrink-0 shadow-lg text-xs"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>Verify Proof</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Block Ledger Raw Proof Details */}
            <div className="rounded-xl bg-slate-900 border border-slate-800 p-4 font-mono text-xs text-slate-300 flex flex-col gap-2">
              <div className="flex items-center justify-between text-slate-400 border-b border-slate-800 pb-2">
                <span>Block Explorer Inspection</span>
                <span className="text-emerald-400">Status: Validated Consensus</span>
              </div>
              <div className="text-2xs grid grid-cols-2 gap-2 text-slate-400">
                <div>Block Height: <span className="text-white">#{selectedCert.blockNumber}</span></div>
                <div>Issued Timestamp: <span className="text-white">{selectedCert.issuedAt}</span></div>
                <div className="col-span-2 truncate">
                  Previous Block Hash: <span className="text-slate-300">{selectedCert.previousHash}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
