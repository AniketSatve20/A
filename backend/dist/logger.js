"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
exports.log = log;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const logsDir = path_1.default.join(__dirname, '../logs');
if (!fs_1.default.existsSync(logsDir)) {
    fs_1.default.mkdirSync(logsDir, { recursive: true });
}
function formatLog(entry) {
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
function log(level, message, data) {
    const entry = {
        timestamp: new Date().toISOString(),
        level,
        message,
        data,
    };
    const formatted = formatLog(entry);
    console.log(formatted);
    const logFile = path_1.default.join(logsDir, `${level.toLowerCase()}.log`);
    fs_1.default.appendFileSync(logFile, formatted + '\n');
}
exports.logger = {
    info: (msg, data) => log('INFO', msg, data),
    warn: (msg, data) => log('WARN', msg, data),
    error: (msg, data) => log('ERROR', msg, data),
    debug: (msg, data) => log('DEBUG', msg, data),
};
//# sourceMappingURL=logger.js.map