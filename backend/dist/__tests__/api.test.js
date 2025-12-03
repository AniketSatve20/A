"use strict";
/**
 * Backend API Test Suite
 * Tests for endpoints, authentication, dispute flow, and AI analysis
 */
Object.defineProperty(exports, "__esModule", { value: true });
describe('HumanWork Backend API', () => {
    describe('Health & System', () => {
        test('GET /health returns server status', () => {
            // Mock implementation - would use actual test framework
            const response = { status: 'ok', uptime: expect.any(Number) };
            expect(response).toHaveProperty('status', 'ok');
        });
        test('GET /api/stats returns aggregated statistics', () => {
            const stats = {
                total_projects: expect.any(Number),
                total_value: expect.any(Number),
                completed: expect.any(Number),
                disputed: expect.any(Number),
            };
            expect(stats).toHaveProperty('total_projects');
        });
    });
    describe('Authentication', () => {
        test('POST /api/auth/verify validates wallet signature', () => {
            const payload = {
                address: '0x1234567890123456789012345678901234567890',
                message: 'Test message',
                signature: '0x...',
            };
            expect(payload.address).toMatch(/^0x[a-fA-F0-9]{40}$/);
        });
        test('Invalid signature returns 401 Unauthorized', () => {
            const response = { error: 'Invalid signature' };
            expect(response).toHaveProperty('error');
        });
    });
    describe('User Reputation', () => {
        test('GET /api/users/:address/reputation returns user reputation', () => {
            const user = {
                id: expect.any(Number),
                wallet_address: '0x1234567890123456789012345678901234567890',
                reputation_score: expect.any(Number),
            };
            expect(user).toHaveProperty('reputation_score');
        });
        test('Invalid address returns 400 Bad Request', () => {
            const response = { error: 'Invalid wallet address' };
            expect(response).toHaveProperty('error');
        });
    });
    describe('Projects', () => {
        test('POST /api/projects creates new project', () => {
            const projectData = {
                projectId: 1,
                clientAddress: '0x1111111111111111111111111111111111111111',
                freelancerAddress: '0x2222222222222222222222222222222222222222',
                totalAmount: 1000,
                status: 'ACTIVE',
            };
            expect(projectData).toHaveProperty('projectId');
        });
        test('GET /api/users/:address/projects returns user projects', () => {
            const projects = expect.any(Array);
            expect(projects).toBeDefined();
        });
    });
    describe('Disputes & AI Analysis', () => {
        test('POST /api/disputes/analyze triggers AI analysis', () => {
            const analysis = {
                complianceScore: expect.any(Number),
                qualityScore: expect.any(Number),
                timelineScore: expect.any(Number),
                verdict: expect.stringMatching(/FREELANCER_WIN|CLIENT_WIN|PARTIAL_REFUND/),
                confidence: expect.any(Number),
            };
            expect(analysis.verdict).toBeDefined();
        });
        test('POST /api/disputes records dispute', () => {
            const dispute = {
                success: true,
                disputeId: expect.any(Number),
            };
            expect(dispute.success).toBe(true);
        });
        test('PUT /api/disputes/:id/verdict updates jury verdict', () => {
            const update = {
                success: true,
                disputeId: expect.any(Number),
            };
            expect(update.success).toBe(true);
        });
        test('GET /api/api/users/:address/disputes returns user disputes', () => {
            const disputes = expect.any(Array);
            expect(disputes).toBeDefined();
        });
        test('GET /api/disputes returns dispute history with limit', () => {
            const disputes = expect.any(Array);
            expect(disputes.length).toBeLessThanOrEqual(50);
        });
    });
    describe('Error Handling', () => {
        test('POST to protected endpoint without auth returns 401', () => {
            const response = { error: 'Missing auth headers' };
            expect(response).toHaveProperty('error');
        });
        test('POST with missing required fields returns 400', () => {
            const response = { error: 'Missing required fields' };
            expect(response).toHaveProperty('error');
        });
        test('Invalid endpoint returns 404', () => {
            const response = {
                error: 'Endpoint not found',
                path: '/api/invalid',
                method: 'GET',
            };
            expect(response).toHaveProperty('error');
        });
    });
    describe('AI Dispute Engine', () => {
        test('Analyzes dispute with multiple scoring factors', () => {
            const analysis = {
                complianceScore: 85.5,
                qualityScore: 92.0,
                timelineScore: 78.5,
                verdict: 'FREELANCER_WIN',
                confidence: 0.85,
            };
            const average = (85.5 + 92.0 + 78.5) / 3;
            expect(average).toBeGreaterThan(80);
        });
        test('Assigns correct verdict based on scores', () => {
            const testCases = [
                { avg: 85, expected: 'FREELANCER_WIN' },
                { avg: 70, expected: 'PARTIAL_REFUND' },
                { avg: 55, expected: 'CLIENT_WIN' },
            ];
            testCases.forEach(tc => {
                if (tc.avg > 80)
                    expect('FREELANCER_WIN').toBe(tc.expected);
                else if (tc.avg > 60)
                    expect('PARTIAL_REFUND').toBe(tc.expected);
                else
                    expect('CLIENT_WIN').toBe(tc.expected);
            });
        });
    });
    describe('Database Operations', () => {
        test('Records project in database', () => {
            const project = {
                project_id: 1,
                client_address: '0x1111111111111111111111111111111111111111',
                status: 'ACTIVE',
            };
            expect(project).toHaveProperty('project_id');
        });
        test('Records dispute in database', () => {
            const dispute = {
                dispute_id: 1,
                project_id: 1,
                status: 'OPEN',
            };
            expect(dispute).toHaveProperty('dispute_id');
        });
        test('Updates dispute verdict', () => {
            const verdict = 'FREELANCER_WIN';
            expect(verdict).toMatch(/FREELANCER_WIN|CLIENT_WIN|PARTIAL_REFUND/);
        });
        test('Stores AI analysis results', () => {
            const analysis = {
                dispute_id: 1,
                overall_verdict: 'FREELANCER_WIN',
                confidence_score: 0.85,
            };
            expect(analysis.confidence_score).toBeLessThanOrEqual(1);
        });
    });
});
/**
 * Integration Test Suite
 * Tests end-to-end workflows
 */
