import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

type StoreData = Record<string, unknown>;

export class JsonStore {
  private readonly filePath: string;
  private readonly enabled: boolean;

  constructor(fileName = 'api-store.json') {
    this.filePath = resolve(process.cwd(), '../../data', fileName);
    this.enabled = process.env.NODE_ENV !== 'test' && !process.env.VITEST;
  }

  read<T>(key: string, fallback: T): T {
    if (!this.enabled) {
      return fallback;
    }
    const data = this.readAll();
    return (data[key] as T | undefined) ?? fallback;
  }

  write(key: string, value: unknown): void {
    if (!this.enabled) {
      return;
    }
    const data = this.readAll();
    data[key] = value;
    this.writeAll(data);
  }

  private readAll(): StoreData {
    if (!existsSync(this.filePath)) {
      return {};
    }
    const content = readFileSync(this.filePath, 'utf8').trim();
    if (!content) {
      return {};
    }
    return JSON.parse(content) as StoreData;
  }

  private writeAll(data: StoreData): void {
    mkdirSync(dirname(this.filePath), { recursive: true });
    const tempPath = `${this.filePath}.tmp`;
    writeFileSync(tempPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
    renameSync(tempPath, this.filePath);
  }
}
