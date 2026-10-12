import { Fragment } from 'react';
import type { CourseQuestion } from '@/lib/learning-program/types';

/**
 * Small, escaped text renderer; never interprets generated HTML.
 * Fenced code keeps newlines/indentation and gets dependency-free token highlighting;
 * every token is rendered as a React text child, so model output can never inject markup.
 */

type Token={text:string;cls:''|'k'|'s'|'n'|'c'|'t'|'a'};

const KEYWORDS:Record<string,Set<string>>={
  java:new Set('abstract assert boolean break byte case catch char class const continue default do double else enum extends final finally float for if implements import instanceof int interface long native new package private protected public record return short static strictfp super switch synchronized this throw throws transient try var void volatile while true false null'.split(' ')),
  python:new Set('False None True and as assert async await break class continue def del elif else except finally for from global if import in is lambda nonlocal not or pass raise return try while with yield match case'.split(' ')),
  javascript:new Set('const let var function return if else for while do switch case default break continue class extends new this super import from export typeof instanceof in of void delete yield async await static get set try catch finally throw true false null undefined'.split(' ')),
};

type LangSpec={re:RegExp;classes:(Token['cls']|'word')[];kw?:Set<string>;capsTypes?:boolean};

// Alternation order per language matches `classes`; unmatched characters pass through as plain text.
const RE_JAVA=/(\/\/[^\n]*|\/\*[\s\S]*?(?:\*\/|$))|("(?:\\[\s\S]|[^"\\\n])*(?:"|$)|'(?:\\[\s\S]|[^'\\\n])*(?:'|$))|(@[A-Za-z_]\w*)|(\d[\d_]*(?:\.\d[\d_]*)?(?:[eE][+-]?\d+)?[lLfFdD]?)|([A-Za-z_$][\w$]*)/y;
const RE_PYTHON=/(#[^\n]*)|("""[\s\S]*?(?:"""|$)|'''[\s\S]*?(?:'''|$)|"(?:\\[\s\S]|[^"\\\n])*(?:"|$)|'(?:\\[\s\S]|[^'\\\n])*(?:'|$))|(@[A-Za-z_]\w*)|(\d[\d_]*(?:\.\d[\d_]*)?(?:[eE][+-]?\d+)?[jJ]?)|([A-Za-z_]\w*)/y;
const RE_JS=/(\/\/[^\n]*|\/\*[\s\S]*?(?:\*\/|$))|(`(?:\\[\s\S]|[^`\\])*(?:`|$)|"(?:\\[\s\S]|[^"\\\n])*(?:"|$)|'(?:\\[\s\S]|[^'\\\n])*(?:'|$))|(\d[\d_]*(?:\.\d[\d_]*)?(?:[eE][+-]?\d+)?n?)|([A-Za-z_$][\w$]*)/y;
const RE_JSON=/("(?:\\[\s\S]|[^"\\\n])*"(?=\s*:))|("(?:\\[\s\S]|[^"\\\n])*(?:"|$))|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|(true|false|null)\b/y;

const SPECS:Record<string,LangSpec>={
  java:{re:RE_JAVA,classes:['c','s','a','n','word'],kw:KEYWORDS.java,capsTypes:true},
  python:{re:RE_PYTHON,classes:['c','s','a','n','word'],kw:KEYWORDS.python,capsTypes:true},
  javascript:{re:RE_JS,classes:['c','s','n','word'],kw:KEYWORDS.javascript,capsTypes:true},
  json:{re:RE_JSON,classes:['t','s','n','k']},
};
const LANG_ALIASES:Record<string,string>={js:'javascript',mjs:'javascript',cjs:'javascript',jsx:'javascript',ts:'javascript',tsx:'javascript',typescript:'javascript',py:'python',jsonc:'json'};

function classify(spec:LangSpec,match:RegExpExecArray):Token['cls']{
  for(let i=0;i<spec.classes.length;i+=1){
    if(match[i+1]===undefined)continue;
    const cls=spec.classes[i];
    if(cls!=='word')return cls;
    if(spec.kw?.has(match[0]))return'k';
    if(spec.capsTypes&&/^[A-Z]/.test(match[0]))return't';
    return'';
  }
  return'';
}

/** Sticky-regex tokenizer; concatenating every token text always reproduces the input exactly. */
function tokenize(code:string,lang:string):Token[]{
  const spec=SPECS[LANG_ALIASES[lang]||lang];
  if(!spec)return[{text:code,cls:''}];
  const tokens:Token[]=[];
  const push=(text:string,cls:Token['cls'])=>{
    if(!text)return;
    const last=tokens[tokens.length-1];
    if(last&&last.cls===cls)last.text+=text;else tokens.push({text,cls});
  };
  let index=0;
  while(index<code.length){
    spec.re.lastIndex=index;
    const match=spec.re.exec(code);
    if(!match){push(code[index],'');index+=1;continue;}
    push(match[0],classify(spec,match));
    index=spec.re.lastIndex;
  }
  return tokens;
}

function CodeBlock({lang,code}:{lang:string;code:string}){
  const known=Boolean(SPECS[LANG_ALIASES[lang]||lang]);
  return <pre tabIndex={0} aria-label="题目代码，可横向滚动" {...(known?{'data-lang':lang}:{})}><code>{tokenize(code,lang).map((token,index)=>token.cls
    ?<span key={index} className={`tok-${token.cls}`}>{token.text}</span>
    :<Fragment key={index}>{token.text}</Fragment>)}</code></pre>;
}

/** Small, escaped text renderer; never interprets generated HTML. */
export default function QuestionText({text}: {text:string}) {
  const parts=text.replace(/\r\n?/g,'\n').split(/(```[^\n]*\n[\s\S]*?(?:\n```|$))/g);
  return <div className="question-text">{parts.map((part,index)=>{
    if(!part)return null;
    if(part.startsWith('```')) {
      const newline=part.indexOf('\n');
      const lang=part.slice(3,newline).trim().toLowerCase();
      return <CodeBlock key={index} lang={lang} code={part.slice(newline+1).replace(/\n```$/,'')}/>;
    }
    return <Fragment key={index}>{part.split(/\n\s*\n/).filter(p=>p.trim()).map((paragraph,i)=>
      /^\s*\{\s*role\s*:/.test(paragraph)
        ? <pre tabIndex={0} aria-label="题目轨迹，可横向滚动" key={i}><code>{paragraph}</code></pre>
        : <p key={i}>{paragraph.split(/(`[^`\n]+`)/g).map((piece,j)=>piece.startsWith('`')&&piece.endsWith('`')?<code key={j}>{piece.slice(1,-1)}</code>:piece)}</p>
    )}</Fragment>;
  })}</div>;
}

/** 结构化题目：材料、题干、作答要求分区显示；没有分区字段的旧题目按原文渲染。 */
export function QuestionView({question}:{question:Pick<CourseQuestion,'material'|'prompt'|'requirements'>}) {
  const material=question.material?.trim(),requirements=question.requirements?.trim();
  if(!material&&!requirements)return <QuestionText text={question.prompt}/>;
  return <div className="question-view">
    {material?<section className="question-section"><span className="question-section-label">材料</span><QuestionText text={material}/></section>:null}
    <section className="question-section"><span className="question-section-label">题干</span><QuestionText text={question.prompt}/></section>
    {requirements?<section className="question-section"><span className="question-section-label">作答要求</span><QuestionText text={requirements}/></section>:null}
  </div>;
}