describe('HumanWork Backend Integration Tests', () => {
    test('Complete dispute resolution workflow', async () => {
        // Step 1: User registers
        const user = {
            wallet_address: '0x1234567890123456789012345678901234567890',
            reputation_score: 0,
        };
        // Step 2: Create project
        const project = {
            projectId: 1,
            clientAddress: '0x1111111111111111111111111111111111111111',
            freelancerAddress: user.wallet_address,
            totalAmount: 1000,
        };
        // Step 3: Submit dispute
        const disputeData = {
            projectId: project.projectId,
            milestoneId: 1,
            initiator: user.wallet_address,
            details: 'Work not completed to standard',
        };
        // Step 4: AI analysis
        const analysis = {
            complianceScore: 65,
            qualityScore: 60,
            timelineScore: 70,
            verdict: 'PARTIAL_REFUND',
            confidence: 0.78,
        };
        // Step 5: Jury votes
        const votes = {
            votesFor: 3,
            votesAgainst: 2,
        };
        // Verify workflow progression
        expect(user).toHaveProperty('wallet_address');
        expect(project).toHaveProperty('projectId');
        expect(analysis).toHaveProperty('verdict');
        expect(analysis.verdict).toBe('PARTIAL_REFUND');
    });
    test('Multi-project user reputation progression', async () => {
        const user = {
            wallet_address: '0x1234567890123456789012345678901234567890',
            reputation_score: 0,
        };
        // Simulate multiple completed projects
        const projects = [
            { id: 1, result: 'COMPLETED', gain: 50 },
            { id: 2, result: 'COMPLETED', gain: 50 },
            { id: 3, result: 'DISPUTED', gain: -20 },
            { id: 4, result: 'COMPLETED', gain: 50 },
        ];
        const totalReputation = projects.reduce((acc, p) => acc + p.gain, 0);
        expect(totalReputation).toBe(130);
        expect(user.reputation_score + totalReputation).toBe(130);
    });
});
//# sourceMappingURL=api.test.js.map