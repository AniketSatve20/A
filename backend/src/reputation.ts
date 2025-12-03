import { updateUserReputation, getUserReputation } from './database';
import { logger } from './logger';

const REPUTATION_RULES = {
  DISPUTE_WIN: 50,
  DISPUTE_LOSE: -20,
  SUCCESSFUL_PROJECT: 30,
  SUCCESSFUL_FREELANCER: 25,
};

export async function updateReputationOnDisputeResolution(
  verdict: string,
  freelancerAddress: string,
  clientAddress: string
) {
  try {
    const freelancerUser = getUserReputation(freelancerAddress);
    const clientUser = getUserReputation(clientAddress);

    let freelancerDelta = 0;
    let clientDelta = 0;

    if (verdict === 'FREELANCER_WIN') {
      freelancerDelta = REPUTATION_RULES.DISPUTE_WIN;
      clientDelta = REPUTATION_RULES.DISPUTE_LOSE;
    } else if (verdict === 'CLIENT_WIN') {
      freelancerDelta = REPUTATION_RULES.DISPUTE_LOSE;
      clientDelta = REPUTATION_RULES.DISPUTE_WIN;
    } else if (verdict === 'PARTIAL_REFUND') {
      freelancerDelta = 10;
      clientDelta = 10;
    }

    const newFreelancerScore = Math.max(
      0,
      (freelancerUser?.reputation_score || 0) + freelancerDelta
    );
    const newClientScore = Math.max(0, (clientUser?.reputation_score || 0) + clientDelta);

    updateUserReputation(freelancerAddress, newFreelancerScore);
    updateUserReputation(clientAddress, newClientScore);

    logger.info('Reputation updated', {
      verdict,
      freelancer: { old: freelancerUser?.reputation_score || 0, new: newFreelancerScore },
      client: { old: clientUser?.reputation_score || 0, new: newClientScore },
    });

    return {
      freelancer: { old: freelancerUser?.reputation_score || 0, new: newFreelancerScore },
      client: { old: clientUser?.reputation_score || 0, new: newClientScore },
    };
  } catch (error) {
    logger.error('Failed to update reputation', error);
    throw error;
  }
}
