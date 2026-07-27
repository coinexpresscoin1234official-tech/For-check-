/* KS TECH AI */
const GEMINI_KEY='AIzaSyAJzuOMnt1QZuWSLdK_ljbW9z0HcwoLIE4';

function cleanAIText(text){
  return text.replace(/\*\*(.*?)\*\*/g,'$1').replace(/\*(.*?)\*/g,'$1')
    .replace(/###\s*/g,'').replace(/##\s*/g,'').replace(/#\s*/g,'')
    .replace(/\$([^$]+)\$/g,'$1').replace(/---/g,'--').trim();
}

async function callGemini(prompt){
  var models=['gemini-2.5-flash','gemini-2.0-flash-latest','gemini-1.5-flash'];
  for(var mi=0;mi<models.length;mi++){
    try{
      var url='https://generativelanguage.googleapis.com/v1beta/models/'+models[mi]+':generateContent?key='+GEMINI_KEY;
      var res=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({contents:[{parts:[{text:prompt}]}],generationConfig:{maxOutputTokens:1024,temperature:0.7}})});
      var data=await res.json();
      if(data.error&&(data.error.code===404||data.error.code===400)){continue;}
      if(data.error&&data.error.code===403){return 'API key blocked. Set Application Restrictions to None in Google Cloud Console.';}
      if(data.error){return 'Error: '+data.error.message;}
      if(data.candidates&&data.candidates[0]&&data.candidates[0].content)
        return data.candidates[0].content.parts[0].text;
    }catch(e){continue;}
  }
  return 'AI unavailable. Please try again.';
}

var chatHistory=[];
var chatOpen=false;
var KS_SYSTEM='You are KS Assistant for KS Tech by Kiran Sankar. Has 15 apps, 4 games, 8 health tools, Science Solver. Everything free, no ads. Be friendly and concise.';
var CHAT_SUGGESTIONS=['How to use EMI calculator?','What apps are available?','Tell me about the games','What is 20-20-20 rule?','How does Password Checker work?'];

function injectChatbot(){
  var fab=document.createElement('button');
  fab.className='ks-chat-fab';fab.id='ksChatFab';fab.innerHTML='🤖';fab.title='KS Assistant';fab.onclick=toggleChat;
  document.body.appendChild(fab);
  var panel=document.createElement('div');
  panel.className='ks-chat-panel';panel.id='ksChatPanel';
  var sh='';
  for(var si=0;si<CHAT_SUGGESTIONS.length;si++){
    sh+='<button class="ks-sugg-btn" onclick="sendSuggestion(this.textContent)">'+CHAT_SUGGESTIONS[si]+'</button>';
  }
  var h='<div class="ks-chat-header">';
  h+='<div><div class="ks-chat-title">🤖 KS Assistant</div>';
  h+='<div class="ks-chat-subtitle">Ask me anything!</div></div>';
  h+='<button class="ks-chat-close" onclick="toggleChat()">X</button></div>';
  h+='<div class="ks-chat-messages" id="ksChatMsgs">';
  h+='<div class="ks-msg bot">Hey! Ask me about any app, game or health tool!</div></div>';
  h+='<div class="ks-chat-suggestions" id="ksChatSuggs">'+sh+'</div>';
  h+='<div class="ks-chat-input-row">';
  h+='<textarea class="ks-chat-input" id="ksChatInput" placeholder="Ask anything..." rows="1" ';
  h+='onkeydown="if(event.key===\'Enter\'&&!event.shiftKey){event.preventDefault();sendChat();}"></textarea>';
  h+='<button class="ks-chat-send" id="ksChatSend" onclick="sendChat()">Send</button></div>';
  panel.innerHTML=h;
  document.body.appendChild(panel);
}

function toggleChat(){
  chatOpen=!chatOpen;
  var panel=document.getElementById('ksChatPanel');
  var fab=document.getElementById('ksChatFab');
  if(panel)panel.classList.toggle('open',chatOpen);
  if(fab)fab.innerHTML=chatOpen?'X':'🤖';
}

function sendSuggestion(text){
  var input=document.getElementById('ksChatInput');
  if(input){input.value=text;sendChat();}
  var s=document.getElementById('ksChatSuggs');
  if(s)s.style.display='none';
}

async function sendChat(){
  var input=document.getElementById('ksChatInput');
  var msgs=document.getElementById('ksChatMsgs');
  var btn=document.getElementById('ksChatSend');
  if(!input||!msgs)return;
  var text=input.value.trim();
  if(!text)return;
  var s=document.getElementById('ksChatSuggs');
  if(s)s.style.display='none';
  input.value='';btn.disabled=true;
  var um=document.createElement('div');um.className='ks-msg user';um.textContent=text;msgs.appendChild(um);
  var tm=document.createElement('div');tm.className='ks-msg bot typing';
  tm.innerHTML='<div class="sci-dots"><span></span><span></span><span></span></div>';
  msgs.appendChild(tm);msgs.scrollTop=msgs.scrollHeight;
  chatHistory.push({role:'user',text:text});
  var hc='';var sl=chatHistory.slice(-6);
  for(var hi=0;hi<sl.length;hi++){hc+=(sl[hi].role==='user'?'User':'Assistant')+': '+sl[hi].text+'\n';}
  var reply=await callGemini(KS_SYSTEM+'\n\nConversation:\n'+hc+'\nRespond as KS Assistant:');
  chatHistory.push({role:'bot',text:reply});
  tm.remove();
  var bm=document.createElement('div');bm.className='ks-msg bot';bm.textContent=cleanAIText(reply);
  msgs.appendChild(bm);msgs.scrollTop=msgs.scrollHeight;btn.disabled=false;input.focus();
}

var sciSubject='maths';
var SCI_EX={
  maths:['Solve x^2+5x+6=0','Integrate x^2 dx','Derivative of sin(x)','Pythagoras theorem','3/4 + 2/5'],
  physics:['Newton second law','Force m=5kg a=3m/s','Ohm law','Kinetic energy formula','Refraction'],
  chemistry:['Atomic number of Carbon','Balance H2+O2','Covalent bonding','pH scale','Periodic table'],
  general:['What is DNA','Water cycle','What causes thunder','How vaccines work','Speed of light']
};

