import express, { Router } from 'express';

const router = Router();

// In-memory storage
const disputes = new Map<number, any>();
let disputeIdCounter = 1;

// Mock data
disputes.set(1, {
  id: 1,
  projectId: 1,
  clientAddress: '0x1234567890abcdef1234567890abcdef12345678',
  freelancerAddress: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
  description: 'Client claims deliverables do not match specifications',
  status: 'open',
  createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
});

disputes.set(2, {
  id: 2,
  projectId: 2,
  clientAddress: '0x1234567890abcdef1234567890abcdef12345678',
  freelancerAddress: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
  description: 'Payment delayed beyond agreed timeline',
  status: 'resolved',
  resolution: {
    verdict: 'Client favored - 80% refund issued',
    confidence: 0.85,
  },
  createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
});

disputeIdCounter = 3;

// Get all disputes
router.get('/', (req, res) => {
  const limit = parseInt(req.query.limit as string) || 50;
  const allDisputes = Array.from(disputes.values()).slice(0, limit);

  res.json({
    disputes: allDisputes,
    total: disputes.size,
  });
});

// Get single dispute
router.get('/:id', (req, res) => {
  const dispute = disputes.get(parseInt(req.params.id));

  if (!dispute) {
    return res.status(404).json({ error: 'Dispute not found' });
  }

  res.json({ dispute });
});

// Create dispute
router.post('/', (req, res) => {
  const {
    projectId,
    clientAddress,
    freelancerAddress,
    description,
  } = req.body;

  if (!projectId || !description) {
    return res.status(400).json({ error: 'ProjectId and description required' });
  }

  const newDispute = {
    id: disputeIdCounter++,
    projectId,
    clientAddress,
    freelancerAddress,
    description,
    status: 'open',
    createdAt: new Date().toISOString(),
  };

  disputes.set(newDispute.id, newDispute);

  res.status(201).json({ dispute: newDispute });
});

// Get dispute resolution
router.get('/:id/resolution', (req, res) => {
  const dispute = disputes.get(parseInt(req.params.id));

  if (!dispute) {
    return res.status(404).json({ error: 'Dispute not found' });
  }

  if (!dispute.resolution) {
    return res.status(400).json({ error: 'No resolution yet' });
  }

  res.json({ resolution: dispute.resolution });
});

// Vote on dispute
router.post('/:id/vote', (req, res) => {
  const { vote } = req.body;
  const dispute = disputes.get(parseInt(req.params.id));

  if (!dispute) {
    return res.status(404).json({ error: 'Dispute not found' });
  }

  if (dispute.status !== 'open') {
    return res.status(400).json({ error: 'Dispute already resolved' });
  }

  // In production, record vote and trigger resolution if quorum reached
  res.json({ message: 'Vote recorded', disputeId: dispute.id });
});

export { router as disputeApi };
