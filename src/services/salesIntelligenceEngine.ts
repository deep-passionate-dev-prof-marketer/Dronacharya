import {
  PitchRoomStatus,
  PitchCallAuditReport,
  PitchCallFlaw,
  PitchWinningMoment,
  PitchCueCard,
  PitchDialogueUtterance,
} from "../types";

export interface LeadIntelligenceDossier {
  leadId: string;
  leadQualityScore: number; // 0 - 100
  conversionProbability: number; // e.g. 88%
  preCallSummary: string;
  currentSchool: string;
  curriculumTrack: string;
  budgetTier: string;
  keyInsights: string[];
  keySellingPoints: string[];
  objectionForecast: Array<{
    objection: string;
    winningResponse: string;
    category: "Accreditation" | "Socialization" | "Tuition" | "Academic Rigor" | "Tech Fluency";
  }>;
  recommendedScholarshipPercent: number;
}

export const LEAD_INTELLIGENCE_REGISTRY: Record<string, LeadIntelligenceDossier> = {
  "lead-101": {
    leadId: "lead-101",
    leadQualityScore: 94,
    conversionProbability: 88,
    preCallSummary:
      "Mateo Hernandez is a senior telecom engineer in Madrid, Spain. Highly analytical. Son Lucas (Grade 10) is currently bored in traditional Madrid state school where teaching is lecture-heavy and slow. Lucas is self-studying quantum physics & algorithms. Family is seeking Cambridge IGCSE accreditation with deep STEM labs and flexible bilingual support.",
    currentSchool: "Colegio San Patricio (Madrid, Spain)",
    curriculumTrack: "Cambridge IGCSE + European STEM Track",
    budgetTier: "Premium International ($6,000 - $8,000 / yr)",
    keyInsights: [
      "Parent Mateo values technical verification over emotional sales talk—demonstrate the 3D Bloch sphere & remote code IDE early.",
      "Lucas is an introvert who thrives in small 1:4 interactive cohorts rather than crowded 35-student traditional halls.",
      "Primary decision maker: Father Mateo; immediate enrollment timeline for upcoming Spring semester.",
    ],
    keySellingPoints: [
      "1:4 Student-to-Teacher Ratio with Cambridge-certified mentors vs. 1:35 in Spanish schools.",
      "Live WebXR 3D Interactive STEM & Quantum Computing Labs built into classroom dock.",
      "Official Cambridge Assessment International Education (CAIE) accreditation with Hague Apostille transcripts.",
      "Flexible European CET timetable eliminates 2-hour daily Madrid commuting fatigue.",
    ],
    objectionForecast: [
      {
        category: "Accreditation",
        objection: "Is online Cambridge IGCSE recognized by Spanish Universities and the EU?",
        winningResponse:
          "Absolutely. 21K School issues official Cambridge Examination Board transcripts accepted by every European University and verified under the Hague Apostille. Lucas sits for standard IGCSE exams at British Council testing centers in Madrid.",
      },
      {
        category: "Socialization",
        objection: "Will Lucas feel isolated without a brick-and-mortar physical school yard?",
        winningResponse:
          "Online schooling eliminates toxic peer distractions while enhancing genuine connection. Lucas will collaborate with peers across 74 countries in small teams, participate in our Global Robotics Hackathons, and join European regional campus meetups.",
      },
      {
        category: "Tuition",
        objection: "Traditional private international schools in Madrid charge €12,000 - €16,000/year. Why is 21K significantly more accessible?",
        winningResponse:
          "By removing wasteful brick-and-mortar real estate and administrative bloat, 21K reinvests 100% of capital into world-class faculty (Harvard, MIT, Cambridge alumni) and cutting-edge tech, delivering superior Ivy-feeder caliber education at a fraction of the cost.",
      },
    ],
    recommendedScholarshipPercent: 25,
  },
  "lead-102": {
    leadId: "lead-102",
    leadQualityScore: 91,
    conversionProbability: 85,
    preCallSummary:
      "Rajesh & Meera Sharma based in Mumbai. Father is VP of Engineering; mother is a pediatric surgeon. Son Aarav (Grade 11) is targeting top US/UK universities (MIT, Stanford, Imperial College London). Traditional physical Indian curriculum school has rigid rote-learning schedules that leave no time for olympiad research or portfolio development.",
    currentSchool: "Bombay Scottish Physical School (Mumbai)",
    curriculumTrack: "American High School Honors + AP Physics Track",
    budgetTier: "High Net-Worth ($8,000 - $12,000 / yr)",
    keyInsights: [
      "High-intent family looking for university portfolio differentiation (AP Capstone, IEEE publications).",
      "Parent Rajesh is concerned about rigorous college counselor guidance for US Common App.",
      "Aarav wants independent research pacing without mandatory physical attendance bureaucracy.",
    ],
    keySellingPoints: [
      "Dual American High School Diploma accredited by Cognia with 18+ Advanced Placement (AP) courses.",
      "Dedicated 1:1 Ivy-League College Admissions Counselor assigned starting in Grade 11.",
      "Direct faculty research mentorship with publication opportunities in student STEM journals.",
      "Recorded HD lectures & asynchronous Google LLM Notebook for self-paced olympiad prep.",
    ],
    objectionForecast: [
      {
        category: "Academic Rigor",
        objection: "How does 21K prepare Aarav for the rigor of AP Physics C and competitive US colleges compared to IB schools?",
        winningResponse:
          "Our faculty includes active college researchers and College Board-certified AP readers. We maintain an average AP score of 4.4/5 across STEM subjects, exceeding the global physical school average of 3.1.",
      },
      {
        category: "Tech Fluency",
        objection: "Can Aarav conduct real hands-on lab experiments for AP Physics and Chemistry?",
        winningResponse:
          "Yes! We utilize PhET University of Colorado simulation engines integrated with real-time multi-device remote control, alongside calibrated home hardware laboratory kits shipped directly to your residence.",
      },
    ],
    recommendedScholarshipPercent: 20,
  },
  "lead-103": {
    leadId: "lead-103",
    leadQualityScore: 84,
    conversionProbability: 79,
    preCallSummary:
      "Jean-Marc Dupont in Paris, France. Daughter Chloe (Grade 4) has shown extraordinary early mathematical giftedness. Traditional Parisian primary school does not allow skipping grades or individualized pacing, leading to boredom and disengagement.",
    currentSchool: "École Primaire Victor Hugo (Paris)",
    curriculumTrack: "Robotics Floww + Primary STEM Foundations",
    budgetTier: "Standard Flexible ($4,500 - $6,500 / yr)",
    keyInsights: [
      "Father is looking for accelerated math & coding without removing childhood joy.",
      "Chloe needs positive affirmation, gamified XP, and visual 3D robotics models.",
      "Bilingual French & English language transition required.",
    ],
    keySellingPoints: [
      "Gifted learner mastery pacing: Chloe can advance to Grade 6 mathematics while staying with age-appropriate peers for social activities.",
      "Interactive 21K Robotics Floww curriculum with Python visual block coding.",
      "Child praise and star feedback loop with parent progress dashboard.",
    ],
    objectionForecast: [
      {
        category: "Socialization",
        objection: "Is Grade 4 too young for online learning? How do you prevent excessive screen fatigue?",
        winningResponse:
          "Our primary sessions follow the 25-minute cognitive sprint rule with 5-minute physical movement and eye-rest breaks. Classes are heavily interactive with physical manipulative kits, not passive lecture watching.",
      },
    ],
    recommendedScholarshipPercent: 15,
  },
  "lead-104": {
    leadId: "lead-104",
    leadQualityScore: 96,
    conversionProbability: 92,
    preCallSummary:
      "Caroline Vance in Boston, USA. Son Ethan (Grade 9) is a competitive junior chess grandmaster candidate and coder. Needs a fully accredited school that travels with him across national tournaments without attendance penalties.",
    currentSchool: "Brookline High School (Massachusetts)",
    curriculumTrack: "American High School Honors + NCAA Flexible Track",
    budgetTier: "Premium Executive ($7,000 - $10,000 / yr)",
    keyInsights: [
      "Zero tolerance for rigid 8:00 AM - 3:00 PM lock-in due to tournament schedules.",
      "Requires official US transcripts accepted by NCAA & US Universities.",
      "Ready to sign today if flexibility and honors curriculum are demonstrated.",
    ],
    keySellingPoints: [
      "100% Anywhere, Anytime Learning: Synchronous live classes combined with offline cached repositories.",
      "Cognia accredited American High School Diploma recognized nationwide.",
      "Personalized academic advisor to coordinate around tournament schedules.",
    ],
    objectionForecast: [
      {
        category: "Accreditation",
        objection: "Will Ethan's high school credits transfer smoothly if he ever transitions back or applies to NCAA athletics?",
        winningResponse:
          "Yes, 21K School is fully Cognia-accredited with official CEEB school code. Transcripts transfer seamlessly to any US high school, university, or NCAA division without credit loss.",
      },
    ],
    recommendedScholarshipPercent: 25,
  },
};

