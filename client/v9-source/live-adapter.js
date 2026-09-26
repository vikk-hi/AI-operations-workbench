/* This file is inserted inside the original V9 closure. It retains V9 navigation,
   themes and diagnosis while rendering synced business data in the core/task views. */
let liveData=null,liveError=false,localAuth=null,liveRange='day',liveTaskSearch='',liveTaskState='open',liveTaskOwner='',liveWeek='',liveWorkDate='';
let liveFirstCategory='',liveSecondCategory='';
const liveRangeNames={day:'最近完整日','7d':'近7日',mtd:'MTD 本月累计',ytd:'YTD 本年累计'};
const liveMoney=v=>v===null||v===undefined?'—':'¥'+Math.round(v).toLocaleString('zh-CN');
const liveNum=v=>v===null||v===undefined?'—':Math.round(v).toLocaleString('zh-CN');
const livePct=v=>v===null||v===undefined?'—':(v*100).toFixed(2)+'%';
const liveChange=v=>v===null||v===undefined?'数据不足':(v>=0?'+':'')+(v*100).toFixed(1)+'%';
const liveMetric=(data,key)=>data?.metrics.find(x=>x.key===key);
const liveFormat=m=>!m||m.value===null?'—':m.unit==='percent'?livePct(m.value):m.unit==='currency'?liveMoney(m.value):liveNum(m.value);
const liveDate=()=>liveData?.overview?.ranges?.day?.period?.end||'';
const liveTasks=()=>liveData?.tasks?.tasks||[];
const liveEnded=t=>/已完成|已取消|无需执行|结束/.test(t.status);
const liveFiltered=()=>liveTasks().filter(t=>(liveTaskState==='ended'?liveEnded(t):!liveEnded(t))&&(!liveTaskOwner||t.responsiblePeople?.some(p=>p.id===liveTaskOwner))&&(!liveTaskSearch||[t.title,t.id,t.section||''].some(v=>v.toLowerCase().includes(liveTaskSearch.toLowerCase()))));
const liveOwnerNames=t=>t.responsiblePeople?.length?t.responsiblePeople.map(p=>esc(p.name)).join('、'):t.peopleStatus==='unresolved'?'人员待解析':'待分派';
const liveCategoryRows=()=>liveData?.categories?.rows||[];
const liveFirstCategories=()=>[...new Set(liveCategoryRows().map(x=>x.category))].sort((a,b)=>a.localeCompare(b,'zh-CN'));
const liveSecondCategories=()=>[...new Set(liveCategoryRows().filter(x=>!liveFirstCategory||x.category===liveFirstCategory).map(x=>x.categoryII))].sort((a,b)=>a.localeCompare(b,'zh-CN'));
function liveCategoryControls(section){
 const rows=liveCategoryRows(),asOf=liveData?.categories?.asOf;
 return `<section class="panel"><div class="panel-head"><div><h2>BI 类目筛选 · ${section==='industry'?'行业对照':'商品明细'}</h2><p>一级、二级类目按同一 BI 分类层级联动；${asOf?`快照日期 ${esc(asOf)}`:'当前无可用 BI 类目数据'}，并非实时行业排名。</p></div>${B(liveData?.categories?.status==='snapshot'?'历史快照':'不可用','amber')}</div><div class="panel-body"><div class="v9-work-toolbar"><label>一级类目 <select id="liveFirstCategory"><option value="">全部一级类目</option>${liveFirstCategories().map(c=>`<option value="${esc(c)}" ${c===liveFirstCategory?'selected':''}>${esc(c)}</option>`).join('')}</select></label>${section==='industry'?`<label>二级类目 <select id="liveSecondCategory"><option value="">全部二级类目</option>${liveSecondCategories().map(c=>`<option value="${esc(c)}" ${c===liveSecondCategory?'selected':''}>${esc(c)}</option>`).join('')}</select></label>`:''}</div>${section==='industry'?`<div class="table-wrap"><table><thead><tr><th>一级类目</th><th>二级类目</th><th>支付金额</th><th>占比</th><th>日环比</th><th>同比</th><th>定位</th></tr></thead><tbody>${rows.filter(x=>(!liveFirstCategory||x.category===liveFirstCategory)&&(!liveSecondCategory||x.categoryII===liveSecondCategory)).map(x=>`<tr><td>${esc(x.category)}</td><td>${esc(x.categoryII)}</td><td>${liveMoney(x.gmv)}</td><td>${livePct(x.share)}</td><td>${liveChange(x.dayChange)}</td><td>${liveChange(x.yearChange)}</td><td><button class="plain-link" data-live-act="category" data-first="${esc(x.category)}" data-second="${esc(x.categoryII)}">查看</button></td></tr>`).join('')||'<tr><td colspan="7" class="empty">该范围无 BI 快照数据。</td></tr>'}</tbody></table></div>`:'<p class="meta">当前 BI TOP 单品没有返回可用行；下方仍是 V9 演示商品，不代表已接入全店商品。</p>'}</div></section>`;
}

