import { Injectable, LoggerService, LogLevel } from '@nestjs/common';
import { appendFileSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

@Injectable()
export class FileLogger implements LoggerService {
  private readonly logFilePath: string;
  private readonly context: string;

  constructor(context = 'application') {
    this.context = context;
    const logsDir = resolve(process.cwd(), '../../logs');
    mkdirSync(logsDir, { recursive: true });
    this.logFilePath = join(logsDir, 'api-server.log');
  }

  log(message: unknown, context?: string): void {
    this.output('log', message, context);
  }

  error(message: unknown, stack?: string, context?: string): void {
    const output = stack ? `${String(message)}\n${stack}` : message;
    this.output('error', output, context);
  }

  warn(message: unknown, context?: string): void {
    this.output('warn', message, context);
  }

  debug(message: unknown, context?: string): void {
    this.output('debug', message, context);
  }

  verbose(message: unknown, context?: string): void {
    this.output('verbose', message, context);
  }

  private output(level: LogLevel, message: unknown, context?: string): void {
    if (message === undefined) {
      return;
    }
    const line = this.format(level, message, context);
    this.write(level, message, context);
    if (level === 'error') {
      console.error(line);
      return;
    }
    if (level === 'warn') {
      console.warn(line);
      return;
    }
    console.log(line);
  }

  private write(level: LogLevel, message: unknown, context?: string): void {
    const record = {
      time: new Date().toISOString(),
      level,
      context: context ?? this.context,
      message: String(message)
    };
    appendFileSync(this.logFilePath, `${JSON.stringify(record)}\n`, 'utf8');
  }

  private format(level: LogLevel, message: unknown, context?: string): string {
    const label = level.toUpperCase();
    const scope = context ?? this.context;
    return `[${label}] [${scope}] ${String(message)}`;
  }
}
