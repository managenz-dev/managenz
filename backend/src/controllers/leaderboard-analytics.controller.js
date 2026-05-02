const prisma = require("../utils/prisma");

function getDateBoundary(period) {
  const now = new Date();
  if (period === "daily")   { const d = new Date(now); d.setHours(0,0,0,0); return d; }
  if (period === "weekly")  { const d = new Date(now); d.setDate(d.getDate()-7); return d; }
  if (period === "monthly") { const d = new Date(now); d.setMonth(d.getMonth()-1); return d; }
  return null;
}
function computeDiffStats(arr) {
  return {
    count:    arr.length,
    avgScore: arr.length > 0 ? Math.round(arr.reduce((a,b)=>a+b,0)/arr.length) : 0,
    best:     arr.length > 0 ? Math.max(...arr) : 0,
  };
}

// ─── Leaderboard ──────────────────────────────────────────────────────────────
exports.getLeaderboard = async (req, res, next) => {
  try {
    const { period = "alltime" } = req.query;
    const me = await prisma.user.findUnique({ where:{ id:req.user.id }, select:{ selectedDomain:true } });
    if (!me?.selectedDomain) return res.status(400).json({ success:false, message:"No domain selected" });

    const dateBoundary = getDateBoundary(period);
    const sessions = await prisma.simulationSession.findMany({
      where: {
        status: "COMPLETED",
        user:   { selectedDomain: me.selectedDomain },
        score:  { isNot: null },
        ...(dateBoundary ? { completedAt: { gte: dateBoundary } } : {}),
      },
      include: {
        score:   true,
        user:    { select:{ id:true, name:true, avatarUrl:true } },
        useCase: { select:{ title:true, difficulty:true } },
      },
      orderBy: { completedAt:"desc" },
    });

    const userMap = {};
    for (const s of sessions) {
      const uid = s.user.id;
      if (!userMap[uid]) userMap[uid] = { userId:uid, name:s.user.name, avatarUrl:s.user.avatarUrl, scores:[], completed:0, lastActive:s.completedAt };
      if (s.score?.overallScore!=null) userMap[uid].scores.push(s.score.overallScore);
      userMap[uid].completed++;
      if (s.completedAt > userMap[uid].lastActive) userMap[uid].lastActive = s.completedAt;
    }
    const leaderboard = Object.values(userMap)
      .filter(u=>u.scores.length>0)
      .map(u=>({ userId:u.userId, name:u.name, avatarUrl:u.avatarUrl, avgScore:Math.round(u.scores.reduce((a,b)=>a+b,0)/u.scores.length), bestScore:Math.max(...u.scores), completed:u.completed, lastActive:u.lastActive, isMe:u.userId===req.user.id }))
      .sort((a,b)=>b.avgScore-a.avgScore||b.completed-a.completed);

    return res.json({ success:true, data:{ leaderboard, period, domain:me.selectedDomain, myRank:leaderboard.findIndex(u=>u.isMe)+1||null } });
  } catch (err) { next(err); }
};

