import fs from 'fs';
import path from 'path';

const logsDir = path.join(__dirname, '../logs');

if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

interface LogEntry {
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';
  message: string;
  data?: any;
}

function formatLog(entry: LogEntry): string {
  const emoji = {
    INFO: 'ℹ️',
    WARN: '⚠️',
    ERROR: '❌',
    DEBUG: '🐛',
  };
  
  let log = `[${entry.timestamp}] ${emoji[entry.level]} ${entry.level}: ${entry.message}`;
  if (entry.data) {
    log += ` | ${JSON.stringify(entry.data)}`;
  }
  return log;
}

export function log(level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG', message: string, data?: any) {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    data,
  };

  const formatted = formatLog(entry);
  console.log(formatted);

  const logFile = path.join(logsDir, `${level.toLowerCase()}.log`);
  fs.appendFileSync(logFile, formatted + '\n');
}

export const logger = {
  info: (msg: string, data?: any) => log('INFO', msg, data),
  warn: (msg: string, data?: any) => log('WARN', msg, data),
  error: (msg: string, data?: any) => log('ERROR', msg, data),
  debug: (msg: string, data?: any) => log('DEBUG', msg, data),
};
