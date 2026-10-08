export interface SafetyInspectionResult {
  isSafe: boolean;
  flaggedCategory?: "adult_nsfw" | "profanity" | "harassment" | "violence" | "none";
  violationReason?: string;
  confidenceScore: number;
  sanitizedText: string;
}

// Comprehensive multi-tier regex and keyword dictionaries for youth-safe online school campus
const ADULT_NSFW_PATTERNS = [
  /\b(nsfw|18\+|porn|xxx|nude|sex|erotic|escort|camgirl|onlyfans|stripper|fetish|lewd)\b/i,
  /\b(blowjob|handjob|cock|pussy|vagina|penis|boobs|tits|orgasm|masturbat)\b/i,
  /\b(hentai|dildo|anal|intercourse|hardcore|incest)\b/i,
];

const PROFANITY_PATTERNS = [
  /\b(fuck|shit|bitch|bastard|asshole|cunt|dick|motherfucker|crap)\b/i,
  /\b(stfu|wtf|f\*ck|s\*it|b\*tch)\b/i,
];

const VIOLENCE_PATTERNS = [
  /\b(kill\s+yourself|suicide|shoot\s+up|bomb\s+school|terrorist|murder\s+you)\b/i,
  /\b(self-harm|cut\s+myself|hang\s+myself)\b/i,
];

export function inspectContentSafety(
  text: string,
  mediaNameOrUrl?: string
): SafetyInspectionResult {
  if (!text && !mediaNameOrUrl) {
    return { isSafe: true, confidenceScore: 100, sanitizedText: "" };
  }

  const combinedCheck = `${text} ${mediaNameOrUrl || ""}`.toLowerCase();

  // 1. Check for Adult / 18+ / NSFW Violations (Highest severity)
  for (const pattern of ADULT_NSFW_PATTERNS) {
    if (pattern.test(combinedCheck)) {
      return {
        isSafe: false,
        flaggedCategory: "adult_nsfw",
        violationReason:
          "Content flagged for Adult / NSFW / 18+ violation. 21K School campus policies strictly forbid explicit material.",
        confidenceScore: 99,
        sanitizedText: "[Content Blocked by Campus Safety Guard]",
      };
    }
  }

  // 2. Check for Violence / Threat / Self-Harm
  for (const pattern of VIOLENCE_PATTERNS) {
    if (pattern.test(combinedCheck)) {
      return {
        isSafe: false,
        flaggedCategory: "violence",
        violationReason:
          "Content flagged for safety violation (harm or harassment). Dispatched to designated student counselor.",
        confidenceScore: 98,
        sanitizedText: "[Content Blocked by Campus Safety Guard]",
      };
    }
  }

  // 3. Check for Profanity
  let isProfane = false;
  let sanitized = text;
  for (const pattern of PROFANITY_PATTERNS) {
    if (pattern.test(text)) {
      isProfane = true;
      sanitized = sanitized.replace(pattern, "****");
    }
  }

  if (isProfane) {
    return {
      isSafe: true, // Allow with automatic censorship
      flaggedCategory: "profanity",
      violationReason: "Minor profanity detected and automatically masked.",
      confidenceScore: 85,
      sanitizedText: sanitized,
    };
  }

  return {
    isSafe: true,
    flaggedCategory: "none",
    confidenceScore: 100,
    sanitizedText: text,
  };
}