function renderScience(){
  var h='<div class="page-wrap">';
  h+='<div class="back-row"><button class="back-btn" onclick="go(\'home\')">Back</button></div>';
  h+='<div class="inner-card"><h2>Science Solver</h2>';
  h+='<p style="color:var(--muted);font-size:13px;margin-bottom:16px">Powered by Gemini AI.</p>';
  h+='<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px" id="sciTabs">';
  h+='<button class="calc-tab active" onclick="setSciSubject(\'maths\',this)">Maths</button>';
  h+='<button class="calc-tab" onclick="setSciSubject(\'physics\',this)">Physics</button>';
  h+='<button class="calc-tab" onclick="setSciSubject(\'chemistry\',this)">Chemistry</button>';
  h+='<button class="calc-tab" onclick="setSciSubject(\'general\',this)">General</button>';
  h+='</div>';
  h+='<div id="sciExamples" style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px"></div>';
  h+='<label class="field-label">Your Question</label>';
  h+='<textarea class="ks-input" id="sciQuestion" rows="3" style="resize:vertical" placeholder="Type your question..."></textarea>';
  h+='<button class="btn btn-primary" style="width:100%;margin-top:12px" onclick="solveScience()" id="sciSolveBtn">Solve with AI</button>';
  h+='<div id="sciOutput" style="margin-top:8px"></div>';
  h+='</div></div>';
  appEl.innerHTML=h;
  updateSciExamples();
}

function setSciSubject(s,btn){
  sciSubject=s;
  var tabs=document.querySelectorAll('#sciTabs .calc-tab');
  for(var i=0;i<tabs.length;i++)tabs[i].classList.remove('active');
  if(btn)btn.classList.add('active');
  updateSciExamples();
}

function updateSciExamples(){
  var el=document.getElementById('sciExamples');
  if(!el)return;
  var arr=SCI_EX[sciSubject]||[];
  var h='';
  for(var i=0;i<arr.length;i++){
    h+='<button class="ks-sugg-btn" onclick="setSciQ(\''+arr[i].replace(/'/g,"\\'")+'\')">'+arr[i]+'</button>';
  }
  el.innerHTML=h;
}

function setSciQ(t){var q=document.getElementById('sciQuestion');if(q){q.value=t;q.focus();}}

async function solveScience(){
  var q=document.getElementById('sciQuestion');
  var out=document.getElementById('sciOutput');
  var btn=document.getElementById('sciSolveBtn');
  if(!q||!out)return;
  var question=q.value.trim();
  if(!question){q.focus();return;}
  btn.disabled=true;btn.textContent='Solving...';
  out.innerHTML='<div class="sci-loading"><div class="sci-dots"><span></span><span></span><span></span></div><span>Thinking...</span></div>';
  var pr={
    maths:'You are an expert maths teacher. Solve step by step.',
    physics:'You are an expert physics teacher. Explain with formulas.',
    chemistry:'You are an expert chemistry teacher. Show equations.',
    general:'You are an expert science teacher. Clear explanation.'
  };
  var result=await callGemini((pr[sciSubject]||pr.general)+'\n\nQuestion: '+question);
  btn.disabled=false;btn.textContent='Solve with AI';
  var cleaned=cleanAIText(result).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>');
  var oh='<div class="sci-result">'+cleaned+'</div>';
  oh+='<button class="btn" style="width:100%;margin-top:10px;background:var(--bg2);border:1px solid var(--border);color:var(--muted);border-radius:14px;padding:12px;cursor:pointer"';
  oh+=' onclick="document.getElementById(\'sciQuestion\').value=\'\';document.getElementById(\'sciOutput\').innerHTML=\'\'">';
  oh+='Ask Another</button>';
  out.innerHTML=oh;
}

/* ── SETTINGS DRAWER LOGIC (added) ── */
var aiEnabled=true;
var fabCorner='br';
var fabCustomPos=null;
var easyMode=false;
var easterEggs=true;
var palette='amber';
var seriousMode=false;
var appearanceExpanded=null;
function toggleAppearanceSection(sec){
  appearanceExpanded = appearanceExpanded===sec ? null : sec;
  renderSettingsPanel();
}
var staticEmojiOriginals=null;
const EMOJI_RE=/[\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{2B00}-\u{2BFF}\uFE0F]/gu;
function stripEmojiInNode(root){
  if(!root)return;
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,null);
  const nodes=[];let n;
  while(n=walker.nextNode())nodes.push(n);
  nodes.forEach(function(tn){
    const stripped=tn.nodeValue.replace(EMOJI_RE,'').replace(/ {2,}/g,' ').replace(/^ | $/g,'');
    // only strip if meaningful text remains — icon-only content (e.g. Sudoku's ✏️ toggle) stays untouched
    if(stripped.trim().length>0) tn.nodeValue=stripped;
  });
}
function applySeriousMode(){
  document.body.classList.toggle('serious-mode',seriousMode);
  const navEl=document.querySelector('nav');
  const mobileMenuEl=document.getElementById('navMobileMenu');
  const settingsHeaderEl=document.querySelector('.settings-drawer-header');
  if(seriousMode){
    if(!staticEmojiOriginals){
      staticEmojiOriginals={
        nav: navEl?navEl.innerHTML:null,
        mobileMenu: mobileMenuEl?mobileMenuEl.innerHTML:null,
        settingsHeader: settingsHeaderEl?settingsHeaderEl.innerHTML:null
      };
    }
    stripEmojiInNode(navEl);
    stripEmojiInNode(mobileMenuEl);
    stripEmojiInNode(settingsHeaderEl);
    stripEmojiInNode(appEl);
    stripEmojiInNode(document.getElementById('settingsBody'));
  }else if(staticEmojiOriginals){
    if(navEl && staticEmojiOriginals.nav!=null) navEl.innerHTML=staticEmojiOriginals.nav;
    if(mobileMenuEl && staticEmojiOriginals.mobileMenu!=null) mobileMenuEl.innerHTML=staticEmojiOriginals.mobileMenu;
    if(settingsHeaderEl && staticEmojiOriginals.settingsHeader!=null) settingsHeaderEl.innerHTML=staticEmojiOriginals.settingsHeader;
  }
}
function settingsToggleSeriousMode(){
  // deprecated: Serious is now selected via setTheme('serious')
}
var settingsView='menu';

