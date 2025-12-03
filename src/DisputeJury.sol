// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-contracts/contracts/utils/ReentrancyGuard.sol";
import "openzeppelin-contracts/contracts/access/Ownable.sol";
import "./UserRegistry.sol";

/**
 * @title DisputeJury V5 - COMPLETE
 * @notice Decentralized jury with AI-PM report as primary evidence
 * @dev Court of appeals with 3-way voting (AcceptAI, SideWithClient, SideWithFreelancer)
 */
contract DisputeJury is ReentrancyGuard, Ownable {
    // ============ State Variables ============
    
    IERC20 public immutable STABLECOIN;
    UserRegistry public immutable USER_REGISTRY;
    address public projectEscrowAddress;
    
    uint256 public constant MIN_STAKE = 100 * 10**6; // 100 USDC
    uint256 public constant JURORS_PER_CASE = 5;
    uint256 public constant VOTING_PERIOD = 7 days;
    
    uint256 public disputeCounter;
    
    enum DisputeOutcome {
        Pending,
        AcceptAISplit,      // V5: Accept AI recommendation
        ClientWins,
        FreelancerWins
    }
    
    enum VoteChoice {
        AcceptAI,           // V5: Vote to accept AI split
        SideWithClient,
        SideWithFreelancer
    }
    
    struct Dispute {
        uint256 projectId;
        uint256 milestoneIndex;
        address client;
        address freelancer;
        uint256 amount;
        address[] jurors;
        mapping(address => bool) hasVoted;
        mapping(address => VoteChoice) votes;
        uint256 votesAcceptAi;
        uint256 votesForClient;
        uint256 votesForFreelancer;
        DisputeOutcome outcome;
        uint256 createdAt;
        uint256 resolvedAt;
        bool fundsDistributed;
        string aiReport;
        uint8 aiRecommendedSplit;
    }
    
    struct JurorInfo {
        uint256 stakedAmount;
        uint256 casesJudged;
        uint256 reputationScore;
        bool isActive;
    }
    
    // ============ Storage ============
    
    mapping(uint256 => Dispute) public disputes;
    mapping(address => JurorInfo) public jurors;
    
    // OPTIMIZATION: Efficient Array Management
    address[] public activeJurors;
    // Tracks index in array for O(1) removal. 
    mapping(address => uint256) public jurorIndices; 
    
    // ============ Events ============
    
    event DisputeCreated(uint256 indexed disputeId, uint256 projectId, uint256 milestoneIndex);
    event EvidenceSubmitted(uint256 indexed disputeId, string evidence, string aiReport);
    event JurorStaked(address indexed juror, uint256 amount);
    event JurorUnstaked(address indexed juror, uint256 amount);
    event VoteCast(uint256 indexed disputeId, address indexed juror, VoteChoice choice);
    event DisputeResolved(uint256 indexed disputeId, DisputeOutcome outcome);
    event RewardDistributed(address indexed juror, uint256 amount);
    
    // ============ Errors ============
    
    error NotVerifiedHuman();
    error InsufficientStake();
    error AlreadyVoted();
    error VotingEnded();
    error VotingNotEnded();
    error NotJurorInCase();
    error DisputeNotResolved();
    error FundsAlreadyDistributed();
    error NotEnoughJurors();
    error Unauthorized();
    
    // ============ Constructor ============
    
    constructor(address _stablecoin, address _userRegistry) Ownable(msg.sender) {
        STABLECOIN = IERC20(_stablecoin);
        USER_REGISTRY = UserRegistry(_userRegistry);
    }
    
    // ============ Juror Management ============
    
    function stakeAsJuror(uint256 amount) external nonReentrant {
        if (!USER_REGISTRY.isVerifiedHuman(msg.sender)) revert NotVerifiedHuman();
        if (amount < MIN_STAKE) revert InsufficientStake();
        
        require(STABLECOIN.transferFrom(msg.sender, address(this), amount), "Stake transfer failed");
        
        JurorInfo storage juror = jurors[msg.sender];
        
        // If not already active, add to array
        if (!juror.isActive) {
            // Optimization: Store the new index in the mapping
            jurorIndices[msg.sender] = activeJurors.length;
            activeJurors.push(msg.sender);
            
            if (juror.reputationScore == 0) {
                juror.reputationScore = 100; // Starting reputation
            }
            juror.isActive = true;
        }
        
        juror.stakedAmount += amount;
        
        emit JurorStaked(msg.sender, amount);
    }
    
    function unstake(uint256 amount) external nonReentrant {
        JurorInfo storage juror = jurors[msg.sender];
        if (juror.stakedAmount < amount) revert InsufficientStake();
        
        juror.stakedAmount -= amount;
        
        // If stake falls below minimum, remove from active pool
        if (juror.stakedAmount < MIN_STAKE && juror.isActive) {
            _removeJuror(msg.sender);
            juror.isActive = false;
        }
        
        require(STABLECOIN.transfer(msg.sender, amount), "Unstake transfer failed");
        emit JurorUnstaked(msg.sender, amount);
    }

    /**
     * @dev Optimization: Removes a juror from the active array in O(1) time.
     * Moves the last element to the deleted spot and then pops the last element.
     */
    function _removeJuror(address jurorToRemove) internal {
        uint256 index = jurorIndices[jurorToRemove];
        uint256 lastIndex = activeJurors.length - 1;

        // If the element to remove is not the last one, swap it with the last one
        if (index != lastIndex) {
            address lastJuror = activeJurors[lastIndex];
            
            activeJurors[index] = lastJuror; // Move the last juror to the slot of the removed juror
            jurorIndices[lastJuror] = index; // Update the index of the moved juror
        }

        // Remove the last element
        activeJurors.pop();
        delete jurorIndices[jurorToRemove]; // Clean up the mapping
    }
    
    // ============ Dispute Management ============
    
    function createDispute(
        uint256 projectId,
        uint256 milestoneIndex,
        address client,
        address freelancer,
        uint256 amount
    ) external returns (uint256) {
        require(msg.sender == projectEscrowAddress, "Only ProjectEscrow");
        
        // Note: For Hackathon demo, you might want to comment out this check 
        // if you don't have 5 jurors staked yet!
        if (activeJurors.length < JURORS_PER_CASE) revert NotEnoughJurors();
        
        uint256 disputeId = disputeCounter++;
        Dispute storage dispute = disputes[disputeId];
        
        dispute.projectId = projectId;
        dispute.milestoneIndex = milestoneIndex;
        dispute.client = client;
        dispute.freelancer = freelancer;
        dispute.amount = amount;
        dispute.outcome = DisputeOutcome.Pending;
        dispute.createdAt = block.timestamp;
        dispute.aiRecommendedSplit = 50; // Default 50/50
        
        dispute.jurors = _selectJurors();
        
        emit DisputeCreated(disputeId, projectId, milestoneIndex);
        
        return disputeId;
    }
    
    function submitEvidence(uint256 disputeId, string memory evidence) external {
        Dispute storage dispute = disputes[disputeId];
        require(msg.sender == dispute.client || msg.sender == dispute.freelancer, "Not party to dispute");
        emit EvidenceSubmitted(disputeId, evidence, dispute.aiReport);
    }
    
    /**
     * @notice V5: Set AI report
     * @dev FIXED: Now allows Owner (Admin/AI) OR ProjectEscrow to set the report
     */
    function setAiReport(uint256 disputeId, string memory report, uint8 recommendedSplit) external {
        // FIX: Check for Owner OR ProjectEscrow
        if (msg.sender != projectEscrowAddress && msg.sender != owner()) {
            revert Unauthorized();
        }
        
        Dispute storage dispute = disputes[disputeId];
        dispute.aiReport = report;
        dispute.aiRecommendedSplit = recommendedSplit;
    }
    
    function castVote(uint256 disputeId, VoteChoice choice) external {
        Dispute storage dispute = disputes[disputeId];
        
        if (block.timestamp > dispute.createdAt + VOTING_PERIOD) revert VotingEnded();
        if (dispute.hasVoted[msg.sender]) revert AlreadyVoted();
        if (!_isJurorInCase(disputeId, msg.sender)) revert NotJurorInCase();
        
        dispute.hasVoted[msg.sender] = true;
        dispute.votes[msg.sender] = choice;
        
        if (choice == VoteChoice.AcceptAI) {
            dispute.votesAcceptAi++;
        } else if (choice == VoteChoice.SideWithClient) {
            dispute.votesForClient++;
        } else {
            dispute.votesForFreelancer++;
        }
        
        emit VoteCast(disputeId, msg.sender, choice);
        
        // Auto-tally if all voted
        uint256 totalVotes = dispute.votesAcceptAi + dispute.votesForClient + dispute.votesForFreelancer;
        if (totalVotes == JURORS_PER_CASE) {
            _tallyVotes(disputeId);
        }
    }
    
    function finalizeDispute(uint256 disputeId) external {
        Dispute storage dispute = disputes[disputeId];
        
        if (block.timestamp <= dispute.createdAt + VOTING_PERIOD) revert VotingNotEnded();
        if (dispute.outcome != DisputeOutcome.Pending) revert DisputeNotResolved();
        
        _tallyVotes(disputeId);
    }
    
    // ============ Internal Functions ============
    
    function _tallyVotes(uint256 disputeId) internal {
        Dispute storage dispute = disputes[disputeId];
        
        if (dispute.votesAcceptAi >= dispute.votesForClient && 
            dispute.votesAcceptAi >= dispute.votesForFreelancer) {
            dispute.outcome = DisputeOutcome.AcceptAISplit;
        } else if (dispute.votesForClient > dispute.votesForFreelancer) {
            dispute.outcome = DisputeOutcome.ClientWins;
        } else {
            dispute.outcome = DisputeOutcome.FreelancerWins;
        }
        
        dispute.resolvedAt = block.timestamp;
        
        emit DisputeResolved(disputeId, dispute.outcome);
        
        _distributeFunds(disputeId);
    }
    
    function _distributeFunds(uint256 disputeId) internal nonReentrant {
        Dispute storage dispute = disputes[disputeId];
        
        if (dispute.fundsDistributed) revert FundsAlreadyDistributed();
        dispute.fundsDistributed = true;
        
        uint256 totalAmount = dispute.amount;
        uint256 jurorReward = totalAmount / 10; 
        uint256 perJurorReward = jurorReward / JURORS_PER_CASE;
        uint256 winnerAmount = totalAmount - jurorReward;
        
        address winner;
        if (dispute.outcome == DisputeOutcome.ClientWins) {
            winner = dispute.client;
        } else if (dispute.outcome == DisputeOutcome.FreelancerWins) {
            winner = dispute.freelancer;
        } else {
            uint256 freelancerAmount = (winnerAmount * dispute.aiRecommendedSplit) / 100;
            uint256 clientAmount = winnerAmount - freelancerAmount;
            
            require(STABLECOIN.transfer(dispute.freelancer, freelancerAmount), "Freelancer transfer failed");
            require(STABLECOIN.transfer(dispute.client, clientAmount), "Client transfer failed");
            
            winner = address(0);
        }
        
        if (winner != address(0)) {
            require(STABLECOIN.transfer(winner, winnerAmount), "Winner payment failed");
        }
        
        VoteChoice winningVote = dispute.outcome == DisputeOutcome.AcceptAISplit 
            ? VoteChoice.AcceptAI 
            : (dispute.outcome == DisputeOutcome.ClientWins ? VoteChoice.SideWithClient : VoteChoice.SideWithFreelancer);
        
        for (uint256 i = 0; i < dispute.jurors.length; i++) {
            address juror = dispute.jurors[i];
            
            if (dispute.hasVoted[juror] && dispute.votes[juror] == winningVote) {
                require(STABLECOIN.transfer(juror, perJurorReward), "Juror payment failed");
                jurors[juror].casesJudged++;
                jurors[juror].reputationScore += 5;
                emit RewardDistributed(juror, perJurorReward);
            } else if (dispute.hasVoted[juror]) {
                jurors[juror].reputationScore = jurors[juror].reputationScore > 10 
                    ? jurors[juror].reputationScore - 10 
                    : 0;
            }
        }
    }
    
    function _selectJurors() internal view returns (address[] memory) {
        address[] memory selected = new address[](JURORS_PER_CASE);
        uint256 count = 0;
        
        uint256 startIndex = uint256(keccak256(abi.encodePacked(block.timestamp, block.prevrandao))) % activeJurors.length;
        
        for (uint256 i = 0; i < activeJurors.length && count < JURORS_PER_CASE; i++) {
            uint256 index = (startIndex + i) % activeJurors.length;
            address juror = activeJurors[index];
            
            if (jurors[juror].isActive && jurors[juror].stakedAmount >= MIN_STAKE) {
                selected[count] = juror;
                count++;
            }
        }
        
        return selected;
    }
    
    function _isJurorInCase(uint256 disputeId, address juror) internal view returns (bool) {
        Dispute storage dispute = disputes[disputeId];
        for (uint256 i = 0; i < dispute.jurors.length; i++) {
            if (dispute.jurors[i] == juror) return true;
        }
        return false;
    }
    
    // ============ View Functions ============
    
    function getDispute(uint256 disputeId) external view returns (
        uint256 projectId,
        address client,
        address freelancer,
        uint256 amount,
        DisputeOutcome outcome,
        uint256 votesAcceptAiResult,
        uint256 votesForClient,
        uint256 votesForFreelancer,
        string memory aiReport
    ) {
        Dispute storage dispute = disputes[disputeId];
        return (
            dispute.projectId,
            dispute.client,
            dispute.freelancer,
            dispute.amount,
            dispute.outcome,
            dispute.votesAcceptAi,
            dispute.votesForClient,
            dispute.votesForFreelancer,
            dispute.aiReport
        );
    }
    
    function getJurorInfo(address juror) external view returns (
        uint256 stakedAmount,
        uint256 casesJudged,
        uint256 reputationScore,
        bool isActive
    ) {
        JurorInfo storage info = jurors[juror];
        return (info.stakedAmount, info.casesJudged, info.reputationScore, info.isActive);
    }
    
    function getActiveJurorCount() external view returns (uint256) {
        return activeJurors.length;
    }
    
    function getDisputeJurors(uint256 disputeId) external view returns (address[] memory) {
        return disputes[disputeId].jurors;
    }
    
    // ============ Admin Functions ============
    
    function setProjectEscrowAddress(address _projectEscrow) external onlyOwner {
        require(projectEscrowAddress == address(0), "Already set");
        projectEscrowAddress = _projectEscrow;
    }
}