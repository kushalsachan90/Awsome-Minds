
import { fetchAuthSession } from "aws-amplify/auth";

import type {
  Incident,
  SystemHealth,
} from "../types/incident";

const API_BASE_URL =
  "https://38tkes5vh0.execute-api.ap-south-1.amazonaws.com";

/* =========================================================
   BACKEND INCIDENT TYPE
   ========================================================= */

interface BackendIncident {
  incidentId: string;

  resourceType?: string;
  resourceArn?: string;

  alarmName?: string;

  metric?: string;
  metricValue?: number | string;
  value?: number | string;
  threshold?: number | string;

  severity?: string;
  approvalStatus?: string;

  rootCause?: string;
  reason?: string;

  confidence?: number | string;
  confidenceReason?: string;

  blastRadius?: string;
  blastRadiusReason?: string;

  estimatedCostImpact?: string;

  fixAction?: string;
  fixParameters?: string;
  fixStatus?: string;
  fixResult?: string;

  createdAt?: string;
  eventTime?: string;
  diagnosedAt?: string;

  approvedBy?: string;
  approvedAt?: string;

  rejectedBy?: string;
  rejectedAt?: string;
  rejectionReason?: string;

  fixedAt?: string;
}

/* =========================================================
   API RESPONSE TYPES
   ========================================================= */

interface IncidentsResponse {
  incidents?: BackendIncident[];
  nextCursor?: string;
}

interface SingleIncidentResponse {
  incident?: BackendIncident;
}

/* =========================================================
   AUTHENTICATION
   ========================================================= */

async function getAccessToken(): Promise<string> {
  const session = await fetchAuthSession();

  const token =
    session.tokens?.accessToken?.toString();

  if (!token) {
    throw new Error(
      "Authentication session expired. Please login again.",
    );
  }

  return token;
}

/* =========================================================
   GENERIC REQUEST
   ========================================================= */

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token =
    await getAccessToken();

  const response =
    await fetch(
      `${API_BASE_URL}${path}`,
      {
        ...options,

        headers: {
          Accept:
            "application/json",

          "Content-Type":
            "application/json",

          Authorization:
            `Bearer ${token}`,

          ...(options.headers || {}),
        },
      },
    );

  const text =
    await response.text();

  let body: unknown = {};

  try {
    body =
      text
        ? JSON.parse(text)
        : {};
  } catch {
    body = {};
  }

  if (!response.ok) {
    let message =
      `Request failed (${response.status})`;

    if (
      typeof body === "object" &&
      body !== null &&
      "message" in body &&
      typeof body.message === "string"
    ) {
      message =
        body.message;
    }

    throw new Error(message);
  }

  return body as T;
}

/* =========================================================
   NUMBER HELPER
   ========================================================= */

function toNumber(
  value: unknown,
  fallback = 0,
): number {
  const number =
    Number(value);

  return Number.isFinite(number)
    ? number
    : fallback;
}

/* =========================================================
   STATUS MAPPING
   ========================================================= */

function mapStatus(
  approvalStatus?: string,
  fixStatus?: string,
): Incident["status"] {
  const approval =
    approvalStatus?.toUpperCase();

  const fix =
    fixStatus?.toUpperCase();

  if (
    approval === "REJECTED"
  ) {
    return "REJECTED";
  }

  if (
    fix === "FAILED"
  ) {
    return "FAILED";
  }

  if (
    fix === "COMPLETED" ||
    fix === "SUCCESS"
  ) {
    return "RESOLVED";
  }

  if (
    fix === "IN_PROGRESS"
  ) {
    return "FIXING";
  }

  if (
    approval === "APPROVED"
  ) {
    return "APPROVED";
  }

  if (
    approval === "PENDING" ||
    approval === "AWAITING_APPROVAL" ||
    approval === "WAITING"
  ) {
    return "AWAITING_APPROVAL";
  }

  return "DETECTED";
}

/* =========================================================
   FIX STATUS MAPPING
   ========================================================= */

function mapFixStatus(
  fixStatus?: string,
): Incident["fixStatus"] {
  const status =
    fixStatus?.toUpperCase();

  if (
    status === "COMPLETED" ||
    status === "SUCCESS"
  ) {
    return "SUCCESS";
  }

  if (
    status === "IN_PROGRESS"
  ) {
    return "IN_PROGRESS";
  }

  if (
    status === "FAILED"
  ) {
    return "FAILED";
  }

  return "PENDING";
}

/* =========================================================
   SEVERITY MAPPING
   ========================================================= */

function mapSeverity(
  severity?: string,
): Incident["severity"] {
  const value =
    severity?.toUpperCase();

  if (value === "HIGH") {
    return "HIGH";
  }

  if (value === "MEDIUM") {
    return "MEDIUM";
  }

  return "LOW";
}

/* =========================================================
   COST IMPACT MAPPING
   ========================================================= */

function mapCostImpact(
  value?: string,
): Incident["estimatedCostImpact"] {
  if (value === "High") {
    return "High";
  }

  if (value === "Medium") {
    return "Medium";
  }

  return "Low";
}

/* =========================================================
   BACKEND → FRONTEND INCIDENT
   ========================================================= */

