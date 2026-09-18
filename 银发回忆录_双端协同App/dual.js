/* 银发回忆录 · 双身份协同层
   讲述者（陈建华 · 72 岁）与协助者（周宁 · 30 岁）共用一个 App，
   同一批章节与素材，两种身份各自的操作视图。 */
(function(){
'use strict';
/* ---------- 状态 ---------- */
const DUAL_KEY='memo-dual-v3';
const dual=Object.assign({
  role:null,ready:false,profile:{},onboardStep:0,
  bound:false,bindMode:'id',bindOk:false,
  switchOpen:false,matTab:'all',
  repairStage:0,repairStep:0,repairSaved:false,repairPos:50,
  stylePrefs:[],styleNew:null,
  collab:0, /* 0 待上传素材 1 已发问 2 文稿已确认 3 章节已成稿 4 已下单成品 */
  collabNote:'国平叔补充：2001 年春交会，展位在 3 号馆靠近通道的角落。合同金额和时间请爸再核对。',
  chapterDone:false,canvasLayout:null,canvasHint:true,generating:false,lastFollowup:'',folSkipped:false
},JSON.parse(localStorage.getItem(DUAL_KEY)||'{}'));
function persistDual(){const o=Object.assign({},dual);localStorage.setItem(DUAL_KEY,JSON.stringify(o));}
const RANK=['待上传素材','已发给讲述者','文稿已确认','章节已成稿','已下单成品'];
const STYLE_LABELS={yuzhen:'短句白描',jianguo:'画面感细节',suhua:'市井烟火气',mingyuan:'克制抒情'};
const isHelper=()=>dual.role==='helper';
const me=()=>isHelper()?{name:dual.profile.hName||'周宁',age:dual.profile.hAge||30,photo:'role-helper'}
                       :{name:dual.profile.nName||'陈建华',age:dual.profile.nAge||72,photo:'narrator'};
const other=()=>isHelper()?{name:dual.profile.nName||'陈建华',photo:'narrator'}:{name:dual.profile.hName||'周宁',photo:'role-helper'};

/* ---------- 图标 ---------- */
const DICONS={
 grid:'<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>',
 flag:'<path d="M5 21V4"/><path d="M5 4h13l-3 5 3 5H5"/>',
 stories:icons.stories,community:icons.community,books:icons.books
};
function dualTabs(){
  const R=state.route;
  const tabs=[['home',isHelper()?'进度':'素材',isHelper()?'flag':'grid'],['stories','经历','stories'],['upload','上传','plus'],['community','广场','community'],['books',isHelper()?'编辑':'我的','books']];
  const act=id=>id==='home'?['home','voice','mphotos'].includes(R):R===id;
  return tabs.map(([id,label,ic])=>{
    if(id==='upload')return `<button class="tab tab-upload" data-final="upload-sheet" aria-label="上传内容"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v16M4 12h16"/></svg><span>上传</span></button>`;
    return `<button class="tab ${act(id)?'active':''}" data-route="${id}" aria-label="${label}" ${act(id)?'aria-current="page"':''}><svg viewBox="0 0 24 24" aria-hidden="true">${DICONS[ic]}</svg><span>${label}</span></button>`;
  }).join('');
}
finalTabs=dualTabs; /* 接管原生底部导航：录音→素材 / 我的→编辑，协助端首页为进度 */

/* ---------- 身份选择 ---------- */
function identityPage(){return `<section class="screen role-screen">
  <div class="role-brand"><span class="logo-seal">忆</span><h1>银发回忆录</h1><p>把一生的故事，慢慢讲成一本书</p></div>
  <div class="role-cards">
    <button class="role-card" data-dual="role" data-val="narrator">
      <div class="role-ill"><img src="${asset('role-narrator')}" alt="讲述者插画"></div>
      <div class="role-copy"><span class="role-tag">我 来 讲 述</span><strong>我是故事的主人</strong><small>用原声讲自己的经历，每一句都由我确认</small></div>
      <span class="role-go">›</span>
    </button>
    <button class="role-card" data-dual="role" data-val="helper">
      <div class="role-ill"><img src="${asset('role-helper')}" alt="协助者插画"></div>
      <div class="role-copy"><span class="role-tag">我 来 协 助</span><strong>我帮家人记录整理</strong><small>上传线索、跟进进度、一起把章节做成书</small></div>
      <span class="role-go">›</span>
    </button>
  </div>
  <p class="role-foot">同一个回忆空间 · 两种身份随时可以切换<br>本页为交互演示，不会申请真实账号</p>
</section>`;}

/* ---------- 入驻问答 ---------- */
/* 入驻选项的插画风图标 */
const OB_ICONS={yes:'ic-handshake',no:'ic-leaf',self:'ic-pen',elder:'ic-home','父亲':'ic-father','母亲':'ic-mother','长辈':'ic-elder','朋友':'ic-friend'};
function obSteps(){
  if(isHelper())return [
   {key:'hName',type:'text',q:'怎么称呼你？',hint:'协助者的名字，会出现在边注与协作记录里',def:'周宁'},
   {key:'hAge',type:'age',q:'你今年多大？',hint:'帮助小忆调整与你沟通的方式',def:30},
   {key:'nName',type:'text',q:'你要帮谁写这本回忆录？',hint:'写下 TA 的名字',def:'陈建华'},
   {key:'rel',type:'choice',q:'TA 是你的什么人？',hint:'',opts:[['父亲','父亲'],['母亲','母亲'],['长辈','其他长辈'],['朋友','朋友']]},
   {key:'join',type:'choice',q:'本人会一起参与记录吗？',hint:'本人确认后，文稿才会进入正式制作',opts:[['yes','会参与','他/她也会用这部手机或自己的手机'],['no','暂不参与','我先整理，之后再说']]}];
  return [
   {key:'nName',type:'text',q:'怎么称呼您？',hint:'您的名字会留在书的扉页上',def:'陈建华'},
   {key:'nAge',type:'age',q:'您今年多大年纪？',hint:'',def:72},
   {key:'forWhom',type:'choice',q:'这本回忆录，写的是谁的故事？',hint:'',opts:[['self','写我自己','把我的这一生留下来'],['elder','帮家中长辈写','我来替他/她整理']]},
   {key:'join',type:'choice',q:'会有人协助您一起记录吗？',hint:'家人可以上传照片线索、帮您跟进进度',opts:[['yes','会有人协助','儿女或亲友一起整理'],['no','暂时我自己来','先自己讲，以后再邀请']]}];
}
function onboardPage(){
  const steps=obSteps();const s=steps[Math.min(dual.onboardStep,steps.length-1)];
  const val=dual.profile[s.key]??s.def??'';
  let body='';
  if(s.type==='text')body=`<form id="ob-form"><input class="ob-input" name="v" maxlength="12" value="${esc(val)}" placeholder="${esc(s.def||'')}" autocomplete="off"></form>`;
  else if(s.type==='age')body=`<div class="ob-age"><button type="button" data-dual="ob-age" data-val="-1">−</button><span><strong>${esc(val)}</strong><small> 岁</small></span><button type="button" data-dual="ob-age" data-val="1">＋</button></div>`;
  else body=`<div class="ob-opts">${s.opts.map(o=>`<button class="ob-opt ${dual.profile[s.key]===o[0]?'sel':''}" data-dual="ob-choice" data-key="${s.key}" data-val="${o[0]}"><span class="ob-ic"><img src="assets/${OB_ICONS[o[0]]||'ic-topic'}.png" alt=""></span><span>${o[1]}${o[2]?`<small>${o[2]}</small>`:''}</span></button>`).join('')}</div>`;
  const dots=steps.map((_,i)=>`<i class="${i<dual.onboardStep?'done':i===dual.onboardStep?'now':''}"></i>`).join('');
  return `<section class="screen ob-screen">
   <div class="ob-roleline">${isHelper()?'协助者入驻 · '+esc(dual.profile.hName||'陈思颖')+'的视角':'讲述者入驻 · '+esc(dual.profile.nName||'陈建华')+'的视角'}</div>
   <div class="ob-dots">${dots}</div>
   <div class="ob-card" id="ob-card"><h1 class="ob-q">${s.q}</h1>${s.hint?`<p class="ob-hint">${s.hint}</p>`:''}${body}</div>
   <div class="ob-actions">
     <button class="ob-next" data-dual="ob-next">${dual.onboardStep===steps.length-1&&dual.profile.join!=='yes'?'完成，进入回忆录':'继续'}</button>
     <button class="ob-skip" data-dual="ob-skip">先跳过，稍后再填</button>
   </div></section>`;
}
function obAdvance(){
  const steps=obSteps();const s=steps[dual.onboardStep];
  if(s.type==='text'){const inp=$('#ob-form input');dual.profile[s.key]=(inp?.value||'').trim()||s.def;}
  if(s.type==='age'&&dual.profile[s.key]==null)dual.profile[s.key]=s.def;
  if(s.type==='choice'&&dual.profile[s.key]==null)dual.profile[s.key]=s.opts[0][0];
  if(s.key==='join'&&dual.profile.join==='yes'){dual.obHasAccount=null;dual.onboardStep=steps.length;render();return;}
  if(dual.onboardStep<steps.length-1){dual.onboardStep++;persistDual();render();return;}
  finishOnboard();
}
function finishOnboard(){dual.ready=true;dual.bound=false;persistDual();state.route='home';render();toast(`欢迎，${me().name}。${isHelper()?'先从“进度”看看可以做什么。':'从“素材”开始，把故事慢慢攒起来。'}`);}
function joinCheckPage(){
  return `<section class="screen ob-screen"><div class="ob-roleline">${isHelper()?'协助者入驻':'讲述者入驻'}</div>
  <div class="ob-card"><h1 class="ob-q">对方已经有忆页账号了吗？</h1><p class="ob-hint">${isHelper()?esc(dual.profile.nName||'陈建华')+'是否已经在用银发回忆录':'协助您的家人是否已经在用银发回忆录'}</p>
  <div class="ob-opts">
    <button class="ob-opt" data-dual="join-has" data-val="yes"><span class="ob-ic"><img src="assets/ic-key.png" alt=""></span><span>已经有账号<small>输入忆页 ID 或扫码，把两个账号绑在一起</small></span></button>
    <button class="ob-opt" data-dual="join-has" data-val="no"><span class="ob-ic"><img src="assets/ic-letter.png" alt=""></span><span>还没有账号<small>可以先开始，之后邀请对方下载 App</small></span></button>
  </div></div>
  <div class="ob-actions"><button class="ob-skip" data-dual="join-back">‹ 返回上一个问题</button></div></section>`;
}

/* ---------- 绑定 / 邀请 ---------- */
function qrSvg(){let cells='';let n=7;for(let y=0;y<9;y++)for(let x=0;x<9;x++){if((x*7+y*13+n)%3&&((x*31+y*17)%5))cells+=`<rect x="${12+x*20}" y="${12+y*20}" width="15" height="15" rx="3" fill="#e8f5ec"/>`;n+=3;}return `<svg viewBox="0 0 204 204" width="168" height="168">${cells}</svg>`;}
function bindPage(){
  let body='';
  if(dual.bindOk)body=`<div class="bind-ok"><span class="ok-orb">✓</span><h1 class="ob-q" style="font-size:19px">绑定成功</h1><p class="ob-hint">已和 ${esc(other().name)} 的回忆空间连在一起</p><button class="ob-next" data-dual="bind-enter" style="width:100%">进入回忆录</button></div>`;
  else if(dual.bindMode==='id')body=`<div class="bind-id-row"><input id="bind-id" maxlength="10" value="YY-7268-JH" aria-label="忆页ID"></div>
    <p class="ob-hint" style="margin:12px 0 0">演示账号 ID 已填好，直接确认即可</p>
    <div class="ob-actions"><button class="ob-next" data-dual="bind-submit">绑定这个账号</button></div>`;
  else body=`<div class="qr-box">${qrSvg()}<span class="qr-scanline"></span><span class="qr-corners"><i></i><i></i><i></i><i></i></span></div>
    <p class="ob-hint" style="margin-top:12px">把对方 App 里的二维码放进框内（演示将自动识别）</p>`;
  return `<section class="screen ob-screen"><div class="ob-roleline">账号绑定 · 双方内容互通</div>
   <div class="ob-card"><h1 class="ob-q" style="font-size:19px">绑定${esc(other().name)}的账号</h1>
   <div class="bind-tabs"><button class="${dual.bindMode==='id'?'sel':''}" data-dual="bind-tab" data-val="id">输入忆页 ID</button><button class="${dual.bindMode==='qr'?'sel':''}" data-dual="bind-tab" data-val="qr">扫码绑定</button></div>
   ${body}</div></section>`;
}
function invitePage(){return `<section class="screen ob-screen"><div class="ob-roleline">邀请对方加入</div>
  <div class="ob-card"><h1 class="ob-q" style="font-size:19px">先开始，再邀请</h1><p class="ob-hint">您可以现在就开始整理，邀请之后随时发出</p>
  <div class="invite-card"><div class="inv-head"><img src="${asset('xiaoyi')}" alt=""><span><strong>银发回忆录 · 邀请卡</strong><small>通过短信或微信发送</small></span></div>
  <p>${esc(me().name)}邀请你一起完成一本回忆录。下载“银发回忆录”，输入邀请码 <b>YY-7268</b>，就能看到我整理的照片和故事线索，随时补上你记得的那些事。</p></div></div>
  <div class="ob-actions"><button class="ob-next" data-dual="invite-send">发送邀请</button><button class="ob-skip" data-dual="invite-skip">先开始整理，稍后邀请</button></div></section>`;
}

/* ---------- 身份切换 ---------- */
function switchSheet(){if(!dual.switchOpen)return '';return `<div class="switch-shade" data-dual="switch-close"><div class="switch-sheet" role="dialog" aria-label="切换身份">
  <h3>切换身份 · 同一个回忆空间</h3>
  <button class="switch-row" data-dual="switch-to" data-val="narrator"><img src="${asset('narrator')}" alt=""><span><strong>${esc(dual.profile.nName||'陈建华')} · 讲述者</strong><small>用原声讲述，确认每一句话</small></span>${!isHelper()?'<span class="cur">当前</span>':''}</button>
  <button class="switch-row" data-dual="switch-to" data-val="helper"><img src="${asset('role-helper')}" alt=""><span><strong>${esc(dual.profile.hName||'周宁')} · 协助者</strong><small>上传线索，跟进进度，排版成书</small></span>${isHelper()?'<span class="cur">当前</span>':''}</button>
  <button class="switch-row" data-dual="switch-reset"><span style="width:42px;height:42px;border-radius:50%;background:#f1e9dc;display:flex;align-items:center;justify-content:center;font-size:17px">↺</span><span><strong>重新填写入驻信息</strong><small>回到身份选择与基础信息问答</small></span></button>
</div></div>`;}
function injectRoleFab(){
  if(!dual.ready)return;
  const line=viewport.querySelector('.screen .topline');
  if(line&&!line.querySelector('.role-switch')){
    const b=document.createElement('button');b.className='role-switch';b.dataset.dual='switch';b.setAttribute('aria-label','切换身份');
    b.innerHTML=`<img src="${asset(me().photo)}" alt="">`;line.appendChild(b);
  }
  if(dual.switchOpen)viewport.insertAdjacentHTML('beforeend',switchSheet());
}

/* ---------- 素材分类卡（插画图标，协助端进度页使用） ---------- */
function matCatCards(){
  const cats=[
   ['照片',`${memories.length+state.addedPhotos.length} 张 · 含 AI 复原`,'ic-photo','mphotos'],
   ['语音讲述',`${countAllAudio()} 条原声 · 小忆提问`,'ic-voice','voice'],
   ['文件线索',`${state.addedFiles.length||'—'} 份旧文件`,'ic-file','file'],
   ['话题线索',`${GUIDES.length} 个可聊话题`,'ic-topic','guides']];
  return `<div class="mat-grid rise">${cats.map(c=>`<button class="mat-cat" data-dual="mat-go" data-val="${c[3]}"><img class="mat-ic-img" src="assets/${c[2]}.png" alt=""><strong>${c[0]}</strong><small>${c[1]}</small><span class="mat-arrow">›</span></button>`).join('')}</div>`;
}

/* ---------- 讲述者首页（小忆问题置顶，保持原交互原型结构） ---------- */
function collabBanner(){
  if(isHelper())return '';
  if(dual.collab===1)return `<button class="collab-banner" data-dual="go-record"><small>协助者 · ${esc(dual.profile.hName||'周宁')} 发来新线索</small><strong>一张展会照片，小忆准备好了问题</strong><span>点这里，用原声回答</span><b>›</b></button>`;
  if(dual.collab===2)return `<button class="collab-banner" data-dual="canvas-expand"><small>《第一个出口订单》</small><strong>文稿已确认，去画布排版这一章</strong><span>照片、人物、原话都已就位</span><b>›</b></button>`;
  if(dual.collab===3)return `<button class="collab-banner" data-dual="preview-chapter"><small>《第一个出口订单》已成稿</small><strong>章节已写入《工作回忆》，去翻看</strong><span>确认后可以选择成品</span><b>›</b></button>`;
  return '';
}
function narratorHome(){
  let html=finalHome();
  const b=collabBanner();
  if(b)html=html.replace('<h1 class="hello">今天，想从哪里<br>开始讲？</h1>','<h1 class="hello">今天，想从哪里<br>开始讲？</h1>'+b);
  html=html.replace('<span class="eyebrow">陈建华 · 我的回忆</span>',`<span class="eyebrow">${esc(me().name)} · 素材</span>`);
  /* 照片墙：素材首页直接可见，横滑浏览，点照片进入经历时间轴 */
  const photos=memories.slice(0,6).map((m,i)=>`<button class="hp-photo" data-final="focus-memory" data-id="${i}" data-route="stories" data-view="timeline"><img src="${m.src||asset(m.photo)}" alt="${esc(m.title)}"><small>${esc(m.date)}</small></button>`).join('');
  const wall=`<div class="section-head"><h2>照片墙</h2><button data-route="mphotos">全部照片 ›</button></div><div class="hp-strip rise">${photos}${dual.repairSaved?`<button class="hp-photo fixed" data-dual="repair-open"><img src="assets/old-restored.png" alt="修复后的全家福"><small>约 1978 年 · 已复原</small></button>`:''}<button class="hp-photo add" data-final="upload-sheet" aria-label="上传更多照片"><span class="hp-plus">＋</span><small>贴上新照片</small></button></div>`;
  return html.replace('</section>',wall+'</section>');
}
function mphotosPage(){
  const tiles=memories.map((m,i)=>`<button class="mphoto" data-final="focus-memory" data-id="${i}" data-route="stories" data-view="timeline"><img src="${m.src||asset(m.photo)}" alt="${esc(m.title)}"><small>${esc(m.date)}</small></button>`);
  return `<section class="screen rise"><div class="topline"><span class="eyebrow">素材 · 照片</span><button class="tiny-action" data-final="upload-sheet">＋ 上传</button></div>
  <h1 class="subheading">照片</h1><p class="subtext">点照片进入经历时间轴；破损老照片可先复原再存入。</p>
  <div class="mat-grid rise" style="margin-bottom:14px">
    <button class="mat-cat" data-dual="repair-open"><img class="mat-ic-img" src="assets/ic-magic.png" alt=""><strong>AI 复原</strong><small>黑白缺角老照片修复演示</small><span class="mat-arrow">›</span></button>
    <button class="mat-cat" data-route="photo"><img class="mat-ic-img" src="assets/ic-album.png" alt=""><strong>添加照片</strong><small>拍摄或从相册选择</small><span class="mat-arrow">›</span></button>
  </div>
  <div class="section-head"><h2>时间轴里的照片</h2><button data-route="stories">经历 ›</button></div>
  <div class="mphoto-grid rise">${tiles.join('')}${dual.repairSaved?`<button class="mphoto fixed" data-dual="repair-open"><img src="assets/old-restored.png" alt="修复后的全家福"><small>约 1978 年 · 已复原</small></button>`:''}</div>
  </section>`;
}

/* ---------- 照片修复 ---------- */
function repairPage(){
  const st=dual.repairStage;
  let body='';
  if(st===0)body=`<div class="repair-photo"><img src="assets/old-damaged.png" alt="待修复的黑白老照片"><div class="repair-tags"><i>缺角</i><i>折痕 ×2</i><i>泛黄</i><i>划痕</i></div></div>
   <p class="subtext" style="margin:14px 0">一张约 1978 年的全家福（演示照片），上传后小忆会逐项检测修复。</p>
   <button class="primary full" data-dual="repair-upload">上传这张老照片</button>
   <button class="tiny-action" style="width:100%;margin-top:10px" data-route="photo">改从相册选择</button>`;
  else if(st===1)body=`<div class="repair-photo"><img src="assets/old-damaged.png" alt="已上传的老照片"><div class="repair-tags"><i>检测到缺角 · 右下角</i><i>折痕 2 处</i><i>霉斑 26 处</i></div></div>
   <div class="agent-decisions soft-card" style="margin-top:14px"><strong>小忆的修复方案</strong><p>① 依据周围砖墙与台阶补全缺角　② 去除折痕与划痕　③ 霉斑清理　④ 黑白上色，还原当年的暖色调</p></div>
   <button class="primary green full" data-dual="repair-start" style="margin-top:14px">开始 AI 复原</button>`;
  else if(st===2)body=`<div class="repair-photo"><img src="assets/old-damaged.png" alt="修复中"><div class="repair-scan"></div></div>
   <div class="repair-steps">${['补全缺角','去除折痕与划痕','清理霉斑','还原色彩'].map((t,i)=>`<span class="${dual.repairStep>=i?'on':''}">${t}</span>`).join('')}</div>`;
  else body=`<div class="cmp-wrap" id="cmp-wrap"><img src="assets/old-restored.png" alt="修复后的照片">
    <div class="cmp-top" id="cmp-top" style="width:${dual.repairPos}%"><img src="assets/old-damaged.png" alt="修复前"></div>
    <span class="cmp-label" style="left:9px">修复前</span><span class="cmp-label" style="right:9px">修复后</span>
    <div class="cmp-handle" id="cmp-handle" style="left:${dual.repairPos}%"></div></div>
   <p class="subtext" style="margin:12px 0">拖动中间的手柄，对比修复前后。</p>
   <div class="record-actions"><button class="ghost" data-dual="repair-redo">重新上传</button><button class="primary green" data-dual="repair-save">存入素材</button></div>`;
  return `<section class="screen subscreen rise">${headerBack('素材 · 照片')}
   <span class="eyebrow">老照片 AI 复原</span><h1 class="subheading">让旧照片重新看清</h1>${body}</section>`;
}
function bindCompare(){
  const wrap=$('#cmp-wrap');if(!wrap)return;
  const move=e=>{const r=wrap.getBoundingClientRect();const x=(e.touches?e.touches[0].clientX:e.clientX);let p=(x-r.left)/r.width*100;p=Math.max(6,Math.min(94,p));dual.repairPos=p;$('#cmp-top').style.width=p+'%';$('#cmp-handle').style.left=p+'%';};
  wrap.addEventListener('pointerdown',e=>{e.preventDefault();move(e);const mm=ev=>move(ev);const up=()=>{removeEventListener('pointermove',mm);removeEventListener('pointerup',up);persistDual()};addEventListener('pointermove',mm);addEventListener('pointerup',up);});
}
function runRepair(){
  dual.repairStage=2;dual.repairStep=0;render();
  clearInterval(window.__memoRepairTimer);
  let i=0;const tm=window.__memoRepairTimer=setInterval(()=>{i++;dual.repairStep=i;
    if(i>=4){clearInterval(tm);window.__memoRepairTimer=null;dual.repairStage=3;persistDual();render();return;}
    document.querySelectorAll('.repair-steps span').forEach((s,j)=>s.classList.toggle('on',j<=i));},800);
}
/* 演示台按步骤展示同一张照片，避免跳步或回看时复原状态残留。 */
window.memoDemo={
  selectRole(role){
    if(role!=='narrator'&&role!=='helper')return;
    if(role==='helper'){dual.profile.hName='陈思颖';dual.profile.hAge=29;dual.profile.nName='陈建华';}
    else{dual.profile.nName='陈建华';dual.profile.nAge=72;}
    document.querySelector(`[data-dual="role"][data-val="${role}"]`)?.click();
  },
  repair(stage){
    clearInterval(window.__memoRepairTimer);window.__memoRepairTimer=null;
    dual.repairStage=stage;dual.repairStep=stage===3?4:0;
    persistDual();route('repair');
    if(stage===2)runRepair();
  },
  saveRepair(){
    clearInterval(window.__memoRepairTimer);window.__memoRepairTimer=null;
    dual.repairStage=3;saveRepaired();
  },
  syncRepair(){
    ensureRepairedPhoto();render();
  },
  step(id){
    const tap=selector=>document.querySelector(selector)?.click();
    if(id==='ob-to-age'||id==='ob-next'){tap('[data-dual="ob-next"]');return;}
    if(id==='ob-age-up'){tap('[data-dual="ob-age"][data-val="1"]');return;}
    if(id==='ob-self'){tap('[data-dual="ob-choice"][data-val="self"]');tap('[data-dual="ob-next"]');return;}
    if(id==='ob-join-yes'){tap('[data-dual="ob-choice"][data-val="yes"]');tap('[data-dual="ob-next"]');return;}
    if(id==='ob-join-no'){tap('[data-dual="join-has"][data-val="no"]');return;}
    if(id==='ob-invite-skip'){tap('[data-dual="invite-skip"]');return;}
    if(id==='ob-relative-father'){tap('[data-dual="ob-choice"][data-val="父亲"]');tap('[data-dual="ob-next"]');return;}
    if(id==='ob-has-account'){tap('[data-dual="join-has"][data-val="yes"]');return;}
    if(id==='ob-bind-submit'){tap('[data-dual="bind-submit"]');return;}
    if(id==='ob-bind-enter'){tap('[data-dual="bind-enter"]');return;}
    if(id==='people')return route('people');
    if(id==='partner-questions'||id==='partner-topics'){
      state.personId='partner';state.personFrom='people';state.detailTab=id==='partner-topics'?'topics':'questions';return route('person');
    }
    if(id==='partner-record')return openRecord('partner','第一个出口订单');
    if(id==='micro-father'){
      clearInterval(state.demoTimer);state.memoMicro='father';state.demoRecording=true;state.demoSeconds=12;
      return route('agent-demo-record');
    }
    if(id==='micro-helper-prompt'||id==='micro-helper-input'){
      state.memoMicro=id==='micro-helper-input'?'helper-input':'helper-prompt';
      state.memoMicroHelper=id==='micro-helper-input'?'小时候我常听爸爸提起这笔订单。翻出展会合影后，我才看见他当年站在角落里的小展位前。':'';
      return route('sendclue');
    }
    if(id==='agent-confirm'){
      state.agentRaw=false;state.agentConfirmed=true;return route('agent-review');
    }
    if(id==='agent-save'){
      state.agentConfirmed=true;state.agentSaved=true;
      localStorage.setItem('memo-prototype-agent-demo-v1',JSON.stringify({saved:true,supplement:state.agentSupplement||''}));
      return route('agent-done');
    }
    if(id==='stories-list'||id==='story-open'){
      state.storiesView='list';state.storyExpanded=id==='story-open'?'export':null;return route('stories');
    }
    if(id==='stories-timeline'){
      ensureRepairedPhoto();
      state.storiesView='timeline';state.timelinePaused=true;state.memoryIndex=0;route('stories');
      setTimeout(()=>{state.memoryIndex=Math.max(0,memories.findIndex(m=>m.id==='restored-1'));focusTimeline(true);},550);
      return;
    }
    if(id==='community')return route('community');
    if(id==='community-detail'){
      state.selectedCommunity='jianguo';return route('community-detail');
    }
    if(id==='community-follow'){
      state.selectedCommunity='jianguo';dual.followedDemo=true;persistDual();return route('community-detail');
    }
    if(id==='community-chat'){
      dual.followedDemo=true;persistDual();state.followFriend='jianguo';return route('friend');
    }
    if(id==='helper-style'){
      route('community');
      const label=STYLE_LABELS.jianguo;
      if(!dual.stylePrefs.includes(label))dual.stylePrefs.push(label);
      dual.styleNew=label;persistDual();render();
      document.querySelector('.btn-style.learned')?.scrollIntoView({block:'center'});
      return;
    }
  }
};
window.addEventListener('message',e=>{
  if(e.source!==window.parent||!e.data?.memoDemo)return;
  const d=e.data.memoDemo;
  if(d.action==='select-role')window.memoDemo.selectRole(d.role);
  else if(d.action==='repair'&&Number.isInteger(d.stage)&&d.stage>=0&&d.stage<=3)window.memoDemo.repair(d.stage);
  else if(d.action==='save-repair')window.memoDemo.saveRepair();
  else if(d.action==='canvas-arrange')autoArrange();
  else if(d.action==='canvas-generate')generateChapter();
  else if(d.action==='sync-repair')window.memoDemo.syncRepair();
  else if(d.action==='step'&&typeof d.id==='string')window.memoDemo.step(d.id);
});
function ensureRepairedPhoto(){
  if(!state.addedPhotos.some(p=>p.id==='restored-1'))state.addedPhotos.push({id:'restored-1',title:'修复后的全家福',date:'约 1978 年',place:'柳市镇老屋门前',story:'AI 复原演示：补全缺角、去除折痕、还原色彩。',src:'assets/old-restored.png'});
  if(!memories.some(m=>m.id==='restored-1'))memories.push({id:'restored-1',year:'1978',date:'约 1978 年 · 柳市镇',place:'老屋门前',title:'修复后的全家福',photo:'old-family',src:'assets/old-restored.png',story:'这张全家福缺了一个角。修复之后，才看清门口台阶上还坐着一只猫。',person:'father'});
  dual.repairSaved=true;persistDual();extraPersist?.();
}
function saveRepaired(){
  ensureRepairedPhoto();
  toast('已存入素材 · 照片，并加入经历时间轴');route('mphotos');
}

/* ---------- 协助端 · 进度 ---------- */
const CHAP_STEPS=['素材','提问','讲述','确认','成稿'];
/* 写好一章，需要备齐的 7 类素材。协助端进度页据此提示“素材还不全”。 */
const CHAP_NEEDS=[
 {id:'time',label:'时间',desc:'哪一年 · 什么场合',img:'ic-time'},
 {id:'place',label:'地点',desc:'在哪里 · 环境什么样',img:'ic-place'},
 {id:'people',label:'人物',desc:'在场的人 · 称呼与关系',img:'ic-people'},
 {id:'photo',label:'照片',desc:'至少一张相关影像',img:'ic-photo'},
 {id:'voice',label:'口述',desc:'本人确认过的原话',img:'ic-voice'},
 {id:'doc',label:'文件',desc:'订单 · 证件 · 票据佐证',img:'ic-file'},
 {id:'feel',label:'细节',desc:'声音 · 气味 · 当时心情',img:'ic-topic'}];
/* 第二章《华辰第一个出口订单》当前的素材完备情况，随协同进度变化 */
function chapNeeds(r){
 return {
  time:r>=2?['ok','2001 年 4 月春交会 · 本人已确认']:r>=1?['warn','“2001 年春交会”来自边注 · 待本人确认']:['miss','还没有时间信息'],
  place:r>=2?['ok','3 号馆近通道角落 · 本人已确认']:r>=1?['warn','“3 号馆近通道角落”来自边注 · 待本人确认']:['miss','还没有地点信息'],
  people:['ok','黄先生 · 赵国平 2 位，称呼与关系已注明'],
  photo:r>=2?['ok','展会合影 1 张 · 本人已确认']:r>=1?['warn','周宁上传合影 1 张 · 待本人确认']:['miss','还没有照片影像'],
  voice:r>=2?['ok','口述整理稿 · 本人亲口确认']:r>=1?['warn','小忆已发问 · 等待本人讲述']:['miss','还没有本人确认的原话'],
  doc:['miss','合同或订单扫描件未上传'],
  feel:r>=3?['ok','“三米乘三米的展位”等细节已入稿']:r>=2?['warn','原话里已有片段 · 还可再补感官细节']:['miss','还没有细节与感受']
 };
}
function chapNeedsHtml(r){
 const st=chapNeeds(r);
 const ok=CHAP_NEEDS.filter(n=>st[n.id][0]==='ok').length;
 const warn=CHAP_NEEDS.filter(n=>st[n.id][0]==='warn').length;
 const miss=CHAP_NEEDS.filter(n=>st[n.id][0]==='miss').length;
 const rows=CHAP_NEEDS.map(n=>{
  const [s,note]=st[n.id];
  const ic=n.img?`<img src="assets/${n.img}.png" alt="">`:`<svg viewBox="0 0 24 24">${n.svg}</svg>`;
  const tail=s==='miss'?`<button class="need-act" data-dual="need-fill" data-val="${n.id}">去补 ›</button>`:s==='warn'?'<span class="need-flag">待确认</span>':'';
  return `<div class="need-row ${s}"><i class="need-ic">${ic}</i><span><strong>${n.label}<em>${n.desc}</em></strong><small>${note}</small></span><b class="need-dot" aria-hidden="true">${s==='ok'?'✓':s==='warn'?'!':'＋'}</b>${tail}</div>`;
 }).join('');
 return `<div class="need-box"><div class="need-head"><strong>章节素材清单</strong><span>已备 ${ok} / ${CHAP_NEEDS.length}${warn?` · ${warn} 项待确认`:''}${miss?` · 还缺 ${miss} 项`:''}</span></div>${rows}</div>`;
}
function chapCard(){
  const r=dual.collab;
  const pct=[15,35,60,85,100][r];
  const stLabel=['st-doing','st-wait','st-doing','st-ok','st-ok'][r];
  const steps=CHAP_STEPS.map((s,i)=>`<span class="${i<r?'hit':i===r?'now':''}">${s}</span>`).join('');
  let cta='';
  if(r===0)cta=`<button class="chap-cta" data-dual="sendclue-open">＋ 上传展会照片</button>`;
  else if(r===1)cta=`<button class="chap-cta ghosty" data-dual="remind">提醒建华回答</button>`;
  else if(r===2)cta=`<button class="chap-cta" data-dual="draftview-open">查看确认文稿</button> <button class="chap-cta green" data-dual="canvas-expand">去画布制作 ›</button>`;
  else if(r===3)cta=`<button class="chap-cta" data-dual="preview-chapter">预览章节</button> <button class="chap-cta green" data-dual="canvas-expand">继续调整 ›</button>`;
  else cta=`<button class="chap-cta green" data-dual="view-order">✓ 查看成品方案</button>`;
  return `<div class="chap-card"><div class="chap-top"><small>工作回忆 · 第二章</small><strong>华辰第一个出口订单</strong><span class="chap-status ${stLabel}">${RANK[r]}</span></div>
  <div class="chap-bar"><i style="width:${pct}%"></i></div><div class="chap-steps">${steps}</div>${chapNeedsHtml(r)}${cta}</div>`;
}
function progressPage(){
  const plans=[
   ['码头装船那天的现场照片','计划 · 本周',dual.collab>=3],
   ['黄先生的全名与后来十几年的往来','小忆追问中',dual.collab>=2],
   ['2003 年抵押房子的那一段','计划 · 下周',false],
   ['思远进公司第一天的安排','计划 · 下周',false]];
  let thread='';
  if(dual.collab>=1){
    thread+=`<div class="thread-msg mine"><small>我 · ${esc(me().name)} · 上传了线索</small>展会合影 1 张。<br>边注：${esc(dual.collabNote)}</div>
    <div class="thread-msg"><small>小忆 · 已代为提问</small>“看着这张合影，你记得那天是怎么开始的吗？”</div>`;
    if(dual.collab>=2)thread+=`<button class="thread-msg reply" data-dual="draftview-open"><small>${esc(dual.profile.nName||'陈建华')} · 已回答并确认</small>“我讲完了，文稿我看过，就这样。”<span class="go">查看他确认的文稿 ›</span></button>`;
    else thread+=`<div class="thread-msg" style="opacity:.65"><small>等待中</small>还没有回复。点页面右上角头像，可以切换到讲述者演示回答。</div>`;
  }else{
    thread=`<div class="thread-msg" style="opacity:.7"><small>开始协作</small>上传一张展会照片，小忆会据此向建华提一个开放问题。</div>`;
  }
  return `<section class="screen rise"><div class="topline"><span class="eyebrow">协助 · 进度</span><button class="tiny-action" data-final="upload-sheet">＋ 上传</button></div>
  <h1 class="subheading">进度</h1>
  <div class="pg-head rise"><img src="${asset('role-helper')}" alt=""><span><strong>${esc(me().name)} · ${me().age} 岁</strong><small>正在协助 ${esc(dual.profile.nName||'陈建华')}（${esc(dual.profile.rel||'父亲')}）完成回忆录</small></span><button data-dual="sendclue-open">＋ 线索</button></div>
  <div class="section-head"><h2>章节进度</h2></div>
  <p class="chap-need-hint">写好一章，要备齐 7 类素材：时间 · 地点 · 人物 · 照片 · 口述 · 文件 · 细节。清单里打「＋」的，就是还缺的。</p>
  <div class="rise">${chapCard()}
  <div class="chap-card" style="opacity:.92"><div class="chap-top"><small>人生故事 · 第一章</small><strong>木匠父亲的工作台</strong><span class="chap-status st-ok">已完成</span></div><div class="chap-bar"><i style="width:100%"></i></div><div class="chap-steps">${CHAP_STEPS.map(s=>`<span class="hit">${s}</span>`).join('')}</div><button class="chap-cta ghosty" data-book="life">翻看这一章</button></div>
  <div class="chap-card" style="opacity:.85"><div class="chap-top"><small>工作回忆 · 第三章</small><strong>把房子拿去抵押</strong><span class="chap-status st-plan">计划录入</span></div><div class="chap-bar"><i style="width:20%"></i></div><div class="chap-steps">${CHAP_STEPS.map((s,i)=>`<span class="${i===0?'now':''}">${s}</span>`).join('')}</div><div class="need-mini"><b>素材 1 / 7</b>只有小忆的话题线索 · 时间、照片、口述、文件等 6 类还没有</div><button class="chap-cta ghosty" data-dual="remind">加入本周计划</button></div></div>
  <div class="section-head"><h2>计划录入</h2></div>
  <div class="rise">${plans.map(p=>`<div class="plan-row ${p[2]?'done':''}"><i class="plan-dot"></i><strong>${p[0]}</strong><small>${p[1]}</small></div>`).join('')}</div>
  <div class="section-head"><h2>待查看 · 对方回复</h2></div>
  <div class="thread rise">${thread}</div>
  <div class="section-head"><h2>素材分类</h2></div>
  ${matCatCards()}
  </section>`;
}
function sendcluePage(){
  if(state.memoMicro==='helper-prompt'||state.memoMicro==='helper-input')return `<section class="screen subscreen rise">${headerBack('协助补充')}
    <span class="eyebrow">小忆指令 · 女儿视角</span><h1 class="subheading">只补充你知道的场景</h1>
    <div class="agent-decisions soft-card"><strong>父亲刚说的原话</strong><p>“那天展位小得很，我跟黄先生比划着算价格，晚上高兴得睡不着。”</p><small>这句话由父亲确认，协助端不能修改。</small></div>
    <div class="repair-photo" style="margin:12px 0"><img src="${asset('expo')}" alt="展会合影"></div>
    <div class="agent-decisions soft-card"><strong>小忆建议补什么</strong><p>说说你亲眼看到的照片细节，或你确实听父亲提过的事；写清这是你的视角。</p></div>
    <form id="clue-form" class="full-form"><label>女儿视角的补充</label><textarea name="note" maxlength="200" placeholder="例如：照片里父亲站在角落的小展位前…">${esc(state.memoMicroHelper||'')}</textarea></form>
    <button class="primary green full" data-dual="sendclue-submit" style="margin-top:14px">提交补充线索</button></section>`;
  return `<section class="screen subscreen rise">${headerBack('进度')}
  <span class="eyebrow">上传线索 · 边注层</span><h1 class="subheading">给建华发一条线索</h1>
  <p class="subtext">线索只帮助小忆选题，不会直接写进正文。</p>
  <div class="repair-photo" style="margin-bottom:12px"><img src="${asset('expo')}" alt="展会合影"><div class="repair-tags"><i>展会合影 · 2001</i><i>待本人确认</i></div></div>
  <form id="clue-form" class="full-form"><label>边注（只有协助者看得到）</label><textarea name="note" maxlength="200">${esc(dual.collabNote)}</textarea></form>
  <div class="agent-decisions soft-card" style="margin-top:4px"><strong>小忆将这样提问</strong><p>“看着这张合影，你记得那天是怎么开始的吗？”<br><span style="color:var(--muted);font-size:10px">日期与金额先不写进问题，等本人亲口确认。</span></p></div>
  <button class="primary green full" data-dual="sendclue-submit" style="margin-top:14px">发给建华</button></section>`;
}
function draftviewPage(){
  return `<section class="screen subscreen rise">${headerBack('进度')}
  <span class="eyebrow">对方已确认 · 工作回忆第二章</span><h1 class="subheading">华辰第一个出口订单</h1>
  <div class="agent-state"><span>原声 → 整理 → 本人确认</span><strong>已确认</strong></div>
  <div class="agent-draft soft-card"><small>整理后的完整文稿 · 由建华亲口确认</small><p>${esc(AGENT_CLEAN)}</p></div>
  <div class="agent-decisions soft-card"><strong>整理判断</strong><p>去掉三个没有信息的“嗯”；“三万美金”说了两次，都保留；“零一年”沿用本人说法。你的边注只作为待核对信息，没有写进正文。</p><div class="uncertain-note"><small>边注 · 我</small><span>${esc(dual.collabNote)}</span></div></div>
  <button class="primary full" data-dual="canvas-expand" style="margin-top:14px">带着这些素材，去画布制作 ›</button></section>`;
}

/* ---------- 章节画布（编辑页内嵌 + 全页） ---------- */
function cvBlocks(){
  const L=dual.canvasLayout||{};
  const base=[
   {id:'photo',x:4,y:3,w:44,html:`<span class="cv-tag tag-helper">协助者上传</span><figure class="cv-photo" style="margin:0"><img src="${asset('expo')}" alt="展会合影"><figcaption>2001 年 · 广交会合影<br>周宁上传 · 待本人确认</figcaption></figure>`},
   {id:'person',x:52,y:5,w:44,html:`<div class="cv-person"><img src="${asset('client')}" alt=""><span><b>黄先生</b><small>马来西亚客户 · 名片与计算器</small></span></div><div class="cv-person" style="padding-top:0"><img src="${asset('partner')}" alt=""><span><b>赵国平</b><small>合伙人 · “行啊老陈”</small></span></div>`},
   {id:'teller',x:6,y:38,w:57,html:`<span class="cv-tag tag-teller">讲述者原话 · 已确认</span><div class="cv-text"><small>陈建华 · 口述整理</small><p>${esc(AGENT_CLEAN.slice(0,86))}……</p></div>`},
   {id:'helper',x:66,y:44,w:30,html:`<div class="cv-text helper-note"><small>边注 · 周宁</small><p>${esc(dual.collabNote)}</p></div>`}];
  if(dual.repairSaved)base.push({id:'restored',x:52,y:70,w:44,html:`<span class="cv-tag tag-ai">AI 复原</span><figure class="cv-photo" style="margin:0"><img src="assets/old-restored.png" alt="修复后的全家福"><figcaption>约 1978 年 · 全家福（已复原）</figcaption></figure>`});
  return base.map(b=>{const p=L[b.id];if(p){
    b.x=Math.max(0,Math.min(96-b.w,p[0]));
    b.y=Math.max(0,Math.min(92,p[1]));
  }return b;});
}
function cvBlocksHtml(){
  return `<svg id="cv-lines" style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none"></svg>
  ${cvBlocks().map(b=>`<div class="cv-block" data-bid="${b.id}" style="left:${b.x}%;top:${b.y}%;width:${b.w}%">${b.html}</div>`).join('')}
  ${dual.generating?`<div class="cv-gather"><span class="cv-orb">✦</span><p>正在把素材排进书页…</p></div>`:''}`;
}
function canvasPage(){
  return `<section class="screen cv-screen">${headerBack('编辑')}
  <div class="cv-head"><span><small>章节画布 · 工作回忆第二章</small><strong>第一个出口订单</strong></span>
  <div class="cv-tools"><button data-dual="canvas-arrange">自动排列</button><button data-dual="canvas-hint">${dual.canvasHint?'隐藏提示':'提示'}</button></div></div>
  <div class="cv-area ${dual.canvasHint?'hint':''}" id="cv-area">${cvBlocksHtml()}</div>
  <div class="cv-foot"><button class="cv-preview" data-dual="preview-chapter">预览书页</button><button class="cv-gen" data-dual="canvas-generate">生成这一章 ✦</button></div>
  </section>`;
}
function dualEditPage(){
  return `<section class="screen rise"><div class="topline"><span class="eyebrow">编辑 · 章节与书架</span><button class="tiny-action" data-extra="new-book">＋ 新建</button></div>
  <div class="cv-head" style="padding-top:6px"><span><small>章节画布 · 工作回忆第二章</small><strong>第一个出口订单</strong></span>
  <div class="cv-tools"><button data-dual="canvas-arrange">自动排列</button><button data-dual="canvas-expand">⤢ 放大</button></div></div>
  <div class="cv-area cv-embed ${dual.canvasHint?'hint':''}" id="cv-area">${cvBlocksHtml()}</div>
  <div class="cv-foot"><button class="cv-preview" data-dual="preview-chapter">预览书页</button><button class="cv-gen" data-dual="canvas-generate">生成这一章 ✦</button></div>
  <div class="section-head" style="margin-top:14px"><h2>我的书架</h2><button data-final="order-open" data-id="work">成品 ›</button></div>
  <div class="shelf-top helper-shelf-top"></div><div class="book-shelf helper-shelf rise">${books.map(b=>`<button class="shelf-book book-${b.id}" data-book="${b.id}">${coverVisual(b)}<span>${esc(b.title)}</span></button>`).join('')}</div><div class="shelf-bottom helper-shelf-bottom"></div>
  </section>`;
}
function cvPositions(){
  const area=$('#cv-area');if(!area)return{};
  const r=area.getBoundingClientRect();const o={};
  area.querySelectorAll('.cv-block').forEach(b=>{o[b.dataset.bid]=[b.offsetLeft/r.width*100,b.offsetTop/r.height*100];});
  return o;
}
function drawCvLines(){
  const area=$('#cv-area'),svg=$('#cv-lines');if(!area||!svg)return;
  const order=['photo','person','teller','helper','restored'].filter(id=>area.querySelector(`[data-bid="${id}"]`));
  const pts=order.map(id=>{const b=area.querySelector(`[data-bid="${id}"]`);return [b.offsetLeft+b.offsetWidth/2,b.offsetTop+b.offsetHeight/2];});
  let d='';for(let i=0;i<pts.length-1;i++){const [x1,y1]=pts[i],[x2,y2]=pts[i+1];const mx=(x1+x2)/2;d+=`M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2} `;}
  svg.innerHTML=`<path d="${d}" fill="none" stroke="#c8a37e" stroke-width="1.6" stroke-dasharray="5 5" opacity=".8"/>`+pts.map(p=>`<circle cx="${p[0]}" cy="${p[1]}" r="3.5" fill="#c8a37e"/>`).join('');
}
function bindCanvas(){
  const area=$('#cv-area');if(!area)return;
  drawCvLines();
  area.querySelectorAll('.cv-block').forEach(b=>{
    b.addEventListener('pointerdown',e=>{
      e.preventDefault();
      const r=area.getBoundingClientRect();
      const dx=e.clientX-b.offsetLeft-r.left,dy=e.clientY-b.offsetTop-r.top;
      b.classList.add('dragging');b.classList.remove('snap');
      const mm=ev=>{let x=ev.clientX-r.left-dx,y=ev.clientY-r.top-dy;
        x=Math.max(0,Math.min(r.width-b.offsetWidth,x));
        y=Math.max(0,Math.min(r.height-b.offsetHeight,y));
        b.style.left=x+'px';b.style.top=y+'px';drawCvLines();};
      const up=()=>{b.classList.remove('dragging');removeEventListener('pointermove',mm);removeEventListener('pointerup',up);
        dual.canvasLayout=cvPositions();persistDual();drawCvLines();};
      addEventListener('pointermove',mm);addEventListener('pointerup',up);
    });
  });
}
function autoArrange(){
  const presets=dual.repairSaved?{photo:[3,3],person:[51,4],teller:[4,40],helper:[64,44],restored:[51,72]}:{photo:[4,4],person:[52,6],teller:[6,42],helper:[64,48]};
  document.querySelectorAll('#cv-area .cv-block').forEach(b=>{
    const p=presets[b.dataset.bid];if(!p)return;
    b.classList.add('snap');b.style.left=p[0]+'%';b.style.top=p[1]+'%';
    setTimeout(()=>drawCvLines(),60);});
  setTimeout(()=>{dual.canvasLayout=cvPositions();persistDual();drawCvLines();},620);
  toast('已按阅读顺序自动排列');
}
function generateChapter(){
  if(dual.generating)return;
  dual.generating=true;render();
  setTimeout(()=>{
    dual.generating=false;
    if(!dual.chapterDone){
      const wb=books.find(b=>b.id==='work');
      dual.chapterAt=wb.pages.length;
      wb.pages.push(
        {type:'photo',label:'第二章 · 第一个出口订单',title:'展会上的第一张合影',photo:'expo',caption:'2001 年 · 广交会（周宁上传）',text:'那天来了一个马来西亚的客户，华裔，姓黄。他看了看我们的产品，问了几个技术参数，留了一张名片。'},
        {type:'chapter',label:'第二章 · 第一个出口订单',title:'华辰第一个出口订单',text:AGENT_CLEAN+'\n\n——\n边注 · '+ (dual.profile.hName||'周宁') +'：'+dual.collabNote}
      );
      dual.chapterDone=true;
    }
    if(dual.collab<3)dual.collab=3;
    persistDual();
    state.bookId='work';state.pageIndex=dual.chapterAt||0;
    toast('第二章已写入《工作回忆》');
    route('reader');
  },1400);
}

/* ---------- 录后回听：小忆来问 + 补白追问（参考讲述端内容设计 P4 回读确认 / P5 补白追问） ---------- */
function followupQuestion(){
  const p=state.recordFor?person(state.recordFor):null;
  if(p)return `你刚才讲到${p.name}，还有哪一件小事，是你想一起记下来的？`;
  if(/照片|合影/.test(state.recordTitle||''))return '说起这张照片的时候，你想起那天的什么声音或气味了吗？';
  if(state.recordTitle)return `「${state.recordTitle}」这件事，大概发生在哪一年？记不确切也没关系。`;
  return '刚才这段里提到的人，你最想再补一句关于谁的话？';
}
previewWithActions=function(){
  const p=state.recordFor?person(state.recordFor):null;
  const q=followupQuestion();dual.lastFollowup=q;
  const follow=dual.folSkipped?'':xySay(`“${esc(q)}”`,`<button class="xy-chip" data-dual="preview-followup"><img src="assets/ic-mic.png" alt="">语音回答</button><button class="xy-chip" data-dual="preview-skip-followup">跳过</button>`);
  return `<section class="screen subscreen rise">${headerBack('回听这一段')}
  ${xySay(`${p?`和${p.name}的这段，`:'这段，'}要留下吗？先听一遍再定。`,`<button class="xy-chip" data-action="play-preview">▶ 回听 ${formatSecs(state.recordSeconds)}</button>`)}
  ${follow}
  <div class="record-actions" style="margin-top:14px"><button class="ghost" data-action="discard-record">不保存</button><button class="ghost" data-extra="rerecord">重新录制</button><button class="primary green" data-action="save-record">保存</button></div>
  <p class="ai-note" style="margin-top:12px">听着不像你说的，就重新录。</p></section>`;
};

/* 新一轮录制时重置「跳过追问」标记 */
const coreOpenRecord=openRecord;
openRecord=function(pid,title){dual.folSkipped=false;persistDual();return coreOpenRecord(pid,title);};

/* ---------- 上传与照片页：插画图标 ---------- */
uploadOverlay=function(){return `<div class="upload-shade" data-final="close-upload"><div class="upload-sheet" role="dialog" aria-label="添加内容"><div class="sheet-handle"></div><h2>添加一段线索</h2><p>先存进素材，不会直接写进正文。</p><div class="upload-options">
<button data-final="upload-photo"><span class="app-icon ill"><img src="assets/ic-camera.png" alt=""></span><span><strong>照片</strong><small>拍照、相册，或修复老照片</small></span>›</button>
<button data-final="upload-wechat"><span class="app-icon ill"><img src="assets/ic-wechat.png" alt=""></span><span><strong>聊天记录</strong><small>粘贴微信里的摘录</small></span>›</button>
<button data-final="upload-file"><span class="app-icon ill"><img src="assets/ic-doc.png" alt=""></span><span><strong>旧文件</strong><small>订单、证件或手写纸</small></span>›</button>
</div><button class="sheet-cancel" data-final="close-upload">取消</button></div></div>`;};
const corePhotoPage=photoPage;
photoPage=function(){return corePhotoPage()
 .replace('📷 现在拍一张','<img class="opt-ic" src="assets/ic-camera.png" alt="">现在拍一张')
 .replace('🖼 从相册选择','<img class="opt-ic" src="assets/ic-album.png" alt="">从相册选择')
 .replace('💬 导入微信聊天线索','<img class="opt-ic" src="assets/ic-wechat.png" alt="">导入微信聊天线索')
 .replace('<input id="photo-file"','<button class="option-row" data-dual="repair-open"><span><strong><img class="opt-ic" src="assets/ic-magic.png" alt="">AI 复原老照片</strong><small>黑白缺角照片，模拟一键修复</small></span>›</button><input id="photo-file"');};

/* ---------- 社区文风学习 ---------- */
const coreCommunityPage=communityPage;
communityPage=function(){
  let html=coreCommunityPage();
  const chips=dual.stylePrefs.map(s=>`<i class="${dual.styleNew===s?'new':''}">${esc(s)}</i>`).join('');
  const card=xySay('看到喜欢的文风就告诉我，整理文稿时我会照这个感觉写。','',`<div class="style-chips">${chips||'<small>还没有 · 点故事下的「✦ 学习文风」</small>'}</div>`);
  html=html.replace('<div class="section-head"><h2>故事动态</h2></div>','<div class="section-head"><h2>故事动态</h2></div>'+card);
  html=html.replace(/<button data-final="community-read" data-id="([^"]+)"/g,(m,id)=>`<button class="btn-style ${dual.stylePrefs.includes(STYLE_LABELS[id])?'learned':''}" data-dual="style" data-id="${id}">${dual.stylePrefs.includes(STYLE_LABELS[id])?'✓ 已学习':'✦ 学习文风'}</button><button data-final="community-read" data-id="${id}"`);
  return html;
};
const demoCommunityDetail=communityDetail;
communityDetail=function(){
  const html=demoCommunityDetail();
  if(state.selectedCommunity!=='jianguo')return html;
  const label=dual.followedDemo?'已关注 · 去对话 ›':'＋ 关注李建国';
  const action=dual.followedDemo?'community-chat':'community-follow';
  return html.replace('<div class="moment-actions">',`<div class="community-follow-action"><button data-dual="${action}">${label}</button></div><div class="moment-actions">`);
};
const demoFriendPage=friendPage;
friendPage=function(){return demoFriendPage().replace('互相关注 · 本地对话预览','已关注 · 本地对话预览');};
const baseDemoRecordPage=demoRecordPage;
demoRecordPage=function(){
  const html=baseDemoRecordPage();
  if(state.memoMicro!=='father')return html;
  return html.replace('“看着这张合影，你记得那天是怎么开始的吗？”','“那天展位很小，你记得怎样跟客户谈价格吗？”')
    .replace(/<p id="live-transcript-lines">.*?<\/p>/s,'<p id="live-transcript-lines"><span>那天展位小得很，我跟黄先生比划着算价格，</span><span>晚上高兴得睡不着。<i class="typing-cursor"></i></span></p>');
};

/* ---------- 渲染接管 ---------- */
const coreRender=render;
const MY_MAIN=['home','stories','community','books','voice','mphotos'];
render=function(){
  if(!dual.role){viewport.innerHTML=identityPage();tabbar.innerHTML='';tabbar.classList.add('hidden');return;}
  if(!dual.ready){
    const steps=obSteps();
    let html;
    if(dual.onboardStep<steps.length)html=onboardPage();
    else if(dual.obHasAccount==null)html=joinCheckPage();
    else html=dual.obHasAccount?bindPage():invitePage();
    viewport.innerHTML=html;tabbar.innerHTML='';tabbar.classList.add('hidden');return;
  }
  const mine={home:isHelper()?progressPage:narratorHome,voice:()=>finalHome(),mphotos:mphotosPage,repair:repairPage,canvas:canvasPage,books:isHelper()?dualEditPage:function(){return myPage();},sendclue:sendcluePage,draftview:draftviewPage}[state.route];
  if(mine){
    viewport.innerHTML=mine()+(state.uploadSheet?uploadOverlay():'')+(dual.switchOpen?switchSheet():'');
    const main=MY_MAIN.includes(state.route);
    tabbar.innerHTML=main?dualTabs():'';tabbar.classList.toggle('hidden',!main);
    injectRoleFab();
    if(state.route==='canvas'||state.route==='books')bindCanvas();
    if(state.route==='repair')bindCompare();
    return;
  }
  coreRender();
  injectRoleFab();
};
const coreBack=back;
back=function(){
  if(dual.switchOpen){dual.switchOpen=false;return render();}
  if(state.route==='repair')return route('mphotos');
  if(state.route==='mphotos'||state.route==='voice')return route('home');
  if(state.route==='canvas')return route('books');
  if(state.route==='sendclue'||state.route==='draftview')return route('home');
  return coreBack();
};

/* ---------- 小忆问题「换一个」：只换卡片，不整页刷新 ---------- */
document.addEventListener('click',e=>{
  const el=e.target.closest('[data-final="guide-next"]');
  if(!el)return;
  if(isHelper()||!['home','voice'].includes(state.route))return;
  e.preventDefault();e.stopImmediatePropagation();
  state.guideIndex=(state.guideIndex+1)%GUIDES.length;state.guideChanges++;
  const g=GUIDES[state.guideIndex];
  /* 只换图片与文字，不重建气泡 */
  const card=viewport.querySelector('.guide-card');
  if(card){
    card.dataset.guide=g.id;
    const btn=card.querySelector('.guide-photo');
    const img=card.querySelector('.guide-photo img');
    if(btn)btn.dataset.id=g.id;
    if(img){img.classList.remove('ph-fade');void img.offsetWidth;img.src=guideImg(g);img.alt=g.title;img.classList.add('ph-fade');}
    const t=card.querySelector('.gp-ov strong'),s=card.querySelector('.gp-ov small');
    if(t)t.textContent=g.title;if(s)s.textContent=g.source;
    const q=card.querySelector('.xy-bubble p');
    if(q)q.textContent='“'+g.q+'”';
  }
  const mini=viewport.querySelector('.assistant-mini span');
  if(mini)mini.textContent=g.q;
},true);

/* ---------- 交互 ---------- */
document.addEventListener('click',e=>{
  const el=e.target.closest('[data-dual]');if(!el)return;
  e.preventDefault();e.stopImmediatePropagation();
  const a=el.dataset.dual,v=el.dataset.val;
  switch(a){
   case 'role':dual.role=v;dual.ready=false;dual.onboardStep=0;dual.obHasAccount=null;dual.bindOk=false;persistDual();render();return;
   case 'ob-choice':dual.profile[el.dataset.key]=v;persistDual();render();return;
   case 'ob-age':{const steps=obSteps(),s=steps[dual.onboardStep];const cur=Number(dual.profile[s.key]??s.def);dual.profile[s.key]=Math.max(1,Math.min(110,cur+Number(v)));persistDual();render();return;}
   case 'ob-next':obAdvance();return;
   case 'ob-skip':dual.ready=true;persistDual();state.route='home';render();return;
   case 'join-has':dual.obHasAccount=(v==='yes');if(v==='yes')dual.bindMode='id';persistDual();render();return;
   case 'join-back':dual.onboardStep=obSteps().length-1;render();return;
   case 'bind-tab':dual.bindMode=v;dual.bindOk=false;render();
     if(v==='qr'){clearTimeout(window.__qrTm);window.__qrTm=setTimeout(()=>{if(!dual.ready&&dual.obHasAccount){dual.bindOk=true;dual.bound=true;persistDual();render();}},2200);}return;
   case 'bind-submit':dual.bindOk=true;dual.bound=true;persistDual();render();return;
   case 'bind-enter':dual.ready=true;persistDual();state.route='home';render();toast('绑定成功，两个账号的内容已互通');return;
   case 'invite-send':dual.ready=true;persistDual();state.route='home';render();toast('邀请已发出（演示），对方下载后会与你绑定');return;
   case 'invite-skip':dual.ready=true;persistDual();state.route='home';render();return;
   case 'switch':dual.switchOpen=true;render();return;
   case 'switch-close':dual.switchOpen=false;render();return;
   case 'switch-to':dual.role=v;dual.switchOpen=false;persistDual();state.route='home';render();toast(isHelper()?`已切换为协助者 · ${me().name}`:`已切换为讲述者 · ${me().name}`);return;
   case 'switch-reset':dual.role=null;dual.ready=false;dual.switchOpen=false;dual.onboardStep=0;dual.profile={};dual.collab=0;dual.chapterDone=false;persistDual();state.route='home';render();return;
   case 'mat-go':if(v==='voice')return route('voice');if(v==='mphotos')return route('mphotos');return route(v);
   case 'repair-open':state.uploadSheet=false;return route('repair');
   case 'repair-upload':dual.repairStage=1;persistDual();render();return;
   case 'repair-start':runRepair();return;
   case 'repair-redo':dual.repairStage=0;persistDual();render();return;
   case 'repair-save':saveRepaired();return;
   case 'go-record':return route('agent-demo-record');
   case 'sendclue-open':return route('sendclue');
   case 'sendclue-submit':{const t=$('#clue-form textarea');if(t)dual.collabNote=t.value.trim()||dual.collabNote;if(dual.collab<1)dual.collab=1;persistDual();route('home');toast(`线索已发给${dual.profile.nName||'陈建华'}，小忆已代为提问`);return;}
   case 'draftview-open':return route('draftview');
   case 'remind':toast(`已提醒${dual.profile.nName||'陈建华'}（演示）。点右上角头像可切换到 TA 的视角。`);return;
   case 'need-fill':{
     if(v==='voice'||v==='time'||v==='place'||v==='feel'){toast(`这类素材要由${dual.profile.nName||'陈建华'}亲口讲述。小忆已把追问排进下一次提问。`);return;}
     state.uploadSheet=true;render();
     toast(v==='doc'?'上传合同、证件或票据的照片，会先存进文件线索':'选择一张照片上传，会先请本人确认');return;}
   case 'canvas-expand':return route('canvas');
   case 'canvas-arrange':autoArrange();return;
   case 'canvas-hint':dual.canvasHint=!dual.canvasHint;persistDual();render();return;
   case 'canvas-generate':generateChapter();return;
   case 'preview-chapter':state.bookId='work';state.pageIndex=dual.chapterAt||0;return route('reader');
   case 'view-order':if(state.orderDraft)return route('order-done');state.orderBook='work';return route('order');
   case 'preview-followup':openRecord(state.recordFor,dual.lastFollowup||'');return;
   case 'preview-skip-followup':dual.folSkipped=true;persistDual();render();return;
   case 'style':{const label=STYLE_LABELS[el.dataset.id];if(!label)return;
     if(!dual.stylePrefs.includes(label)){dual.stylePrefs.push(label);dual.styleNew=label;persistDual();toast(`小忆已记下「${label}」· 以后整理文稿会参考这种文风`);setTimeout(()=>{dual.styleNew=null;persistDual();if(state.route==='community')render();},1800);render();}else toast('小忆已经学过这种文风了');return;}
   case 'community-follow':window.memoDemo.step('community-follow');return;
   case 'community-chat':window.memoDemo.step('community-chat');return;
  }
});
document.addEventListener('submit',e=>{
  if(e.target.id==='ob-form'){e.preventDefault();obAdvance();}
},true);
/* 协同推进钩子：讲述者确认保存 → 进度+1；保存成品方案 → 完成 */
document.addEventListener('click',e=>{
  const f=e.target.closest('[data-final]');if(!f)return;
  if(f.dataset.final==='xy-voice'){e.preventDefault();e.stopImmediatePropagation();route('ai');setTimeout(()=>{try{startListening()}catch(_){/* 不支持时停留对话页 */}},350);return;}
  if(f.dataset.final==='agent-save'&&dual.collab<2){dual.collab=2;persistDual();}
  if(f.dataset.final==='save-final-order'&&dual.collab<4){dual.collab=4;persistDual();}
},true);

/* ---------- 小忆 · 微信式对话（全端统一组件） ---------- */
function xySay(msg,chips,extra){
  return `<div class="xy-chat"><img class="xy-ava" src="${asset('xiaoyi')}" alt="小忆头像"><div class="xy-bubble"><small>小忆</small><p>${msg}</p>${extra||''}${chips?`<div class="xy-chips">${chips}</div>`:''}</div></div>`;
}
window.xySay=xySay;
/* 各页小忆迷你条 → 气泡 + 气泡内选项 */
assistantMini=function(context,question){
  return xySay(esc(question||'我会安静听你讲。'),`<button class="xy-chip" data-final="ai-open" data-context="${context}">和她聊聊 ›</button><button class="xy-chip" data-final="xy-voice"><img src="assets/ic-mic.png" alt="">直接语音说</button>`);
};
/* 首页小忆问题区：大尺寸话题图卡 + 小忆气泡，分开两块 */
guideCard=function(g){
  return `<div class="guide-card xy-host" data-guide="${esc(g.id)}"><button class="guide-photo big" data-final="select-guide" data-id="${esc(g.id)}"><img src="${guideImg(g)}" alt="${esc(g.title)}"><span class="gp-ov"><small>${esc(g.source)}</small><strong>${esc(g.title)}</strong></span></button>${xySay(`“${esc(g.q)}”`,`<button class="xy-chip sel" data-final="guide-record"><img src="assets/ic-mic.png" alt="">就讲这个</button><button class="xy-chip" data-final="guide-next">换一个</button>`)}</div>`;
};

/* ---------- 深链与启动 ---------- */
const dl=new URLSearchParams(location.search);
if(dl.get('role')==='helper'||dl.get('role')==='narrator'){dual.role=dl.get('role');dual.ready=true;}
if(dl.get('fresh')==='1'){dual.role=null;dual.ready=false;dual.collab=0;dual.chapterDone=false;}
/* 页面深链只在已通过“选择身份”进入后生效，不再绕过身份选择直接进 App */
if(['canvas','repair','mphotos','voice','sendclue','draftview'].includes(dl.get('screen'))&&dual.ready)state.route=dl.get('screen');
persistDual();
render();
})();
