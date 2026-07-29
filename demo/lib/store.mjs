import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export class InteractionStore {
  constructor(filePath) {
    this.filePath = filePath;
    this.writeChain = Promise.resolve();
  }

  async readAll() {
    try {
      const raw = await readFile(this.filePath, "utf8");
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      if (error.code === "ENOENT") return [];
      throw error;
    }
  }

  async find(id) {
    return (await this.readAll()).find((item) => item.id === id) || null;
  }

  async save(interaction) {
    return this.#enqueue(async () => {
      const records = await this.readAll();
      const index = records.findIndex((item) => item.id === interaction.id);
      if (index >= 0) records[index] = interaction;
      else records.unshift(interaction);
      await mkdir(path.dirname(this.filePath), { recursive: true });
      await writeFile(this.filePath, `${JSON.stringify(records, null, 2)}\n`, "utf8");
      return interaction;
    });
  }

  #enqueue(operation) {
    const next = this.writeChain.then(operation, operation);
    this.writeChain = next.catch(() => {});
    return next;
  }
}