function liveTrend(data){
 const rows=liveData.overview.daily.filter(x=>x.date>=data.period.start&&x.date<=data.period.end).slice(-30);
 if(!rows.length)return '<div class="empty">所选范围暂无可用的每日走势。</div>';
 const max=Math.max(1,...rows.flatMap(x=>[x.gmv||0,x.target||0])),W=740,H=170;
 const px=i=>40+i*680/Math.max(1,rows.length-1),py=v=>137-v/max*108;
 const line=key=>{let groups=[],points=[];rows.forEach((row,i)=>{const v=row[key];if(v===null){if(points.length)groups.push(points.join(' '));points=[];}else points.push(px(i)+','+py(v));});if(points.length)groups.push(points.join(' '));return groups.map(p=>`<polyline points="${p}" fill="none" stroke="${key==='gmv'?'var(--blue)':'var(--sub)'}" stroke-width="${key==='gmv'?2.5:1.5}" ${key==='gmv'?'':'stroke-dasharray="5 5"'}/>`).join('');};
 const dots=rows.flatMap((row,i)=>['target','gmv'].filter(key=>row[key]!==null).map(key=>`<circle cx="${px(i)}" cy="${py(row[key])}" r="${rows.length===1?5:3}" fill="${key==='gmv'?'var(--blue)':'var(--sub)'}"/>`)).join('');
 return `<svg class="v9-trend" viewBox="0 0 ${W} ${H}" role="img" aria-label="真实支付金额与日目标走势">${[0,.5,1].map(v=>`<line x1="40" x2="725" y1="${py(max*v)}" y2="${py(max*v)}" stroke="var(--line)"/><text x="0" y="${py(max*v)+3}" font-size="10" fill="var(--sub)">${(max*v/10000).toFixed(1)}万</text>`).join('')}${line('target')}${line('gmv')}${dots}<text x="40" y="160" font-size="10" fill="var(--sub)">${rows[0].date.slice(5)}</text><text x="720" y="160" text-anchor="end" font-size="10" fill="var(--sub)">${rows.at(-1).date.slice(5)}</text></svg><div class="v9-chart-legend"><span><i></i>支付实际</span><span><i class="dashed"></i>日目标</span><small>缺日断线；单位：元</small></div>`;
}

function liveTargetsPanel(){
 const data=liveData?.targets;if(!data)return notice('公司与品牌目标来源正在读取。','amber');
 const c=data.company,b=data.brand,d=data.d11;
 const rate=(actual,target)=>actual!==null&&target>0?livePct(actual/target):'—';
 return panel('公司目标 · 不含购物金 GMV / NET','与品牌逐日目标分开。MTD 对照整月目标；YTD 对照截至当前月的月目标合计。',`<div class="table-wrap"><table class="v9-target-table"><thead><tr><th>范围</th><th>GMV 实际 / 目标</th><th>GMV 达成</th><th>NET 实际 / 目标</th><th>NET 达成</th></tr></thead><tbody>${[['MTD',c.mtd],['YTD',c.ytd]].map(([label,row])=>`<tr><td><b>${label}</b></td><td>${liveMoney(row.gmvActual)} / ${liveMoney(row.gmvTarget)}</td><td>${rate(row.gmvActual,row.gmvTarget)}</td><td>${liveMoney(row.netActual)} / ${liveMoney(row.netTarget)}</td><td>${rate(row.netActual,row.netTarget)}</td></tr>`).join('')}</tbody></table></div><div class="table-foot">${esc(c.source)}。NET 实际暂取天猫日报 Book sales Net；真实刷新状态待核验。</div>`)+
 panel('品牌日目标 · 10 月待确认','与公司目标是两套口径；本次仅以公司 10 月目标作为暂行拆解输入。',`<div class="panel-body"><p>biz plan目标副本：${b.october.length} 个日期，状态 ${b.status==='empty'?'31 日目标尚未填写':b.status==='complete'?'31 日五项指标已有值，仍须审核':'部分日期已填，暂不可确认'}。</p><p>公司 10 月目标参考：GMV ${liveMoney(c.october.gmvTarget)}；NET ${liveMoney(c.october.netTarget)}。源表小数精度未完整保留，正式回填须重新读取原始精确值。</p><p>D11 抢先购 ${d.start}—${d.end}：${d.gmvTarget===null?'五日目标待制定/审核':`五日 GMV ${liveMoney(d.gmvTarget)}，待独立人工确认`}。</p></div>`);
}

