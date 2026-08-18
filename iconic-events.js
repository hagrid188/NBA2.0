// ============================================================
// NBA 名场面（iconic moments）— 新增 33 个事件（替换 6 个在 post-game-events.js 内）
// 依赖 post-game-events.js：EVENT_REGISTRY / applyEventConsequence / injuryDaysToGames
// 说明：暂不联动生涯海报彩蛋；年代门槛 eraMinYear；生涯去重 career.flags.icn
// ============================================================
(function(){
  if (typeof EVENT_REGISTRY === 'undefined' || typeof EVENT_REGISTRY.push !== 'function') return;

  function addP(k,v){ try{ if (typeof addProfileDelta === 'function') addProfileDelta(k, v); }catch(e){} }
  function mods(g,chem,morale){ try{ var ev=STATE.season&&STATE.season.events; if(ev){ ev.pendingMods=ev.pendingMods||[]; ev.pendingMods.push({gamesLeft:g,chem:chem||0,morale:morale||0,desc:'名场面'}); } }catch(e){} }
  function money(v,reason){ try{ if (typeof addMoney==='function'){ var amt=(typeof eraMoney==='function')?eraMoney(v):v; addMoney(amt,reason||'名场面'); } }catch(e){} }
  function press(v){ try{ var ev=STATE.season&&STATE.season.events; if(ev){ ev.mediaPressure=Math.max(-5,Math.min(10,(ev.mediaPressure||0)+(v||0))); } }catch(e){} }
  function mark(id){ try{ STATE.career=STATE.career||{}; STATE.career.flags=STATE.career.flags||{}; STATE.career.flags.icn=STATE.career.flags.icn||{}; STATE.career.flags.icn[id]=true; STATE.career.flags.icnCount=(STATE.career.flags.icnCount||0)+1; }catch(e){} }
  function done(id){ try{ return !!(STATE.career&&STATE.career.flags&&STATE.career.flags.icn&&STATE.career.flags.icn[id]); }catch(e){ return false; } }
  function inc(id,by){ try{ STATE.career=STATE.career||{}; STATE.career.flags=STATE.career.flags||{}; STATE.career.flags.icn=STATE.career.flags.icn||{}; STATE.career.flags.icn[id]=(STATE.career.flags.icn[id]||0)+(by||1); }catch(e){} }
  function posOk(ps){ var p=(typeof STATE!=='undefined'&&STATE&&STATE.position)||'PG'; ps=[].concat(ps); return ps.indexOf(p)>=0; }
  function isPO(){ return !!(STATE&&STATE.season&&STATE.season.isPlayoffs); }
  function gamesN(){ return (STATE&&STATE.season&&STATE.season.games)?STATE.season.games.length:0; }
  function allStarPeriod(){ return !isPO() && gamesN()>=38 && gamesN()<=68; }
  function retiring(){ try{ var age=(STATE.career&&STATE.career.currentAge)||22; if(age>=36) return true; if(typeof getBranchNode==='function'){ var nd=getBranchNode('retirement_countdown'); return !!nd && nd!=='start'; } }catch(e){} return false; }
  function seasonThree(){ try{ return (STATE.season&&STATE.season.playerStats&&STATE.season.playerStats.threeM)||0; }catch(e){ return 0; } }
  function changedTeam(){ try{ var ss=STATE.career&&STATE.career.seasons; if(!ss||!ss.length) return false; var last=ss[ss.length-1]; return !!last && last.team!==STATE.careerTeam; }catch(e){ return false; } }

  function K(ctx){
    var r=(ctx&&ctx.result)||{};
    var g=(ctx&&ctx.game)||{};
    var s=(ctx&&ctx.stats)||{};
    var dA=99;
    if (typeof r.scoreA==='number'&&typeof r.scoreB==='number') dA=Math.abs(r.scoreA-r.scoreB);
    else if (typeof g.scoreA==='number'&&typeof g.scoreB==='number') dA=Math.abs(g.scoreA-g.scoreB);
    var yr=0; try{ if(typeof getEraEconomyYear==='function') yr=getEraEconomyYear()||0; }catch(e){}
    return { r:r,g:g,s:s,won:!!r.won,home:!!g.home,diff:dA,isPO:isPO(),gamesN:gamesN(),
      allStarPeriod:allStarPeriod(),retiring:retiring(),year:yr,three:seasonThree(),
      changedTeam:changedTeam(),attrs:(STATE&&STATE.attrs)||{},
      pct:(ctx&&ctx.userState&&ctx.userState.pct)||0.5,
      ovr:(ctx&&ctx.userState&&ctx.userState.ovr)||((STATE&&STATE.finalOVR)||0) };
  }

  function E(def){
    EVENT_REGISTRY.push({
      id:def.id, name:def.name, weight:def.weight||2, eraMinYear:def.eraMinYear||0,
      condition:function(ctx){
        try{
          if (done(def.id)) return false;
          var k=K(ctx);
          if (def.pos && !posOk(def.pos)) return false;
          if (def.cond && !def.cond(k)) return false;
          return true;
        }catch(e){ return false; }
      },
      execute:function(ctx){
        var out={emoji:def.emoji,title:def.title,body:def.body,choices:[]};
        (def.choices||[]).forEach(function(c){
          var choice={label:c.label,hint:c.hint||''};
          if (c.requires) choice.requires=function(q){ try{ return !!c.requires(K(q)); }catch(e){ return false; } };
          choice.apply=function(q){
            mark(def.id);
            if (c.act) c.act(K(q),q);
            return {
              emoji:(typeof c.emoji==='function')?c.emoji(K(q)):(c.emoji||def.emoji),
              title:(typeof c.title==='function')?c.title(K(q)):(c.title||def.title),
              body:(typeof c.body==='function')?c.body(K(q),q):c.body
            };
          };
          out.choices.push(choice);
        });
        return out;
      }
    });
  }

  var DEFS = [    { id:'icn_bird_here', name:'伯德：我要在这里绝杀你', weight:1, eraMinYear:1987, emoji:'🎯', title:'伯德：我要在这里绝杀你',
      body:'暂停回来，教练把最后一攻画给你。你指着对面的防守人，所有人都听见了那句话。',
      cond:function(k){ return k.won && k.diff<=3 && (k.s.pts||0)>=20; },
      choices:[
        { label:'兑现诺言，命中绝杀', hint:'人气+、媒体好感+、绝杀数+1', act:function(){ addP('fame',3); addP('mediaTrust',2); addP('controversy',1); inc('gameWinners',1); }, body:'你接到球，盯着他说：“就这里。”然后起跳、出手、空心入网。他成了背景板，赛后那张照片传遍全网。<br><br>效果：人气+3；媒体好感+2；争议+1；绝杀数+1。' },
        { label:'吸引包夹，传给空位队友', hint:'更衣室信任+', act:function(){ addP('lockerRoomTrust',2); addP('fame',1); }, body:'你做出要投的动作，两人扑过来——你把球塞给空切的队友，他上篮命中。赛后他搂着你说：“下一次我传回给你。”<br><br>效果：更衣室信任+2；人气+1。' },
        { label:'强行出手，打铁被逆转', hint:'争议+、媒体压力+', act:function(){ addP('controversy',1); press(1); }, body:'你出手了，球在篮筐上转了一圈，滚了出来。对手完成绝杀。赛后被问起那句话，你只能苦笑。<br><br>效果：争议+1；媒体压力+1。' }
      ]},
    { id:'icn_miller_choke', name:'米勒：掐脖', weight:1, eraMinYear:1994, pos:['SG','SF'], emoji:'✋', title:'米勒：掐脖',
      body:'你爆砍高分淘汰宿敌，赛后你径直走向对方核心。全场屏住呼吸——你知道他们要拍下这一刻。',
      cond:function(k){ return k.isPO && k.won && (k.s.pts||0)>=30; },
      choices:[
        { label:'做出“掐脖子”的经典动作', hint:'争议+、人气+；20% 罚款', act:function(){ addP('controversy',2); addP('fame',2); if(Math.random()<0.2) money(-2,'联盟罚款（庆祝过激）'); }, body:'你双手虚掐住空气，对着他做出那个动作。裁判没吹，但联盟办公室不会看不见。<br><br>效果：争议+2；人气+2；20% 联盟罚款。' },
        { label:'改成击掌：“你打得不错”', hint:'媒体好感+', act:function(){ addP('mediaTrust',1); }, body:'你伸出手，他犹豫了一下，还是和你击了掌。赛后他承认：“我没想到你会这么做。”<br><br>效果：媒体好感+1。' },
        { label:'只做一个闭嘴手势', hint:'争议+、人气+', act:function(){ addP('controversy',1); addP('fame',1); }, body:'你把食指竖在唇前，一句话没说。够了。<br><br>效果：争议+1；人气+1。' }
      ]},    { id:'icn_jordan_shrug', name:'乔丹：耸肩', weight:1, eraMinYear:1992, pos:['SG','SF'], emoji:'🤷', title:'乔丹：耸肩',
      body:'你今晚手感滚烫，三分一个接一个。回防的路上，你朝替补席做了那个耸肩摊手的动作——全世界都记得这个画面。',
      cond:function(k){ return k.won && (k.s.threeM||0)>=5; },
      choices:[
        { label:'耸肩摊手', hint:'人气+、媒体好感+、士气+', act:function(){ addP('fame',3); addP('mediaTrust',2); mods(3,0,1); }, body:'你耸肩摊手，仿佛在说“我也没办法”。解说员疯了，替补席疯了，对手的心态也裂了。<br><br>效果：人气+3；媒体好感+2；未来3场士气+1。' },
        { label:'面无表情，继续防守', hint:'媒体好感+', act:function(){ addP('mediaTrust',1); }, body:'你连笑都没笑，像这一切都在计划之内。“杀手本色。”赛后媒体这么写。<br><br>效果：媒体好感+1。' },
        { label:'耸肩后补一句“我今天停不下来”', hint:'争议+、人气+', act:function(){ addP('controversy',1); addP('fame',2); }, body:'你耸肩，然后朝技术台喊：“我今天停不下来。”对手的替补席有人站了起来。<br><br>效果：争议+1；人气+2。' }
      ]},
    { id:'icn_wade_house', name:'韦德：这是我的主场', weight:1, eraMinYear:2009, pos:['PG','SG'], emoji:'🏠', title:'这是我的主场',
      body:'主场绝杀！全场陷入疯狂。你冲向技术台——跳上去只需要一秒钟。',
      cond:function(k){ return k.won && k.home && (k.s.pts||0)>=30 && k.diff<=4; },
      choices:[
        { label:'跳上技术台怒吼“这是我的主场”', hint:'人气+、主场士气+；20% 罚款', act:function(){ addP('fame',3); mods(3,0,1); if(Math.random()<0.2) money(-2,'联盟罚款（庆祝过激）'); }, body:'你跳上技术台，对着全场怒吼：“这是我的主场！”保安冲过来时，你已经成了封面。<br><br>效果：人气+3；未来3场士气+1；20% 联盟罚款。' },
        { label:'冷静走回更衣室，食指指天', hint:'媒体好感+、人气+', act:function(){ addP('mediaTrust',1); addP('fame',1); }, body:'你没有庆祝，只竖起食指指向天空，一步步走回更衣室。镜头追着你，直到门关上。<br><br>效果：媒体好感+1；人气+1。' },
        { label:'与全场球迷击掌拥抱', hint:'人气+', act:function(){ addP('fame',2); }, body:'你沿着边线跑了一圈，和每一个能碰到手的人击掌。这个城市爱你，你也爱它。<br><br>效果：人气+2。' }
      ]},    { id:'icn_death_stare', name:'詹姆斯：死亡之瞳', weight:1, eraMinYear:2012, pos:['SF','PF'], emoji:'😤', title:'死亡之瞳',
      body:'客场生死战，赛前你走到中场，盯着对面的半场看了整整十秒。没有人敢说话。',
      cond:function(k){ return k.isPO && k.won && (k.s.pts||0)>=28; },
      choices:[
        { label:'死亡之瞳凝视对方半场', hint:'士气+、人气+、争议+', act:function(){ addP('fame',2); addP('controversy',1); mods(3,0,2); }, body:'你的眼神没有焦点，却让整个球馆安静下来。那场比赛你像换了个人，怎么投都有。<br><br>效果：人气+2；争议+1；未来3场士气+2（命中率小加成）。' },
        { label:'安静热身，不回应挑衅', hint:'媒体好感+', act:function(){ addP('mediaTrust',1); }, body:'对方球员赛前一直在看你，你没有理他，专注热身。<br><br>效果：媒体好感+1。' },
        { label:'拍地板怒吼', hint:'更衣室信任+、士气+', act:function(){ addP('lockerRoomTrust',1); mods(1,0,1); }, body:'你突然蹲下，用力拍了两下地板，起身怒吼。队友们跟着喊起来。<br><br>效果：更衣室信任+1；士气+1。' }
      ]},
    { id:'icn_kg_anything', name:'加内特：一切皆有可能', weight:1, eraMinYear:2008, pos:['PF','C'], emoji:'🗣️', title:'一切皆有可能',
      body:'你们拿下了这场至关重要的胜利。你跪在球场地板上，胸口剧烈起伏——这一刻，你只想把心里的声音喊出来。',
      cond:function(k){ return k.isPO && k.won && (k.s.pts||0)>=20 && (k.s.reb||0)>=10; },
      choices:[
        { label:'跪地怒吼“一切皆有可能”', hint:'人气+、更衣室信任+、队史评价+', act:function(){ addP('fame',3); addP('lockerRoomTrust',2); addP('legacyBonus',1); }, body:'“一切皆有可能！”你的声音在球馆里回荡，队友朝你扑过来。<br><br>效果：人气+3；更衣室信任+2；队史评价+1。' },
        { label:'拥抱每个队友，把球举过头顶', hint:'更衣室信任+', act:function(){ addP('lockerRoomTrust',3); addP('mediaTrust',1); }, body:'你一个接一个拥抱，最后把比赛用球举过头顶，向全场致意。<br><br>效果：更衣室信任+3；媒体好感+1。' },
        { label:'把这场胜利献给家乡', hint:'人气+、媒体好感+', act:function(){ addP('fame',2); addP('mediaTrust',1); }, body:'赛后你对着镜头说：“这场胜利送给我的家乡。”<br><br>效果：人气+2；媒体好感+1。' }
      ]},    { id:'icn_gilbert', name:'阿里纳斯：提前庆祝', weight:1, eraMinYear:2007, pos:['PG','SG'], emoji:'🙌', title:'提前庆祝',
      body:'最后时刻，你出手三分。球还在空中，全场屏息。你忽然转身，举起双手。',
      cond:function(k){ return k.won && k.diff<=3 && (k.s.threeA||0)>=6; },
      choices:[
        { label:'提前转身庆祝', hint:'命中：人气+、媒体好感+；打铁：争议+、媒体压力+', act:function(k,q){ var hit=Math.random()<0.5; q.__icnHit=hit; if(hit){ addP('fame',3); addP('mediaTrust',2); } else { addP('controversy',1); press(1); } },
          body:function(k,q){ return q.__icnHit ? '你背对篮筐举起双手，身后传来全场爆炸般的欢呼——球进了。这一幕被剪进所有集锦。<br><br>效果：人气+3；媒体好感+2。' : '球弹框而出。你张开双臂走回半场，像个喜剧演员。赛后这段视频被循环播放。<br><br>效果：争议+1；媒体压力+1。'; } },
        { label:'老老实实等球进再庆祝', hint:'无额外效果', act:function(){}, body:'你站在原地，等球确定进筐才举起手。稳健，但没有名场面。<br><br>效果：无。' },
        { label:'出手后冲对方替补席喊“这球进了”', hint:'争议+、人气+；命中再加码', act:function(k,q){ var hit=Math.random()<0.5; q.__icnHit=hit; addP('controversy',1); addP('fame', hit?2:1); },
          body:function(k,q){ return q.__icnHit ? '你对着对方替补席喊“这球进了！”然后球真的进了。他们只能看着你摇头。<br><br>效果：争议+1；人气+2。' : '你喊完“这球进了”，球弹框而出。对方的替补席笑到前仰后合。<br><br>效果：争议+1；人气+1。'; } }
      ]},    { id:'icn_bird_steal', name:'伯德抢断', weight:1, eraMinYear:1987, pos:['PG','SG','SF'], emoji:'✋', title:'史上最伟大抢断',
      body:'最后三十秒，落后一分。对方发边线球，你盯着持球人的眼睛——你闻到了那个机会。',
      cond:function(k){ return k.isPO && k.won && (k.s.stl||0)>=2 && k.diff<=4; },
      choices:[
        { label:'抢断后长传队友绝杀', hint:'领袖气质+、人气+、绝杀数+1', act:function(){ addP('leadership',1); addP('fame',2); addP('lockerRoomTrust',1); inc('gameWinners',1); }, body:'你预判到了传球路线，断球后头也不回把球甩向前场——队友接球上进。解说喊出那句经典台词：“XX stole the ball！”<br><br>效果：领袖气质+1；人气+2；更衣室信任+1；绝杀数+1。' },
        { label:'抢断后自己强攻造犯规', hint:'媒体好感+、人气+', act:function(){ addP('mediaTrust',1); addP('fame',1); }, body:'你断球后一条龙杀向篮下，造成犯规，两罚稳稳命中。<br><br>效果：媒体好感+1；人气+1。' },
        { label:'示意自己出界，把球权还回去', hint:'媒体好感+、争议-', act:function(){ addP('mediaTrust',2); addP('controversy',-1); }, body:'裁判没吹，但你主动示意球碰到你的手出界了。对方球员愣住了，全场起立鼓掌。<br><br>效果：媒体好感+2；争议-1。' }
      ]},
    { id:'icn_dream_shake', name:'奥拉朱旺：梦幻脚步', weight:1, eraMinYear:1994, pos:['C','PF'], emoji:'🌀', title:'梦幻脚步',
      body:'你在低位接到球，防守人是联盟顶级内线。你只做了两个假动作，他就飞了出去。',
      cond:function(k){ return k.won && (k.s.pts||0)>=30 && (k.s.reb||0)>=8; },
      choices:[
        { label:'连续假动作晃飞防守人再出手', hint:'人气+、士气+', act:function(){ addP('fame',2); mods(3,0,1); }, body:'你把他晃得双脚离地，然后轻轻放篮。解说反复回放这个动作：“这不是篮球，是艺术。”<br><br>效果：人气+2；未来3场士气+1。' },
        { label:'赛后把脚步教给年轻队友', hint:'更衣室信任+', act:function(){ addP('lockerRoomTrust',2); }, body:'训练结束你留下新秀，一对一教他低位脚步。他笨拙地模仿，你们笑成一团。<br><br>效果：更衣室信任+2。' },
        { label:'淡淡说一句“就是感觉对了”', hint:'媒体好感+、人气+', act:function(){ addP('mediaTrust',1); addP('fame',1); }, body:'记者追问脚步秘诀，你只说了五个字：“就是感觉对了。”<br><br>效果：媒体好感+1；人气+1。' }
      ]},    { id:'icn_jordan_switch', name:'乔丹：换手上篮', weight:1, eraMinYear:1991, pos:['SG','SF'], emoji:'🪄', title:'换手上篮',
      body:'快攻中你起跳，防守人从侧面扑来。你在空中把球从右手换到左手，绕过他，轻轻放进。',
      cond:function(k){ return k.won && (k.s.fgm||0)>=10 && ((k.s.fgm||0)/(k.s.fga||1))>=0.5; },
      choices:[
        { label:'赛后说“我甚至没看篮筐”', hint:'人气+、媒体好感+', act:function(){ addP('fame',2); addP('mediaTrust',2); }, body:'赛后记者问你怎么做到的，你说：“我甚至没看篮筐。”<br><br>效果：人气+2；媒体好感+2。' },
        { label:'现场教队友这个动作', hint:'更衣室信任+', act:function(){ addP('lockerRoomTrust',2); }, body:'你拉着队友在训练场试这个动作，他摔了个屁股墩，你笑到肚子疼。<br><br>效果：更衣室信任+2。' },
        { label:'强调“这是本能反应”', hint:'媒体好感+', act:function(){ addP('mediaTrust',1); }, body:'你耸耸肩：“打多了，身体自己会动。”<br><br>效果：媒体好感+1。' }
      ]},
    { id:'icn_miller_8sec', name:'米勒时刻：8秒8分', weight:1, eraMinYear:1995, pos:['SG'], emoji:'⚡', title:'8秒8分',
      body:'最后不到20秒，你们落后6分。对面已经准备庆祝了——你忽然觉得，这个剧本你好像在哪见过。',
      cond:function(k){ return k.won && k.diff<=4 && (k.s.pts||0)>=20 && (k.s.fta||0)>=4; },
      choices:[
        { label:'复刻：三分→抢断→三分→两罚全中', hint:'人气+、媒体好感+、里程碑', act:function(){ addP('fame',3); addP('mediaTrust',2); addP('controversy',1); inc('millerMoment',1); }, body:'三分、抢断、三分、两罚全中。8秒8分。你对着主场球迷割喉，全场安静得像图书馆。<br><br>效果：人气+3；媒体好感+2；争议+1；里程碑“米勒时刻”+1。' },
        { label:'只赌三分手感', hint:'命中：人气+、媒体好感+；打铁：争议+、媒体压力+', act:function(k,q){ var hit=Math.random()<0.5; q.__icnHit=hit; if(hit){ addP('fame',3); addP('mediaTrust',2); } else { addP('controversy',1); press(1); } },
          body:function(k,q){ return q.__icnHit ? '你连投两记三分全中，又造到犯规。胜利从对方手里抢了回来。<br><br>效果：人气+3；媒体好感+2。' : '你赌三分，第一记进了，第二记弹框。好在队友拼下篮板，你最后两罚稳住。<br><br>效果：争议+1；媒体压力+1。'; } },
        { label:'赛后对客场球迷鞠躬', hint:'争议+、人气+', act:function(){ addP('controversy',2); addP('fame',2); }, body:'比赛结束，你走到中场，对着整片客场看台鞠了一躬。嘘声和掌声混在一起。<br><br>效果：争议+2；人气+2。' }
      ]},    { id:'icn_tmac_35', name:'麦迪时刻：35秒13分', weight:1, eraMinYear:2004, pos:['SG','SF'], emoji:'⏱️', title:'35秒13分',
      body:'最后40秒，你们落后8分。计时器在跳，所有人都放弃了——除了你。',
      cond:function(k){ return k.won && k.diff<=3 && (k.s.pts||0)>=25 && (k.s.threeM||0)>=4; },
      choices:[
        { label:'连续干拔三分+三加一', hint:'人气+、媒体好感+、里程碑', act:function(){ addP('fame',3); addP('mediaTrust',3); inc('tmacMoment',1); }, body:'干拔、干拔、再干拔，最后一个三加一。35秒13分，对手教练赛后说：“你还能怎么办？你只能看着。”<br><br>效果：人气+3；媒体好感+3；里程碑“麦迪时刻”+1。' },
        { label:'保守打两分拖时间', hint:'险些输球：争议+', act:function(){ addP('controversy',1); }, body:'你选择稳妥的快速两分，时间一点点烧掉。最后你仓促出手没进——幸好队友补进绝杀。赛后媒体说你差点毁掉比赛。<br><br>效果：争议+1。' },
        { label:'把球交给手感最好的队友', hint:'更衣室信任+', act:function(){ addP('lockerRoomTrust',2); }, body:'你把球权让给连续命中的队友，他连进两记三分追平，你在加时锁定胜局。<br><br>效果：更衣室信任+2。' }
      ]},
    { id:'icn_vc_dunk', name:'卡特：死亡之扣', weight:1, eraMinYear:2000, pos:['SG','SF'], emoji:'💥', title:'死亡之扣',
      body:'你持球突进，防守人站在篮下——你起跳，全世界都知道接下来会发生什么。',
      cond:function(k){ return k.won && (k.attrs.DNK||0)>=85; },
      choices:[
        { label:'扣完后对镜头比“零”手势', hint:'人气+、争议+', act:function(){ addP('fame',3); addP('controversy',2); }, body:'你从他头顶飞过去完成扣篮，落地后对着镜头比了个“零”。他站在原地，眼神空洞。<br><br>效果：人气+3；争议+2。' },
        { label:'赛后向被隔扣者致意', hint:'媒体好感+、争议-', act:function(){ addP('mediaTrust',2); addP('controversy',-1); }, body:'赛后你找到他，说“兄弟，没有恶意。”他苦笑：“我知道，但你明天会上所有头条。”<br><br>效果：媒体好感+2；争议-1。' },
        { label:'说自己也没想到跳那么高', hint:'媒体好感+、人气+', act:function(){ addP('mediaTrust',1); addP('fame',1); }, body:'你挠挠头：“说实话，我自己也没想到能跳那么高。”<br><br>效果：媒体好感+1；人气+1。' }
      ]},    { id:'icn_tmac_selfoop', name:'麦迪：自抛自扣', weight:1, eraMinYear:2002, pos:['SG','SF'], emoji:'🤸', title:'自抛自扣',
      body:'全明星周末，所有人都想看你表演。你运球到三分线，把球抛向篮板——然后起飞。',
      cond:function(k){ return k.allStarPeriod && k.ovr>=85; },
      choices:[
        { label:'自抛自扣，对镜头比耶', hint:'人气+、媒体好感+', act:function(){ addP('fame',3); addP('mediaTrust',1); }, body:'球砸板弹回，你单手接住扣进。全场起立，解说：“他刚才是不是把自己也骗了？”<br><br>效果：人气+3；媒体好感+1。' },
        { label:'承认“我练过很多次”', hint:'媒体好感+', act:function(){ addP('mediaTrust',1); }, body:'记者问是不是即兴发挥，你老实承认：“其实我练过很多次，今天是第一次成功。”<br><br>效果：媒体好感+1。' },
        { label:'强调“这是我最好的动作”', hint:'人气+', act:function(){ addP('fame',2); }, body:'你站在场地中央说：“这是我最好的动作，没有之一。”<br><br>效果：人气+2。' }
      ]},
    { id:'icn_magic_allstar', name:'魔术师：全明星回归', weight:1, eraMinYear:1992, pos:['PG'], emoji:'✨', title:'全明星回归',
      body:'全明星周末，你站上球场。没人知道这个赛季你经历了什么，但所有人都站起来鼓掌——你回来了。',
      cond:function(k){ return k.allStarPeriod && k.ovr>=85 && ((k.s.pts||0)+(k.s.ast||0))>=25; },
      choices:[
        { label:'全场组织，送出10+助攻', hint:'人气+、媒体好感+、回归里程碑+', act:function(){ addP('fame',3); addP('mediaTrust',3); inc('comebackGame',1); }, body:'你连续送出妙传，最后一记不看人传球让全场炸裂。赛后你对着镜头说：“我回来了。”<br><br>效果：人气+3；媒体好感+3；回归里程碑+1。' },
        { label:'把球权交给年轻人', hint:'更衣室信任+', act:function(){ addP('lockerRoomTrust',2); }, body:'你打了半场就把舞台让给年轻人，坐在场边鼓掌。新人们赛后围过来找你合影。<br><br>效果：更衣室信任+2。' },
        { label:'赛后说“我还能打”', hint:'人气+、争议+', act:function(){ addP('fame',2); addP('controversy',1); }, body:'你对着镜头说：“谁说我不能打了？”第二天这句话上了头条。<br><br>效果：人气+2；争议+1。' }
      ]},    { id:'icn_bird_3pt', name:'伯德：三分大赛热身服', weight:1, eraMinYear:1988, pos:['PG','SG','SF'], emoji:'🏹', title:'三分大赛',
      body:'全明星三分大赛，你穿着热身服走进场地。所有人都以为你在开玩笑——直到你连中9球。',
      cond:function(k){ return k.allStarPeriod && k.three>=50 && (k.s.threeM||0)>=2; },
      choices:[
        { label:'穿热身服参赛并夺冠', hint:'人气+、争议+', act:function(){ addP('fame',3); addP('controversy',2); }, body:'你连外套都没脱，最后一球命中时举起一根手指。对手摇了摇头，把球扔给你。<br><br>效果：人气+3；争议+2。' },
        { label:'认真热身参赛', hint:'媒体好感+、人气+', act:function(){ addP('mediaTrust',1); addP('fame',1); }, body:'你按部就班热身，稳稳拿下冠军。记者问秘诀，你说：“多练。”<br><br>效果：媒体好感+1；人气+1。' },
        { label:'赛前就宣布“你们争第二吧”', hint:'争议+、人气+', act:function(){ addP('controversy',2); addP('fame',2); }, body:'开赛前你对着镜头说：“你们争第二吧。”然后你真夺冠了——没有人觉得你在吹牛。<br><br>效果：争议+2；人气+2。' }
      ]},
    { id:'icn_payton_road', name:'佩顿：过你像过清晨的马路', weight:1, eraMinYear:1990, pos:['PG'], emoji:'🌄', title:'清晨的马路',
      body:'你连续三次生吃对面的全明星后卫，他脸色越来越难看。你凑到他耳边，准备说出那句经典台词。',
      cond:function(k){ return k.won && (k.s.ast||0)>=8 && (k.s.pts||0)>=15; },
      choices:[
        { label:'原话：“过你像过清晨的马路”', hint:'争议+、人气+、士气+', act:function(){ addP('controversy',1); addP('fame',1); mods(3,0,1); }, body:'你贴着他耳朵说：“过你，就像过清晨的马路。”他追了你一整场，再也没防住你。<br><br>效果：争议+1；人气+1；未来3场士气+1。' },
        { label:'赛后圆场：“他只是没睡醒”', hint:'媒体好感+、争议+', act:function(){ addP('mediaTrust',1); addP('controversy',1); }, body:'赛后记者问你怎么评价他的防守，你说：“他可能没睡醒。”<br><br>效果：媒体好感+1；争议+1。' },
        { label:'闭嘴，赢球', hint:'媒体好感+', act:function(){ addP('mediaTrust',1); }, body:'你全程一句话不说，用比赛说话。赛后他被问到感受，只说了句“他很强”。<br><br>效果：媒体好感+1。' }
      ]},    { id:'icn_jordan_kiss', name:'乔丹：强吻米勒', weight:1, eraMinYear:1998, pos:['SG','SF'], emoji:'💋', title:'强吻',
      body:'宿敌之战，垃圾话从第一节喷到第四节。你盯着他的眼睛——你知道该用什么方式终结这场口舌之争。',
      cond:function(k){ return k.isPO && k.won && (k.s.pts||0)>=25; },
      choices:[
        { label:'用额头贴住对方核心', hint:'人气+、争议+、宿敌声望+；20% 技犯', act:function(){ addP('fame',2); addP('controversy',2); inc('rivalry',1); if(Math.random()<0.2) money(-1.5,'技术犯规罚款'); }, body:'你走上前，用额头抵住他的额头，一字一句地说完最后一句话。裁判拉开你们时，全场已经沸腾。<br><br>效果：人气+2；争议+2；宿敌声望+1；20% 技犯罚款。' },
        { label:'拍拍他：“打得好”', hint:'媒体好感+', act:function(){ addP('mediaTrust',1); }, body:'你拍了拍他的肩膀，说“打得不错”。他愣了一下，然后笑了：“你也是。”<br><br>效果：媒体好感+1。' },
        { label:'赛后发布会继续放话', hint:'争议+、人气+', act:function(){ addP('controversy',1); addP('fame',1); }, body:'赛后你把垃圾话带到了发布会，记者们兴奋地记下每一个字。<br><br>效果：争议+1；人气+1。' }
      ]},
    { id:'icn_ai_practice', name:'AI：我们在讨论训练', weight:1, eraMinYear:2002, emoji:'🎤', title:'我们在讨论训练？',
      body:'你们又输了一场，你打得也不好。发布会现场，记者开始提问——你脑子里只剩那个问题：“我们在讨论训练？”',
      cond:function(k){ return !k.isPO && !k.won && (k.s.pts||0)<20; },
      choices:[
        { label:'复刻经典发布会', hint:'媒体好感-、争议+、人气+；10% 罚款', act:function(){ addP('mediaTrust',-2); addP('controversy',2); addP('fame',2); if(Math.random()<0.1) money(-1.5,'联盟罚款（发布会不当言论）'); }, body:'“我们在讨论训练？训练？不是比赛，是训练？”你连续反问，发布会现场鸦雀无声。这段视频成了永流传的梗。<br><br>效果：媒体好感-2；争议+2；人气+2；10% 联盟罚款。' },
        { label:'认真回应记者', hint:'媒体好感+', act:function(){ addP('mediaTrust',1); }, body:'你深吸一口气，认真回答每一个问题。记者们反而有些不习惯。<br><br>效果：媒体好感+1。' },
        { label:'一句话带过“我打球不是为了解释”', hint:'争议+、媒体好感+', act:function(){ addP('controversy',1); addP('mediaTrust',1); }, body:'你说：“我打球不是为了解释。”然后起身离开。<br><br>效果：争议+1；媒体好感+1。' }
      ]},    { id:'icn_rodman_dive', name:'罗德曼：飞身救球', weight:1, eraMinYear:1991, pos:['SF','PF'], emoji:'🛡️', title:'飞身救球',
      body:'球快要出界了，所有人都认为这一球没了。你没有任何犹豫，整个人飞了出去。',
      cond:function(k){ return k.isPO && k.won && (k.s.reb||0)>=12; },
      choices:[
        { label:'飞身救球后立刻回防', hint:'领袖气质+、士气+、人气+', act:function(){ addP('leadership',1); mods(3,0,2); addP('fame',1); }, body:'你撞进观众席，把球救回队友手里，爬起来立刻回防。队友说那一刻他们想为你打架。<br><br>效果：领袖气质+1；未来3场士气+2；人气+1。' },
        { label:'救球后起身捶胸怒吼', hint:'士气+、争议+', act:function(){ mods(3,0,2); addP('controversy',1); }, body:'你起身捶着胸口怒吼，替补席全部冲出来把你拽回去——比赛还没结束。<br><br>效果：未来3场士气+2；争议+1。' },
        { label:'赛后说“地板也是我的工作”', hint:'媒体好感+、人气+', act:function(){ addP('mediaTrust',1); addP('fame',1); }, body:'赛后记者问为什么那么拼，你说：“地板也是我的工作。”<br><br>效果：媒体好感+1；人气+1。' }
      ]},
    { id:'icn_barkley_donkey', name:'巴克利：亲驴屁股', weight:1, eraMinYear:1993, emoji:'🐴', title:'亲驴屁股',
      body:'你在节目里放话：如果……就亲驴屁股。赛季末，兑现的时刻到了。',
      cond:function(k){ return !k.isPO && k.gamesN>=65; },
      choices:[
        { label:'履行赌约，当众亲驴', hint:'人气+、媒体好感+、争议+', act:function(){ addP('fame',3); addP('mediaTrust',3); addP('controversy',2); }, body:'你真的亲了。镜头怼到脸上，全国直播。你事后说：“愿赌服输，我说话算话。”<br><br>效果：人气+3；媒体好感+3；争议+2。' },
        { label:'请驴当节目嘉宾', hint:'人气+、媒体好感+', act:function(){ addP('fame',2); addP('mediaTrust',2); }, body:'你把驴请进演播室，它坐在你旁边的椅子上，比你还会抢镜。<br><br>效果：人气+2；媒体好感+2。' },
        { label:'耍赖不兑现', hint:'媒体好感-、争议+', act:function(){ addP('mediaTrust',-2); addP('controversy',2); }, body:'你找了一堆理由不兑现。观众不买账，这个话题被嘲笑了整整一个休赛期。<br><br>效果：媒体好感-2；争议+2。' }
      ]},    { id:'icn_shaq_grandma', name:'奥尼尔：我奶奶也能夺冠', weight:1, eraMinYear:2000, pos:['C'], emoji:'👵', title:'统治宣言',
      body:'你们赢下了这场关键胜利，你打出统治级表现。赛后有人问：如果换成别人和你组队，还能赢吗？',
      cond:function(k){ return k.isPO && k.won && (k.s.pts||0)>=25; },
      choices:[
        { label:'放话“我奶奶跟我组队也能夺冠”', hint:'争议+、人气+、媒体好感+', act:function(){ addP('controversy',2); addP('fame',2); addP('mediaTrust',1); }, body:'“说句实话，我奶奶跟我组队也能夺冠。”全场笑了，但没人觉得你在吹牛。<br><br>效果：争议+2；人气+2；媒体好感+1。' },
        { label:'把功劳分给全队', hint:'更衣室信任+', act:function(){ addP('lockerRoomTrust',2); }, body:'你说：“没有他们，我什么都不是。”队友们记住了这句话。<br><br>效果：更衣室信任+2。' },
        { label:'强调“这是我练出来的”', hint:'媒体好感+', act:function(){ addP('mediaTrust',1); }, body:'你举了举手臂：“天赋是爸妈给的，统治力是我自己练的。”<br><br>效果：媒体好感+1。' }
      ]},
    { id:'icn_bron_not1', name:'詹姆斯：Not 1, Not 2…', weight:1, eraMinYear:2010, emoji:'📣', title:'Not 1, Not 2…',
      body:'你加盟了新球队，发布会座无虚席。记者问：接下来打算拿几个冠军？',
      cond:function(k){ return k.gamesN<=8 && k.changedTeam && k.ovr>=90; },
      choices:[
        { label:'原话：“Not 1, Not 2, Not 3…”', hint:'争议+、人气+、媒体好感+', act:function(){ addP('controversy',2); addP('fame',2); addP('mediaTrust',1); }, body:'你笑着数：“不是一个，不是两个，不是三个……”全场掌声雷动，也埋下了无数未来的话题。<br><br>效果：争议+2；人气+2；媒体好感+1。' },
        { label:'低调回应“一步一步来”', hint:'媒体好感+', act:function(){ addP('mediaTrust',1); }, body:'你说：“冠军要一步一步来。”<br><br>效果：媒体好感+1。' },
        { label:'承诺但留余地“我会尽力”', hint:'争议+', act:function(){ addP('controversy',1); }, body:'你说：“我会尽力带他们夺冠。”媒体解读出三种意思。<br><br>效果：争议+1。' }
      ]},    { id:'icn_miller_spike', name:'米勒与斯派克·李', weight:1, eraMinYear:1994, pos:['SG'], emoji:'🎬', title:'场边宿敌',
      body:'比赛间隙，场边那个戴着帽子的名导演又站起来朝你喷垃圾话。全场摄像机都对准了你俩。',
      cond:function(k){ return k.won && (k.s.pts||0)>=25; },
      choices:[
        { label:'与他互喷一整晚', hint:'人气+、争议+', act:function(){ addP('fame',2); addP('controversy',2); }, body:'你们从第一节吵到第四节，他站起来你也站起来。赛后他说：“这个小子让我想拍一部电影。”<br><br>效果：人气+2；争议+2。' },
        { label:'无视他，专注比赛', hint:'媒体好感+', act:function(){ addP('mediaTrust',1); }, body:'他越喊，你越冷静。赛后你淡淡说：“我打我的球。”<br><br>效果：媒体好感+1。' },
        { label:'赛后约他喝咖啡', hint:'媒体好感+、人气+', act:function(){ addP('mediaTrust',1); addP('fame',1); }, body:'赛后你走过去：“明天有空吗？我请客。”他愣住，然后大笑。<br><br>效果：媒体好感+1；人气+1。' }
      ]},
    { id:'icn_ai_kiss', name:'艾弗森：亲吻地板', weight:1, eraMinYear:2001, pos:['PG','SG'], emoji:'😘', title:'亲吻地板',
      body:'季后赛主场关键战，你砍下高分带队取胜。赛后，你走向中圈，全场安静下来。',
      cond:function(k){ return k.isPO && k.won && (k.s.pts||0)>=30; },
      choices:[
        { label:'单膝跪地亲吻地板', hint:'人气+、忠诚+、媒体好感+', act:function(){ addP('fame',3); addP('loyalty',2); addP('mediaTrust',2); }, body:'你单膝跪地，亲吻了这块地板。全场起立，赛后这张照片登上了所有报纸的头版。<br><br>效果：人气+3；忠诚+2；媒体好感+2。' },
        { label:'与主场球迷拥抱致意', hint:'人气+', act:function(){ addP('fame',2); }, body:'你沿着场边与球迷击掌、拥抱，像感谢每一位战友。<br><br>效果：人气+2。' },
        { label:'只说一句“这是我的城市”', hint:'人气+、争议+', act:function(){ addP('fame',1); addP('controversy',1); }, body:'你对着镜头说：“这是我的城市。”<br><br>效果：人气+1；争议+1。' }
      ]},    { id:'icn_bd_ak47', name:'巴朗·戴维斯：隔扣AK47', weight:1, eraMinYear:2007, pos:['PG','SG'], emoji:'🏀', title:'隔扣AK47',
      body:'你持球杀向篮下，对面站着的是联盟最好的防守球员之一。你没有减速。',
      cond:function(k){ return k.won && (k.attrs.DNK||0)>=80 && (k.s.pts||0)>=20; },
      choices:[
        { label:'隔扣后怒吼', hint:'人气+、争议+', act:function(){ addP('fame',2); addP('controversy',1); }, body:'你隔着那个防守悍将把球砸进去，落地后怒吼。他低头走开，一句话没说。<br><br>效果：人气+2；争议+1。' },
        { label:'赛后把海报送给被隔扣者', hint:'媒体好感+', act:function(){ addP('mediaTrust',2); }, body:'赛后你把那张海报打印出来签上名，托人送给他。他看了很久，最后笑了。<br><br>效果：媒体好感+2。' },
        { label:'放话“这是本赛季最佳扣篮”', hint:'人气+、争议+', act:function(){ addP('fame',1); addP('controversy',1); }, body:'你在更衣室对记者说：“不用等到赛季结束，这就是最佳扣篮。”<br><br>效果：人气+1；争议+1。' }
      ]},
    { id:'icn_trae_bow', name:'特雷·杨：向尼克斯鞠躬', weight:1, eraMinYear:2021, pos:['PG','SG'], emoji:'🙇', title:'客场鞠躬',
      body:'季后赛客场，全场都在嘘你。你命中关键球后，做了一个让整个球馆安静下来的动作。',
      cond:function(k){ return k.isPO && k.won && (k.s.pts||0)>=25; },
      choices:[
        { label:'全场鞠躬+耸肩', hint:'人气+、争议+', act:function(){ addP('fame',3); addP('controversy',3); }, body:'你深深鞠了一躬，然后耸肩摊手。嘘声变成了全场沉默，然后是你的名字被呼喊。<br><br>效果：人气+3；争议+3。' },
        { label:'做完手势立刻走人', hint:'人气+、争议+', act:function(){ addP('fame',2); addP('controversy',1); }, body:'你比完手势，没等反应直接转身走回替补席，留下全场愣住。<br><br>效果：人气+2；争议+1。' },
        { label:'赛后道歉“情绪上头了”', hint:'媒体好感+、争议-', act:function(){ addP('mediaTrust',1); addP('controversy',-1); }, body:'赛后你道歉：“当时情绪上头了。”记者们反而更喜欢你了。<br><br>效果：媒体好感+1；争议-1。' }
      ]},    { id:'icn_wade_jersey', name:'韦德：最后一舞', weight:1, eraMinYear:2019, pos:['SG'], emoji:'👕', title:'最后一舞',
      body:'退役赛季的最后一场常规赛。终场哨响，你知道该和这座球场告别了。',
      cond:function(k){ return k.retiring && !k.isPO && k.gamesN>=78; },
      choices:[
        { label:'与对手核心互换球衣', hint:'人气+、媒体好感+、里程碑', act:function(){ addP('fame',3); addP('mediaTrust',3); inc('lastDance',1); }, body:'你走向对面那个你交手了半辈子的家伙，脱下单边球衣递给他。他接过去，你们拥抱了很久。<br><br>效果：人气+3；媒体好感+3；里程碑“最后一舞”+1。' },
        { label:'把球衣扔向球迷', hint:'人气+', act:function(){ addP('fame',2); }, body:'你把球衣叠好，用力扔向看台。抢到的那个人举着它哭了出来。<br><br>效果：人气+2。' },
        { label:'独自站在场地中央', hint:'人气+、媒体好感+', act:function(){ addP('fame',2); addP('mediaTrust',2); }, body:'你站在中圈，环顾整座球馆，像要把每一个角落都记住。灯光打在你身上，全场起立。<br><br>效果：人气+2；媒体好感+2。' }
      ]},
    { id:'icn_kobe_mambaout', name:'科比：Mamba Out', weight:1, eraMinYear:2016, pos:['SG'], emoji:'🎩', title:'Mamba Out',
      body:'退役赛季的最后一战，你打光了最后一丝力气。比赛结束，你站在场地中央，麦克风递到你面前。',
      cond:function(k){ return k.retiring && !k.isPO && k.gamesN>=80; },
      choices:[
        { label:'喊出“Mamba Out”', hint:'传奇度+、人气+、里程碑', act:function(){ addP('legacyBonus',3); addP('fame',3); inc('mambaOut',1); }, body:'你接过麦克风，只说了一句：“Mamba Out。”然后把麦克风放在地上，转身离开。全场喊你的名字喊了很久。<br><br>效果：传奇度+3；人气+3；里程碑“Mamba Out”+1。' },
        { label:'只挥手离场', hint:'媒体好感+', act:function(){ addP('mediaTrust',2); }, body:'你什么都没说，举起手挥了挥，走进球员通道。足够体面。<br><br>效果：媒体好感+2。' },
        { label:'说“我会想念这一切”', hint:'媒体好感+、人气+', act:function(){ addP('mediaTrust',2); addP('fame',1); }, body:'你说：“我会想念这一切，每一个夜晚。”<br><br>效果：媒体好感+2；人气+1。' }
      ]},    { id:'icn_jordan_allstar03', name:'乔丹：2003全明星谢幕', weight:1, eraMinYear:2003, emoji:'👑', title:'全明星谢幕',
      body:'全明星周末，这是你职业生涯最后一次站上全明星舞台。全场球迷站起来，掌声经久不息。',
      cond:function(k){ return k.retiring && k.allStarPeriod && k.ovr>=85; },
      choices:[
        { label:'接受全场致敬', hint:'人气+、媒体好感+', act:function(){ addP('fame',3); addP('mediaTrust',3); }, body:'你站在场地中央，向四周鞠躬。所有全明星都围过来与你握手。<br><br>效果：人气+3；媒体好感+3。' },
        { label:'把球传给年轻人', hint:'更衣室信任+', act:function(){ addP('lockerRoomTrust',2); }, body:'你打了几个回合就把舞台让给年轻人，坐在场边为他们鼓掌。<br><br>效果：更衣室信任+2。' },
        { label:'说“我依然是最好的”', hint:'争议+、人气+', act:function(){ addP('controversy',1); addP('fame',2); }, body:'你在赛后说：“我依然是最好的。”有人觉得狂，有人觉得这就是乔丹。<br><br>效果：争议+1；人气+2。' }
      ]},
    { id:'icn_courtside', name:'场边名宿', weight:1, eraMinYear:1984, emoji:'🛋️', title:'场边名宿',
      body:'场边坐着一位传奇人物，镜头时不时切到他。你打进关键球后，他刚好在鼓掌。',
      cond:function(k){ return k.isPO && k.won; },
      choices:[
        { label:'向他点头致意', hint:'媒体好感+、人气+', act:function(){ addP('mediaTrust',1); addP('fame',1); }, body:'你朝他点了点头，他举了举帽子回礼。赛后他说：“这小子有礼貌。”<br><br>效果：媒体好感+1；人气+1。' },
        { label:'与他互动玩梗', hint:'人气+、争议+', act:function(){ addP('fame',2); addP('controversy',1); }, body:'你打完球冲他做了个他当年的招牌动作。他先是一愣，然后站起来给你鼓掌。<br><br>效果：人气+2；争议+1。' },
        { label:'无视，专注比赛', hint:'媒体好感+', act:function(){ addP('mediaTrust',1); }, body:'你全场没看他一眼，赛后他说：“他眼里只有胜利。”<br><br>效果：媒体好感+1。' }
      ]},
    { id:'icn_dirk_room', name:'德克：更衣室独处', weight:1, eraMinYear:2011, pos:['PF','C'], emoji:'🥺', title:'更衣室独处',
      body:'你们赢下了这场关键胜利。队友在庆祝，你却一个人走回更衣室，关上门。',
      cond:function(k){ return k.isPO && k.won && (k.s.pts||0)>=25; },
      choices:[
        { label:'独自哭一场', hint:'媒体好感+、人气+', act:function(){ addP('mediaTrust',3); addP('fame',3); }, body:'你把门反锁，靠着衣柜坐了很久。后来队友说，那是他第一次见你哭。媒体说：这是真性情。<br><br>效果：媒体好感+3；人气+3。' },
        { label:'冲出去与队友狂欢', hint:'更衣室信任+', act:function(){ addP('lockerRoomTrust',3); }, body:'你在更衣室待了三十秒，然后冲出来把香槟泼向所有人。今晚没有人能早睡。<br><br>效果：更衣室信任+3。' },
        { label:'给家乡打电话', hint:'人气+、媒体好感+', act:function(){ addP('fame',2); addP('mediaTrust',1); }, body:'你拨通家里的电话，只说了句：“我做到了。”那边传来家人的哭声。<br><br>效果：人气+2；媒体好感+1。' }
      ]}
  ,
    { id:'trash_baby', name:'伯德：你们都是来争第二的吗', weight:2, eraMinYear:1984, emoji:'🏆', title:'你们都是来争第二的吗',
      body:'赛前采访，记者问你对本赛季的争冠格局怎么看。你扫了一眼镜头，忽然想起那个经典的画面——那个绿色球衣的传奇，是如何用一句话让整个联盟安静下来的。',
      cond:function(k){ return k.pct>=0.55; },
      choices:[
        { label:'原话复刻：“你们都是来争第二的吗？”', hint:'争议+、人气+、士气+', act:function(){ addP('controversy',1); addP('fame',1); mods(3,0,1); }, body:'你原话复刻。队友们愣了两秒，然后笑成一片；对手赛前集体上头，比赛火药味十足。<br><br>效果：争议+1；人气+1；未来3场士气+1。' },
        { label:'低调回应：“我们只是来打球的”', hint:'媒体好感+', act:function(){ addP('mediaTrust',1); }, body:'你没有放狠话，只说“我们只是来打球的”。记者追问，你笑而不答。<br><br>效果：媒体好感+1。' },
        { label:'沉默不答，转身离开', hint:'更衣室信任+', act:function(){ addP('lockerRoomTrust',1); }, body:'你什么都没说，直接离开采访区。队友们觉得你稳得住。<br><br>效果：更衣室信任+1。' }
      ]},
    { id:'trash_sneaker', name:'乔丹：加油，你差点就防住我了', weight:2, eraMinYear:1989, pos:['SG','SF'], emoji:'😏', title:'差点就防住我了',
      body:'你连续在同一个防守人头上命中，回防时他脸色铁青。你凑近他耳边，那句话已经到了嘴边。',
      cond:function(k){ return k.won && (k.s.pts||0)>=25; },
      choices:[
        { label:'说出那句名言', hint:'争议+、人气+、化学+', act:function(){ addP('controversy',1); addP('fame',1); mods(3,1,0); }, body:'他听完这句话，整个下半场都贴在你身上，但你还是拿下了比赛。<br><br>效果：争议+1；人气+1；未来3场球队化学+1。' },
        { label:'拍拍他：“好防”', hint:'媒体好感+', act:function(){ addP('mediaTrust',1); }, body:'你拍了拍他的肩膀：“防得不错。”他愣住，然后点了点头。<br><br>效果：媒体好感+1。' },
        { label:'赛后对记者复述这句话', hint:'媒体好感+、人气+', act:function(){ addP('mediaTrust',1); addP('fame',1); }, body:'你在发布会上复述了这句话，记者们笑成一片，第二天全美都知道了。<br><br>效果：媒体好感+1；人气+1。' }
      ]},
    { id:'trash_korean', name:'AI：跨过你', weight:2, eraMinYear:2001, pos:['PG','SG'], emoji:'🚶', title:'AI：跨过你',
      body:'你用一连串变向把对位防守人晃倒在地，球权在你脚下。全场起立——你只用一个动作就能载入史册。',
      cond:function(k){ return k.won && (k.s.pts||0)>=28 && (k.isPO || k.diff<=8); },
      choices:[
        { label:'像 AI 一样直接从他身上跨过去', hint:'争议+、人气+；15% 罚款', act:function(){ addP('controversy',2); addP('fame',2); if(Math.random()<0.15) money(-2,'联盟罚款（跨人挑衅）'); }, body:'你从他身上跨了过去。他躺在地上，看着你走回半场。这张照片成了永流传的经典。<br><br>效果：争议+2；人气+2；15% 联盟罚款。' },
        { label:'扶起他，说声抱歉', hint:'媒体好感+', act:function(){ addP('mediaTrust',2); }, body:'你弯下腰把他拉起来：“兄弟，没事吧？”他苦笑：“球打得不错，人也不错。”<br><br>效果：媒体好感+2。' },
        { label:'俯视他两秒，然后转身走开', hint:'争议+、人气+', act:function(){ addP('controversy',1); addP('fame',1); }, body:'你低头看了他两秒，一句话没说，转身走开。沉默比垃圾话更有杀伤力。<br><br>效果：争议+1；人气+1。' }
      ]},
    { id:'trash_bald', name:'皮蓬：邮差周末不上班', weight:2, eraMinYear:1997, emoji:'📮', title:'邮差周末不上班',
      body:'比赛最后时刻，对面的大个子站上罚球线。你走到他耳边，准备送出那句改变历史的一句话。',
      cond:function(k){ return k.won && (k.s.fta||0)>=8 && k.diff<=8; },
      choices:[
        { label:'说：“邮差周末不上班”', hint:'士气+；对方罚球心理波动', act:function(){ addP('fame',1); mods(3,0,1); }, body:'他果然罚丢了关键一球。赛后他把这句话记了很久，而你们赢了。<br><br>效果：人气+1；未来3场士气+1。' },
        { label:'什么都不说，静静看他罚', hint:'无额外效果', act:function(){}, body:'你什么都没说。他两罚全中，但你们还是赢下了比赛。<br><br>效果：无。' },
        { label:'赛后把这个梗讲给队友听', hint:'更衣室信任+、媒体好感+', act:function(){ addP('lockerRoomTrust',1); addP('mediaTrust',1); }, body:'你在更衣室讲了这个梗，队友笑到拍桌子，第二天训练还挂在嘴边。<br><br>效果：更衣室信任+1；媒体好感+1。' }
      ]},
    { id:'trash_referee_chat', name:'邓肯：未来是你的', weight:2, eraMinYear:2007, emoji:'🔮', title:'未来是你的',
      body:'你们击败宿敌晋级后，对方核心垂着头走下球场。你走过去，准备说出那句被说了无数遍的话。',
      cond:function(k){ return k.isPO && k.won; },
      choices:[
        { label:'拥抱他：“未来是你的”', hint:'人气+、媒体好感+、争议-', act:function(){ addP('fame',2); addP('mediaTrust',2); addP('controversy',-1); }, body:'你抱住他，轻声说：“未来是你的。”多年后他每次想起这句话，都会多练一小时。<br><br>效果：人气+2；媒体好感+2；争议-1。' },
        { label:'只说一句“好好打球”', hint:'媒体好感+', act:function(){ addP('mediaTrust',1); }, body:'你拍了拍他：“好好打球。”没有多余的话。<br><br>效果：媒体好感+1。' },
        { label:'不理会，径直走回更衣室', hint:'争议+', act:function(){ addP('controversy',1); }, body:'你没有安慰他，径直走回更衣室。第二天媒体说你赢了球，输了风度。<br><br>效果：争议+1。' }
      ]},
    { id:'trash_bench_dance', name:'库里：晚安', weight:2, eraMinYear:2015, pos:['PG','SG'], emoji:'😴', title:'库里：晚安',
      body:'你命中那记杀死比赛的三分，全场沸腾。摄像机对准你，所有人都知道下一秒会发生什么——球馆里的空气都安静下来，等你给出回应。',
      cond:function(k){ return k.won && (k.s.threeM||0)>=5 && k.diff<=6; },
      choices:[
        { label:'对观众席做“晚安”手势', hint:'人气+、媒体好感+', act:function(){ addP('fame',2); addP('mediaTrust',1); }, body:'你双手枕在脑后，像哄孩子入睡一样对全场做了“晚安”。赛后这段视频被做成无数个版本。<br><br>效果：人气+2；媒体好感+1。' },
        { label:'转身对对方替补席做手势', hint:'争议+、人气+', act:function(){ addP('controversy',2); addP('fame',1); }, body:'你直接转向对方替补席做了“晚安”手势。对方教练赛后说：我们记住了。<br><br>效果：争议+2；人气+1。' },
        { label:'冲镜头眨眼比心', hint:'人气+', act:function(){ addP('fame',1); }, body:'你对镜头眨眼比心，把挑衅变成了可爱。评论区两极分化，但播放量说明了一切。<br><br>效果：人气+1。' }
      ]},
    ];

  DEFS.forEach(function(def){ E(def); });
})();// ── N7 跟腱罚球：重大腿部伤病抉择钩子（在 post-game-events.js checkRandomEvents 中调用） ──
// ★ 伤病立即结算：事件触发后 injury 状态即生效（与普通伤病流程一致）；选项只做加减
(function(){
  var LEG = ['injury_major_achilles','injury_major_hamstring','injury_major_jones_fracture','injury_major_acl'];
  window.__wrapLegInjuryEvent = function(picked, ctx){
    try{
      if (!picked || !picked.id || LEG.indexOf(picked.id) < 0) return null;
      var fl = STATE.career && STATE.career.flags;
      if (fl && fl.icn && fl.icn.icn_achilles_ft) return null;
      if (Math.random() >= 0.7) return null;
      var d0 = picked.execute(ctx);
      if (!d0 || d0._consequence !== 'injury') return null;
      if (!d0.id) d0.id = picked.id; // ★ 原伤病 execute 不含 id，需补上才能命中 INJURY_DAYS_BY_ID
      var yr = 0; try{ if (typeof getEraEconomyYear === 'function') yr = getEraEconomyYear() || 0; }catch(e){}
      var early = yr > 0 && yr < 2013;
      var T = early ? '伯德：背伤罚球' : '科比：跟腱罚球';
      var E = early ? '🏀' : '🩼';
      var B = early
        ? '80年代的那个夜晚，你在季后赛遭遇背部重伤。队医把担架推过来，裁判却示意：刚才那球犯规了，先罚球。全场安静地看你慢慢站起来。'
        : '你的腿在一瞬间失去了支撑——跟腱传来那声熟悉的闷响。裁判哨响：对方犯规。队医冲过来之前，你听见全场在喊你的名字。罚球线就在眼前。';
      return {
        id: picked.id,
        name: T,
        weight: 1,
        condition: function(){ return true; },
        execute: function(q){
          function injText(){
            var iv = STATE.season && STATE.season.events && STATE.season.events.injury;
            return iv ? ('预计缺阵 ' + iv.gamesLeft + ' 场') : '';
          }
          function markUsed(){
            try{ STATE.career = STATE.career || {}; STATE.career.flags = STATE.career.flags || {}; STATE.career.flags.icn = STATE.career.flags.icn || {}; STATE.career.flags.icn.icn_achilles_ft = true; }catch(e){}
          }
          function adjustInjury(p){
            var iv = STATE.season && STATE.season.events && STATE.season.events.injury;
            if (!iv) return;
            iv.daysLeft = Math.round(iv.daysLeft * p);
            if (typeof injuryDaysToGames === 'function') iv.gamesLeft = injuryDaysToGames(iv.daysLeft);
          }
          // ★ 立即结算：调用一次即完成伤病挂账（与普通伤病事件一致）
          try{ applyEventConsequence(d0, q, { noTimeline: true }); }catch(e){}
          return {
            emoji: E, title: T, body: B,
            choices: [
              { label: '忍痛两罚全中再离场', hint: '人气+、传奇度+；伤停时间+15%', apply: function(){
                markUsed();
                try{ addProfileDelta('fame', 2); addProfileDelta('legacyBonus', 1); }catch(e){}
                adjustInjury(1.15);
                return { emoji: '🏅', title: (early ? '背伤罚球：两罚全中' : '跟腱罚球：两罚全中'), body: '你把球罚进，两罚全中，然后才允许自己倒下。队医说，这多撑的几秒让伤势重了一点。<br><br>效果：人气+2；传奇度+1；伤停时间+15%（' + injText() + '）。' };
              }},
              { label: '罚进一球后离场', hint: '人气+', apply: function(){
                markUsed();
                try{ addProfileDelta('fame', 1); }catch(e){}
                return { emoji: '🏀', title: (early ? '背伤罚球：一球命中' : '跟腱罚球：一球命中'), body: '第一罚进了，第二罚你实在撑不住，把球交给队友自己走回更衣室。没有人责怪你。<br><br>效果：人气+1；' + injText() + '。' };
              }},
              { label: '直接回更衣室治疗', hint: '恢复更快；媒体好感-1', apply: function(){
                markUsed();
                try{ addProfileDelta('mediaTrust', -1); }catch(e){}
                adjustInjury(0.9);
                return { emoji: '🚑', title: '放弃罚球：直接治疗', body: '你拒绝了罚球，让队医架着你回更衣室。第二天有媒体说你不够硬，但你清楚：这能让恢复期缩短一些。<br><br>效果：媒体好感-1；恢复时间-10%（' + injText() + '）。' };
              }}
            ]
          };
        }
      };
    }catch(e){ return null; }
  };
})();
