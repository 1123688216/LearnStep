// 真实模型 + 真实数据库生成一门测试课程，用于人工检查课程内容质量与界面渲染。
// 需要 --live；默认写入 test 账号（只新增，不改动既有课程），可在 3011 登录查看。
// 节数不写死：由 estimateLessonCount 按目标日期/每周学时/技能数自动估算（同界面生成路径）。
// 用法：node --experimental-strip-types scripts/real-course-probe.mjs --live [用户名]
import {registerHooks} from 'node:module';
import {existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

const argv=process.argv.slice(2).filter(x=>!x.startsWith('--'));
if(!process.argv.includes('--live'))throw Error('需要 --live：真实模型调用并写入真实数据库（只新增一门测试课程）。');
process.loadEnvFile('.env.local');
process.env.KNOWLEDGE_GATE_MODE='advisory';// 测提示词质量，不让资料门禁拦截生成
process.env.WORKFLOW_AUTO_WEB='false';// 不联网收录，避免向真实资料库写入网页
const username=argv[0]||'test';
registerHooks({resolve(specifier,context,next){
  if(specifier.startsWith('@/')){
    const base=resolve(specifier.slice(2));
    for(const ext of ['.ts','.tsx','/index.ts'])if(existsSync(base+ext))return next(pathToFileURL(base+ext).href,context);
  }
  return next(specifier,context);
}});
const {getDatabase}=await import('../lib/db/index.ts');
const {createGoalWithProfile}=await import('../lib/db/goals.ts');
const {ensureGoalSkills}=await import('../lib/db/learning-loop.ts');
const {generateCourseForGoal}=await import('../lib/learning-loop/service.ts');
const {readAuthoredLesson}=await import('../lib/db/programs.ts');

const db=getDatabase();
const user=db.prepare('SELECT id FROM users WHERE username=?').get(username);
if(!user)throw Error(`找不到用户 ${username}`);
const userId=user.id;
const startedAt=Date.now();
const elapsed=()=>Math.round((Date.now()-startedAt)/1000)+'s';
const {goal}=createGoalWithProfile({userId,title:'课程质量实测·自动排课：Agent 工具调用与 ReAct',description:'理解 Agent 为什么需要工具、工具调用与 ReAct 循环的机制，能按时间顺序解释一段运行轨迹，并说明工具失败后的处理策略。',horizon:'质量实测',targetDate:'2026-12-24',selfLevel:'beginner',weeklyHours:4,background:'初学者，用过普通聊天机器人，没接触过 Agent 框架。'});
ensureGoalSkills(userId,goal.id,[
  {key:'tool-calling',name:'工具调用机制',description:'工具声明、调用请求、执行与结果回填的完整链路。',targetLevel:3,weight:1,capabilityType:'conceptual_understanding'},
  {key:'react-trajectory',name:'ReAct 轨迹解释',description:'按时间顺序解释思考—行动—观察的迭代与停止条件。',targetLevel:3,weight:1,capabilityType:'conceptual_understanding'},
  {key:'tool-failure',name:'工具失败处理',description:'识别工具失败并选择重试、降级或澄清。',targetLevel:3,weight:1,capabilityType:'problem_solving'},
]);
console.log(JSON.stringify({goalId:goal.id}));
const program=await generateCourseForGoal(userId,goal.id,undefined,async p=>console.log(JSON.stringify({elapsed:elapsed(),stage:p.stage,message:p.message})));
const lesson=readAuthoredLesson(userId,program.programId,program.lessons[0].id).lesson;
const line='─'.repeat(60);
console.log(line);
console.log(JSON.stringify({programId:program.programId,lessonId:lesson.id,title:lesson.title,generationStatus:lesson.generationStatus,generationMode:lesson.generationMode,sourceStatus:lesson.sourceStatus,qualityStatus:lesson.qualityStatus,qualityScore:lesson.contentVersion?.qualityReport?.score,qualityIssues:lesson.contentVersion?.qualityReport?.issues?.map(i=>i.message)}));
console.log('课节目标：'+lesson.objective);
for(const block of lesson.blocks){
  console.log(line);
  console.log(`【${block.type}】${block.title}`);
  if('body' in block&&block.body)console.log(block.body);
  if('scenario' in block&&block.scenario){console.log('场景：'+block.scenario);block.steps.forEach((s,i)=>console.log(`  ${i+1}. ${s}`));console.log('结果：'+block.result);console.log('验证：'+block.verification);}
  if('prompt' in block&&block.prompt){console.log('练习：'+block.prompt);(block.completionCriteria||[]).forEach(c=>console.log('  ✓ '+c));}
}
console.log(line);
console.log('课后题：');
for(const q of lesson.questions){
  console.log(`―【${q.kind}】`);
  if(q.material)console.log('[材料] '+q.material);
  console.log('[题干] '+q.prompt);
  if(q.requirements)console.log('[作答要求] '+q.requirements);
  console.log('[提示] '+(q.hint||'（无）'));
}
console.log(line);
console.log(`DONE 已写入真实数据库（用户 ${username}）。打开 http://127.0.0.1:3011 登录该账号，在目标列表找「${goal.title}」即可查看分区渲染与代码高亮。goalId=${goal.id} programId=${program.programId}`);
db.close();