function liveCoreView(){
 if(liveError)return head('01 / CORE BUSINESS','核心数据','数据连接暂不可用。')+notice('无法读取妙搭数据库，请刷新后重试。','red');
 if(!liveData)return head('01 / CORE BUSINESS','核心数据','正在读取多维表副本…')+notice('正在加载真实经营数据。');
 const data=liveData.overview.ranges[liveRange],gmv=liveMetric(data,'gmv'),uv=liveMetric(data,'uv'),cvr=liveMetric(data,'cvr'),aov=liveMetric(data,'aov');
 const selected=Object.entries(liveRangeNames).map(([key,label])=>`<option value="${key}" ${key===liveRange?'selected':''}>${label}</option>`).join('');
 return head('01 / CORE BUSINESS','核心数据','按完整日期看目标与差异；经营数据来自多维表副本。',btn('查看店铺诊断','nav','data-view="diagnostic"','','arrow'))+
 `<div class="v9-context"><div><span class="meta">经营范围</span><b>天猫</b>${B('2026 / 2025 日报','blue')}</div><div><span class="meta">最近完整数据日 ${esc(liveDate())} · 副本快照，同步状态待核验</span><a href="${esc(liveData.overview.sourceUrl)}" target="_blank" rel="noreferrer">数据来源</a></div></div>`+
 liveTargetsPanel()+
 `<div class="v9-periodbar"><label>观察周期<select id="livePeriod">${selected}</select></label><span class="meta">${esc(data.period.start||'—')} — ${esc(data.period.end||'—')}</span><span class="v9-divider"></span><span class="meta">以下指标默认同时展示目标、同比和上一等长周期环比。</span></div>`+
 `<div class="v9-core-grid"><section class="panel v9-primary-kpi"><div class="panel-head"><div><h2>所选周期 · 支付金额</h2><p>${esc(data.period.start||'—')} — ${esc(data.period.end||'—')} · 天猫真实数据</p></div>${B('副本同步','blue')}</div><div class="panel-body"><div class="v9-big-value">${liveMoney(gmv?.value)}</div><div class="v9-change">${B('同比 '+liveChange(gmv?.yoy),gmv?.yoy<0?'red':'blue')}<span>环比 ${liveChange(gmv?.mom)}</span></div><div class="v9-mini-kpis"><div><small>所选期目标达成</small><b>${livePct(gmv?.targetRate)}</b></div><div><small>实际 − 累计计划</small><b class="${gmv?.value<gmv?.target?'text-red':''}">${gmv?.value!==null&&gmv?.target!==null?liveMoney(gmv.value-gmv.target):'—'}</b></div><div><small>数据覆盖</small><b>${data.period.days}<em>天</em></b></div></div></div></section>${panel('目标与实际走势','支付金额与日目标按相同日期展示；缺失日期不会补零。',`<div class="panel-body">${liveTrend(data)}</div>`)}</div>`+
 panel('目标进度 · 不同周期，不混加','完整日、近7日、MTD和YTD按同一数据截止日汇总。',`<div class="table-wrap"><table class="v9-target-table"><thead><tr><th>观察范围</th><th>累计实际</th><th>截至同日计划</th><th>目标达成</th><th>同比</th><th>环比</th><th>状态</th></tr></thead><tbody>${Object.entries(liveRangeNames).map(([key,label])=>{const x=liveData.overview.ranges[key],m=liveMetric(x,'gmv');return `<tr><td><button class="plain-link" data-live-act="range" data-range="${key}"><b>${label}</b></button><div class="meta">${x.period.start||'—'}—${x.period.end||'—'}</div></td><td>${liveMoney(m?.value)}</td><td>${liveMoney(m?.target)}</td><td>${livePct(m?.targetRate)}</td><td>${liveChange(m?.yoy)}</td><td>${liveChange(m?.mom)}</td><td>${B(x.warnings.length?'部分比较不足':'副本快照','amber')}</td></tr>`;}).join('')}<tr><td><b>活动累计</b></td><td colspan="5" class="meta">待指定活动起止日期和目标口径</td><td>${B('待配置','amber')}</td></tr></tbody></table></div>`)+
 `<section class="panel v9-formula-panel"><div class="panel-head"><div><h2>黄金公式 · 同范围访客与买家</h2><p>周期转化率 = 买家数 ÷ UV；客单价 = GMV ÷ 买家数。各项的目标与比较见下表。</p></div></div><div class="v9-formula"><div><small>支付金额</small><b>${liveFormat(gmv)}</b></div><i>=</i><div><small>周期访客 UV</small><b>${liveFormat(uv)}</b></div><i>×</i><div><small>支付买家转化率</small><b>${liveFormat(cvr)}</b></div><i>×</i><div><small>买家客单价</small><b>${liveFormat(aov)}</b></div></div></section>`+
 panel('指标明细 · 目标 / 同比 / 环比','源表未配置目标的指标显示“未配置”，缺少可比周期显示“数据不足”。',`<div class="table-wrap"><table class="v9-target-table"><thead><tr><th>指标</th><th>实际</th><th>目标</th><th>目标达成</th><th>同比</th><th>环比</th></tr></thead><tbody>${data.metrics.map(m=>`<tr><td><b>${esc(m.label)}</b></td><td>${liveFormat(m)}</td><td>${m.target===null?'未配置':m.unit==='percent'?livePct(m.target):m.unit==='currency'?liveMoney(m.target):liveNum(m.target)}</td><td>${livePct(m.targetRate)}</td><td>${liveChange(m.yoy)}</td><td>${liveChange(m.mom)}</td></tr>`).join('')}</tbody></table></div>`)+
 (data.warnings.length?notice(data.warnings.map(esc).join('；'),'amber'):'')+
 `<div class="v9-focus-strip"><div>${ico('search')}<span><b>从差额到处理</b><small>按品类、流量、转化、客单到具体商品逐层排查。</small></span>${btn('定位差异','nav','data-view="diagnostic"','text')}</div><div>${ico('task')}<span><b>任务处理</b><small>执行任务从复制后的多维表持续同步。</small></span>${btn('查看待办','nav','data-view="tasks"','text')}</div></div>`;
}

