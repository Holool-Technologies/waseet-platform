export interface WaseetTask {
  taskId: string;
  publicTaskCode: string;
  clientUserId: string;
  freelancerUserId?: string;
  title: string;
  description: string;
  budgetUSD: number;
  status: number;
  statusLabel: string;
  category: number;
  categoryLabel: string;      // REQ 2
  proposalCount: number;
  approvalStatus: string;      // PendingApproval | Approved | Rejected
  rejectionReason?: string;
  hasSubmittedProposal: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskRequest {
  title: string;
  description: string;
  budgetUSD: number;
  category: number;           // REQ 2
}

export interface Proposal {
  proposalId: string;
  taskId: string;
  freelancerUserId: string;
  coverLetter: string;        // empty string for anonymized freelancer view
  bidAmount: number;
  status: number;
  statusLabel: string;
  submittedAt: string;
}

export interface CreateProposalRequest {
  coverLetter: string;
  bidAmount: number;
}

export interface ChatMessage {
  messageId: string;
  taskId: string;
  senderUserId: string;
  sanitizedContent: string;
  aiFlags: string;
  sentAt: string;
}

export interface EscrowTransaction {
  escrowId: string;
  taskId: string;
  amountUSD: number;
  status: number;
  statusLabel: string;
  heldAt: string;
  releasedAt?: string;
}