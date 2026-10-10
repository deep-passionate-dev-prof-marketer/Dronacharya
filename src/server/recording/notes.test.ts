import { describe, expect, it } from "vitest";
import { extractiveNotes, TranscriptEntry } from "./notes";

const at = (min: number) => new Date(Date.UTC(2026, 9, 9, 10, min)).toISOString();
const line = (min: number, text: string, who = "Dr. Vance", id = "tch-vance"): TranscriptEntry => ({ at: at(min), speakerId: id, speakerName: who, text });

describe("extractiveNotes", () => {
  it("says so when nothing was captured", () => {
    const n = extractiveNotes([]);
    expect(n.summary).toBe("No speech was captured during this class.");
    expect(n.generator).toBe("extractive");
    expect(n.stats).toEqual({ lines: 0, speakers: 0, minutes: 0 });
  });

  it("doesn't mistake teaching talk for homework", () => {
    const n = extractiveNotes([
      line(0, "Today we revise Newton's second law"),
      line(1, "In practice the friction force is small"),
      line(2, "Please submit your worksheet by Friday"),
      line(3, "Read chapter 4 before the next lesson"),
    ]);
    expect(n.homework).toEqual(["Please submit your worksheet by Friday", "Read chapter 4 before the next lesson"]);
  });

  it("uses only transcript sentences and finds questions, homework and concepts", () => {
    const lines = [
      line(0, "Today we study interference of light waves"),
      line(2, "Interference happens when two coherent light waves overlap"),
      line(4, "Why do we need coherent sources?", "Sophia Chen", "stu-10SOPHIACH"),
      line(5, "Coherent sources keep a constant phase difference so the interference pattern is stable"),
      line(12, "Young's double slit experiment shows bright and dark fringes from interference"),
      line(15, "For homework solve questions one to five from the wave optics worksheet"),
    ];
    const n = extractiveNotes(lines);
    const sentences = lines.map((l) => l.text);
    // every summary sentence comes from the transcript
    for (const s of n.summary.split(/(?<=\.)\s+/)) expect(sentences).toContain(s.replace(/\.$/, ""));
    expect(n.questions).toEqual([{ question: "Why do we need coherent sources?", askedBy: "Sophia Chen" }]);
    expect(n.homework).toEqual(["For homework solve questions one to five from the wave optics worksheet"]);
    expect(n.keyConcepts).toContain("interference");
    expect(n.keyConcepts).toContain("coherent");
    expect(n.stats).toEqual({ lines: 6, speakers: 2, minutes: 15 });
    expect(n.outline.map((o) => o.minute)).toEqual([0, 10]);
  });
});