function liveTaskView(){
 if(liveError)return head('03 / ACTION WORKSPACE','待办事项','任务数据暂不可用。')+notice('无法读取妙搭数据库，请刷新后重试。','red');
 if(!liveData)return head('03 / ACTION WORKSPACE','待办事项','正在读取多维表副本…')+notice('正在加载任务台账。');
 const rows=liveFiltered(),open=liveTasks().filter(t=>!liveEnded(t)),ended=liveTasks().filter(liveEnded);
 const owners=[...new Map(liveTasks().flatMap(t=>t.responsiblePeople||[]).map(p=>[p.id,p])).values()].sort((a,b)=>a.name.localeCompare(b.name,'zh-CN'));
 return head('03 / ACTION WORKSPACE','待办事项','同一任务只展示一条记录；计划开始和截止日期按源表展示。')+
 `<div class="v9-work-toolbar"><div class="segmented"><button class="on">团队与流程</button></div><div class="segmented secondary"><button data-live-act="task-state" data-state="open" class="${liveTaskState==='open'?'on':''}">当前待办</button><button data-live-act="task-state" data-state="ended" class="${liveTaskState==='ended'?'on':''}">已结束</button></div><input type="search" id="liveTaskSearch" aria-label="搜索任务" placeholder="搜索任务 / 板块" value="${esc(liveTaskSearch)}"><label class="meta">负责人 <select id="liveTaskOwner" aria-label="筛选负责人"><option value="">全部负责人</option>${owners.map(p=>`<option value="${esc(p.id)}" ${p.id===liveTaskOwner?'selected':''}>${esc(p.name)}</option>`).join('')}</select></label><span class="meta">来自执行任务副本 · ${liveTasks().length} 条</span></div>`+
 `<div class="v9-work-stats"><button data-live-act="task-state" data-state="open"><small>当前待办</small><b>${open.length}</b><span>已同步任务</span></button><button data-live-act="task-state" data-state="ended"><small>已结束</small><b>${ended.length}</b><span>不计入当前待办</span></button><button data-live-act="task-state" data-state="open"><small>未设截止日期</small><b>${open.filter(t=>!t.endDate).length}</b><span>不补造 DDL</span></button><button data-live-act="tasks-calendar"><small>计划开始日期</small><b>${open.filter(t=>t.startDate).length}</b><span>可在周日历查看</span></button></div>`+
 `<section class="panel"><div class="table-wrap"><table class="v9-task-table"><thead><tr><th>任务 / 对象</th><th>板块</th><th>状态</th><th>计划开始 → DDL</th><th>负责人</th><th>来源</th></tr></thead><tbody>${rows.map(t=>`<tr><td><b>${esc(t.title)}</b><div class="meta mono">${esc(t.id)}</div></td><td>${esc(t.section||'未分组')}</td><td>${B(t.status,t.status==='已完成'?'green':t.status==='进行中'?'blue':'gray')}</td><td class="nowrap">${esc(t.startDate||'未排期')} → ${esc(t.endDate||'未设置')}</td><td class="meta">${liveOwnerNames(t)}</td><td><a href="${esc(liveData.tasks.source.tasksUrl)}" target="_blank" rel="noreferrer">打开副本</a></td></tr>`).join('')||'<tr><td colspan="6" class="empty">当前没有匹配任务。</td></tr>'}</tbody></table></div></section>`+
 `<p class="source-ref">新建、改期、回执写回和负责人消息触达尚未启用；此处仅展示真实台账。V9的演示任务与工具仍可在其他演示页面体验。</p>`+
 panel('策划事项模板','来自另一份多维表副本，用于后续新建任务时选择工作项。',`<div class="table-wrap"><table><thead><tr><th>工作项</th><th>场景</th><th>频率</th><th>已登记 Skill</th></tr></thead><tbody>${liveData.tasks.templates.map(t=>`<tr><td>${esc(t.title)}</td><td>${esc(t.scene||'—')}</td><td>${esc(t.frequency||'按需')}</td><td>${esc(t.skills.join('、')||'—')}</td></tr>`).join('')}</tbody></table></div>`);
}

