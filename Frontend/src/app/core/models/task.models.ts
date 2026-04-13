export interface WaseetTask {
  taskId: string;
  publicTaskCode: string;
  clientUserId: string;
  freelancerUserId?: string;
  title: string;
  description: string;
  budgetUSD: number;
  status: number;
  createdAt: string;
}

export interface CreateTaskRequest {
  title: string;
  description: string;
  budgetUSD: number;
}

export interface Proposal {
  proposalId: string;
  taskId: string;
  freelancerUserId: string;
  coverLetter: string;
  bidAmount: number;
  status: number;
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
  heldAt: string;
  releasedAt?: string;
}