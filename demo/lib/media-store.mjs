import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

const allowedExtensions = new Set([".mp3", ".mp4", ".mpeg", ".mpga", ".m4a", ".wav", ".webm"]);

export class MediaStore {
  constructor(directory) {
    this.directory = directory;
  }

  async save({ bytes, originalName, mimeType }) {
    const extension = path.extname(originalName || "").toLowerCase();
    if (!allowedExtensions.has(extension)) throw new Error("Unsupported audio format");
    const id = randomUUID();
    const storedName = `${id}${extension}`;
    await mkdir(this.directory, { recursive: true });
    await writeFile(path.join(this.directory, storedName), bytes, { flag: "wx" });
    const metadata = { id, storedName, originalName, mimeType: mimeType || "application/octet-stream", size: bytes.length };
    await writeFile(path.join(this.directory, `${id}.json`), JSON.stringify(metadata), { flag: "wx" });
    return metadata;
  }

  async read(id) {
    if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
    try {
      const metadata = JSON.parse(await readFile(path.join(this.directory, `${id}.json`), "utf8"));
      const bytes = await readFile(path.join(this.directory, metadata.storedName));
      return { metadata, bytes };
    } catch (error) {
      if (error.code === "ENOENT") return null;
      throw error;
    }
  }
}
