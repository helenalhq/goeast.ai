-- Run only after disabling the Preview deployment, evicting all QA sessions,
-- and retaining/reconciling any necessary provider evidence. Do not use CASCADE.
begin;
drop function goeast_p1_qa.decision_qa_isolation_ok(uuid);
drop function goeast_p1_qa.decision_record_payment(uuid,text,text,text,text,text);
drop function goeast_p1_qa.decision_record_refund(text,text,text);
drop function goeast_p1_qa.decision_acquire_generation(uuid,uuid,uuid);
drop function goeast_p1_qa.decision_finish_generation(uuid,uuid,uuid,jsonb);
drop table goeast_p1_qa.decision_refund_tombstones;
drop table goeast_p1_qa.decision_orders;
drop table goeast_p1_qa.approved_owner;
drop schema goeast_p1_qa;
drop role goeast_p1_qa;
commit;
