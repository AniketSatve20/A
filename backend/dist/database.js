"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeDatabase = initializeDatabase;
exports.insertUser = insertUser;
exports.getOrCreateUser = getOrCreateUser;
exports.insertProject = insertProject;
exports.insertDispute = insertDispute;
exports.insertAIAnalysis = insertAIAnalysis;
exports.getDisputeHistory = getDisputeHistory;
exports.recordProject = recordProject;
exports.recordDispute = recordDispute;
exports.updateDisputeVerdict = updateDisputeVerdict;
exports.getUserReputation = getUserReputation;
exports.updateUserReputation = updateUserReputation;
exports.getProjectStats = getProjectStats;
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
// Ensure data directory exists
const dataDir = path_1.default.join(__dirname, '../data');
if (!fs_1.default.existsSync(dataDir)) {
    fs_1.default.mkdirSync(dataDir, { recursive: true });
    console.log('📁 Created data directory');
}
// Initialize database
const db = new better_sqlite3_1.default(path_1.default.join(dataDir, 'humanwork.db'));
// Enable foreign keys
db.pragma('foreign_keys = ON');
// Create tables
function initializeDatabase() {
    // Users table
    db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      wallet_address TEXT UNIQUE NOT NULL,
      username TEXT,
      role TEXT,
      reputation_score INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
    // Projects table
    db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER UNIQUE NOT NULL,
      client_address TEXT NOT NULL,
      freelancer_address TEXT NOT NULL,
      status TEXT,
      total_amount REAL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (client_address) REFERENCES users(wallet_address),
      FOREIGN KEY (freelancer_address) REFERENCES users(wallet_address)
    )
  `);
    // Disputes table
    db.exec(`
    CREATE TABLE IF NOT EXISTS disputes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      dispute_id INTEGER UNIQUE NOT NULL,
      project_id INTEGER NOT NULL,
      milestone_id INTEGER NOT NULL,
      initiator_address TEXT NOT NULL,
      status TEXT DEFAULT 'OPEN',
      ai_verdict TEXT,
      ai_confidence REAL,
      jury_verdict TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      resolved_at DATETIME,
      FOREIGN KEY (project_id) REFERENCES projects(id),
      FOREIGN KEY (initiator_address) REFERENCES users(wallet_address)
    )
  `);
    // AI Analysis Results table
    db.exec(`
    CREATE TABLE IF NOT EXISTS ai_analysis (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      dispute_id INTEGER NOT NULL UNIQUE,
      contract_compliance_score REAL,
      work_quality_score REAL,
      timeline_adherence_score REAL,
      overall_verdict TEXT,
      confidence_score REAL,
      analysis_details TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (dispute_id) REFERENCES disputes(dispute_id)
    )
  `);
    console.log('✅ Database initialized');
}
// Insert user
function insertUser(walletAddress, role) {
    const stmt = db.prepare(`
    INSERT OR IGNORE INTO users (wallet_address, role)
    VALUES (?, ?)
  `);
    return stmt.run(walletAddress, role);
}
// Get or create user
function getOrCreateUser(walletAddress) {
    insertUser(walletAddress, 'USER');
    const stmt = db.prepare('SELECT * FROM users WHERE wallet_address = ?');
    return stmt.get(walletAddress);
}
// Insert project
function insertProject(projectId, clientAddress, freelancerAddress, totalAmount) {
    const stmt = db.prepare(`
    INSERT INTO projects (project_id, client_address, freelancer_address, status, total_amount)
    VALUES (?, ?, ?, 'ACTIVE', ?)
  `);
    return stmt.run(projectId, clientAddress, freelancerAddress, totalAmount);
}
// Insert dispute
function insertDispute(disputeId, projectId, milestoneId, initiatorAddress) {
    const stmt = db.prepare(`
    INSERT INTO disputes (dispute_id, project_id, milestone_id, initiator_address)
    VALUES (?, ?, ?, ?)
  `);
    return stmt.run(disputeId, projectId, milestoneId, initiatorAddress);
}
// Insert AI analysis
function insertAIAnalysis(disputeId, complianceScore, qualityScore, timelineScore, verdict, confidence, details) {
    const stmt = db.prepare(`
    INSERT INTO ai_analysis (
      dispute_id, contract_compliance_score, work_quality_score,
      timeline_adherence_score, overall_verdict, confidence_score, analysis_details
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
    return stmt.run(disputeId, complianceScore, qualityScore, timelineScore, verdict, confidence, details);
}
// Get dispute history
function getDisputeHistory(limit = 50) {
    const stmt = db.prepare(`
    SELECT d.*, a.* FROM disputes d
    LEFT JOIN ai_analysis a ON d.dispute_id = a.dispute_id
    ORDER BY d.created_at DESC
    LIMIT ?
  `);
    return stmt.all(limit);
}
// Record project
function recordProject(data) {
    const stmt = db.prepare(`
    INSERT OR REPLACE INTO projects (project_id, client_address, freelancer_address, status, total_amount)
    VALUES (?, ?, ?, ?, ?)
  `);
    return stmt.run(data.projectId, data.clientAddress, data.freelancerAddress, data.status || 'ACTIVE', data.totalAmount);
}
// Record dispute
function recordDispute(data) {
    const stmt = db.prepare(`
    INSERT OR REPLACE INTO disputes (dispute_id, project_id, milestone_id, initiator_address, status, ai_verdict, ai_confidence)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
    return stmt.run(data.disputeId, data.projectId, data.milestoneId, data.initiator, data.status || 'OPEN', data.aiVerdict, data.aiConfidence);
}
// Update dispute verdict
function updateDisputeVerdict(disputeId, verdict, votesFor, votesAgainst) {
    const stmt = db.prepare(`
    UPDATE disputes SET jury_verdict = ? WHERE dispute_id = ?
  `);
    return stmt.run(verdict, disputeId);
}
// Get user reputation
function getUserReputation(walletAddress) {
    const stmt = db.prepare('SELECT reputation_score FROM users WHERE wallet_address = ?');
    return stmt.get(walletAddress);
}
// Update user reputation
function updateUserReputation(walletAddress, newScore) {
    const stmt = db.prepare('UPDATE users SET reputation_score = ? WHERE wallet_address = ?');
    return stmt.run(newScore, walletAddress);
}
// Get project stats
function getProjectStats() {
    const stmt = db.prepare(`
    SELECT
      COUNT(*) as total_projects,
      SUM(total_amount) as total_value,
      SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) as completed,
      SUM(CASE WHEN status = 'DISPUTED' THEN 1 ELSE 0 END) as disputed
    FROM projects
  `);
    return stmt.get();
}
// Export database instance (with any typing to avoid export issues)
exports.default = db;
//# sourceMappingURL=database.js.map