const APP_UPDATED='24 July 2026';
const CHANGELOG=[
  '🎉 4 new Fun tools are live: If Earth Was... (your weight on other planets), Age on Mars (your age across the solar system), Moon Phase Calculator, and What If Calculators',
  '📏 Life in Numbers now supports cm/ft-in for height and kg/lb for weight, not just one fixed unit',
  '🎩 New: Vintage theme — sepia/aged-paper palette, Playfair Display serif headings',
  '⬜ New: Boring/Minimal theme — plain white/black, classic blue links, zero decoration',
  '⏱️ Stopwatch now has a proper Cancel button',
  '🎨 All themes now support both Dark and Light mode'
];
const SETTINGS_MENU=[
  {id:'appearance',icon:'🎨',label:'Appearance',desc:'Theme & colors'},
  {id:'accessibility',icon:'♿',label:'Accessibility',desc:'Simple Mode & extras'},
  {id:'ai',icon:'🤖',label:'AI Assistant',desc:'Chat button on/off & position'},
  {id:'invite',icon:'📤',label:'Invite a Friend',desc:'Share KS Tech'},
  {id:'feedback',icon:'💬',label:'Help & Feedback',desc:'Send feedback, get in touch'},
  {id:'backup',icon:'💾',label:'Backup & Restore',desc:'Save/restore settings as a code'},
  {id:'whatsnew',icon:'🆕',label:"What's New",desc:'Last updated '+APP_UPDATED}
];

const PALETTES=[
  {id:'amber',name:'Amber',color:'#F5A623'},
  {id:'indigo',name:'Indigo',color:'#3D52D5'},
  {id:'emerald',name:'Emerald',color:'#22C58B'},
  {id:'rose',name:'Rose',color:'#F0507E'},
  {id:'violet',name:'Violet',color:'#9B6BF2'},
  {id:'cyan',name:'Cyan',color:'#22B8CF'}
];
const FONT_SIZES=[
  {name:'Small',scale:0.9,preview:14},
  {name:'Normal',scale:1,preview:16},
  {name:'Large',scale:1.15,preview:18},
  {name:'X-Large',scale:1.3,preview:20}
];
const THEMES=[
  {id:'pixel',name:'Pixelated',icon:'👾'},
  {id:'default',name:'Classic',icon:'🌌'},
  {id:'calm',name:'Calm',icon:'🌿'},
  {id:'futuristic',name:'Futuristic',icon:'🚀'},
  {id:'retro',name:'Retro',icon:'📼'},
  {id:'hacker',name:'Hacker',icon:'💻'},
  {id:'vintage',name:'Vintage',icon:'🎩'},
  {id:'boring',name:'Boring',icon:'⬜'},
  {id:'serious',name:'Serious',icon:'🧐'}
];
const THEME_CLASSES=['theme-calm','theme-futuristic','theme-retro','theme-pixel','theme-hacker','theme-vintage','theme-boring'];
var theme='pixel';
function setTheme(id){
  theme=id;
  document.body.classList.remove.apply(document.body.classList,THEME_CLASSES);
  if(id!=='default' && id!=='serious') document.body.classList.add('theme-'+id);
  seriousMode = (id==='serious');
  applySeriousMode();
  renderSettingsPanel();
  schedulePrefsSave();
}
var fontScale=1;
function setFontScale(scale){
  fontScale=scale;
  document.documentElement.style.zoom=scale;
  renderSettingsPanel();
  schedulePrefsSave();
}
function setPalette(id){
  palette=id;
  document.documentElement.setAttribute('data-palette',id);
  renderSettingsPanel();
  schedulePrefsSave();
}
function goSettingsView(v){
  settingsView=v;
  if(v==='whatsnew')markWhatsNewSeen();
  renderSettingsPanel();
}
function markWhatsNewSeen(){
  var btns=document.querySelectorAll('.settings-icon-btn');
  for(var i=0;i<btns.length;i++)btns[i].classList.remove('has-badge');
}