function liveTimelineView(){
 if(liveError)return head('SOP PROGRESS','流程进度','活动时间线暂不可用。')+notice('无法读取妙搭数据库，请刷新后重试。','red');
 const timeline=liveData?.timeline;
 if(!timeline)return head('SOP PROGRESS','流程进度','正在读取 D11 抢先购时间线…');
 const rows=timeline.rows||[],selected=rows.find(row=>row.selectedForTest),complete=rows.filter(row=>row.completed).length;
 const target=liveData?.targets?.d11;
 return head('SOP PROGRESS','D11 抢先购 · 活动进度','按活动日期 2026-10-15—10-19 归属；事项保留原计划日期，不据此推断执行状态。')+
 notice('本页读取活动时间线副本，尚未接通工作台确认及回写。目标审核、任务通知和璇玑运行状态不能在此假装完成。','amber')+
 `<div class="v9-work-stats"><div><small>活动事项</small><b>${rows.length}</b><span>来自时间线副本</span></div><div><small>源表已完成</small><b>${complete}</b><span>仅按源表标记统计</span></div><div><small>目标制定测试节点</small><b>${selected?'1':'0'}</b><span>仅一条进入本次案例</span></div><div><small>D11 五日目标</small><b>${target?.gmvTarget==null?'待定':liveMoney(target.gmvTarget)}</b><span>未确认前不生效</span></div></div>`+
 panel('大促活动目标制定 · 待人工确认','按公司 10 月 GMV / NET 目标暂行拆解；正式活动目标仍需榅桲确认。',`<div class="panel-body"><p>活动归属：2026-10-15—10-19。${selected?`对应源记录 ${esc(selected.recordId)}；本次测试指定负责人：榅桲。`:'源表未找到目标制定事项。'}</p><p>当前状态：${target?.status==='ready-for-review'?'目标已有完整日值，但仍未在工作台确认':'目标尚未形成可确认的完整日值'}。工作台尚无审核写回能力，因此此处只显示待确认，不提供失效的确认按钮。</p></div>`)+
 panel('活动时间线','源表人员与事项日期如实展示；“测试负责人”仅代表本次案例约定，不改动源表人员。',`<div class="table-wrap"><table class="v9-target-table"><thead><tr><th>事项</th><th>计划开始 → 截止</th><th>源表负责人</th><th>本次案例</th><th>源表状态</th></tr></thead><tbody>${rows.map(row=>`<tr><td><b>${esc(row.item)}</b><div class="meta mono">${esc(row.recordId)}</div></td><td>${esc(row.itemStart||'未设置')} → ${esc(row.itemEnd||'未设置')}</td><td>${esc(row.sourceOwnerName||'待分派')}</td><td>${row.selectedForTest?B('榅桲 · 目标制定','blue'):'—'}</td><td>${B(row.completed?'已标记完成':'未标记完成',row.completed?'green':'gray')}</td></tr>`).join('')||'<tr><td colspan="5" class="empty">暂无 D11 时间线事项。</td></tr>'}</tbody></table></div><div class="table-foot">${rows.length} 条源记录；目标制定的重复模板只选一条用于案例，不删除或改写另一条。</div>`)+
 `<p class="source-ref"><a href="${esc(timeline.source)}" target="_blank" rel="noreferrer">查看时间线副本</a> · 读取快照，不代表实时运行或审核结果。</p>`;
}

