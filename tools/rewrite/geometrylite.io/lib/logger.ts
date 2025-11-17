/**
 * Logger
 * Structured logging with file output
 */

import fs from 'fs/promises';
import path from 'path';

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

export class Logger {
  constructor(
    private logDir: string,
    private minLevel: LogLevel = LogLevel.INFO,
  ) {}

  /**
   * Write log entry to console and file
   */
  private async writeLog(level: LogLevel, message: string, data?: any) {
    const timestamp = new Date().toISOString();
    const logLine = `[${timestamp}] [${level}] ${message}${data ? ' ' + JSON.stringify(data) : ''}\n`;

    // Console output
    if (this.shouldLog(level)) {
      console.log(logLine.trim());
    }

    // File output
    await fs.mkdir(this.logDir, { recursive: true });
    const logFile = path.join(
      this.logDir,
      level === LogLevel.ERROR ? 'errors.log' : `rewrite-${this.getDateStr()}.log`,
    );
    await fs.appendFile(logFile, logLine, 'utf-8');
  }

  /**
   * Check if log level should be logged
   */
  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
    return levels.indexOf(level) >= levels.indexOf(this.minLevel);
  }

  /**
   * Get current date string for log file naming
   */
  private getDateStr(): string {
    return new Date().toISOString().split('T')[0];
  }

  /**
   * Log info message
   */
  info(message: string, data?: any) {
    return this.writeLog(LogLevel.INFO, message, data);
  }

  /**
   * Log error message
   */
  error(message: string, data?: any) {
    return this.writeLog(LogLevel.ERROR, message, data);
  }

  /**
   * Log warning message
   */
  warn(message: string, data?: any) {
    return this.writeLog(LogLevel.WARN, message, data);
  }

  /**
   * Log debug message
   */
  debug(message: string, data?: any) {
    return this.writeLog(LogLevel.DEBUG, message, data);
  }
}
