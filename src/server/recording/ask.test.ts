import { describe, expect, it } from "vitest";
import { answerFromTranscript, cleanAnswer, searchTranscript } from "./ask";

const start = "2026-10-09T10:00:00.000Z";
const at = (min: number) => new Date(Date.UTC(2026, 9, 9, 10, min)).toISOString();
const lines = [
  { at: at(0), speakerId: "t", speakerName: "Dr. Vance", text: "Today we study interference of light waves" },
  { at: at(3), speakerId: "t", speakerName: "Dr. Vance", text: "Coherent sources keep a constant phase difference" },
  { at: at(9), speakerId: "t", speakerName: "Dr. Vance", text: "Bright fringes appear where waves arrive in phase" },
];

describe("searchTranscript", () => {
  it("returns matching lines in class order with the minute they were said", () => {
    expect(searchTranscript("What are coherent sources?", lines, start)).toEqual([{ minute: 3, speakerName: "Dr. Vance", text: "Coherent sources keep a constant phase difference" }]);
    expect(searchTranscript("wave phase", lines, start).map((q) => q.minute)).toEqual([0, 3, 9]);
  });

  it("returns nothing for unrelated or empty questions", () => {
    expect(searchTranscript("photosynthesis", lines, start)).toEqual([]);
    expect(searchTranscript("what is the", lines, start)).toEqual([]);
  });

  it("answers without AI by quoting the transcript", async () => {
    const prev = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;
    const a = await answerFromTranscript("fringes", lines, start);
    expect(a).toEqual({ answer: null, generator: "search", quotes: [{ minute: 9, speakerName: "Dr. Vance", text: "Bright fringes appear where waves arrive in phase" }] });
    if (prev) process.env.GEMINI_API_KEY = prev;
  });

  it("cleans transcript formatting that small models echo back", () => {
    expect(cleanAnswer("][4m] Dr. Vance: Coherent sources keep a constant phase difference.")).toBe("Coherent sources keep a constant phase difference.");
    expect(cleanAnswer("[12m] Coherent light has a fixed phase.")).toBe("Coherent light has a fixed phase.");
    expect(cleanAnswer("Note: this keeps the pattern stable.")).toBe("Note: this keeps the pattern stable.");
    expect(cleanAnswer("The answer is simple.")).toBe("The answer is simple.");
  });
});
