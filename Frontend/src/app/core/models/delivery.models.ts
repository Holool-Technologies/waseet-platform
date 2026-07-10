export interface DeliveryFile {
  fileId: string;
  originalFileName: string;
  fileUrl: string;
  sizeBytes: number;
  contentType: string;
  uploadedAt: string;
}
export interface DeliveryLink {
  label: string;
  url:   string;
}

export interface DeliveryChecklistItem {
  item: string;
  done: boolean;
}

export interface Delivery {
  deliveryId:      string;
  taskId:          string;
  taskCode:        string;
  revisionNumber:  number;
  note:            string;
  videoUrl:        string | null;
  links:           DeliveryLink[];
  checklist:       DeliveryChecklistItem[];
  progressPercent: number;
  status:          DeliveryStatus;
  submittedAt:     string;
  reviewDeadline:  string;
  respondedAt:     string | null;
  totalRevisions:  number;
  maxRevisions:    number;
  files:           DeliveryFile[];
}

export type DeliveryStatus =
  | 'AwaitingReview'
  | 'RevisionRequested'
  | 'Accepted'
  | 'AutoReleased'
  | 'Disputed';

export interface RevisionRequest {
  revisionId: string;
  deliveryId: string;
  reason: string;
  status: string;
  createdAt: string;
}

export interface Dispute {
  disputeId: string;
  deliveryId: string;
  taskId: string;
  report: string;
  status: string;
  resolution: string | null;
  freelancerAmount: number | null;
  clientRefundAmount: number | null;
  adminNotes: string;
  createdAt: string;
  resolvedAt: string | null;
}

export interface AuditLog {
  logId: string;
  eventType: string;
  actorType: string;
  payload: string;
  occurredAt: string;
}

export interface DeliverySettings {
  reviewWindowDays: number;
  maxRevisions: number;
}