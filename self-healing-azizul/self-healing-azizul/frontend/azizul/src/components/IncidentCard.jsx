const value = (v) =>
  v === undefined || v === null || v === ''
    ? 'Not available'
    : String(v);

const title = (v) =>
  value(v).replaceAll('_', ' ');

const field = (i, camel, snake) =>
  i[camel] ?? i[snake];

export default function IncidentCard({ incident, onDecision }) {
  // Backend uses approvalStatus, while older frontend used status.
  const status = field(
    incident,
    'status',
    'approvalStatus'
  );

  const awaiting =
    status === 'AWAITING_APPROVAL' ||
    status === 'PENDING';

  const confidence = field(
    incident,
    'confidence',
    'confidence_score'
  );

  const blast = field(
    incident,
    'blastRadius',
    'blast_radius'
  );

  // Backend currently stores the recommended fix as fixAction.
  // Fall back to recommendedAction/recommended_action if available.
  const recommendedAction =
    field(
      incident,
      'recommendedAction',
      'recommended_action'
    ) ??
    incident.fixAction;

  const resourceType = field(
    incident,
    'resourceType',
    'resource_type'
  );

  const resourceId = field(
    incident,
    'resourceId',
    'resource_id'
  );

  const metricValue = field(
    incident,
    'metricValue',
    'metric_value'
  );

  const threshold = field(
    incident,
    'threshold',
    'threshold_value'
  );

  const diagnosedAt = field(
    incident,
    'diagnosedAt',
    'diagnosed_at'
  );

  const approvedBy = field(
    incident,
    'approvedBy',
    'approved_by'
  );

  const rejectedBy = field(
    incident,
    'rejectedBy',
    'rejected_by'
  );

  const rejectionReason = field(
    incident,
    'rejectionReason',
    'rejection_reason'
  );

  return (
    <article className="incident-card">

      <div className="card-top">
        <div>
          <span
            className={`severity ${String(
              incident.severity || 'unknown'
            ).toLowerCase()}`}
          >
            {title(incident.severity)}
          </span>

          <h2>
            {value(incident.incidentId)}
          </h2>

          <p>
            {value(resourceType)} · {value(resourceId)}
          </p>
        </div>

        <span className="status">
          {title(status)}
        </span>
      </div>

      <div className="metrics">

        <div>
          <small>Metric</small>
          <b>
            {value(incident.metric)}
          </b>
        </div>

        <div>
          <small>Observed / threshold</small>
          <b>
            {value(metricValue)} / {value(threshold)}
          </b>
        </div>

        <div>
          <small>Diagnosed</small>
          <b>
            {diagnosedAt
              ? new Date(
                  diagnosedAt
                ).toLocaleString()
              : 'Not available'}
          </b>
        </div>

      </div>

      <div className="diagnosis">

        <section>
          <small>Root cause</small>
          <p>
            {value(incident.rootCause)}
          </p>
        </section>

        <section>
          <small>Why this action</small>
          <p>
            {value(incident.reason)}
          </p>
        </section>

        <section>
          <small>Recommended action</small>
          <p>
            {title(recommendedAction)}
          </p>
        </section>

      </div>

      <div className="ai-grid">

        <div>
          <small>AI confidence</small>

          <b>
            {confidence === undefined ||
            confidence === null
              ? 'Not available'
              : `${confidence}%`}
          </b>

          <p>
            {value(
              field(
                incident,
                'confidenceReason',
                'confidence_reason'
              )
            )}
          </p>
        </div>

        <div>
          <small>Blast radius</small>

          <b>
            {title(blast)}
          </b>

          <p>
            {value(
              field(
                incident,
                'blastRadiusReason',
                'blast_radius_reason'
              )
            )}
          </p>
        </div>

        <div>
          <small>Estimated cost impact</small>

          <b>
            {value(
              field(
                incident,
                'estimatedCostImpact',
                'estimated_cost_impact'
              )
            )}
          </b>
        </div>

      </div>

      {rejectionReason && (
        <div className="reason">
          <b>Rejection reason:</b>{' '}
          {rejectionReason}
        </div>
      )}

      <div className="card-actions">

        {awaiting ? (
          <>
            <button
              onClick={() =>
                onDecision(
                  incident,
                  'reject'
                )
              }
            >
              Reject
            </button>

            <button
              className="primary"
              onClick={() =>
                onDecision(
                  incident,
                  'approve'
                )
              }
            >
              Approve fix
            </button>
          </>
        ) : (
          <span>
            Decision:{' '}
            {value(
              approvedBy || rejectedBy
            )}
          </span>
        )}

      </div>

    </article>
  );
}