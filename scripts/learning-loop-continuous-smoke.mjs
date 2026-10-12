import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {existsSync,mkdtempSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {tmpdir} from 'node:os';

// Continuous multi-lesson loop: 生成课程 → 学习提问 → 答题评分 → 更新能力画像 → 解锁下一课,
// with failure/retry duplication checks at every step. Rules mode, isolated temp database.
process.env.LLM_PROVIDER='rules';
process.env.SQLITE_DATABASE_PATH=join(mkdtempSync(join(tmpdir(),'growth-loop-continuous-')),'test.sqlite');
process.env.KNOWLEDGE_GATE_MODE='advisory';
process.env.WORKFLOW_AUTO_WEB='false';
process.env.RAG_INGESTION_URL='';
process.env.EMBEDDING_SERVICE_URL='';
registerHooks({resolve(specifier,context,next){
  if(specifier==='next/server')return next('next/server.js',context);
  if(specifier==='@/lib/auth/session')return {url:'data:text/javascript,export async function getCurrentUser(){return {id:"loop-continuous"};}',shortCircuit:true};
  if(specifier.startsWith('@/')){
    const base=resolve(specifier.slice(2));
    for(const ext of ['.ts','.tsx','/index.ts'])if(existsSync(base+ext))return next(pathToFileURL(base+ext).href,context);
  }
  return next(specifier,context);
}});
const {getDatabase,withTransaction}=await import('../lib/db/index.ts');
const {syncCourseTasks}=await import('../lib/db/course-tasks.ts');
const {createGoalWithProfile}=await import('../lib/db/goals.ts');
const {ensureGoalSkills,readSkillMastery}=await import('../lib/db/learning-loop.ts');
const {generateCourseForGoal}=await import('../lib/learning-loop/service.ts');
const {readAuthoredLesson,readLearningProgram}=await import('../lib/db/programs.ts');
const {claimGradeRequest,releaseGradeRequest,completeGradeRequest}=await import('../lib/db/grade-requests.ts');
const {POST:learningAction}=await import('../app/api/learning-program/route.ts');

const db=getDatabase(),userId='loop-continuous',now=new Date().toISOString();
const LESSONS=3;
console.log(JSON.stringify({test:'continuous learning loop',database:process.env.SQLITE_DATABASE_PATH}));

const post=body=>learningAction(new Request('http://localhost/api/learning-program',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)}));

db.prepare("INSERT INTO users(id,username,password_hash,display_name,created_at,updated_at) VALUES(?,?,'test-only','连续闭环测试',?,?)").run(userId,userId,now,now);
const {goal}=createGoalWithProfile({userId,title:'Java 集合框架入门',description:'理解 List 与 Map 的典型用法，能阅读并改写简短示例代码。',horizon:'测试',targetDate:null,selfLevel:'beginner',weeklyHours:3,background:'认识Java基本语法。'});
ensureGoalSkills(userId,goal.id,[
  {key:'list-basics',name:'List基础操作',description:'创建、遍历与修改List。',targetLevel:3,weight:1,capabilityType:'conceptual_understanding'},
  {key:'map-basics',name:'Map基础操作',description:'键值读写与遍历。',targetLevel:3,weight:1,capabilityType:'conceptual_understanding'},
  {key:'collection-choice',name:'集合选型',description:'按场景选择List或Map。',targetLevel:3,weight:1,capabilityType:'problem_solving'},
]);
const reporter=async()=>{};