function renderSettingsPanel(){
  const body=document.getElementById('settingsBody');
  if(!body)return;
  if(settingsView==='menu'){
    body.innerHTML = renderAccountMenuButton()
    + SETTINGS_MENU.map(function(m){
      return '<button class="settings-menu-item" onclick="goSettingsView(\''+m.id+'\')">'
        +'<span class="settings-menu-icon">'+m.icon+'</span>'
        +'<span class="settings-menu-text"><strong>'+m.label+'</strong><span>'+m.desc+'</span></span>'
        +'<span class="settings-menu-chevron">›</span></button>';
    }).join('')
    +'<button class="settings-menu-item" onclick="closeSettings();go(\'about\')">'
      +'<span class="settings-menu-icon">ℹ️</span>'
      +'<span class="settings-menu-text"><strong>About this app</strong><span>Who built this, and how your data is handled</span></span>'
      +'<span class="settings-menu-chevron">›</span></button>'
    +'<p style="font-size:11.5px;color:var(--muted);line-height:1.6;margin-top:6px;">These display settings live only in this browser tab and reset when you refresh. Only your account info (if you sign in) is saved.</p>';
    return;
  }
  var backBtn='<button class="settings-panel-back" onclick="goSettingsView(\'menu\')">‹ Back to Settings</button>';
  if(settingsView==='appearance'){
    const curPalette=PALETTES.find(function(p){return p.id===palette;});
    const curFont=FONT_SIZES.find(function(f){return f.scale===fontScale;});
    let html=backBtn+'<div class="settings-panel-title">🎨 Appearance</div>'
      +'<div class="settings-row"><div class="settings-row-text"><strong>Dark / Light mode</strong><span id="settingsThemeLabel">Currently: Dark</span></div>'
      +'<button class="ks-switch" id="settingsThemeSwitch" onclick="settingsToggleTheme()" aria-label="Toggle theme"><span class="theme-icon moon">🌙</span><span class="theme-icon sun">☀️</span></button></div>';

    html+='<button class="settings-menu-item" onclick="toggleAppearanceSection(\'colors\')" style="margin-top:8px;'+(appearanceExpanded==='colors'?'border-radius:16px 16px 0 0;margin-bottom:0;':'')+'">'
      +'<span class="settings-menu-icon">🎨</span>'
      +'<span class="settings-menu-text"><strong>Accent Color</strong><span>'+(theme!=='default'?'Overridden by the '+(THEMES.find(function(t){return t.id===theme;})||{}).name+' theme':'Currently: '+(curPalette?curPalette.name:'Amber'))+'</span></span>'
      +'<span class="settings-menu-chevron">'+(appearanceExpanded==='colors'?'⌄':'›')+'</span></button>';
    if(appearanceExpanded==='colors'){
      html+='<div style="background:var(--surface);border:1px solid var(--border);border-top:none;border-radius:0 0 16px 16px;padding:16px;margin-bottom:10px;"><div class="palette-grid">'
        +PALETTES.map(function(p){
          return '<div class="palette-swatch'+(palette===p.id?' active':'')+'" onclick="setPalette(\''+p.id+'\')">'
            +'<span class="dot" style="background:'+p.color+'"></span><span class="plabel">'+p.name+'</span></div>';
        }).join('')
        +'</div></div>';
    }

    html+='<button class="settings-menu-item" onclick="toggleAppearanceSection(\'font\')" style="'+(appearanceExpanded==='font'?'border-radius:16px 16px 0 0;margin-bottom:0;':'')+'">'
      +'<span class="settings-menu-icon">🔤</span>'
      +'<span class="settings-menu-text"><strong>Text Size</strong><span>Currently: '+(curFont?curFont.name:'Normal')+'</span></span>'
      +'<span class="settings-menu-chevron">'+(appearanceExpanded==='font'?'⌄':'›')+'</span></button>';
    if(appearanceExpanded==='font'){
      html+='<div style="background:var(--surface);border:1px solid var(--border);border-top:none;border-radius:0 0 16px 16px;padding:16px;margin-bottom:10px;"><div class="palette-grid" style="grid-template-columns:repeat(4,1fr);">'
        +FONT_SIZES.map(function(f){
          return '<div class="palette-swatch'+(fontScale===f.scale?' active':'')+'" onclick="setFontScale('+f.scale+')">'
            +'<span style="font-size:'+f.preview+'px;font-weight:800;">A</span><span class="plabel">'+f.name+'</span></div>';
        }).join('')
        +'</div></div>';
    }

    const curTheme=THEMES.find(function(t){return t.id===theme;});
    html+='<button class="settings-menu-item" onclick="toggleAppearanceSection(\'theme\')" style="'+(appearanceExpanded==='theme'?'border-radius:16px 16px 0 0;margin-bottom:0;':'')+'">'
      +'<span class="settings-menu-icon">'+(curTheme?curTheme.icon:'🌌')+'</span>'
      +'<span class="settings-menu-text"><strong>Theme</strong><span>'+(curTheme?curTheme.name:'Default')+'</span></span>'
      +'<span class="settings-menu-chevron">'+(appearanceExpanded==='theme'?'⌄':'›')+'</span></button>';
    if(appearanceExpanded==='theme'){
      html+='<div style="background:var(--surface);border:1px solid var(--border);border-top:none;border-radius:0 0 16px 16px;padding:16px;margin-bottom:10px;"><div class="palette-grid">'
        +THEMES.map(function(t){
          return '<div class="palette-swatch'+(theme===t.id?' active':'')+'" onclick="setTheme(\''+t.id+'\')">'
            +'<span style="font-size:26px;">'+t.icon+'</span><span class="plabel">'+t.name+'</span></div>';
        }).join('')
        +'</div></div>';
    }
    body.innerHTML=html;
  }
  else if(settingsView==='accessibility'){
    body.innerHTML=backBtn+'<div class="settings-panel-title">♿ Accessibility</div>'
      +'<div class="settings-row"><div class="settings-row-text"><strong>Simple Mode</strong><span>Big, flat, easy-to-tap buttons on the home screen</span></div>'
      +'<button class="ks-switch" id="settingsEasySwitch" onclick="settingsToggleEasyMode()" aria-label="Toggle simple mode"></button></div>'
      +'<div class="settings-row"><div class="settings-row-text"><strong>Easter eggs</strong><span>Playful loading jokes in some tools (e.g. What Day Was It)</span></div>'
      +'<button class="ks-switch" id="settingsEggsSwitch" onclick="settingsToggleEasterEggs()" aria-label="Toggle easter eggs"></button></div>';
  }
  else if(settingsView==='ai'){
    body.innerHTML=backBtn+'<div class="settings-panel-title">🤖 AI Assistant</div>'
      +'<div class="settings-row"><div class="settings-row-text"><strong>Enable AI button</strong><span>Turn the chat assistant on or off</span></div>'
      +'<button class="ks-switch" id="settingsAiSwitch" onclick="settingsToggleAI()" aria-label="Toggle AI assistant"></button></div>'
      +'<div class="settings-section-label" style="margin-top:14px">AI button position</div>'
      +'<div class="pos-grid" id="posGrid">'
      +'<button class="pos-btn'+(fabCorner==='tl'?' active':'')+'" data-pos="tl" onclick="setFabCorner(\'tl\')">↖ Top left</button>'
      +'<button class="pos-btn'+(fabCorner==='tr'?' active':'')+'" data-pos="tr" onclick="setFabCorner(\'tr\')">↗ Top right</button>'
      +'<button class="pos-btn'+(fabCorner==='bl'?' active':'')+'" data-pos="bl" onclick="setFabCorner(\'bl\')">↙ Bottom left</button>'
      +'<button class="pos-btn'+(fabCorner==='br'?' active':'')+'" data-pos="br" onclick="setFabCorner(\'br\')">↘ Bottom right</button></div>'
      +'<span style="font-size:12px;color:var(--muted);">Tip: on top of a preset, you can also drag the AI button itself anywhere on screen.</span>';
  }
  else if(settingsView==='invite'){
    body.innerHTML=backBtn+'<div class="settings-panel-title">📤 Invite a Friend</div>'
      +'<p style="font-size:13px;color:var(--muted);margin-bottom:14px;">Share KS Tech with someone who\'d like it.</p>'
      +'<button class="btn btn-primary" style="width:100%" onclick="shareApp()">📤 Share KS Tech</button>'
      +'<div class="fb-status" id="shareStatus"></div>';
  }
  else if(settingsView==='feedback'){
    body.innerHTML=backBtn+'<div class="settings-panel-title">💬 Help & Feedback</div>'
      +(MAIN_TUTORIAL_VIDEO_ID
        ? '<div style="position:relative;padding-top:56.25%;border-radius:14px;overflow:hidden;margin-bottom:18px;"><iframe src="https://www.youtube.com/embed/'+MAIN_TUTORIAL_VIDEO_ID+'" style="position:absolute;top:0;left:0;width:100%;height:100%;border:0;" allowfullscreen></iframe></div>'
        : '<div class="info-box">🎬 A full walkthrough video is on the way. Each tool also has its own ❓ help button once you\'re inside it.</div>')
      +'<textarea class="fb-textarea" id="fbText" placeholder="e.g. Love the app! Could you add a QR code generator?"></textarea>'
      +'<button class="btn btn-primary" style="width:100%" onclick="sendFeedback()" id="fbSendBtn">✉️ Send feedback</button>'
      +'<div class="fb-status" id="fbStatus"></div>'
      +'<button class="settings-btn" style="margin-top:14px" onclick="window.open(IG,\'_blank\')">📸 Official Instagram <span>›</span></button>';
  }
  else if(settingsView==='backup'){
    body.innerHTML=backBtn+'<div class="settings-panel-title">💾 Backup & Restore</div>'
      +'<p style="font-size:13px;color:var(--muted);margin-bottom:14px;">Nothing here saves automatically. Generate a short code for your current settings (theme, color, AI, etc.) and paste it back in later — even on a different device — to bring them back.</p>'
      +'<button class="btn btn-secondary" style="width:100%" onclick="doExportSettings()">📤 Generate my code</button>'
      +'<textarea class="fb-textarea" id="exportCodeBox" readonly style="display:none;margin-top:10px;font-family:monospace;font-size:11px;"></textarea>'
      +'<button class="btn btn-ghost" style="width:100%;margin-top:8px;display:none" id="copyCodeBtn" onclick="copyExportCode()">📋 Copy code</button>'
      +'<div class="settings-section-label" style="margin-top:22px">Restore from a code</div>'
      +'<textarea class="fb-textarea" id="importCodeInput" placeholder="Paste your saved code here"></textarea>'
      +'<button class="btn btn-primary" style="width:100%" onclick="importSettingsCode()">📥 Restore settings</button>'
      +'<div class="fb-status" id="backupStatus"></div>';
  }
  else if(settingsView==='whatsnew'){
    body.innerHTML=backBtn+'<div class="settings-panel-title">🆕 What\'s New</div>'
      +'<p style="font-size:12px;color:var(--muted);margin-bottom:14px;">Last updated: '+APP_UPDATED+'</p>'
      +'<ul style="padding-left:18px;display:flex;flex-direction:column;gap:10px;font-size:13.5px;color:var(--text);">'
      +CHANGELOG.map(function(c){return '<li>'+c+'</li>';}).join('')
      +'</ul>';
  }
  else if(settingsView==='account'){
    body.innerHTML=backBtn+renderAccountPanel();
  }
  syncSettingsUI();
  if(seriousMode)stripEmojiInNode(body);
}

