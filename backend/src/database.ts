import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Ensure data directory exists
const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
  console.log('📁 Created data directory');
}

// Initialize database
const db = new Database(path.join(dataDir, 'humanwork.db'));

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Create tables
export function initializeDatabase() {
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
export function insertUser(walletAddress: string, role: string) {
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO users (wallet_address, role)
    VALUES (?, ?)
  `);
  return stmt.run(walletAddress, role);
}

// Get or create user
export function getOrCreateUser(walletAddress: string) {
  insertUser(walletAddress, 'USER');
  const stmt = db.prepare('SELECT * FROM users WHERE wallet_address = ?');
  return stmt.get(walletAddress);
}

// Insert project
export function insertProject(
  projectId: number,
  clientAddress: string,
  freelancerAddress: string,
  totalAmount: number
) {
  const stmt = db.prepare(`
    INSERT INTO projects (project_id, client_address, freelancer_address, status, total_amount)
    VALUES (?, ?, ?, 'ACTIVE', ?)
  `);
  return stmt.run(projectId, clientAddress, freelancerAddress, totalAmount);
}

// Insert dispute
export function insertDispute(
  disputeId: number,
  projectId: number,
  milestoneId: number,
  initiatorAddress: string
) {
  const stmt = db.prepare(`
    INSERT INTO disputes (dispute_id, project_id, milestone_id, initiator_address)
    VALUES (?, ?, ?, ?)
  `);
  return stmt.run(disputeId, projectId, milestoneId, initiatorAddress);
}

// Insert AI analysis
export function insertAIAnalysis(
  disputeId: number,
  complianceScore: number,
  qualityScore: number,
  timelineScore: number,
  verdict: string,
  confidence: number,
  details: string
) {
  const stmt = db.prepare(`
    INSERT INTO ai_analysis (
      dispute_id, contract_compliance_score, work_quality_score,
      timeline_adherence_score, overall_verdict, confidence_score, analysis_details
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  return stmt.run(
    disputeId,
    complianceScore,
    qualityScore,
    timelineScore,
    verdict,
    confidence,
    details
  );
}

// Get dispute history
export function getDisputeHistory(limit: number = 50) {
  const stmt = db.prepare(`
    SELECT d.*, a.* FROM disputes d
    LEFT JOIN ai_analysis a ON d.dispute_id = a.dispute_id
    ORDER BY d.created_at DESC
    LIMIT ?
  `);
  return stmt.all(limit);
}

// Get user reputation
export function getUserReputation(walletAddress: string) {
  const stmt = db.prepare('SELECT reputation_score FROM users WHERE wallet_address = ?');
  return stmt.get(walletAddress);
}

// Update user reputation
export function updateUserReputation(walletAddress: string, newScore: number) {
  const stmt = db.prepare('UPDATE users SET reputation_score = ? WHERE wallet_address = ?');
  return stmt.run(newScore, walletAddress);
}

// Get project stats
export function getProjectStats() {
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

// Export database instance
export default db;