// Row-count invariants shared by every duplication check below.
const counts=()=>({
  programs:db.prepare("SELECT count(*) n FROM learning_programs WHERE user_id=? AND status='active'").get(userId).n,
  tasks:db.prepare('SELECT count(*) n FROM tasks WHERE user_id=?').get(userId).n,
  links:db.prepare('SELECT count(*) n FROM task_lesson_links l JOIN tasks t ON t.id=l.task_id WHERE t.user_id=?').get(userId).n,
  attempts:db.prepare('SELECT count(*) n FROM lesson_assessment_attempts WHERE user_id=?').get(userId).n,
  versions:db.prepare('SELECT count(*) n FROM lesson_content_versions v JOIN course_lessons c ON c.id=v.lesson_id JOIN learning_programs p ON p.id=c.program_id WHERE p.user_id=?').get(userId).n,
  progress:db.prepare('SELECT progress_percent FROM goals WHERE id=? AND user_id=?').get(goal.id,userId).progress_percent,
});
const taskStatus=lessonId=>db.prepare('SELECT t.status FROM tasks t JOIN task_lesson_links l ON l.task_id=t.id WHERE l.lesson_id=? AND t.user_id=?').get(lessonId,userId)?.status;

try{
  const program=await generateCourseForGoal(userId,goal.id,LESSONS,reporter);
  const programId=program.programId;
  assert.equal(program.lessons.length,LESSONS);
  const base=counts();
  assert.equal(base.programs,1);assert.equal(base.attempts,0);assert.equal(base.progress,0);
  assert.equal(base.tasks,1,'only the available first lesson owns a task');
  assert(base.versions>=1,'first lesson materialized');

  let passGrade=null;
  for(let i=0;i<LESSONS;i+=1){
    const lessonId=i===0?program.lessons[0].id:passGrade.nextLessonId;
    assert(lessonId,'previous pass must unlock the next lesson');
    const authored=readAuthoredLesson(userId,programId,lessonId).lesson;
    assert.equal(authored.generationStatus,'ready',`lesson ${i+1} must be generated before study`);
    assert.equal(authored.qualityStatus,'passed');
    assert.equal(authored.questions.length,3);
    assert(authored.primarySkillId,`lesson ${i+1} must map to a skill`);
    assert.equal(taskStatus(lessonId),'current');

    // 1) 学习提问：tutor Q&A through the real route; it must not write loop state.
    const beforeQA=counts();
    const qa=await post({action:'tutor',programId,lessonId,message:'这节课的示例代码为什么要这样写？'});
    assert.equal(qa.status,200);
    const reply=(await qa.json()).reply;
    assert(reply?.reply?.length>0,'tutor must answer');
    assert.deepEqual(counts(),beforeQA,'tutor Q&A must be read-only for loop state');

    // 2) 失败作答：写入一次成绩和一条能力证据，不解锁、不改任务。
    const masteryBefore=readSkillMastery(userId,authored.primarySkillId);
    const wrongAnswers=Object.fromEntries(authored.questions.map(q=>[q.id,'不知道']));
    const failRequest={action:'grade',programId,lessonId,answers:wrongAnswers,deferNextLesson:true,requestId:`fail-request-${i}`};
    const inFlight=claimGradeRequest(userId,failRequest.requestId,programId,authored,wrongAnswers);
    db.prepare('UPDATE lesson_grade_requests SET lease_until=0 WHERE user_id=? AND request_id=?').run(userId,failRequest.requestId);
    const takeover=claimGradeRequest(userId,failRequest.requestId,programId,authored,wrongAnswers);
    assert.notEqual(takeover.lease.ownerToken,inFlight.lease.ownerToken);
    assert.throws(()=>withTransaction(tx=>{
      tx.prepare('UPDATE goals SET progress_percent=99 WHERE id=?').run(goal.id);
      completeGradeRequest(tx,inFlight.lease,{});
    }),/接管/,'stale worker completion rolls back the whole transaction');
    assert.equal(counts().progress,beforeQA.progress);
    releaseGradeRequest(inFlight.lease);
    const pending=await post(failRequest);
    assert.equal(pending.status,409,'parallel delivery must not start another grade');
    assert.equal((await pending.json()).code,'grading_pending');
    releaseGradeRequest(takeover.lease);
    const fail=(await (await post(failRequest)).json()).grade;
    assert.equal(fail.passed,false,'clearly insufficient answer must fail');
    let expected=counts();
    assert.equal(expected.attempts,beforeQA.attempts+1,'failed attempt recorded once');
    assert.equal(expected.progress,Math.round(i/LESSONS*100),'failed attempt must not move goal progress');
    const masteryAfterFail=readSkillMastery(userId,authored.primarySkillId);
    assert.equal(masteryAfterFail.evidenceCount,masteryBefore.evidenceCount+1,'first answer to a new question set is mastery evidence');
    assert.equal(taskStatus(lessonId),'current','failed lesson keeps its task current');
    const beforeReplay=counts();
    const replay=await (await post(failRequest)).json();
    assert.equal(replay.replayed,true);
    assert.deepEqual(replay.grade,fail);
    assert.deepEqual(counts(),beforeReplay,'lost response retry does not create an attempt');
    const conflict=await post({...failRequest,answers:{...wrongAnswers,[authored.questions[0].id]:'changed'}});
    assert.equal(conflict.status,400,'same request cannot change answers');
    assert.deepEqual(counts(),beforeReplay);

    // 3) 失败重试（相同题目再答错）：只新增成绩，不重复累计能力证据。
    const failRetry=(await (await post({action:'grade',programId,lessonId,answers:wrongAnswers,deferNextLesson:true})).json()).grade;
    assert.equal(failRetry.passed,false);
    expected=counts();
    assert.equal(expected.attempts,beforeQA.attempts+2);
    assert.equal(expected.progress,Math.round(i/LESSONS*100));
    assert.deepEqual(readSkillMastery(userId,authored.primarySkillId),masteryAfterFail,'re-answering the same questions must not inflate mastery');
    assert.equal(expected.tasks,beforeQA.tasks,'retry must not duplicate tasks');
    assert.equal(expected.links,beforeQA.links,'retry must not duplicate task links');

    // 4) 通过作答：任务完成、进度推进、解锁下一课；同一题集不再改变掌握度。
    const passAnswers=Object.fromEntries(authored.questions.map(q=>[q.id,q.referenceAnswer+' 因为应依据上述步骤判断，最后检查结果是否符合题目标准。']));
    const passRequest={action:'grade',programId,lessonId,answers:passAnswers,deferNextLesson:true,requestId:`pass-request-${i}`};
    passGrade=(await (await post(passRequest)).json()).grade;
    assert.equal(passGrade.passed,true,'reference-pattern answer should pass');
    expected=counts();
    assert.equal(expected.attempts,beforeQA.attempts+3);
    assert.equal(expected.progress,Math.round((i+1)/LESSONS*100),`progress after lesson ${i+1}`);
    assert.equal(taskStatus(lessonId),'done','passed lesson completes its task');
    assert.deepEqual(readSkillMastery(userId,authored.primarySkillId),masteryAfterFail,'passing the same question set adds no new evidence');
    if(i<LESSONS-1){
      assert(passGrade.nextLessonId,'passing must name the next lesson');
      assert.equal(taskStatus(passGrade.nextLessonId),'current','newly unlocked lesson gets exactly one task');
      assert.equal(expected.tasks,beforeQA.tasks+1);
      assert.equal(expected.links,beforeQA.links+1);
    }else{
      assert.equal(passGrade.nextLessonId,undefined,'last lesson has no next lesson');
      assert.equal(expected.tasks,beforeQA.tasks);
    }

    // 5) Lost response replay is idempotent; intentional reassessment uses a new request ID.
    const beforeDupPass=counts();
    const replayPass=await (await post(passRequest)).json();
    assert.equal(replayPass.replayed,true);assert.deepEqual(replayPass.grade,passGrade);
    assert.deepEqual(counts(),beforeDupPass);
    const dupPass=(await (await post({...passRequest,requestId:`intentional-regrade-${i}`})).json()).grade;
    assert.equal(dupPass.passed,true);
    assert.deepEqual(counts(),{...beforeDupPass,attempts:beforeDupPass.attempts+1},'duplicate pass retry adds only one attempt row');
    assert.deepEqual(readSkillMastery(userId,authored.primarySkillId),masteryAfterFail);

    // 6) 生成下一课（网页端 retry-lesson-stream 路径），随后每种重试都不能产生重复数据。
    if(i<LESSONS-1){
      const nextId=passGrade.nextLessonId;
      const stream=async()=>{
        const response=await post({action:'retry-lesson-stream',programId,lessonId:nextId});
        assert.equal(response.status,200);
        const events=(await response.text()).trim().split('\n').map(line=>JSON.parse(line));
        assert(!events.some(event=>event.type==='error'),JSON.stringify(events));
        return events.find(event=>event.type==='result')?.program;
      };
      const beforeGen=counts();
      const generated=await stream();
      assert(generated,'stream must return the persisted program');
      assert.equal(generated.lessons[i+1].generationStatus,'ready','next lesson generated');
      const afterGen=counts();
      assert(afterGen.versions>beforeGen.versions,'generating writes a new content version');
      assert.equal(afterGen.tasks,beforeGen.tasks,'task was already created at unlock time');
      assert.equal(afterGen.links,beforeGen.links);
      assert.equal(afterGen.attempts,beforeGen.attempts,'generation must not write grades');
      assert.equal(afterGen.programs,beforeGen.programs);
      assert.equal(afterGen.progress,beforeGen.progress);

      // 6a) 重复打开下一课：ready 课节直接返回既有 program，不重新生成。
      const again=await stream();
      assert.equal(again.lessons[i+1].generationStatus,'ready');
      assert.deepEqual(counts(),afterGen,'re-running lesson generation on a ready lesson must not add versions, tasks or grades');

      // 6b) 重复发起整课生成：目标已有进行中课程时恢复原课程。
      const regenerated=await generateCourseForGoal(userId,goal.id,LESSONS,reporter);
      assert.equal(regenerated.programId,programId,'course generation retry must reuse the active program');
      assert.deepEqual(counts(),afterGen,'course generation retry must not duplicate programs, lessons, tasks or grades');

      // 6c) 任务同步重放两次：幂等。
      for(let r=0;r<2;r++)withTransaction(tx=>syncCourseTasks(tx,userId,programId));
      assert.deepEqual(counts(),afterGen,'task sync replay must not duplicate tasks or links');
    }
    console.log(JSON.stringify({lesson:i+1,status:'passed',attempts:counts().attempts,progress:counts().progress}));
  }

  const finalCounts=counts();
  assert.equal(finalCounts.progress,100);
  assert.equal(finalCounts.attempts,LESSONS*4,'four attempts per lesson: fail, duplicate fail, pass, duplicate pass');
  assert.equal(finalCounts.programs,1);
  assert.equal(finalCounts.tasks,LESSONS);
  assert.equal(db.prepare("SELECT count(*) n FROM tasks WHERE user_id=? AND status='done'").get(userId).n,LESSONS);
  assert.equal(db.prepare('SELECT count(*) n FROM course_lessons c JOIN learning_programs p ON p.id=c.program_id WHERE p.user_id=? AND c.status=\'passed\'').get(userId).n,LESSONS);
  const evidence=db.prepare('SELECT COALESCE(SUM(evidence_count),0) n FROM skill_mastery WHERE user_id=?').get(userId).n;
  assert.equal(evidence,LESSONS,'exactly one mastery evidence per unique question set despite 12 attempts');
  assert.equal(db.prepare('PRAGMA foreign_key_check').all().length,0);
  const finalProgram=readLearningProgram(userId,programId);
  assert(finalProgram.lessons.every(lesson=>lesson.status==='passed'&&lesson.generationStatus==='ready'));
  console.log('PASS',JSON.stringify({lessons:LESSONS,attempts:finalCounts.attempts,tasks:finalCounts.tasks,evidence,progress:finalCounts.progress,versions:finalCounts.versions}));
}finally{db.close();}
