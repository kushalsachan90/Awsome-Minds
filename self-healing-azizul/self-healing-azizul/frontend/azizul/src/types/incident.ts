export type Severity = "HIGH" | "MEDIUM" | "LOW";

export type IncidentStatus =
  | "DETECTED"
  | "DIAGNOSING"
  | "AWAITING_APPROVAL"
  | "APPROVED"
  | "FIXING"
  | "RESOLVED"
  | "FAILED"
  | "REJECTED";

export type FixStatus = "PENDING" | "IN_PROGRESS" | "SUCCESS" | "FAILED";

export type ActivityType =
  | "DETECTED"
  | "EVENTBRIDGE"
  | "DIAGNOSIS_START"
  | "DIAGNOSIS_COMPLETE"
  | "AWAITING_APPROVAL"
  | "APPROVED"
  | "REJECTED"
  | "FIXING_START"
  | "RESOLVED"
  | "FAILED";

export interface Activity {
  id: string;
  type: ActivityType;
  label: string;
  timestamp: string; // ISO
  detail?: string;
}

export interface Incident {
  incidentId: string;
  resourceType: string; // Lambda | DynamoDB | EC2 ...
  resourceId: string;
  resourceArn: string;

  alarmName: string;
  metric: string;
  metricValue: number;
  threshold: number;

  severity: Severity;

  status: IncidentStatus;

  rootCause: string;
  reason: string;
  recommendedAction: string;

  confidence: number; // 0..100
  confidenceReason: string;

  blastRadius: string;
  blastRadiusReason: string;

  estimatedCostImpact: "Low" | "Medium" | "High";

  createdAt: string; // ISO
  diagnosedAt?: string;
  approvedBy?: string;
  approvedAt?: string;
  fixedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;

  fixStatus: FixStatus;

  activity: Activity[];
}

export interface SystemHealth {
  status: "Operational" | "Degraded" | "Major Outage";
  region: string;
  activeIncidents: number;
  resolvedToday: number;
  autoHealingSuccess: number; // percent
  updatedAt: string;
}
