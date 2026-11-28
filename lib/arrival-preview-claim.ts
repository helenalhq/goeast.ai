// Email acceptance is not Emma acknowledgement. An abandoned lease is recoverable.
export const listClaimableSql = `
  SELECT id, "itineraryVersion" AS version, deadline, (notice_id IS NOT NULL) AS "noticeSent"
  FROM arrival_preview.jobs
  WHERE state='paid' AND (claim_until IS NULL OR claim_until <= now() OR claim_version IS DISTINCT FROM "itineraryVersion")
  ORDER BY paid_at, id LIMIT 20`;

// Compare the exact revision on the row under PostgreSQL's atomic UPDATE.
export const claimSql = `
  UPDATE arrival_preview.jobs
  SET claim_until=now()+interval '30 minutes', claim_token=gen_random_uuid(), claim_version="itineraryVersion"
  WHERE id=$1 AND "itineraryVersion"=$2 AND state='paid'
    AND (claim_until IS NULL OR claim_until <= now() OR claim_version IS DISTINCT FROM "itineraryVersion")
  RETURNING id, claim_version AS version, claim_token AS "claimToken", claim_until AS "claimUntil", deadline, trip`;