/* ── PERSISTENCE (added): local autosave for everyone, cloud sync when signed in ── */
var PREFS_KEY='kstech_prefs_v1';
function collectPrefs(){
  return {theme:isLight()?'light':'dark',palette:palette,aiEnabled:aiEnabled,fabCorner:fabCorner,fabCustomPos:fabCustomPos,easyMode:easyMode,easterEggs:easterEggs,fontScale:fontScale,seriousMode:seriousMode,visualTheme:theme,lastPage:(curPage==='auth'?'home':curPage)};
}
function applyPrefs(data){
  if(!data)return;
  if(data.theme){ document.documentElement.setAttribute('data-theme',data.theme); }
  if(typeof data.aiEnabled==='boolean'){ aiEnabled=data.aiEnabled; applyAISettings(); }
  if(typeof data.easyMode==='boolean'){ easyMode=data.easyMode; }
  if(typeof data.easterEggs==='boolean'){ easterEggs=data.easterEggs; }
  if(data.fabCorner){ fabCorner=data.fabCorner; fabCustomPos=(data.fabCustomPos||null); applyFabPosition(); }
  if(data.palette){ palette=data.palette; document.documentElement.setAttribute('data-palette',data.palette); }
  if(typeof data.fontScale==='number'){ fontScale=data.fontScale; document.documentElement.style.zoom=fontScale; }
  if(typeof data.seriousMode==='boolean' && data.seriousMode!==seriousMode){ seriousMode=data.seriousMode; applySeriousMode(); }
  if(data.visualTheme){ setTheme(data.visualTheme); }
}
function savePrefsLocal(){
  try{ localStorage.setItem(PREFS_KEY, JSON.stringify(collectPrefs())); }catch(e){}
}
function loadPrefsLocal(){
  try{
    var raw=localStorage.getItem(PREFS_KEY);
    if(raw){ var data=JSON.parse(raw); applyPrefs(data); return data; }
  }catch(e){}
  return null;
}
var prefsCloudTimer=null;
function schedulePrefsSave(){
  savePrefsLocal();
  if(currentUser && window.KSFirebase && window.KSFirebase.savePrefs){
    clearTimeout(prefsCloudTimer);
    prefsCloudTimer=setTimeout(function(){
      window.KSFirebase.savePrefs(collectPrefs()).catch(function(){});
    },800);
  }
}

