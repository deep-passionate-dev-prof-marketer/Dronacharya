import { describe, expect, it } from "vitest";
import { cleanFileName, sniffFileType } from "./files";

const zipWith = (...names: string[]) => Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.from("....[Content_Types].xml...." + names.join("....") + "....")]);

describe("uploaded file checks", () => {
  it("recognises allowed files by their bytes", () => {
    expect(sniffFileType(Buffer.from("%PDF-1.7\n%âãÏÓ\n1 0 obj"))?.ext).toBe("pdf");
    expect(sniffFileType(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]))?.ext).toBe("png");
    expect(sniffFileType(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0]))?.ext).toBe("jpg");
    expect(sniffFileType(Buffer.from("GIF89a\x01\x00\x01\x00"))?.ext).toBe("gif");
    expect(sniffFileType(Buffer.concat([Buffer.from("RIFF"), Buffer.from([0, 0, 0, 0]), Buffer.from("WEBPVP8 ")]))?.ext).toBe("webp");
    expect(sniffFileType(zipWith("word/document.xml"), "essay.docx")?.ext).toBe("docx");
    expect(sniffFileType(zipWith("ppt/presentation.xml"), "deck.pptx")?.ext).toBe("pptx");
    expect(sniffFileType(zipWith("xl/workbook.xml"), "marks.xlsx")?.ext).toBe("xlsx");
  });
  it("refuses everything else, whatever it's called", () => {
    expect(sniffFileType(Buffer.from("<html><script>alert(1)</script></html>"), "notes.pdf")).toBeNull();
    expect(sniffFileType(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script/></svg>'), "pic.png")).toBeNull();
    expect(sniffFileType(Buffer.from("MZ\x90\x00\x03\x00\x00\x00"), "game.pdf")).toBeNull();
    expect(sniffFileType(Buffer.from([0x50, 0x4b, 0x03, 0x04, 1, 2, 3, 4, 5, 6]), "archive.docx")).toBeNull(); // plain zip
    expect(sniffFileType(Buffer.from("hi"))).toBeNull();
  });
  it("cleans names: no paths, the real extension", () => {
    expect(cleanFileName("../../etc/passwd", { ext: "pdf" } as any)).toBe("passwd.pdf");
    expect(cleanFileName("Worksheet 3 (final).PDF", { ext: "pdf" } as any)).toBe("Worksheet 3 (final).pdf");
    expect(cleanFileName('evil"name<script>.html', { ext: "png" } as any)).toBe("evil_name_script_.png");
    expect(cleanFileName("गणित अभ्यास.docx", { ext: "docx" } as any)).toBe("गणित अभ्यास.docx");
  });
});