/**
 * Real-time Teleprompter Cue Card Generator
 * Detects trigger keywords in live transcript and presents winning talk tracks
 */
export function generateLiveCueCards(transcriptText: string): PitchCueCard[] {
  const lower = transcriptText.toLowerCase();
  const cueCards: PitchCueCard[] = [];

  if (lower.includes("accreditation") || lower.includes("valid") || lower.includes("recognized") || lower.includes("recognized in") || lower.includes("degree") || lower.includes("certificate")) {
    cueCards.push({
      id: `cue-${Date.now()}-acc`,
      triggerKeyword: "Accreditation & Recognition",
      category: "Accreditation",
      advice: "Highlight 21K's Cognia & Cambridge International accreditations. Mention official Hague Apostille seal and 100% university acceptance rate worldwide.",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    });
  }

  if (lower.includes("cost") || lower.includes("expensive") || lower.includes("afford") || lower.includes("price") || lower.includes("fee") || lower.includes("tuition") || lower.includes("budget")) {
    cueCards.push({
      id: `cue-${Date.now()}-cost`,
      triggerKeyword: "Pricing & Affordability",
      category: "Tuition",
      advice: "Anchor value against traditional $14,000/yr international schools. Deploy the pre-authorized 25% Founder's Spot Scholarship to create immediate closing urgency.",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    });
  }

  if (lower.includes("social") || lower.includes("friends") || lower.includes("lonely") || lower.includes("isolated") || lower.includes("sports") || lower.includes("peer")) {
    cueCards.push({
      id: `cue-${Date.now()}-soc`,
      triggerKeyword: "Socialization & Community",
      category: "Socialization",
      advice: "Reassure parent: 40+ student-led global clubs, weekly virtual game nights, small cohort collaboration pods, and local campus city meetups.",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    });
  }

  if (lower.includes("screen") || lower.includes("eyes") || lower.includes("headache") || lower.includes("sitting") || lower.includes("hours")) {
    cueCards.push({
      id: `cue-${Date.now()}-screen`,
      triggerKeyword: "Screen Time & Wellness",
      category: "Tech Fluency",
      advice: "Explain synchronized 5-minute eye-rest breaks, interactive discussion vs passive watching, and offline workbook project time.",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    });
  }

  if (lower.includes("teacher") || lower.includes("faculty") || lower.includes("qualification") || lower.includes("mentor") || lower.includes("quality")) {
    cueCards.push({
      id: `cue-${Date.now()}-fac`,
      triggerKeyword: "Faculty Rigor & Mentorship",
      category: "Academic Rigor",
      advice: "Highlight top 2% global faculty selection, certified Cambridge/IB examiners, and MIT & Oxford guest lecture masterclasses.",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    });
  }

  return cueCards;
}