function doExportSettings(){
  var data=collectPrefs();
  var code=btoa(JSON.stringify(data));
  var box=document.getElementById('exportCodeBox');
  var copyBtn=document.getElementById('copyCodeBtn');
  if(box){ box.value=code; box.style.display='block'; }
  if(copyBtn)copyBtn.style.display='block';
}
function copyExportCode(){
  var box=document.getElementById('exportCodeBox');
  var st=document.getElementById('backupStatus');
  if(!box)return;
  box.select();
  if(navigator.clipboard){
    navigator.clipboard.writeText(box.value).then(function(){
      if(st){st.textContent='✅ Copied! Save this somewhere safe — a Notes app works fine.';st.className='fb-status ok';}
    }).catch(function(){
      if(st){st.textContent='Could not auto-copy — the code is selected, copy it manually.';st.className='fb-status err';}
    });
  }
}
function importSettingsCode(){
  var input=document.getElementById('importCodeInput');
  var st=document.getElementById('backupStatus');
  if(!input||!input.value.trim()){ if(st){st.textContent='Paste a code first.';st.className='fb-status err';} return; }
  try{
    var data=JSON.parse(atob(input.value.trim()));
    applyPrefs(data);
    renderSettingsPanel();
    schedulePrefsSave();
    if(st){st.textContent='✅ Settings restored!';st.className='fb-status ok';}
  }catch(e){
    if(st){st.textContent="⚠️ That code doesn't look valid — check you copied the whole thing.";st.className='fb-status err';}
  }
}

function shareApp(){
  var text="Hey! I'm using KS Tech — a growing collection of free, ad-free tools. Most tools work instantly with no sign-up; a free optional account just unlocks a few extras like the community feed. Check it out: "+SITE_URL;
  var status=document.getElementById('shareStatus');
  if(navigator.share){
    navigator.share({title:'KS Tech',text:text}).catch(function(){});
  }else if(navigator.clipboard){
    navigator.clipboard.writeText(text).then(function(){
      if(status){status.textContent='✅ Copied! Paste it into any chat app to share.';status.className='fb-status ok';}
    }).catch(function(){
      if(status){status.textContent='Could not copy automatically. Select and copy: '+text;status.className='fb-status err';}
    });
  }else if(status){
    status.textContent=text;status.className='fb-status';
  }
}

function settingsToggleEasyMode(){
  easyMode=!easyMode;
  syncSettingsUI();
  closeSettings();
  go('home');
  schedulePrefsSave();
}
function settingsToggleEasterEggs(){ easterEggs=!easterEggs; syncSettingsUI(); schedulePrefsSave(); }

var settingsHistoryPushed=false;
function openSettings(){
  settingsView='menu';
  renderSettingsPanel();
  document.getElementById('settingsOverlay').classList.add('open');
  document.getElementById('settingsDrawer').classList.add('open');
  history.pushState({ksOverlay:'settings'},'','');
  settingsHistoryPushed=true;
}
function closeSettings(){
  document.getElementById('settingsOverlay').classList.remove('open');
  document.getElementById('settingsDrawer').classList.remove('open');
  if(settingsHistoryPushed){ settingsHistoryPushed=false; history.back(); }
}
window.addEventListener('popstate',function(){
  if(document.getElementById('settingsDrawer').classList.contains('open')){
    settingsHistoryPushed=false;
    document.getElementById('settingsOverlay').classList.remove('open');
    document.getElementById('settingsDrawer').classList.remove('open');
  }
});
function syncSettingsUI(){
  var light=isLight();
  var ts=document.getElementById('settingsThemeSwitch');
  var tl=document.getElementById('settingsThemeLabel');
  if(ts)ts.classList.toggle('on',light);
  if(tl)tl.textContent='Currently: '+(light?'Light':'Dark');
  var as=document.getElementById('settingsAiSwitch');
  if(as)as.classList.toggle('on',aiEnabled);
  var es=document.getElementById('settingsEasySwitch');
  if(es)es.classList.toggle('on',easyMode);
  var eggs=document.getElementById('settingsEggsSwitch');
  if(eggs)eggs.classList.toggle('on',easterEggs);
}
function settingsToggleTheme(){ toggleTheme(); syncSettingsUI(); }
function settingsToggleAI(){ aiEnabled=!aiEnabled; syncSettingsUI(); applyAISettings(); schedulePrefsSave(); }
function applyAISettings(){
  var fab=document.getElementById('ksChatFab');
  var panel=document.getElementById('ksChatPanel');
  if(!fab)return;
  if(aiEnabled){ fab.style.display='flex'; }
  else{ fab.style.display='none'; if(panel)panel.classList.remove('open'); chatOpen=false; }
}
function setFabCorner(corner){
  fabCorner=corner; fabCustomPos=null;
  var btns=document.querySelectorAll('#posGrid .pos-btn');
  for(var i=0;i<btns.length;i++)btns[i].classList.toggle('active',btns[i].dataset.pos===corner);
  applyFabPosition();
  schedulePrefsSave();
}
function applyFabPosition(){
  var fab=document.getElementById('ksChatFab');
  var panel=document.getElementById('ksChatPanel');
  if(!fab)return;
  fab.style.left='';fab.style.top='';fab.style.right='';fab.style.bottom='';
  if(fabCustomPos){ fab.style.left=fabCustomPos.left+'px'; fab.style.top=fabCustomPos.top+'px'; }
  else{
    if(fabCorner==='br'){fab.style.right='20px';fab.style.bottom='24px';}
    else if(fabCorner==='bl'){fab.style.left='20px';fab.style.bottom='24px';}
    else if(fabCorner==='tr'){fab.style.right='20px';fab.style.top='24px';}
    else if(fabCorner==='tl'){fab.style.left='20px';fab.style.top='24px';}
  }
  if(panel){
    panel.style.right='';panel.style.left='';panel.style.bottom='';panel.style.top='';
    var r=fab.getBoundingClientRect();
    var openUp=r.top>window.innerHeight/2;
    var openLeft=r.left>window.innerWidth/2;
    if(openUp) panel.style.bottom=(window.innerHeight-r.top+10)+'px'; else panel.style.top=(r.bottom+10)+'px';
    if(openLeft) panel.style.right=(window.innerWidth-r.right)+'px'; else panel.style.left=r.left+'px';
  }
}
function makeFabDraggable(){
  var fab=document.getElementById('ksChatFab');
  if(!fab)return;
  fab.classList.add('ks-draggable');
  var dragging=false,moved=false,startX,startY,startLeft,startTop;
  fab.addEventListener('pointerdown',function(e){
    dragging=true;moved=false;
    var r=fab.getBoundingClientRect();
    startX=e.clientX;startY=e.clientY;startLeft=r.left;startTop=r.top;
    try{fab.setPointerCapture(e.pointerId);}catch(err){}
    fab.classList.add('ks-dragging');
  });
  fab.addEventListener('pointermove',function(e){
    if(!dragging)return;
    var dx=e.clientX-startX,dy=e.clientY-startY;
    if(Math.abs(dx)>4||Math.abs(dy)>4)moved=true;
    if(!moved)return;
    var w=fab.offsetWidth,h=fab.offsetHeight;
    var left=Math.min(Math.max(0,startLeft+dx),window.innerWidth-w);
    var top=Math.min(Math.max(0,startTop+dy),window.innerHeight-h);
    fab.style.right='';fab.style.bottom='';
    fab.style.left=left+'px';fab.style.top=top+'px';
    fabCustomPos={left:left,top:top};
  });
  function endDrag(){
    if(!dragging)return;
    dragging=false;
    fab.classList.remove('ks-dragging');
    if(moved){applyFabPosition();schedulePrefsSave();}
  }
  fab.addEventListener('pointerup',endDrag);
  fab.addEventListener('pointercancel',endDrag);
  fab.onclick=function(){ if(!moved) toggleChat(); };
}
new MutationObserver(function(){syncSettingsUI();}).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});

