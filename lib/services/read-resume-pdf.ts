import { extractResumeProfile } from "./resume-profile";

export async function readResumePdf(file: File) {
  const pdfjs = await import("pdfjs-dist");
  const { default: workerUrl } = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
  const task = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()), isEvalSupported: false, cMapUrl: "/pdfjs/cmaps/", cMapPacked: true, standardFontDataUrl: "/pdfjs/standard_fonts/" });
  try {
    const document = await task.promise;
    if (document.numPages > 30) throw new Error("简历超过 30 页，请上传精简版本或手动填写资料");
    const lines: string[] = [];
    for (let number = 1; number <= document.numPages; number++) {
      const page = await document.getPage(number);
      const content = await page.getTextContent();
      let line = "", lastY: number | undefined;
      for (const item of content.items) {
        if (!("str" in item)) continue;
        const y = item.transform[5];
        if (lastY !== undefined && Math.abs(y - lastY) > 3 && line) { lines.push(line); line = ""; }
        line += `${line && !line.endsWith(" ") ? " " : ""}${item.str}`;
        lastY = y;
        if (item.hasEOL) { lines.push(line); line = ""; lastY = undefined; }
      }
      if (line) lines.push(line);
      page.cleanup();
    }
    const text = lines.join("\n");
    return { fields: extractResumeProfile(text), hasText: text.trim().length > 10 };
  } finally { await task.destroy(); }
}