// ─── Analytics ────────────────────────────────────────────────────────────────
// FIX: removed selectedDomain guard — now always queries by userId directly
exports.getMyAnalytics = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const user   = await prisma.user.findUnique({ where:{ id:userId }, select:{ name:true, selectedDomain:true } });

    const allSessions = await prisma.simulationSession.findMany({
      where:  { userId },
      select: { status:true, createdAt:true, completedAt:true },
    });

    // Return empty only if truly no sessions at all
    if (allSessions.length === 0) {
      return res.json({ success:true, data:{ overview:{ total:0,completed:0,inProgress:0,avgScore:0,bestScore:0,lowestScore:0,trend:"neutral",trendPercent:0,percentile:0,completionRate:0 }, scoreOverTime:[],weeklyData:[],radarData:[],difficultyData:[],scoreDistribution:[],recentSessions:[],empty:true } });
    }

    const sessions = await prisma.simulationSession.findMany({
      where:   { userId, status:"COMPLETED", score:{ isNot:null } },
      include: { score:true, useCase:{ select:{ title:true, slug:true, difficulty:true } } },
      orderBy: { completedAt:"asc" },
    });

    const total       = allSessions.length;
    const completed   = sessions.length;
    const inProgress  = allSessions.filter(s=>s.status==="IN_PROGRESS").length;
    const scores      = sessions.map(s=>s.score.overallScore);
    const avgScore    = scores.length>0 ? Math.round(scores.reduce((a,b)=>a+b,0)/scores.length) : 0;
    const bestScore   = scores.length>0 ? Math.max(...scores) : 0;
    const lowestScore = scores.length>0 ? Math.min(...scores) : 0;

    let trend="neutral", trendPercent=0;
    if (scores.length>=4) {
      const half=Math.floor(scores.length/2), firstH=scores.slice(0,half).reduce((a,b)=>a+b,0)/half, secondH=scores.slice(half).reduce((a,b)=>a+b,0)/(scores.length-half);
      trendPercent=Math.round(((secondH-firstH)/firstH)*100);
      trend=secondH>firstH+3?"improving":secondH<firstH-3?"declining":"stable";
    }

    const scoreOverTime = sessions.map((s,i)=>({ index:i+1, label:s.useCase.title.length>18?s.useCase.title.slice(0,18)+"…":s.useCase.title, fullTitle:s.useCase.title, score:s.score.overallScore, date:s.completedAt?new Date(s.completedAt).toLocaleDateString("en-IN",{day:"numeric",month:"short"}):"", difficulty:s.useCase.difficulty }));

    const weeklyData=[];
    for (let w=7;w>=0;w--) {
      const ws=new Date(); ws.setDate(ws.getDate()-w*7); ws.setHours(0,0,0,0);
      const we=new Date(ws); we.setDate(we.getDate()+7);
      const wk=sessions.filter(s=>{const d=new Date(s.completedAt);return d>=ws&&d<we;});
      const wsc=wk.map(s=>s.score.overallScore);
      weeklyData.push({ week:"W"+(8-w), label:ws.toLocaleDateString("en-IN",{day:"numeric",month:"short"}), count:wk.length, avgScore:wsc.length>0?Math.round(wsc.reduce((a,b)=>a+b,0)/wsc.length):0 });
    }

    const dimFields=[{key:"financialPrudence",label:"Financial"},{key:"stakeholderAlignment",label:"Stakeholder"},{key:"riskManagement",label:"Risk Mgmt"},{key:"leadershipCredibility",label:"Leadership"},{key:"teamMorale",label:"Team Morale"},{key:"strategicClarity",label:"Strategy"}];
    const dimTotals={},dimCounts={};
    for (const s of sessions) { for (const{key}of dimFields){ const v=s.score[key]; if(v!=null){dimTotals[key]=(dimTotals[key]||0)+v;dimCounts[key]=(dimCounts[key]||0)+1;}}}
    const radarData=dimFields.map(({key,label})=>({ dimension:label, score:dimCounts[key]>0?Math.round(dimTotals[key]/dimCounts[key]):0, fullMark:100 }));

    const buckets=[{range:"0–20",min:0,max:20,count:0},{range:"21–40",min:21,max:40,count:0},{range:"41–60",min:41,max:60,count:0},{range:"61–75",min:61,max:75,count:0},{range:"76–90",min:76,max:90,count:0},{range:"91–100",min:91,max:100,count:0}];
    for (const score of scores){ const b=buckets.find(b=>score>=b.min&&score<=b.max); if(b)b.count++; }

    const diffMap={easy:[],intermediate:[],advanced:[]};
    for (const s of sessions){ const d=s.useCase.difficulty?.toLowerCase(); if(diffMap[d])diffMap[d].push(s.score.overallScore); }
    const difficultyData=[{difficulty:"Easy",...computeDiffStats(diffMap.easy)},{difficulty:"Intermediate",...computeDiffStats(diffMap.intermediate)},{difficulty:"Advanced",...computeDiffStats(diffMap.advanced)}];

    let percentile=100;
    if (avgScore>0&&user?.selectedDomain) {
      try {
        const ds=await prisma.simulationSession.findMany({ where:{ status:"COMPLETED", score:{ isNot:null }, user:{ selectedDomain:user.selectedDomain } }, include:{ score:true } });
        const da={};
        for (const s of ds){ if(!da[s.userId])da[s.userId]=[]; if(s.score?.overallScore!=null)da[s.userId].push(s.score.overallScore); }
        const aa=Object.values(da).filter(a=>a.length>0).map(a=>Math.round(a.reduce((x,y)=>x+y,0)/a.length));
        const below=aa.filter(a=>a<avgScore).length;
        percentile=aa.length>1?Math.round((below/(aa.length-1))*100):100;
      } catch{ percentile=100; }
    }

    return res.json({
      success: true,
      data: {
        overview:{ total,completed,inProgress,avgScore,bestScore,lowestScore,trend,trendPercent,percentile,completionRate:total>0?Math.round((completed/total)*100):0 },
        scoreOverTime, weeklyData, radarData, difficultyData,
        scoreDistribution: buckets,
        recentSessions: sessions.slice(-6).reverse().map(s=>({ title:s.useCase.title, score:s.score.overallScore, difficulty:s.useCase.difficulty, date:s.completedAt?new Date(s.completedAt).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"2-digit"}):"" })),
        empty: false,
      },
    });
  } catch (err) { next(err); }
};

// ─── Domain list ──────────────────────────────────────────────────────────────
exports.getDomainList = async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({ where:{ selectedDomain:{ not:null } }, select:{ selectedDomain:true }, distinct:["selectedDomain"] });
    const domains = users.map(u=>u.selectedDomain).filter(Boolean).map(slug=>({ slug, name:slug.split("-").map(w=>w.charAt(0).toUpperCase()+w.slice(1)).join(" ") }));
    return res.json({ success:true, data:{ domains } });
  } catch (err) { next(err); }
};