import React, { useState } from "react";
import { useClassroom } from "../../context/ClassroomContext";
import {
  Zap,
  Play,
  Plus,
  ArrowRight,
  CheckCircle,
  AlertTriangle,
  Clock,
  Shield,
  Users,
  Layers,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Workflow,
} from "lucide-react";
import { AutomationRule } from "../../types";

export const VisualFlowBuilder: React.FC = () => {
  const {
    automationRules,
    toggleAutomationRule,
    executeRule,
    addNewRule,
  } = useClassroom();

  const [selectedRuleId, setSelectedRuleId] = useState<string>(automationRules[0]?.id || "");
  const [showNewRuleModal, setShowNewRuleModal] = useState(false);
  const [testingRuleId, setTestingRuleId] = useState<string | null>(null);

  // New rule state
  const [ruleName, setRuleName] = useState("");
  const [ruleDesc, setRuleDesc] = useState("");
  const [triggerType, setTriggerType] = useState<any>("schedule_time");
  const [triggerVal, setTriggerVal] = useState("09:00 AM UTC");
  const [actionType, setActionType] = useState<any>("create_grade_rooms");

  const activeRule = automationRules.find((r) => r.id === selectedRuleId) || automationRules[0];

  const handleTestRun = async (ruleId: string) => {
    setTestingRuleId(ruleId);
    await executeRule(ruleId);
    setTimeout(() => {
      setTestingRuleId(null);
    }, 1200);
  };

  const handleCreateRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleName.trim()) return;

    const newRule: AutomationRule = {
      id: `rule-${Date.now()}`,
      name: ruleName,
      description: ruleDesc || "Custom administrative operations automation rule.",
      category: "grade_room",
      trigger: {
        type: triggerType,
        label: triggerType === "schedule_time" ? `Timetable Event (${triggerVal})` : "Trigger Condition Met",
        value: triggerVal,
      },
      actions: [
        {
          type: actionType,
          label: actionType === "create_grade_rooms" ? "Auto-Generate Encrypted Virtual Classrooms" : "Dispatch Automated Administrative Workflow",
          params: {},
        },
      ],
      enabled: true,
      runCount: 0,
    };

    addNewRule(newRule);
    setSelectedRuleId(newRule.id);
    setShowNewRuleModal(false);
    setRuleName("");
    setRuleDesc("");
  };

  return (
    <div className="flex-1 flex flex-col bg-[#070b14] p-6 overflow-y-auto">
      <div className="max-w-6xl w-full mx-auto flex flex-col gap-4 lg:gap-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/70 p-5 rounded-2xl border border-white/10 shadow-sm">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#003872]/10 text-blue-300 flex items-center justify-center font-bold">
                <Workflow className="w-4 h-4 text-blue-300" />
              </div>
              <h2 className="font-headline font-bold text-lg text-blue-300">
                Dronacharya Visual Automation Flow Builder
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-1 font-sans">
              Visually chain schedule triggers, grade-wise room creators, facilitator allocators, and failover actions.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowNewRuleModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#003872] text-white text-xs font-bold hover:bg-[#00264d] transition-colors shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Automation Rule</span>
            </button>
          </div>
        </div>

        {/* Create Rule Modal */}
        {showNewRuleModal && (
          <div className="p-5 rounded-2xl bg-slate-900/70 border-2 border-[#003872]/30 shadow-xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <h3 className="font-headline font-bold text-sm text-blue-300">
                Configure New Dronacharya Operational Flow
              </h3>
              <button
                onClick={() => setShowNewRuleModal(false)}
                className="text-slate-400 hover:text-white text-xs"
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handleCreateRule} className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-sans">
              <div>
                <label className="block text-slate-200 font-semibold mb-1">Rule Name</label>
                <input
                  type="text"
                  placeholder="e.g. Grade 9 Science Lab Concurrency Rule"
                  value={ruleName}
                  onChange={(e) => setRuleName(e.target.value)}
                  className="w-full border border-white/15 rounded-lg p-2.5 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-200 font-semibold mb-1">Trigger Event</label>
                <select
                  value={triggerType}
                  onChange={(e) => setTriggerType(e.target.value)}
                  className="w-full border border-white/15 rounded-lg p-2.5 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                >
                  <option value="schedule_time">Daily Timetable Time Trigger</option>
                  <option value="teacher_inactive">Primary Facilitator Inactive &gt; 5 Minutes</option>
                  <option value="student_absent_count">Unexcused Student Absence Threshold</option>
                  <option value="exam_started">Official Exam Commenced</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-slate-200 font-semibold mb-1">Description / Academic Objective</label>
                <input
                  type="text"
                  placeholder="Explains what this rule automates across the 21K School campus..."
                  value={ruleDesc}
                  onChange={(e) => setRuleDesc(e.target.value)}
                  className="w-full border border-white/15 rounded-lg p-2.5 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-slate-200 font-semibold mb-1">Action to Execute</label>
                <select
                  value={actionType}
                  onChange={(e) => setActionType(e.target.value)}
                  className="w-full border border-white/15 rounded-lg p-2.5 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                >
                  <option value="create_grade_rooms">Auto-Generate Grade Rooms with Teacher Allocation</option>
                  <option value="route_emergency_substitute">Trigger Emergency Substitute Teacher Routing</option>
                  <option value="send_parent_compliance_email">Dispatch Automated Absence Alert to Parents</option>
                  <option value="lockdown_exam_controls">Enforce Exam Lockdown Mode</option>
                </select>
              </div>

              <div className="sm:col-span-2 flex justify-end gap-2 pt-2 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setShowNewRuleModal(false)}
                  className="px-4 py-2 rounded-lg text-slate-300 hover:bg-white/[0.08] text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-[#003872] text-white text-xs font-bold hover:bg-[#00264d] shadow-sm"
                >
                  Save & Activate Flow
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Master-Detail: Flow Rules list on left, Visual Node Stage on right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Rules List */}
          <div className="lg:col-span-4 flex flex-col gap-3">
            <span className="font-headline font-bold text-xs text-blue-300 uppercase tracking-wider">
              Configured Campus Rules ({automationRules.length})
            </span>

            <div className="flex flex-col gap-2.5">
              {automationRules.map((rule) => {
                const isSelected = rule.id === activeRule?.id;
                return (
                  <div
                    key={rule.id}
                    onClick={() => setSelectedRuleId(rule.id)}
                    className={`p-4 rounded-xl border text-left cursor-pointer transition-all ${
                      isSelected
                        ? "bg-slate-900/70 border-blue-500/60 ring-2 ring-blue-500/30 shadow-md"
                        : "bg-slate-900/80 border-white/10 hover:border-white/20 hover:bg-white/10"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-headline font-bold text-xs text-blue-300 leading-snug">
                        {rule.name}
                      </h4>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleAutomationRule(rule.id);
                        }}
                        title={rule.enabled ? "Rule Active" : "Rule Paused"}
                        className="text-slate-400 hover:text-blue-300"
                      >
                        {rule.enabled ? (
                          <ToggleRight className="w-5 h-5 text-[#0082FF]" />
                        ) : (
                          <ToggleLeft className="w-5 h-5 text-slate-300" />
                        )}
                      </button>
                    </div>

                    <p className="text-[11px] text-slate-400 font-sans mt-1 line-clamp-2">
                      {rule.description}
                    </p>

                    <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between text-[10px] font-mono text-slate-400">
                      <span className="text-emerald-300 font-semibold font-sans">
                        {rule.runCount} Executions
                      </span>
                      <span>{rule.lastRunAt || "Idle"}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Interactive Visual Node Diagram */}
          {activeRule && (
            <div className="lg:col-span-8 flex flex-col gap-4">
              <div className="bg-slate-900/70 rounded-2xl border border-white/10 p-6 shadow-sm flex flex-col gap-6">
                {/* Rule Title & Controls */}
                <div className="flex items-start justify-between gap-4 border-b border-white/5 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-blue-500/10 text-blue-300">
                        {activeRule.category.replace("_", " ")}
                      </span>
                      <span className="text-xs font-semibold text-emerald-300 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        {activeRule.enabled ? "Active on Production" : "Disabled"}
                      </span>
                    </div>
                    <h3 className="font-headline font-bold text-base text-blue-300 mt-1">
                      {activeRule.name}
                    </h3>
                    <p className="text-xs text-slate-400 font-sans mt-0.5">
                      {activeRule.description}
                    </p>
                  </div>

                  <button
                    onClick={() => handleTestRun(activeRule.id)}
                    disabled={testingRuleId === activeRule.id}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#FFBB00] text-blue-300 text-xs font-bold hover:bg-[#e6a800] transition-colors shadow-sm shrink-0"
                  >
                    <Play className={`w-3.5 h-3.5 fill-current ${testingRuleId === activeRule.id ? "animate-spin" : ""}`} />
                    <span>{testingRuleId === activeRule.id ? "Simulating..." : "Test Dry-Run"}</span>
                  </button>
                </div>

                {/* Visual Flow Canvas */}
                <div className="relative rounded-xl bg-[#070b14] border border-white/10 p-6 overflow-hidden flex flex-col md:flex-row items-center justify-between gap-4">
                  {/* Subtle Grid Background */}
                  <div className="absolute inset-0 opacity-40 pointer-events-none bg-[radial-gradient(#003872_1px,transparent_1px)] [background-size:16px_16px]" />

                  {/* 1. Trigger Node */}
                  <div className="relative z-10 w-full md:w-56 rounded-xl bg-slate-900/70 border-2 border-[#0082FF] p-4 shadow-sm flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] font-bold text-[#0082FF] uppercase">
                        TRIGGER
                      </span>
                      <Clock className="w-3.5 h-3.5 text-[#0082FF]" />
                    </div>
                    <div className="font-headline font-bold text-xs text-blue-300">
                      {activeRule.trigger.label}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono bg-white/[0.03] p-1.5 rounded">
                      Value: {activeRule.trigger.value}
                    </div>
                  </div>

                  {/* Connecting Arrow */}
                  <div className="relative z-10 text-slate-400 rotate-90 md:rotate-0 flex items-center justify-center">
                    <ArrowRight className="w-5 h-5 text-blue-300" />
                  </div>

                  {/* 2. Condition / Filter Node */}
                  <div className="relative z-10 w-full md:w-56 rounded-xl bg-slate-900/70 border-2 border-[#FFBB00] p-4 shadow-sm flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] font-bold text-[#b38300] uppercase">
                        FILTER CRITERIA
                      </span>
                      <Shield className="w-3.5 h-3.5 text-[#FFBB00]" />
                    </div>
                    <div className="font-headline font-bold text-xs text-blue-300">
                      {activeRule.condition ? `${activeRule.condition.field} ${activeRule.condition.operator}` : "Global Cohort Policy"}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono bg-white/[0.03] p-1.5 rounded">
                      {activeRule.condition ? activeRule.condition.value : "All Enrolled Grades"}
                    </div>
                  </div>

                  {/* Connecting Arrow */}
                  <div className="relative z-10 text-slate-400 rotate-90 md:rotate-0 flex items-center justify-center">
                    <ArrowRight className="w-5 h-5 text-blue-300" />
                  </div>

                  {/* 3. Action Node */}
                  <div className="relative z-10 w-full md:w-60 rounded-xl bg-slate-900/70 border-2 border-[#00C2E0] p-4 shadow-sm flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] font-bold text-[#00C2E0] uppercase">
                        CAMPUS ACTION
                      </span>
                      <Zap className="w-3.5 h-3.5 text-[#00C2E0]" />
                    </div>
                    <div className="font-headline font-bold text-xs text-blue-300">
                      {activeRule.actions[0]?.label}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono bg-white/[0.03] p-1.5 rounded truncate">
                      Parameters verified & encrypted
                    </div>
                  </div>
                </div>

                {/* Operational Details Card */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-sans">
                  <div className="p-3 rounded-lg bg-white/[0.03] border border-white/10">
                    <span className="text-slate-400 text-[11px] block">Execution Engine</span>
                    <span className="font-bold text-blue-300">Dronacharya Low-Latency Node</span>
                  </div>
                  <div className="p-3 rounded-lg bg-white/[0.03] border border-white/10">
                    <span className="text-slate-400 text-[11px] block">Security Isolation</span>
                    <span className="font-bold text-emerald-300">AES-256-GCM Hardware Encrypted</span>
                  </div>
                  <div className="p-3 rounded-lg bg-white/[0.03] border border-white/10">
                    <span className="text-slate-400 text-[11px] block">Audit Trail</span>
                    <span className="font-bold text-[#0082FF]">Real-Time Telemetry Stream</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