function liveCalendarView(){
 if(!liveData)return head('03 / WEEK PLANNING','周日历','正在读取任务排期…');
 const base=liveWeek||liveDate(),m=new Date(base+'T00:00:00Z');m.setUTCDate(m.getUTCDate()-(m.getUTCDay()+6)%7);const days=Array.from({length:7},(_,i)=>{const d=new Date(m);d.setUTCDate(d.getUTCDate()+i);return d.toISOString().slice(0,10);});
 return head('03 / WEEK PLANNING','周日历','根据多维表里的计划开始和截止日期展示；缺失的 DDL 不推断。')+
 `<div class="v9-calendar-toolbar"><div><button class="btn small" data-live-act="week" data-step="-7">上一周</button><button class="btn small" data-live-act="week" data-step="0">本周</button><button class="btn small" data-live-act="week" data-step="7">下一周</button></div><b>${days[0]} — ${days[6]}</b><span class="meta">只读排期；跨日任务展示在计划区间。</span></div>`+
 `<div class="v9-week-grid">${days.map((day,i)=>{const rows=liveTasks().filter(t=>!liveEnded(t)&&t.startDate&&t.startDate<=day&&(!t.endDate||t.endDate>=day));return `<section class="v9-day ${day===liveDate()?'today':''}"><header><span>${['周一','周二','周三','周四','周五','周六','周日'][i]}</span><b>${day.slice(5)}</b><small>${rows.length} 项</small></header><div class="v9-day-body">${rows.map(t=>`<article class="v9-calendar-task"><b>${esc(t.title)}</b><span>${esc(t.section||'未分组')}</span><span>${esc(t.startDate)} → ${esc(t.endDate||'DDL 未设置')}</span>${B(t.status,'blue')}</article>`).join('')||'<p class="meta empty-day">暂无排期</p>'}</div></section>`;}).join('')}</div>`;
}