/**
 * Calculates real-time Talk-to-Listen Ratio & Speech Pacing
 */
export function calculateCallDynamics(transcript: PitchDialogueUtterance[]): {
  repPercent: number;
  leadPercent: number;
  isMonopolizing: boolean;
  totalWords: number;
} {
  let repWords = 0;
  let leadWords = 0;

  for (const u of transcript) {
    const count = u.text.trim().split(/\s+/).length;
    if (u.role === "sales_rep") {
      repWords += count;
    } else {
      leadWords += count;
    }
  }

  const total = repWords + leadWords;
  if (total === 0) {
    return { repPercent: 50, leadPercent: 50, isMonopolizing: false, totalWords: 0 };
  }

  const repPercent = Math.round((repWords / total) * 100);
  const leadPercent = 100 - repPercent;
  const isMonopolizing = repPercent > 65;

  return { repPercent, leadPercent, isMonopolizing, totalWords: total };
}

/**
 * Comprehensive Post-Call AI Audit & Flaw Highlighting Engine
 * Analyzes call duration, transcript dynamics, objection coverage, and closing technique
 */
export function generatePitchCallAuditReport(
  room: PitchRoomStatus,
  transcript: PitchDialogueUtterance[],
  callDurationSeconds: number
): PitchCallAuditReport {
  const durationMins = Math.floor(callDurationSeconds / 60);
  const durationSecs = callDurationSeconds % 60;
  const durationFormatted = `${durationMins}m ${durationSecs}s`;

  const dynamics = calculateCallDynamics(transcript);
  const talkToListenRatio = {
    repPercent: dynamics.repPercent,
    leadPercent: dynamics.leadPercent,
  };

  const flaws: PitchCallFlaw[] = [];
  const winningMoments: PitchWinningMoment[] = [];
  const coachingDirectives: string[] = [];

  // 1. Analyze Discovery Phase & Empathy
  let discoveryScore = 88;
  const hasAskedGoals = transcript.some(
    (u) => u.role === "sales_rep" && (u.text.toLowerCase().includes("hurdle") || u.text.toLowerCase().includes("goal") || u.text.toLowerCase().includes("struggle"))
  );
  if (!hasAskedGoals) {
    discoveryScore -= 18;
    flaws.push({
      id: `flaw-1`,
      timestamp: "02:15",
      severity: "critical",
      flawCategory: "discovery",
      flaw: "Missed Deep Discovery Exploration",
      impact: "Reduced psychological buy-in by jumping directly into curriculum features without uncovering parent's pain points.",
      betterApproach: "Ask: 'What is the #1 limitation in your child's current physical school that made you explore 21K today?'",
    });
  } else {
    winningMoments.push({
      id: `win-1`,
      timestamp: "01:45",
      achievement: "Strong Discovery Anchor",
      reproducibleTip: "Uncovered learner's frustration with traditional slow-paced classroom pacing early in call.",
    });
  }

  // 2. Analyze Talk-To-Listen Monopolization
  let valueArticulationScore = 85;
  if (dynamics.isMonopolizing) {
    valueArticulationScore -= 15;
    flaws.push({
      id: `flaw-2`,
      timestamp: "05:30",
      severity: "warning",
      flawCategory: "pacing",
      flaw: `Talk Ratio Over-Monopolized (${dynamics.repPercent}% Rep vs ${dynamics.leadPercent}% Parent)`,
      impact: "Parent felt talked at rather than engaged in collaborative educational consultation.",
      betterApproach: "Implement 30-Second Rule: after sharing a core value proposition, immediately prompt with an open-ended check-in.",
    });
    coachingDirectives.push("Practice active listening: Pause for 3 seconds after the parent finishes speaking before answering.");
  } else {
    winningMoments.push({
      id: `win-2`,
      timestamp: "04:10",
      achievement: "Balanced Conversational Cadence",
      reproducibleTip: `Maintained healthy ${dynamics.leadPercent}% parent talk time, allowing them to express core anxieties.`,
    });
  }

  // 3. Analyze Objection Handling
  let objectionHandlingScore = 82;
  const parentMentionsAccreditation = transcript.some(
    (u) => u.role === "lead" && (u.text.toLowerCase().includes("valid") || u.text.toLowerCase().includes("accreditation") || u.text.toLowerCase().includes("recognized"))
  );
  const repMentionedCogniaOrCambridge = transcript.some(
    (u) => u.role === "sales_rep" && (u.text.toLowerCase().includes("cambridge") || u.text.toLowerCase().includes("cognia") || u.text.toLowerCase().includes("hague"))
  );

  if (parentMentionsAccreditation && !repMentionedCogniaOrCambridge) {
    objectionHandlingScore -= 22;
    flaws.push({
      id: `flaw-3`,
      timestamp: "07:45",
      severity: "critical",
      flawCategory: "objection_handling",
      flaw: "Incomplete Accreditation Proof",
      impact: "Left parent with residual skepticism regarding degree transferability and university recognition.",
      betterApproach: "Cite specific accreditation bodies (Cognia, Cambridge International) and emphasize Hague Apostille verification.",
    });
    coachingDirectives.push("Always keep the Accreditation Proof Sheet ready to display when European or US parents inquire about transfer credits.");
  } else if (repMentionedCogniaOrCambridge) {
    winningMoments.push({
      id: `win-3`,
      timestamp: "08:12",
      achievement: "Flawless Regulatory Objection Neutralization",
      reproducibleTip: "Confirmed Cambridge Examination Board testing centers in local city, completely neutralizing parent skepticism.",
    });
  }

  // 4. Analyze Closing Decisiveness
  let closingDecisivenessScore = 86;
  if (room.contractStatus === "signed") {
    closingDecisivenessScore = 96;
    winningMoments.push({
      id: `win-4`,
      timestamp: "12:30",
      achievement: "Decisive 1-Call Close & Seat Reservation",
      reproducibleTip: `Secured signed agreement with ${room.scholarshipGrantedPercent}% Founder's Spot Grant applied.`,
    });
  } else if (room.scholarshipGrantedPercent === 0) {
    closingDecisivenessScore -= 20;
    flaws.push({
      id: `flaw-4`,
      timestamp: "11:05",
      severity: "warning",
      flawCategory: "closing",
      flaw: "Failed to Deploy Closing Incentive",
      impact: "Allowed parent to leave call without urgency anchor or incentive to reserve today.",
      betterApproach: "Introduce Spot Scholarship: 'We have 2 Founder's seats authorized for this cohort; if we reserve today, I can lock in 25% off.'",
    });
    coachingDirectives.push("Always ask for the reservation deposit before concluding the call—do not let warm leads cool down to email follow-ups.");
  }

  // Calculate Weighted Overall Score
  const overallScore = Math.round(
    discoveryScore * 0.25 +
    valueArticulationScore * 0.25 +
    objectionHandlingScore * 0.25 +
    closingDecisivenessScore * 0.25
  );

  coachingDirectives.push("Review student's specific passion (e.g. Robotics/Physics) before dialing to personalize the 3D Bloch sphere live demonstration.");

  return {
    id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    roomId: room.roomId,
    callDate: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    durationFormatted,
    overallScore,
    discoveryScore,
    valueArticulationScore,
    objectionHandlingScore,
    closingDecisivenessScore,
    talkToListenRatio,
    highlightedFlaws: flaws,
    winningMoments,
    aiCoachingDirectives: coachingDirectives,
    crmSyncStatus: "synced",
    crmSyncTimestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    recordedClipUrl: `/api/recordings/${room.roomId}.mp4`,
  };
}
