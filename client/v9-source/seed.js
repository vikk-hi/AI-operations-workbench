/* Synthetic pilot data. Product names reuse V6 templates; everything operational is demo-only. */
(function(root){function makeSeed(assets,C){
 const templates=assets.productTemplates.filter(x=>x.platform==='天猫').slice(0,12);
 const dates=['2026-09-15','2026-09-08','2026-09-19','2026-09-03','2026-09-12','2026-08-18','2026-09-02','2026-09-05','2026-09-20','2026-09-01','2026-09-17','2026-09-07'];
 const products=templates.map((p,i)=>({id:p.id,name:p.name,platform:p.platform,shop:'HM演示店铺',concept:p.concept,category:p.category,unit:p.unit,listed:dates[i],article:'DEMO-ARTICLE-'+(i+1),seasonal:i===8?'待核验':'AW26（演示）',stock:i===3?52:360+i*92,pool:(i===1||i===2)?'POOL-SHARED-01':'POOL-'+i,archived:i===4,stageLabel:i===0?'T+7（源输出示意）':i===1?'T+14（源输出示意）':i===2?'T+3（源输出示意）':'阶段输出待接入',sourceState:i===2?'failed':i===8?'unmatched':i===9?'conflict':'success',slice:i===0?'2026-09-20':null,imageRecord:[1,6,7].includes(i),sabRecord:i%3===0,adState:i===2?'读取失败':i===8?'未匹配':i===9?'冲突':i===4?'暂停':i%2?'在推记录':'未匹配',thumbnailType:i%4,demo:true}));
 const daily=[];for(let i=0;i<products.length;i++){const p=products[i];for(let day='2026-08-18';day<='2026-10-08';day=C.addDays(day,1)){if(day<p.listed)continue;const k=C.dayDiff('2026-08-18',day),uv=Math.round((i===2?32:450+i*73)*(1+0.08*Math.sin((k+i)/2))),rate=(.019+i*.0015)*(i===6&&day>'2026-09-14'?1.28:1)*(i===7&&day>'2026-09-20'?1.12:1);const buyers=Math.round(uv*rate);daily.push({productId:p.id,date:day,uv,buyers,gmv:Math.round(buyers*1.15*p.unit),ready:!(i===2&&day==='2026-09-21')});}}
 const users=[{id:'ops',name:'运营专员',role:'operator',dept:'运营',initial:'运'},{id:'design',name:'策划专员',role:'operator',dept:'策划',initial:'策'},{id:'ads',name:'推广专员',role:'operator',dept:'推广',initial:'推'},{id:'merch',name:'商品经理',role:'merch',dept:'商品',initial:'商'},{id:'lead',name:'主管 / 核验人',role:'manager',dept:'统筹',initial:'核'}];
 const plan=(enabled=false)=>({enabled,metric:'cr',baselineDays:7,milestones:[3,7],minUV:500,recipients:['ops','lead'],cadence:'节点报告',version:1});
 function task(n,pi,title,kind,owner,status,extra={}){return {id:'TASK-'+String(n).padStart(3,'0'),productId:pi===null?'':products[pi].id,title,kind,resource:kind==='main_image'?'main_image:1':kind==='video'||kind==='video_check'?'video:main':kind,owner,verifier:'lead',status,priority:n===1?'high':'normal',version:1,artifactVersion:1,artifactContent:n===1?'【演示核查包 v1】\n来源只有切片录制日期；不能据此认定已经上传。\n1. 核查目标商品当前主图视频。\n2. 已上传则提交可核验依据，避免重复上传。\n3. 确认未上传时，在实际授权范围内处理；本Demo不连接平台。':'【演示产物 v1】\n明确目标商品、输入版本和本次要求。\n核对后提交实际执行结果；不得把产物生成当作线上生效。',source:n===1?'新品阶段输出（演示）':n===4?'诊断建议（演示）':'SOP候选（演示）',scenario:'日常',activity:'',requirement:'本任务为交互示例，并非源SOP正式T+阶段派发。请核查对象与产物版本，保留实际操作证据。',requestKey:'DEMO-REQ-'+n,sourceStage:pi===null?'非阶段任务':products[pi].stageLabel,plannedStart:'2026-09-22',plannedEnd:'2026-09-23',observationEnd:'2026-09-30',due:'2026-09-23',syncStatus:'pending',submissions:[],reviews:[],artifacts:[],plan:plan(false),...extra};}
 const tasks=[
 task(1,0,'核查主图视频是否已上线','video_check','ops','queued',{due:'2026-09-22',skill:'主图视频上传 / 核查能力',plan:plan(true)}),
 task(2,1,'主图第1张：场景卖点优化','main_image','design','running',{plan:plan(true),skill:'页面与素材能力'}),
 task(3,1,'评估投放预算调整方案','ad_budget','ads','queued',{plan:plan(true),skill:'推广分析能力'}),
 task(4,3,'复核缺货风险与采购建议','purchase','merch','queued',{priority:'high',skill:'库存诊断能力'}),
 task(5,6,'尺码说明优化与上线核验','size_info','ops','done',{plannedStart:'2026-09-14',plannedEnd:'2026-09-14',observationEnd:'2026-09-21',due:'2026-09-14',effectiveAt:'2026-09-14T12:00:00+08:00',verifiedAt:'2026-09-14T16:00:00+08:00',plan:plan(true),resolution:'executed',syncStatus:'simulated',skill:'页面优化能力'}),
 task(6,7,'主图替换：等待复核版本与线上状态','main_image','ops','review',{plannedStart:'2026-09-20',plannedEnd:'2026-09-20',observationEnd:'2026-09-27',due:'2026-09-22',plan:plan(true),skill:'页面与素材能力'}),
 task(7,2,'推广来源读取失败：核对数据状态','data_check','ops','blocked',{blockedReason:'HM在推表读取失败（演示）；不据此判断未推广。',skill:'数据到数检查'}),
 task(8,5,'历史新品页面核查：保留未完成工作','page_check','ops','running',{due:'2026-09-21',requirement:'商品已退出30天新品LIST，但任务仍保留；不能因列表过滤就删除历史工作。',skill:'页面核查能力'}),
 task(9,1,'另一端口计划替换同一张主图','main_image','ops','queued',{plan:plan(true),requirement:'与策划正在进行的主图1替换形成直接冲突；需要调整排期或撤销重复任务。'}),
 task(10,9,'活动页面商品透出核验','page_check','ops','queued',{scenario:'活动',activity:'秋季主题周（演示）',due:'2026-09-25'}),
 task(11,null,'年度品类目标拆解草稿核对','report','merch','queued',{scenario:'专项',source:'手工临时（演示）',plannedStart:'2026-09-28',plannedEnd:'2026-09-30',due:'2026-09-30'}),
 task(12,8,'新上架商品说明补全','size_info','ops','done',{plannedStart:'2026-09-21',plannedEnd:'2026-09-21',observationEnd:'2026-09-28',effectiveAt:'2026-09-21T12:00:00+08:00',due:'2026-09-21',plan:plan(true),resolution:'executed'})
 ];
 tasks[5].submissions=[{id:'SUB-TASK-006-1',by:'ops',note:'已替换演示素材版本，并登记线上核查依据。',evidence:'演示执行回执（不是真实平台截图）',effectiveAt:'2026-09-20T12:00:00+08:00',submittedAt:'2026-09-20T14:00:00+08:00',artifactVersion:1,outcome:'performed',attachments:[]}];
 for(const t of tasks.filter(x=>x.status==='done')){t.submissions=[{id:'SUB-'+t.id+'-1',by:t.owner,note:'种子数据：演示已执行动作',evidence:'种子数据：演示核验记录',effectiveAt:t.effectiveAt,submittedAt:t.effectiveAt,artifactVersion:1,outcome:'performed',attachments:[]}];t.reviews=[{by:'lead',decision:'approve',note:'演示已核验',at:t.effectiveAt,submissionId:t.submissions[0].id,artifactVersion:1}];}
 const sources=[{id:'newlist',name:'新品基础 / 阶段输出',ref:'来源索引 · 新品基础信息 / 今日阶段清单',status:'success',dataDate:'2026-09-22',readAt:'2026-09-22',note:'展示记录为演示；真实字段与阶段动作未接入。'},
 {id:'sales',name:'生参商品日数据',ref:'来源索引 · 销售数据',status:'success',dataDate:'2026-09-21',readAt:'2026-09-22',note:'确定性样本；完整销售日D与业务日T分开。'},
 {id:'img',name:'主图优化 / SAB LIST',ref:'来源索引 · HM优化 / 指定LIST',status:'success',dataDate:'2026-09-21',readAt:'2026-09-22',note:'有记录不等于完成；来源观察与人员核验分开。'},
 {id:'clip',name:'直播切片跟进',ref:'来源索引 · 切片跟进I列',status:'success',dataDate:'2026-09-21',readAt:'2026-09-22',note:'有效录制日期不能推导已上传。'},
 {id:'ad',name:'推广 HM在推表',ref:'来源索引 · 指定推广多维表',status:'failed',dataDate:'2026-09-20',readAt:'2026-09-22',note:'局部商品失败情景；暂停、未匹配、失败、冲突分别显示。'},
 {id:'core',name:'核心商品周快照',ref:'来源索引 · 全部“核心商品文案”工作表',status:'success',dataDate:'2026-09-21',readAt:'2026-09-22',note:'源SOP按周一刷新；示例保留快照日期。'}];
 let s={schema:'hm-pilot-v7',version:1,clock:'2026-09-22',completeThrough:'2026-09-21',demoDataEnd:'2026-10-08',dataVersion:1,users,products,tasks,daily,sources,policies:[{id:'POL-SEED-1',productId:products[3].id,mode:'stop_purchase',reason:'演示策略：本波段清退，不再新增采购；缺货风险仍保留。',reviewDate:'2026-09-30',by:'merch',version:1,active:true}],events:[],requests:{},reports:[],notifications:[],flags:{macOnline:true,syncFail:false},lastCreated:null};
 s=C.applyCommand(s,'lead',{type:'evaluateAll',requestId:'SEED-EVAL',payload:{}});
 s.events.unshift({id:'EV-SEED',at:'2026-09-22T02:30:00Z',businessDate:'2026-09-22',actor:'system',action:'seed',objectId:'DEMO',detail:'演示任务已准备；没有读取真实飞书表格、执行CLI或派发真实任务。'});
 return s;
}if(typeof module==='object'&&module.exports)module.exports=makeSeed;else root.createHMPilotSeed=makeSeed;
})(typeof globalThis!=='undefined'?globalThis:this);
