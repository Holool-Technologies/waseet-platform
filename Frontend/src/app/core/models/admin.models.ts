export interface DashboardStats {
  totalUsers: number;
  totalClients: number;
  totalFreelancers: number;
  pendingKyc: number;
  totalTasks: number;
  openTasks: number;
  activeTasks: number;
  completedTasks: number;
  disputedTasks: number;
  totalMessages: number;
  blockedMessages: number;
  totalEscrowVolume: number;
  heldEscrowVolume: number;
  generatedAt: string;
}

export interface AdminUser {
  userId: string;
  email: string;
  role: string;
  kycStatus: string;
  taskCount: number;
  createdAt: string;
  isBanned: boolean;
}

export interface AdminTask {
  taskId: string;
  publicTaskCode: string;
  title: string;
  categoryLabel: string;
  budgetUSD: number;
  status: string;
  proposalCount: number;
  createdAt: string;
}

export interface AdminKyc {
  kycId: string;
  userId: string;
  userEmail: string;
  status: string;
  documentBlobRef: string;
  submittedAt: string;
  verifiedAt?: string;
}

export interface AdminEscrow {
  escrowId: string;
  taskCode: string;
  amountUSD: number;
  status: string;
  heldAt: string;
  releasedAt?: string;
}

export interface AdminChatMessage {
  messageId: string;
  taskCode: string;
  senderRole: string;
  sanitizedContent: string;
  piiDetected: boolean;
  blocked: boolean;
  aiFlags: string;
  sentAt: string;
}

export interface AdminPaged<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}