function liveWorkloadView(){
 if(!liveData)return head('03 / TEAM CAPACITY','团队负荷','正在读取任务安排…');
 const date=liveWorkDate||liveDate(),rows=liveTasks().filter(t=>!liveEnded(t)&&t.startDate&&t.startDate<=date&&(!t.endDate||t.endDate>=date));
 const groups=new Map(),ownerNames=new Map();rows.forEach(t=>{const owners=t.responsiblePeople?.length?t.responsiblePeople:[{id:'未分派',name:t.peopleStatus==='unresolved'?'人员待解析':'待分派'}];owners.forEach(p=>{ownerNames.set(p.id,p.name);if(!groups.has(p.id))groups.set(p.id,[]);groups.get(p.id).push(t);});});
 return head('03 / TEAM CAPACITY','团队每日负荷','按负责人和计划日期汇总已登记任务；源表没有预计分钟时不推算工时。')+
 `<div class="v9-work-toolbar"><label>查看日期 <input type="date" id="liveWorkDate" value="${esc(date)}"></label><span class="meta">仅统计有计划开始日期、且当前未结束的任务。</span></div>`+
 panel('人员 × 所选日期','主责任务数来自多维表；协作、人工分钟和核验口径仍待接入。',`<div class="table-wrap"><table class="v9-load-table"><thead><tr><th>负责人</th><th>计划任务</th><th>预计人工投入</th><th>待确认</th><th>仍需处理</th></tr></thead><tbody>${[...groups].map(([id,tasks])=>`<tr><td>${esc(ownerNames.get(id)||'人员待解析')}</td><td><b>${tasks.length}</b> 项</td><td class="meta">未提供</td><td>${tasks.filter(t=>t.status==='待确认').length}</td><td>${tasks.filter(t=>!liveEnded(t)).length}</td></tr>`).join('')||'<tr><td colspan="5" class="empty">这一天暂无已登记排期。</td></tr>'}</tbody></table></div>`)+notice('未提供协作投入与日终冻结快照；这些数字暂不可用于工时或绩效判断。','amber');
}

function liveSourcesView(){
 const sources=liveData?.sources?.sources||[];
 return head('DATA & RULES','数据与规则','当前已接入的数据副本及后续切换规则；原多维表保持不变。')+
 panel('当前数据源','经营和任务使用复制后的多维表；同步是读取，不代表任务写回已经启用。',`<div class="table-wrap"><table class="v9-target-table"><thead><tr><th>模块</th><th>当前表</th><th>接入方式</th><th>原表</th><th>入口</th></tr></thead><tbody>${sources.map(s=>`<tr><td><b>${esc(s.label)}</b></td><td>${esc(s.tableName)}</td><td>${B(s.mode==='demo'?'演示数据':'持续同步',s.mode==='demo'?'amber':'blue')}</td><td>${s.readOnlyOriginal?'不改动':'—'}</td><td>${s.baseUrl?`<a href="${esc(s.baseUrl)}" target="_blank" rel="noreferrer">打开副本</a>`:'待接入'}</td></tr>`).join('')||'<tr><td colspan="5" class="empty">正在读取数据源配置…</td></tr>'}</tbody></table></div>`)+
 panel('更换多维表','未来由你选择目标表；选择前先复制候选表、检查字段和权限，再启用新连接。',`<div class="panel-body"><p>${esc(liveData?.sources?.replacementRule||'正在加载切换规则…')}</p><p>当前版本尚未提供自助切换按钮，也不会对原表写入。任务创建、改期、反馈写回及负责人触达仍待后续接通。</p></div>`);
}