/* ═══════════════════════ BACKGROUND TIMER PILL ═══════════════════════
   Shows a small draggable pill (Dynamic-Island style) whenever the
   Stopwatch and/or Timer has an active session and you're on a
   different page. If BOTH are running at once, the pill holds two
   pages you scroll through vertically — swipe up/down to see the
   other one, tap a page to jump to that tool, tap its ✕ to dismiss. */
function injectTimerPill(){
  var pill=document.createElement('div');
  pill.className='ks-timer-pill';pill.id='ksTimerPill';
  pill.innerHTML=
    '<div class="ks-pill-drag" id="ksPillDrag">⠿</div>'+
    '<div class="ks-pill-scroll" id="ksPillScroll">'+
      '<div class="ks-pill-page" id="ksPillPageCd" data-kind="cd">'+
        '<span class="ks-pill-dot"></span><span class="ks-pill-label" id="ksPillLabelCd">00:00</span>'+
        '<span class="ks-pill-restart" id="ksPillRestartCd" data-kind="cd" title="Restart" style="display:none">🔁</span>'+
        '<span class="ks-pill-x" data-kind="cd" title="Dismiss">✕</span>'+
      '</div>'+
      '<div class="ks-pill-page" id="ksPillPageSw" data-kind="sw">'+
        '<span class="ks-pill-dot"></span><span class="ks-pill-label" id="ksPillLabelSw">00:00</span>'+
        '<span class="ks-pill-x" data-kind="sw" title="Dismiss">✕</span>'+
      '</div>'+
    '</div>';
  document.body.appendChild(pill);
  var pages=pill.querySelectorAll('.ks-pill-page');
  for(var i=0;i<pages.length;i++){
    pages[i].addEventListener('click',function(e){
      var kind=this.getAttribute('data-kind');
      if(e.target&&e.target.classList.contains('ks-pill-restart')){
        e.stopPropagation();
        restartCdTimer();
        return;
      }
      if(e.target&&e.target.classList.contains('ks-pill-x')){
        e.stopPropagation();
        dismissPillTimer(kind);
        return;
      }
      go(kind==='cd'?'countdown':'stopwatch');
    });
  }
  makePillDraggable(document.getElementById('ksPillDrag'),pill);
  setInterval(updateTimerPill,250);
}
/* Tapping ✕ on a still-running item just hides the pill — the timer/stopwatch
   keeps going in the background. Tapping ✕ on a *finished* countdown alarm
   silences it instead (that one really is done). To fully stop a running
   session, open its page and use Cancel there, same as before. */
