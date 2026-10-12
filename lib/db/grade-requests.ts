import { createHash, randomUUID } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';
import { getDatabase, withTransaction } from './index.ts';
import type { AuthoredCourseLesson, CourseLessonGrade } from '../learning-program/types.ts';

export type GradeRequestLease = { userId: string; requestId: string; fingerprint: string; ownerToken: string };
export function claimGradeRequest(userId: string, requestId: string, programId: string, lesson: AuthoredCourseLesson, answers: Record<string,string>) {
  if (!/^[A-Za-z0-9_-]{8,128}$/.test(requestId)) throw new Error('评分请求编号不合法。');
  const fingerprint=createHash('sha256').update(JSON.stringify({programId,lessonId:lesson.id,
    version:lesson.contentVersionId,questions:lesson.questions,
    answers:lesson.questions.map(q=>[q.id,answers[q.id]||''])})).digest('hex');
  return withTransaction(db=>{
    const existing=db.prepare('SELECT fingerprint, lease_until, result_json FROM lesson_grade_requests WHERE user_id=? AND request_id=?')
      .get(userId,requestId) as {fingerprint:string;lease_until:number;result_json:string|null}|undefined;
    if(existing?.fingerprint && existing.fingerprint!==fingerprint) throw new Error('同一评分请求不能更换答案或题目，请重新提交。');
    if(existing?.result_json) return {grade:JSON.parse(existing.result_json) as CourseLessonGrade};
    if(existing && existing.lease_until>Date.now()) return {pending:true as const};
    const ownerToken=randomUUID();
    db.prepare(`INSERT INTO lesson_grade_requests(user_id,request_id,fingerprint,owner_token,lease_until)
      VALUES(?,?,?,?,?) ON CONFLICT(user_id,request_id) DO UPDATE SET owner_token=excluded.owner_token,lease_until=excluded.lease_until`)
      .run(userId,requestId,fingerprint,ownerToken,Date.now()+600_000);
    return {lease:{userId,requestId,fingerprint,ownerToken} satisfies GradeRequestLease};
  });
}

/** Called inside the same transaction as the grade, task and mastery writes. */
export function completeGradeRequest(db:DatabaseSync, lease:GradeRequestLease, grade:CourseLessonGrade) {
  const result=db.prepare(`UPDATE lesson_grade_requests SET result_json=? WHERE user_id=? AND request_id=?
    AND fingerprint=? AND owner_token=? AND result_json IS NULL`)
    .run(JSON.stringify(grade),lease.userId,lease.requestId,lease.fingerprint,lease.ownerToken);
  if(result.changes!==1) throw new Error('评分请求已被恢复操作接管，本次写入已取消，请重试获取结果。');
}
export function releaseGradeRequest(lease:GradeRequestLease) {
  getDatabase().prepare(`UPDATE lesson_grade_requests SET lease_until=0 WHERE user_id=? AND request_id=?
    AND owner_token=? AND result_json IS NULL`).run(lease.userId,lease.requestId,lease.ownerToken);
}