function mapIncident(
  raw: BackendIncident,
): Incident {
  const metricValue =
    toNumber(
      raw.metricValue ??
        raw.value,
    );

  const threshold =
    toNumber(
      raw.threshold,
    );

  return {
    incidentId:
      raw.incidentId,

    resourceType:
      raw.resourceType ||
      "Lambda",

    resourceId:
      raw.resourceArn
        ? (
            raw.resourceArn
              .split(":")
              .pop() ||
            raw.resourceArn
          )
        : "",

    resourceArn:
      raw.resourceArn ||
      "",

    alarmName:
      raw.alarmName ||
      "",

    metric:
      raw.metric ||
      "",

    metricValue,

    threshold,

    severity:
      mapSeverity(
        raw.severity,
      ),

    status:
      mapStatus(
        raw.approvalStatus,
        raw.fixStatus,
      ),

    rootCause:
      raw.rootCause ||
      "",

    reason:
      raw.reason ||
      "",

    recommendedAction:
      raw.fixAction ||
      "No remediation action specified",

    confidence:
      toNumber(
        raw.confidence,
      ),

    confidenceReason:
      raw.confidenceReason ||
      "",

    blastRadius:
      raw.blastRadius ||
      "",

    blastRadiusReason:
      raw.blastRadiusReason ||
      "",

    estimatedCostImpact:
      mapCostImpact(
        raw.estimatedCostImpact,
      ),

    createdAt:
      raw.createdAt ||
      raw.eventTime ||
      "",

    diagnosedAt:
      raw.diagnosedAt,

    approvedBy:
      raw.approvedBy,

    approvedAt:
      raw.approvedAt,

    rejectedBy:
      raw.rejectedBy,

    rejectedAt:
      raw.rejectedAt,

    rejectionReason:
      raw.rejectionReason,

    fixedAt:
      raw.fixedAt,

    fixStatus:
      mapFixStatus(
        raw.fixStatus,
      ),

    activity: [],
  };
}

/* =========================================================
   GET /incidents
   ========================================================= */

export async function fetchIncidents(): Promise<
  Incident[]
> {
  const response =
    await request<IncidentsResponse>(
      "/incidents",
    );

  return (
    response.incidents || []
  ).map(
    mapIncident,
  );
}

/* =========================================================
   GET /incidents/:id
   ========================================================= */

export async function fetchIncidentById(
  id: string,
): Promise<
  Incident | undefined
> {
  try {
    const response =
      await request<
        BackendIncident |
        SingleIncidentResponse
      >(
        `/incidents/${encodeURIComponent(id)}`,
      );

    /*
     Backend can return either:

     {
       incidentId: "..."
     }

     OR:

     {
       incident: {
         incidentId: "..."
       }
     }
    */

    const raw =
      "incident" in response
        ? response.incident
        : response;

    if (
      !raw ||
      !raw.incidentId
    ) {
      return undefined;
    }

    return mapIncident(raw);
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("404")
    ) {
      return undefined;
    }

    throw error;
  }
}

/* =========================================================
   SYSTEM HEALTH
   ========================================================= */

export async function fetchSystemHealth(): Promise<SystemHealth> {
  const incidents =
    await fetchIncidents();

  const activeIncidents =
    incidents.filter(
      (incident) =>
        incident.status !==
          "RESOLVED" &&
        incident.status !==
          "REJECTED" &&
        incident.status !==
          "FAILED",
    ).length;

  const resolvedToday =
    incidents.filter(
      (incident) =>
        incident.status ===
        "RESOLVED",
    ).length;

  const successfulFixes =
    incidents.filter(
      (incident) =>
        incident.fixStatus ===
        "SUCCESS",
    ).length;

  const autoHealingSuccess =
    incidents.length === 0
      ? 0
      : Math.round(
          (
            successfulFixes /
            incidents.length
          ) * 100,
        );

  return {
    status:
      activeIncidents === 0
        ? "Operational"
        : "Degraded",

    region:
      "ap-south-1",

    activeIncidents,

    resolvedToday,

    autoHealingSuccess,

    updatedAt:
      new Date().toISOString(),
  };
}

/* =========================================================
   POST /incidents/:id/approve
   ========================================================= */

export async function approveIncident(
  id: string,
  _approvedBy?: string,
): Promise<
  Incident | undefined
> {
  const response =
    await request<
      BackendIncident |
      SingleIncidentResponse
    >(
      `/incidents/${encodeURIComponent(id)}/approve`,
      {
        method: "POST",

        body:
          JSON.stringify({}),
      },
    );

  const raw =
    "incident" in response
      ? response.incident
      : response;

  if (
    raw &&
    raw.incidentId
  ) {
    return mapIncident(raw);
  }

  /*
   If backend only returns
   { message: "..." },
   get the updated incident.
  */

  return fetchIncidentById(id);
}

/* =========================================================
   POST /incidents/:id/reject
   ========================================================= */

export async function rejectIncident(
  id: string,
  reason: string,
): Promise<
  Incident | undefined
> {
  const response =
    await request<
      BackendIncident |
      SingleIncidentResponse
    >(
      `/incidents/${encodeURIComponent(id)}/reject`,
      {
        method: "POST",

        body:
          JSON.stringify({
            reason,
          }),
      },
    );

  const raw =
    "incident" in response
      ? response.incident
      : response;

  if (
    raw &&
    raw.incidentId
  ) {
    return mapIncident(raw);
  }

  /*
   If backend only returns
   { message: "..." },
   get the updated incident.
  */

  return fetchIncidentById(id);
}