function dismissPillTimer(kind){
  if(kind==='cd'){
    if(cdAlarmPlaying){ stopCdAlarm();cdFinished=false; }
    else{ cdPillHidden=true; }
  }else if(kind==='sw'){
    swPillHidden=true;
  }
  updateTimerPill();
}
function restartCdTimer(){
  stopCdAlarm();cdFinished=false;cdPillHidden=false;
  if(cdLastTotal>0){
    cdTotal=cdLastTotal;cdEnd=Date.now()+cdLastTotal*1000;cdRunning=true;
  }
  if(curPage==='countdown') renderCountdown();
  updateTimerPill();
}
/* Called the moment a countdown hits zero, whether or not we're on its page. */
function cdMarkFinished(){
  cdFinished=true;cdPillHidden=false;
  startCdAlarm();
  var scrollEl=document.getElementById('ksPillScroll');
  if(scrollEl) scrollEl.scrollTop=0; // surface the countdown page even if the stopwatch page was showing
}
function getKsAudioCtx(){
  if(!ksAudioCtx) ksAudioCtx=new (window.AudioContext||window.webkitAudioContext)();
  return ksAudioCtx;
}
function playPillBeep(){
  try{
    var ctx=getKsAudioCtx();
    if(ctx.state==='suspended') ctx.resume();
    var t=ctx.currentTime;
    [[880,t],[1040,t+.42]].forEach(function(pair){
      var o=ctx.createOscillator(),g=ctx.createGain();
      o.type='sine';o.frequency.value=pair[0];
      g.gain.setValueAtTime(0.0001,pair[1]);
      g.gain.exponentialRampToValueAtTime(0.22,pair[1]+.01);
      g.gain.exponentialRampToValueAtTime(0.0001,pair[1]+.33);
      o.connect(g);g.connect(ctx.destination);
      o.start(pair[1]);o.stop(pair[1]+.35);
    });
  }catch(err){}
}
function startCdAlarm(){
  if(cdAlarmPlaying)return;
  cdAlarmPlaying=true;
  playPillBeep();
  cdAlarmInterval=setInterval(playPillBeep,1800);
}
function stopCdAlarm(){
  cdAlarmPlaying=false;
  clearInterval(cdAlarmInterval);cdAlarmInterval=null;
}
function updateTimerPill(){
  var pill=document.getElementById('ksTimerPill');
  var pageCd=document.getElementById('ksPillPageCd');
  var pageSw=document.getElementById('ksPillPageSw');
  var labelCd=document.getElementById('ksPillLabelCd');
  var labelSw=document.getElementById('ksPillLabelSw');
  var restartCd=document.getElementById('ksPillRestartCd');
  if(!pill||!pageCd||!pageSw)return;
  // Catch a countdown reaching zero while we're away from its page —
  // cdTick only runs while the countdown page itself is open.
  if(cdRunning&&cdEnd<=Date.now()){
    clearInterval(cdInterval);cdRunning=false;cdTotal=0;
    cdMarkFinished();
  }
  var cdShow=cdAlarmPlaying||((cdRunning||cdTotal>0)&&curPage!=='countdown'&&!cdPillHidden);
  var swShow=(swRunning||swElapsed>0)&&curPage!=='stopwatch'&&!swPillHidden;

  if(cdShow){
    pageCd.style.display='flex';
    pageCd.classList.toggle('finished',cdAlarmPlaying);
    if(restartCd) restartCd.style.display=cdAlarmPlaying?'inline-block':'none';
    if(cdAlarmPlaying) labelCd.textContent="⏰ Time's up";
    else{ var rem=cdRunning?Math.max(0,Math.round((cdEnd-Date.now())/1000)):cdTotal; labelCd.textContent=cdFmt(rem); }
  }else{ pageCd.style.display='none'; }

  if(swShow){
    pageSw.style.display='flex';
    var total=swRunning?swElapsed+(Date.now()-swStart):swElapsed;
    labelSw.textContent=swFmt(total).slice(0,5);
  }else{ pageSw.style.display='none'; }

  pill.classList.toggle('show',cdShow||swShow);
}
function makePillDraggable(handle,pill){
  var dragging=false,startX,startY,startLeft,startTop;
  handle.addEventListener('pointerdown',function(e){
    dragging=true;
    var r=pill.getBoundingClientRect();
    startX=e.clientX;startY=e.clientY;startLeft=r.left;startTop=r.top;
    try{handle.setPointerCapture(e.pointerId);}catch(err){}
    pill.classList.add('ks-dragging');
  });
  handle.addEventListener('pointermove',function(e){
    if(!dragging)return;
    var dx=e.clientX-startX,dy=e.clientY-startY;
    var w=pill.offsetWidth,h=pill.offsetHeight;
    var left=Math.min(Math.max(0,startLeft+dx),window.innerWidth-w);
    var top=Math.min(Math.max(0,startTop+dy),window.innerHeight-h);
    pill.style.transform='none';
    pill.style.left=left+'px';pill.style.top=top+'px';
  });
  function endDrag(){
    if(!dragging)return;
    dragging=false;
    pill.classList.remove('ks-dragging');
  }
  handle.addEventListener('pointerup',endDrag);
  handle.addEventListener('pointercancel',endDrag);
}

function sendFeedback(){
  var ta=document.getElementById('fbText');
  var status=document.getElementById('fbStatus');
  var btn=document.getElementById('fbSendBtn');
  var msg=ta.value.trim();
  if(!msg){status.textContent='Please write something before sending.';status.className='fb-status err';return;}
  btn.disabled=true;btn.textContent='Sending...';
  status.textContent='';status.className='fb-status';
  fetch('https://formsubmit.co/ajax/'+EMAIL,{
    method:'POST',
    headers:{'Content-Type':'application/json','Accept':'application/json'},
    body:JSON.stringify({message:msg,_subject:'KS Tech — New feedback',_template:'box'})
  }).then(function(r){return r.json();}).then(function(){
    btn.disabled=false;btn.textContent='✉️ Send feedback';
    status.textContent='✅ Sent! Thanks — it goes straight to Kiran\'s inbox.';
    status.className='fb-status ok';
    ta.value='';
  }).catch(function(){
    btn.disabled=false;btn.textContent='✉️ Send feedback';
    status.innerHTML='⚠️ Could not send automatically. <a href="mailto:'+EMAIL+'?subject=KS%20Tech%20Feedback&body='+encodeURIComponent(msg)+'" style="color:var(--accent)">Tap here to email it instead</a>.';
    status.className='fb-status err';
  });
}

/* BOOT */
document.documentElement.setAttribute('data-palette','amber');
var ksSavedPrefs=loadPrefsLocal(); /* restore saved theme/palette/style/settings before first paint (added) */
if(!(ksSavedPrefs && ksSavedPrefs.visualTheme)){ document.body.classList.add('theme-pixel'); } /* Pixelated is now the default theme for new visitors (added) */
(function(){var btns=document.querySelectorAll('.settings-icon-btn');for(var i=0;i<btns.length;i++)btns[i].classList.add('has-badge');})();
if(ksSavedPrefs && ksSavedPrefs.lastPage && ksSavedPrefs.lastPage!=='home'){ go(ksSavedPrefs.lastPage); }
else{ renderHome(); }
injectChatbot();
applyAISettings();
makeFabDraggable();
