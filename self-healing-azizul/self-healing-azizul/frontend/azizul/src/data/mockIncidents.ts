import type { Incident, SystemHealth } from "../types/incident";

const now = Date.now();
const minutesAgo = (m: number) => new Date(now - m * 60_000).toISOString();

export const mockSystemHealth: SystemHealth = {
  status: "Degraded",
  region: "ap-south-1",
  activeIncidents: 1,
  resolvedToday: 12,
  autoHealingSuccess: 92,
  updatedAt: new Date().toISOString(),
};

export const mockIncidents: Incident[] = [
  {
    incidentId: "INC-001",
    resourceType: "Lambda",
    resourceId: "SelfHealingFaultyLambda",
    resourceArn:
      "arn:aws:lambda:ap-south-1:123456789012:function:SelfHealingFaultyLambda",
    alarmName: "SelfHealing-FaultyLambda-Alarm",
    metric: "Errors",
    metricValue: 1,
    threshold: 0,
    severity: "HIGH",
    status: "AWAITING_APPROVAL",
    rootCause: "Lambda function is throwing runtime errors.",
    reason:
      "The CloudWatch Errors metric crossed the configured threshold, indicating runtime failures during invocation.",
    recommendedAction:
      "Investigate the Lambda runtime failure and remediate the underlying error. Inspect CloudWatch Logs for stack traces and restart the function's execution environment.",
    confidence: 96,
    confidenceReason:
      "CloudWatch directly reported Lambda execution errors with a strong correlation to recent invocations.",
    blastRadius: "Single Lambda",
    blastRadiusReason:
      "The alarm is associated with a single Lambda resource and no downstream dependencies are currently impacted.",
    estimatedCostImpact: "Low",
    createdAt: minutesAgo(2),
    diagnosedAt: minutesAgo(1.5),
    fixStatus: "PENDING",
    activity: [
      {
        id: "a1",
        type: "DETECTED",
        label: "Incident detected by CloudWatch",
        timestamp: minutesAgo(2),
        detail: "Alarm 'SelfHealing-FaultyLambda-Alarm' transitioned to ALARM state.",
      },
      {
        id: "a2",
        type: "EVENTBRIDGE",
        label: "EventBridge triggered self-healing workflow",
        timestamp: minutesAgo(1.95),
        detail: "Step Functions execution started.",
      },
      {
        id: "a3",
        type: "DIAGNOSIS_START",
        label: "AI diagnosis started",
        timestamp: minutesAgo(1.9),
        detail: "Amazon Bedrock invoked via Diagnose Lambda.",
      },
      {
        id: "a4",
        type: "DIAGNOSIS_COMPLETE",
        label: "AI diagnosis completed",
        timestamp: minutesAgo(1.5),
        detail: "Root cause identified with 96% confidence.",
      },
      {
        id: "a5",
        type: "AWAITING_APPROVAL",
        label: "Waiting for human approval",
        timestamp: minutesAgo(1.4),
      },
    ],
  },
  {
    incidentId: "INC-002",
    resourceType: "DynamoDB",
    resourceId: "IncidentsTable",
    resourceArn:
      "arn:aws:dynamodb:ap-south-1:123456789012:table/Incidents",
    alarmName: "IncidentsTable-ConsumedCapacity-Alarm",
    metric: "ConsumedReadCapacityUnits",
    metricValue: 420,
    threshold: 400,
    severity: "MEDIUM",
    status: "RESOLVED",
    rootCause:
      "DynamoDB table experienced elevated read capacity consumption.",
    reason:
      "ConsumedReadCapacityUnits exceeded the provisioned threshold for 3 consecutive periods.",
    recommendedAction:
      "Enable auto-scaling on read capacity and review query patterns for missing indexes.",
    confidence: 91,
    confidenceReason:
      "CloudWatch metrics show a clear and sustained capacity spike over the last 15 minutes.",
    blastRadius: "Single DynamoDB Table",
    blastRadiusReason:
      "Only the Incidents table exceeded its capacity threshold. Downstream services are unaffected.",
    estimatedCostImpact: "Low",
    createdAt: minutesAgo(62),
    diagnosedAt: minutesAgo(60),
    approvedBy: "you",
    approvedAt: minutesAgo(58),
    fixedAt: minutesAgo(45),
    fixStatus: "SUCCESS",
    activity: [
      {
        id: "b1",
        type: "DETECTED",
        label: "Incident detected by CloudWatch",
        timestamp: minutesAgo(62),
      },
      {
        id: "b2",
        type: "EVENTBRIDGE",
        label: "EventBridge triggered self-healing workflow",
        timestamp: minutesAgo(61.9),
      },
      {
        id: "b3",
        type: "DIAGNOSIS_COMPLETE",
        label: "AI diagnosis completed",
        timestamp: minutesAgo(60),
      },
      {
        id: "b4",
        type: "APPROVED",
        label: "Fix approved by user",
        timestamp: minutesAgo(58),
        detail: "Approved by you",
      },
      {
        id: "b5",
        type: "FIXING_START",
        label: "Auto-scaling policy updated",
        timestamp: minutesAgo(57),
      },
      {
        id: "b6",
        type: "RESOLVED",
        label: "Incident resolved",
        timestamp: minutesAgo(45),
      },
    ],
  },
  {
    incidentId: "INC-003",
    resourceType: "Lambda",
    resourceId: "SelfHealingApplyFix",
    resourceArn:
      "arn:aws:lambda:ap-south-1:123456789012:function:SelfHealingApplyFix",
    alarmName: "SelfHealing-ApplyFix-Errors-Alarm",
    metric: "Errors",
    metricValue: 3,
    threshold: 1,
    severity: "HIGH",
    status: "RESOLVED",
    rootCause: "Transient dependency failure in Apply-Fix Lambda.",
    reason:
      "The Apply-Fix Lambda encountered intermittent failures reaching a downstream service.",
    recommendedAction:
      "Implement retry logic with exponential backoff and verify downstream service health.",
    confidence: 97,
    confidenceReason:
      "CloudWatch Logs show consistent error patterns across multiple invocations.",
    blastRadius: "Single Lambda",
    blastRadiusReason:
      "Only the Apply-Fix Lambda experienced errors. No user-facing impact detected.",
    estimatedCostImpact: "Low",
    createdAt: minutesAgo(180),
    diagnosedAt: minutesAgo(178),
    approvedBy: "you",
    approvedAt: minutesAgo(175),
    fixedAt: minutesAgo(160),
    fixStatus: "SUCCESS",
    activity: [
      {
        id: "c1",
        type: "DETECTED",
        label: "Incident detected by CloudWatch",
        timestamp: minutesAgo(180),
      },
      {
        id: "c2",
        type: "DIAGNOSIS_COMPLETE",
        label: "AI diagnosis completed",
        timestamp: minutesAgo(178),
      },
      {
        id: "c3",
        type: "APPROVED",
        label: "Fix approved by user",
        timestamp: minutesAgo(175),
      },
      {
        id: "c4",
        type: "RESOLVED",
        label: "Incident resolved",
        timestamp: minutesAgo(160),
      },
    ],
  },
  {
    incidentId: "INC-004",
    resourceType: "EC2",
    resourceId: "i-0a1b2c3d4e5f67890",
    resourceArn:
      "arn:aws:ec2:ap-south-1:123456789012:instance/i-0a1b2c3d4e5f67890",
    alarmName: "EC2-CPUUtilization-High",
    metric: "CPUUtilization",
    metricValue: 94.2,
    threshold: 85,
    severity: "MEDIUM",
    status: "RESOLVED",
    rootCause: "Sustained high CPU utilization on EC2 instance.",
    reason:
      "CPUUtilization exceeded the threshold for 5 consecutive evaluation periods.",
    recommendedAction:
      "Vertically scale the instance type and review application profiling for hot loops.",
    confidence: 88,
    confidenceReason:
      "CloudWatch metric is reliable, but the underlying workload cause is not fully determined.",
    blastRadius: "Single EC2 Instance",
    blastRadiusReason:
      "The instance is part of an Auto Scaling Group; traffic was rebalanced.",
    estimatedCostImpact: "Medium",
    createdAt: minutesAgo(320),
    diagnosedAt: minutesAgo(318),
    approvedBy: "you",
    approvedAt: minutesAgo(315),
    fixedAt: minutesAgo(290),
    fixStatus: "SUCCESS",
    activity: [
      {
        id: "d1",
        type: "DETECTED",
        label: "Incident detected by CloudWatch",
        timestamp: minutesAgo(320),
      },
      {
        id: "d2",
        type: "DIAGNOSIS_COMPLETE",
        label: "AI diagnosis completed",
        timestamp: minutesAgo(318),
      },
      {
        id: "d3",
        type: "APPROVED",
        label: "Fix approved by user",
        timestamp: minutesAgo(315),
      },
      {
        id: "d4",
        type: "RESOLVED",
        label: "Incident resolved",
        timestamp: minutesAgo(290),
      },
    ],
  },
  {
    incidentId: "INC-005",
    resourceType: "Lambda",
    resourceId: "SelfHealingDiagnose",
    resourceArn:
      "arn:aws:lambda:ap-south-1:123456789012:function:SelfHealingDiagnose",
    alarmName: "SelfHealing-Diagnose-Duration-Alarm",
    metric: "Duration",
    metricValue: 12400,
    threshold: 10000,
    severity: "LOW",
    status: "RESOLVED",
    rootCause: "Diagnose Lambda exceeded expected duration.",
    reason:
      "P99 duration crossed the threshold during a period of high incident volume.",
    recommendedAction:
      "Increase Lambda memory allocation and review Bedrock prompt optimization.",
    confidence: 82,
    confidenceReason:
      "Duration spikes correlate with incident volume, but the exact driver needs further analysis.",
    blastRadius: "Diagnostic Pipeline",
    blastRadiusReason:
      "Slowdown affected the diagnostic pipeline, not production workloads.",
    estimatedCostImpact: "Low",
    createdAt: minutesAgo(480),
    diagnosedAt: minutesAgo(478),
    approvedBy: "you",
    approvedAt: minutesAgo(475),
    fixedAt: minutesAgo(460),
    fixStatus: "SUCCESS",
    activity: [
      {
        id: "e1",
        type: "DETECTED",
        label: "Incident detected by CloudWatch",
        timestamp: minutesAgo(480),
      },
      {
        id: "e2",
        type: "DIAGNOSIS_COMPLETE",
        label: "AI diagnosis completed",
        timestamp: minutesAgo(478),
      },
      {
        id: "e3",
        type: "RESOLVED",
        label: "Incident resolved",
        timestamp: minutesAgo(460),
      },
    ],
  },
];