const v9RenderChrome=renderChrome,v9Footer=footer;
const v9IndustryView=industryView,v9ProductsView=productsView,v9ViewRows=viewRows;
viewRows=function(){
 const rows=v9ViewRows();
 if(U.view!=='products'||!liveFirstCategory)return rows;
 const allowed=new Set(liveCategoryRows().filter(x=>x.category===liveFirstCategory).map(x=>x.categoryII));
 return rows.filter(row=>allowed.has(row.product.category));
};
industryView=function(){
 const matchingDemo=S.market.categories.some(x=>x.name===liveSecondCategory);
 if(matchingDemo&&U.marketCategory!==liveSecondCategory){U.marketCategory=liveSecondCategory;U.marketMerchant='';U.marketTag='';}
 return liveCategoryControls('industry')+
 `<p class="source-ref">下方行业排名及竞争详情为 V9 演示数据；${matchingDemo?'已按同名二级类目定位演示详情，不与 BI 快照合并统计。':'当前筛选与演示类目未建立可靠映射，不据此生成行业结论。'}</p>`+
 (matchingDemo||!liveSecondCategory?v9IndustryView():notice('没有对应的演示行业详情。请查看上方 BI 快照；正式行业数据仍待接入。','amber'));
};
productsView=function(){return liveCategoryControls('products')+v9ProductsView();};
renderChrome=function(){v9RenderChrome();const liveView=['core','tasks','calendar','workload','sop','runs'].includes(U.view);if(liveView){const date=$('#topbar .top-date');if(date)date.textContent='最近完整数据日 '+(liveDate()||'加载中');const badge=$('#topbar .top-actions .badge');if(badge){badge.textContent=liveData?'副本 · 刷新待核验':'正在连接';badge.className='badge amber';}const viewer=localAuth?.authenticated?{...localAuth.user,role:'personal'}:liveData?.tasks?.viewer;const role=$('#topbar .top-role');if(role){if(viewer)role.innerHTML=`<span class="avatar">${esc(viewer.name.slice(0,1))}</span><div><label>当前登录 · ${localAuth?.authenticated?'飞书真实身份':viewer.role==='developer'?'工作台开发':'个人'}</label><br><b>${esc(viewer.name)}</b>${localAuth?.authenticated?' · <button class="plain-link" data-live-act="feishu-logout">退出</button>':''}</div>`;else if(localAuth?.configured)role.innerHTML='<span class="avatar">?</span><div><label>真实身份待确认</label><br><button class="plain-link" data-live-act="feishu-login">使用飞书登录</button></div>';else if(localAuth)role.innerHTML='<span class="avatar">?</span><div><label>本地登录待配置</label><br><b>请配置飞书应用凭证</b></div>';else role.innerHTML='<span class="avatar">?</span><div><label>真实身份待确认</label><br><b>正在检查飞书登录</b></div>';}const newTask=$('#topbar [data-act="create-task"]');if(newTask){newTask.textContent='演示新建任务';newTask.title='当前仅使用 V9 本机演示任务，不写入真实多维表';}const count=$('#sidebar .navbtn .count');if(count&&liveData)count.textContent=liveTasks().filter(t=>!liveEnded(t)).length;const note=$('#sidebar .sidebar-context');if(note)note.innerHTML='<span class="dot"></span> 经营按完整日更新<br><small>任务副本刷新状态待核验</small>';}};
footer=function(){return ['core','tasks','calendar','workload','sop','runs'].includes(U.view)?'<div class="footnote">V9 界面 · 核心数据、任务台账及 D11 时间线来自副本<br>店铺诊断、Skill、通知和 V9 任务操作仍为演示；正式写回尚未接通</div>':v9Footer();};
coreView=liveCoreView;tasksView=liveTaskView;calendarView=liveCalendarView;workloadView=liveWorkloadView;sopView=liveTimelineView;runsView=liveSourcesView;
window.addEventListener('hm-live-ready',e=>{liveData=e.detail;liveError=false;liveWeek=liveDate();liveWorkDate=liveDate();render();});
window.addEventListener('hm-live-error',()=>{liveError=true;render();});
window.addEventListener('hm-auth-ready',e=>{localAuth=e.detail;render();});
window.addEventListener('hm-auth-error',()=>{localAuth={configured:false,unavailable:true};render();});
document.addEventListener('click',e=>{const b=e.target.closest('[data-live-act]');if(!b)return;const act=b.dataset.liveAct;if(act==='feishu-login'){window.location.href=`${window.location.protocol}//${window.location.hostname}:3001/auth/login`;}if(act==='feishu-logout'){fetch(`${window.location.protocol}//${window.location.hostname}:3001/auth/logout`,{method:'POST',credentials:'include'}).then(()=>window.location.reload());}if(act==='range'){liveRange=b.dataset.range;render();}if(act==='task-state'){liveTaskState=b.dataset.state;render();}if(act==='tasks-calendar'){nav('calendar');}if(act==='category'){liveFirstCategory=b.dataset.first;liveSecondCategory=b.dataset.second;render();}if(act==='week'){const step=Number(b.dataset.step);if(step===0)liveWeek=liveDate();else{const d=new Date((liveWeek||liveDate())+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+step);liveWeek=d.toISOString().slice(0,10);}render();}},true);
document.addEventListener('change',e=>{if(e.target.id==='livePeriod'){liveRange=e.target.value;render();}if(e.target.id==='liveTaskOwner'){liveTaskOwner=e.target.value;render();}if(e.target.id==='liveWorkDate'){liveWorkDate=e.target.value;render();}if(e.target.id==='liveFirstCategory'){liveFirstCategory=e.target.value;liveSecondCategory='';render();}if(e.target.id==='liveSecondCategory'){liveSecondCategory=e.target.value;render();}},true);
document.addEventListener('input',e=>{if(e.target.id==='liveTaskSearch'){const value=e.target.value;liveTaskSearch=value;const pos=e.target.selectionStart;render();const input=$('#liveTaskSearch');input?.focus();input?.setSelectionRange(pos,pos);}},true);
