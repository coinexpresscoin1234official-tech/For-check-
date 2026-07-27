/* ═══════════════════════ ADMIN DASHBOARD (added) ═══════════════════════
   UX-only gate: everything here is convenience/navigation. The actual
   authorization boundary is Firestore's isAdmin() check on every read/write
   for adminConfig/security, appConfig/features, announcements, and
   inboxMessages — this code never grants access on its own, it just hides
   controls that would fail server-side anyway for a non-admin. */
var ADMIN_UNLOCK_KEY='ksAdminUnlocked_v1';
var ADMIN_IDLE_MS=30*60*1000; // re-lock after 30 min of no admin activity
var adminView='flags';        // 'flags' | 'announcements' | 'inbox'
var adminPinEntry='';
var adminPinBusy=false;
var adminPinErr=null;
var adminPinMode='check';     // 'check' | 'setup' (setup = no PIN doc exists yet)
var adminFlagsUnsub=null;
var adminAnnUnsub=null;
var adminInboxUnsub=null;
var adminAnnouncements=[];
var adminInboxMsgs=[];
var adminInboxTargetUid='';

function adminUnsubAll(){
  if(adminFlagsUnsub){ adminFlagsUnsub(); adminFlagsUnsub=null; }
  if(adminAnnUnsub){ adminAnnUnsub(); adminAnnUnsub=null; }
  if(adminInboxUnsub){ adminInboxUnsub(); adminInboxUnsub=null; }
}

function adminIsSessionUnlocked(){
  var raw;
  try{ raw=sessionStorage.getItem(ADMIN_UNLOCK_KEY); }catch(e){ return false; }
  if(!raw) return false;
  try{
    var obj=JSON.parse(raw);
    if(!obj||!obj.ts) return false;
    if(Date.now()-obj.ts>ADMIN_IDLE_MS){ sessionStorage.removeItem(ADMIN_UNLOCK_KEY); return false; }
    obj.ts=Date.now(); sessionStorage.setItem(ADMIN_UNLOCK_KEY, JSON.stringify(obj)); // refresh idle timer on activity
    return true;
  }catch(e){ return false; }
}
function adminMarkUnlocked(){
  try{ sessionStorage.setItem(ADMIN_UNLOCK_KEY, JSON.stringify({ts:Date.now()})); }catch(e){}
}
function adminLock(){
  try{ sessionStorage.removeItem(ADMIN_UNLOCK_KEY); }catch(e){}
  adminUnsubAll();
  adminPinEntry=''; adminPinErr=null;
  go('admin');
}

function adminDeniedHtml(msg){
  return '<section class="admin-pin-shell"><div class="admin-pin-icon">🚫</div>'
    +'<h2 class="section-title" style="margin-bottom:10px">Access denied</h2>'
    +'<p style="color:var(--muted);margin-bottom:20px">'+escapeHTML(msg)+'</p>'
    +'<button class="btn btn-secondary" onclick="go(\'home\')">← Back home</button></section>';
}

function renderAdmin(){
  if(!authReady){ appEl.innerHTML='<section class="admin-pin-shell"><p style="color:var(--muted)">Loading…</p></section>'; setTimeout(function(){ if(curPage==='admin') renderAdmin(); },250); return; }
  if(!currentUser){ appEl.innerHTML=adminDeniedHtml('Please sign in with an admin account first.'); return; }
  if(!communityIsAdmin()){ appEl.innerHTML=adminDeniedHtml("You don't have access to this page."); return; }
  if(!adminIsSessionUnlocked()){ renderAdminPinLock(); return; }
  renderAdminShell();
}

/* ── PIN lock screen ── */
function renderAdminPinLock(){
  adminPinEntry=''; adminPinErr=null; adminPinBusy=false; adminPinMode='check';
  appEl.innerHTML='<section class="admin-pin-shell" id="adminPinShell"><p style="color:var(--muted)">Checking security settings…</p></section>';
  if(!window.KSFirebase||!window.KSFirebase.adminGetSecurity){ adminPinErrShow('Still connecting — please try again in a moment.'); return; }
  window.KSFirebase.adminGetSecurity().then(function(snap){
    adminPinMode=(snap && snap.exists && snap.exists()) ? 'check' : 'setup';
    adminPinDraw();
  }).catch(function(err){
    adminPinErrShow(ksFriendlyAuthError?ksFriendlyAuthError(err):'Could not reach the database.');
  });
}
function adminPinErrShow(msg){
  var el=document.getElementById('adminPinShell');
  if(el) el.innerHTML='<div class="admin-pin-icon">⚠️</div><p style="color:var(--muted);margin-bottom:16px">'+escapeHTML(msg)+'</p><button class="btn btn-secondary" onclick="renderAdminPinLock()">Retry</button>';
}
function adminPinDraw(){
  var el=document.getElementById('adminPinShell');
  if(!el) return;
  var dots='';
  for(var i=0;i<6;i++){ dots+='<div class="admin-pin-dot'+(i<adminPinEntry.length?' filled':'')+'"></div>'; }
  var title=adminPinMode==='setup' ? 'Set an admin PIN' : 'Enter admin PIN';
  var sub=adminPinMode==='setup' ? 'No PIN is set yet — choose a 4–6 digit PIN to protect this dashboard on this device.' : 'This unlocks the dashboard for this browser tab only.';
  el.innerHTML='<div class="admin-pin-icon">🔐</div>'
    +'<h2 class="section-title" style="margin-bottom:6px">'+title+'</h2>'
    +'<p style="color:var(--muted);margin-bottom:6px;font-size:13.5px">'+sub+'</p>'
    +'<div class="admin-pin-dots">'+dots+'</div>'
    +'<div class="admin-pin-keypad">'
      +[1,2,3,4,5,6,7,8,9].map(function(n){return '<button class="admin-pin-key" onclick="adminPinPress(\''+n+'\')">'+n+'</button>';}).join('')
      +'<button class="admin-pin-key wide" onclick="adminPinBackspace()">⌫</button>'
      +'<button class="admin-pin-key" onclick="adminPinPress(\'0\')">0</button>'
      +'<button class="admin-pin-key wide" onclick="adminPinSubmit()">'+(adminPinBusy?'…':'✔')+'</button>'
    +'</div>'
    +'<div class="admin-pin-err">'+(adminPinErr?escapeHTML(adminPinErr):'')+'</div>'
    +'<button class="back-btn" style="margin-top:18px" onclick="go(\'home\')">← Cancel</button>';
}
function adminPinPress(d){
  if(adminPinBusy||adminPinEntry.length>=6) return;
  adminPinEntry+=d; adminPinErr=null; adminPinDraw();
}
function adminPinBackspace(){
  if(adminPinBusy) return;
  adminPinEntry=adminPinEntry.slice(0,-1); adminPinDraw();
}
function sha256Hex(str){
  return crypto.subtle.digest('SHA-256', new TextEncoder().encode(str)).then(function(buf){
    return Array.prototype.map.call(new Uint8Array(buf), function(b){ return b.toString(16).padStart(2,'0'); }).join('');
  });
}
function adminPinSubmit(){
  if(adminPinBusy) return;
  if(adminPinEntry.length<4){ adminPinErr='PIN must be at least 4 digits.'; adminPinDraw(); return; }
  adminPinBusy=true; adminPinErr=null; adminPinDraw();
  sha256Hex(adminPinEntry).then(function(hash){
    if(adminPinMode==='setup'){
      return window.KSFirebase.adminSetPin(hash).then(function(){
        adminPinBusy=false; adminMarkUnlocked(); renderAdmin();
      });
    }else{
      return window.KSFirebase.adminGetSecurity().then(function(snap){
        var data=(snap&&snap.exists&&snap.exists())?snap.data():null;
        adminPinBusy=false;
        if(data && data.pinHash===hash){ adminMarkUnlocked(); renderAdmin(); }
        else{ adminPinEntry=''; adminPinErr='Incorrect PIN.'; adminPinDraw(); }
      });
    }
  }).catch(function(err){
    adminPinBusy=false; adminPinEntry='';
    adminPinErr=ksFriendlyAuthError?ksFriendlyAuthError(err):'Something went wrong. Please try again.';
    adminPinDraw();
  });
}
function adminChangePinPrompt(){
  var p1=prompt('Enter a new admin PIN (4–6 digits):'); if(p1===null) return;
  p1=p1.trim();
  if(!/^\d{4,6}$/.test(p1)){ alert('PIN must be 4–6 digits.'); return; }
  sha256Hex(p1).then(function(hash){
    return window.KSFirebase.adminSetPin(hash);
  }).then(function(){
    alert('Admin PIN updated.');
  }).catch(function(err){
    alert('Could not update PIN: '+(err&&err.message?err.message:err));
  });
}

/* ── Dashboard shell ── */
function adminSetView(v){ adminUnsubAll(); adminView=v; adminRenderPanel(); }
function renderAdminShell(){
  appEl.innerHTML='<section class="admin-wrap">'
    +'<div class="back-row">'
      +'<button class="back-btn" onclick="go(\'home\')">← Home</button>'
      +'<button class="back-btn" onclick="adminChangePinPrompt()">Change PIN</button>'
      +'<button class="back-btn" style="margin-left:auto" onclick="adminLock()">🔒 Lock</button>'
    +'</div>'
    +'<h2 class="section-title" style="margin-bottom:4px">Admin Dashboard</h2>'
    +'<p style="color:var(--muted);margin-bottom:22px">Signed in as '+escapeHTML(currentUser.displayName||currentUser.email||'')+'</p>'
    +'<div class="admin-tabs">'
      +'<button class="admin-tab'+(adminView==='flags'?' active':'')+'" onclick="adminSetView(\'flags\')">🚩 Feature Flags</button>'
      +'<button class="admin-tab'+(adminView==='announcements'?' active':'')+'" onclick="adminSetView(\'announcements\')">📣 Announcements</button>'
      +'<button class="admin-tab'+(adminView==='inbox'?' active':'')+'" onclick="adminSetView(\'inbox\')">📥 Inbox</button>'
    +'</div>'
    +'<div id="adminPanelBody"></div>'
  +'</section>';
  adminRenderPanel();
}
function adminRenderPanel(){
  var el=document.getElementById('adminPanelBody'); if(!el) return;
  if(adminView==='flags') renderAdminFlagsPanel(el);
  else if(adminView==='announcements') renderAdminAnnouncementsPanel(el);
  else if(adminView==='inbox') renderAdminInboxPanel(el);
}
function adminErrorHtml(err){
  return '<div class="admin-card"><p style="color:#FF5A5A">'+escapeHTML(ksFriendlyAuthError?ksFriendlyAuthError(err):'Something went wrong.')+'</p></div>';
}

/* ── Feature flags panel ── */
var adminFeatureFlags={};
var ADMIN_FLAG_KEY_RE=/^[a-z][a-z0-9_]{1,39}$/;
function renderAdminAppFeaturesHtml(){
  var groups=FEATURE_CATALOG.map(function(g){
    var rows=g.items.map(function(it){
      var on=!(adminFeatureFlags && adminFeatureFlags[it.key]===false); // default: enabled unless explicitly paused
      return '<div class="admin-flag-row" data-name="'+escapeHTML(it.label.toLowerCase())+'">'
        +'<span class="admin-flag-name">'+escapeHTML(it.label)+'</span>'
        +'<span class="admin-badge '+(on?'live':'off')+'">'+(on?'LIVE':'PAUSED')+'</span>'
        +'<label class="ks-switch"><input type="checkbox" '+(on?'checked':'')+' onchange="adminToggleCatalogFlag(\''+it.key+'\',this.checked)"><span class="ks-switch-track"></span></label>'
      +'</div>';
    }).join('');
    return '<div class="admin-flag-group" data-group="'+escapeHTML(g.group.toLowerCase())+'"><h4 class="admin-flag-group-title">'+escapeHTML(g.group)+'</h4><div class="admin-flag-list">'+rows+'</div></div>';
  }).join('');
  return '<div class="admin-card">'
    +'<div class="admin-card-head"><h3>App Features</h3></div>'
    +'<p style="color:var(--sub);font-size:12px;margin-bottom:14px">Turn any single game, tool, or section off for every visitor, instantly, without touching anything else on the site. Flip it back on the same way.</p>'
    +'<div style="position:relative;margin-bottom:16px">'
      +'<span style="position:absolute;left:16px;top:50%;transform:translateY(-50%);font-size:16px;pointer-events:none">🔍</span>'
      +'<input class="ks-input" id="adminFeatureSearch" placeholder="Search games, tools, sections..." oninput="adminFilterFeatures(this.value)" style="padding-left:44px;">'
    +'</div>'
    +'<div id="adminFeatureGroups">'+groups+'</div>'
    +'<p id="adminFeatureNoMatch" style="display:none;text-align:center;padding:20px;color:var(--muted);font-size:14px">😕 No matching feature found.</p>'
  +'</div>';
}
// Filters the App Features rows by label text as the admin types. Hides a
// whole group heading when every row inside it is filtered out, so search
// results don't leave empty "Games" / "Health tools" headers floating around.
function adminFilterFeatures(query){
  var q=(query||'').toLowerCase().trim();
  var groups=document.querySelectorAll('#adminFeatureGroups .admin-flag-group');
  var anyVisible=false;
  groups.forEach(function(group){
    var rows=group.querySelectorAll('.admin-flag-row');
    var groupHasMatch=false;
    rows.forEach(function(row){
      var match=!q||row.dataset.name.indexOf(q)!==-1;
      row.style.display=match?'':'none';
      if(match){ groupHasMatch=true; anyVisible=true; }
    });
    group.style.display=groupHasMatch?'':'none';
  });
  var noMatch=document.getElementById('adminFeatureNoMatch');
  if(noMatch) noMatch.style.display=anyVisible?'none':'block';
}
function adminToggleCatalogFlag(key,val){
  window.KSFirebase.setFeatureFlag(key,val).catch(function(err){
    alert('Could not update: '+(err&&err.message?err.message:err));
  });
}
function renderAdminFlagsPanel(el){
  el.innerHTML='<div class="admin-card"><p style="color:var(--muted)">Loading feature flags…</p></div>';
  adminFlagsUnsub=window.KSFirebase.subscribeFeatureFlags(function(flags,err){
    if(err){ el.innerHTML=adminErrorHtml(err); return; }
    adminFeatureFlags=flags||{};
    var catalogKeys={}; FEATURE_CATALOG.forEach(function(g){ g.items.forEach(function(it){ catalogKeys[it.key]=true; }); });
    var keys=Object.keys(adminFeatureFlags).filter(function(k){ return !catalogKeys[k]; }).sort();
    var rows=keys.map(function(k){
      var on=!!adminFeatureFlags[k];
      return '<div class="admin-flag-row">'
        +'<span class="admin-flag-name">'+escapeHTML(k)+'</span>'
        +'<span class="admin-badge '+(on?'live':'off')+'">'+(on?'ON':'OFF')+'</span>'
        +'<label class="ks-switch"><input type="checkbox" '+(on?'checked':'')+' onchange="adminToggleFlag(\''+encodeURIComponent(k)+'\',this.checked)"><span class="ks-switch-track"></span></label>'
        +'<button class="btn btn-ghost admin-flag-del" onclick="adminDeleteFlag(\''+encodeURIComponent(k)+'\')" title="Delete flag" aria-label="Delete flag">🗑</button>'
      +'</div>';
    }).join('');
    el.innerHTML=renderAdminAppFeaturesHtml()
    +'<div class="admin-card">'
      +'<div class="admin-card-head"><h3>Custom Flags</h3><span class="admin-count">'+keys.length+'</span></div>'
      +(keys.length?'<div class="admin-flag-list">'+rows+'</div>':'<p class="admin-empty">No custom flags yet — for advanced/one-off use. The toggles above already cover every game, tool and section.</p>')
      +'<p style="color:var(--sub);font-size:12px;margin-top:10px">Synced live via onSnapshot — toggling a switch above updates every connected visitor instantly.</p>'
    +'</div>'
    +'<div class="admin-card">'
      +'<div class="admin-card-head"><h3>New custom flag</h3></div>'
      +'<label class="field-label">Flag key</label>'
      +'<input class="ks-input mt-sm" id="adminNewFlagKey" placeholder="e.g. new_dashboard_ui" maxlength="40" autocomplete="off" '
        +'oninput="adminValidateFlagKeyInput()" onkeydown="if(event.key===\'Enter\'){event.preventDefault();adminAddFlag();}">'
      +'<p class="helper-txt" id="adminFlagKeyHelp" style="display:block;color:var(--sub)">Lowercase letters, numbers, and underscores only — must start with a letter (2–40 characters).</p>'
      +'<button class="btn btn-primary mt-sm" id="adminAddFlagBtn" onclick="adminAddFlag()" disabled>Add flag</button>'
    +'</div>';
  });
}
// Live validation as the admin types — normalizes to a safe snake_case key,
// rejects anything that doesn't match ADMIN_FLAG_KEY_RE or already exists,
// and keeps the submit button disabled until the key is actually valid. This
// replaces the old behavior of silently stripping bad characters with no
// feedback, which is how gibberish/partial keys were getting created.
function adminValidateFlagKeyInput(){
  var inp=document.getElementById('adminNewFlagKey');
  var help=document.getElementById('adminFlagKeyHelp');
  var btn=document.getElementById('adminAddFlagBtn');
  if(!inp||!help||!btn) return false;
  var raw=inp.value;
  var norm=raw.trim().toLowerCase().replace(/\s+/g,'_');
  var valid=ADMIN_FLAG_KEY_RE.test(norm);
  var dup=valid && Object.prototype.hasOwnProperty.call(adminFeatureFlags,norm);
  inp.classList.toggle('err', raw.length>0 && !valid);
  if(!raw.length){
    help.textContent='Lowercase letters, numbers, and underscores only — must start with a letter (2–40 characters).';
    help.style.color='var(--sub)';
  }else if(!valid){
    help.textContent='Invalid key — use lowercase letters, numbers, and underscores, starting with a letter.';
    help.style.color='#FF5A5A';
  }else if(dup){
    help.textContent='A flag named "'+norm+'" already exists.';
    help.style.color='#FF5A5A';
  }else{
    help.textContent='Will be added as: '+norm;
    help.style.color='#22C58B';
  }
  btn.disabled=!(valid && !dup);
  return valid && !dup;
}
function adminToggleFlag(keyEnc,val){
  window.KSFirebase.setFeatureFlag(decodeURIComponent(keyEnc),val).catch(function(err){
    alert('Could not update flag: '+(err&&err.message?err.message:err));
  });
}
function adminDeleteFlag(keyEnc){
  var key=decodeURIComponent(keyEnc);
  if(!confirm('Delete flag "'+key+'"? This cannot be undone.')) return;
  window.KSFirebase.deleteFeatureFlag(key).catch(function(err){
    alert('Could not delete flag: '+(err&&err.message?err.message:err));
  });
}
function adminAddFlag(){
  var inp=document.getElementById('adminNewFlagKey');
  if(!inp) return false;
  if(!adminValidateFlagKeyInput()) return false; // re-validates + refreshes the helper text/disabled state
  var key=inp.value.trim().toLowerCase().replace(/\s+/g,'_');
  var btn=document.getElementById('adminAddFlagBtn');
  if(btn) btn.disabled=true;
  window.KSFirebase.setFeatureFlag(key,false).then(function(){
    inp.value='';
    adminValidateFlagKeyInput();
  }).catch(function(err){
    alert('Could not add flag: '+(err&&err.message?err.message:err));
    if(btn) btn.disabled=false;
  });
  return false;
}

/* ── Announcements panel ── */
function renderAdminAnnouncementsPanel(el){
  el.innerHTML='<div class="admin-card"><p style="color:var(--muted)">Loading announcements…</p></div>';
  adminAnnUnsub=window.KSFirebase.subscribeAnnouncements(function(list,err){
    if(err){ el.innerHTML=adminErrorHtml(err); return; }
    adminAnnouncements=list||[];
    var items=adminAnnouncements.map(function(a){
      var live=a.active!==false;
      return '<div class="admin-ann-item">'
        +'<h4>'+escapeHTML(a.title||'(untitled)')+'</h4>'
        +'<p>'+escapeHTML(a.body||'')+'</p>'
        +'<div class="admin-ann-meta">'
          +'<span class="admin-badge '+(live?'live':'off')+'">'+(live?'LIVE':'HIDDEN')+'</span>'
          +'<button class="btn btn-ghost" style="padding:5px 12px;font-size:12px" onclick="adminToggleAnnouncement(\''+a.id+'\','+(!live)+')">'+(live?'Hide':'Show')+'</button>'
          +'<button class="btn btn-ghost" style="padding:5px 12px;font-size:12px" onclick="adminEditAnnouncementPrompt(\''+a.id+'\')">Edit</button>'
          +'<button class="btn btn-ghost" style="padding:5px 12px;font-size:12px" onclick="adminDeleteAnnouncement(\''+a.id+'\')">Delete</button>'
        +'</div>'
      +'</div>';
    }).join('');
    el.innerHTML='<div class="admin-card">'
      +'<div class="admin-card-head"><h3>Announcements</h3><span class="admin-count">'+adminAnnouncements.length+'</span></div>'
      +(adminAnnouncements.length?items:'<p class="admin-empty">No announcements yet.</p>')
    +'</div>'
    +'<div class="admin-card">'
      +'<div class="admin-card-head"><h3>New announcement</h3></div>'
      +'<label class="field-label">Title</label>'
      +'<input class="ks-input mt-sm" id="adminAnnTitle" placeholder="e.g. Scheduled maintenance" style="margin-bottom:12px">'
      +'<label class="field-label">Message</label>'
      +'<textarea class="ks-input" id="adminAnnBody" rows="3" placeholder="Details for visitors…" style="margin-bottom:12px;resize:vertical"></textarea>'
      +'<button class="btn btn-primary" onclick="adminCreateAnnouncement()">Publish</button>'
    +'</div>';
  });
}
function adminCreateAnnouncement(){
  var titleEl=document.getElementById('adminAnnTitle'), bodyEl=document.getElementById('adminAnnBody');
  var title=(titleEl&&titleEl.value||'').trim().slice(0,120);
  var body=(bodyEl&&bodyEl.value||'').trim().slice(0,2000);
  if(!title||!body){ alert('Please fill in both a title and a message.'); return; }
  window.KSFirebase.createAnnouncement({title:title,body:body,active:true}).then(function(){
    if(titleEl) titleEl.value=''; if(bodyEl) bodyEl.value='';
  }).catch(function(err){ alert('Could not publish: '+(err&&err.message?err.message:err)); });
}
function adminToggleAnnouncement(id,active){
  window.KSFirebase.updateAnnouncement(id,{active:active}).catch(function(err){
    alert('Could not update: '+(err&&err.message?err.message:err));
  });
}
function adminEditAnnouncementPrompt(id){
  var a=adminAnnouncements.find(function(x){return x.id===id;}); if(!a) return;
  var newBody=prompt('Edit announcement text:', a.body||''); if(newBody===null) return;
  newBody=newBody.trim().slice(0,2000);
  if(!newBody){ alert('Message cannot be empty.'); return; }
  window.KSFirebase.updateAnnouncement(id,{body:newBody}).catch(function(err){
    alert('Could not save: '+(err&&err.message?err.message:err));
  });
}
function adminDeleteAnnouncement(id){
  if(!confirm('Delete this announcement? This cannot be undone.')) return;
  window.KSFirebase.deleteAnnouncement(id).catch(function(err){
    alert('Could not delete: '+(err&&err.message?err.message:err));
  });
}

/* ── Admin inbox (direct messages to a specific user UID) ──
   Note: /users/{uid} profiles are only readable by their own owner, so this
   dashboard can't look people up by name — copy a UID from a Community post
   (visible on every post/reply) into the "Recipient UID" field to message
   that person. */
function renderAdminInboxPanel(el){
  el.innerHTML='<div class="admin-card"><p style="color:var(--muted)">Loading inbox…</p></div>';
  adminInboxUnsub=window.KSFirebase.subscribeAllInboxMessages(function(list,err){
    if(err){ el.innerHTML=adminErrorHtml(err); return; }
    adminInboxMsgs=list||[];
    var items=adminInboxMsgs.map(function(m){
      return '<div class="admin-inbox-item">'
        +'<p>'+escapeHTML(m.text||'')+'</p>'
        +'<div class="admin-ann-meta">'
          +'<span class="admin-badge '+(m.read?'off':'live')+'">'+(m.read?'READ':'UNREAD')+'</span>'
          +'<span style="font-size:11.5px;color:var(--sub);font-family:\'Share Tech Mono\',monospace">to: '+escapeHTML(m.toUid||'')+'</span>'
          +'<button class="btn btn-ghost" style="padding:5px 12px;font-size:12px;margin-left:auto" onclick="adminDeleteInboxMsg(\''+m.id+'\')">Delete</button>'
        +'</div>'
      +'</div>';
    }).join('');
    el.innerHTML='<div class="admin-card">'
      +'<div class="admin-card-head"><h3>Send a message</h3></div>'
      +'<label class="field-label">Recipient UID</label>'
      +'<input class="ks-input mt-sm" id="adminInboxToUid" placeholder="paste a UID from a Community post" style="margin-bottom:12px">'
      +'<label class="field-label">Message</label>'
      +'<textarea class="ks-input" id="adminInboxText" rows="3" placeholder="Message to send…" style="margin-bottom:12px;resize:vertical"></textarea>'
      +'<button class="btn btn-primary" onclick="adminSendInboxMsg()">Send</button>'
    +'</div>'
    +'<div class="admin-card">'
      +'<div class="admin-card-head"><h3>Sent messages</h3><span class="admin-count">'+adminInboxMsgs.length+'</span></div>'
      +(adminInboxMsgs.length?items:'<p class="admin-empty">No messages sent yet.</p>')
    +'</div>';
  });
}
function adminSendInboxMsg(){
  var toEl=document.getElementById('adminInboxToUid'), textEl=document.getElementById('adminInboxText');
  var toUid=(toEl&&toEl.value||'').trim();
  var text=(textEl&&textEl.value||'').trim().slice(0,1000);
  if(!toUid||!text){ alert('Please enter a recipient UID and a message.'); return; }
  window.KSFirebase.sendInboxMessage(toUid,text).then(function(){
    if(textEl) textEl.value='';
  }).catch(function(err){ alert('Could not send: '+(err&&err.message?err.message:err)); });
}
function adminDeleteInboxMsg(id){
  if(!confirm('Delete this message?')) return;
  window.KSFirebase.deleteInboxMessage(id).catch(function(err){
    alert('Could not delete: '+(err&&err.message?err.message:err));
  });
}

/* ═══════════════════════ USER-FACING INBOX (added) ═══════════════════════ */
var userInboxLiveUnsub=null;
var userInboxMsgs=[];
var userUnreadCount=0;
var userInboxErr=null;
function startUserInboxListener(){
  if(userInboxLiveUnsub||!currentUser||!window.KSFirebase||!window.KSFirebase.subscribeMyInbox) return;
  userInboxLiveUnsub=window.KSFirebase.subscribeMyInbox(function(list,err){
    if(err){
      userInboxErr=err;
      console.error('Inbox listener error:', err); // was silently swallowed before — surfaced so a broken query/rule shows up instead of just "no messages"
      if(curPage==='inbox') renderUserInbox();
      return;
    }
    userInboxErr=null;
    userInboxMsgs=list||[];
    userUnreadCount=userInboxMsgs.filter(function(m){return !m.read;}).length;
    updateNavAuthUI();
    if(curPage==='inbox') renderUserInbox();
  });
}
function stopUserInboxListener(){
  if(userInboxLiveUnsub){ userInboxLiveUnsub(); userInboxLiveUnsub=null; }
  userInboxMsgs=[]; userUnreadCount=0; userInboxErr=null;
}
function renderUserInbox(){
  if(!currentUser){ appEl.innerHTML=adminDeniedHtml('Please sign in to view your messages.'); return; }
  if(userInboxErr){
    appEl.innerHTML='<section class="admin-wrap">'
      +'<div class="back-row"><button class="back-btn" onclick="go(\'home\')">← Home</button></div>'
      +'<h2 class="section-title" style="margin-bottom:20px">Messages</h2>'
      +'<div class="admin-card"><p style="color:#FF5A5A">'+escapeHTML(ksFriendlyAuthError?ksFriendlyAuthError(userInboxErr):'Could not load your messages.')+'</p></div>'
    +'</section>';
    return;
  }
  var items=userInboxMsgs.map(function(m){
    var when=m.createdAt&&m.createdAt.toDate?m.createdAt.toDate().toLocaleString():'';
    return '<div class="admin-inbox-item">'
      +'<p>'+escapeHTML(m.text||'')+'</p>'
      +'<div class="admin-ann-meta">'
        +(when?'<span style="font-size:11.5px;color:var(--sub)">'+escapeHTML(when)+'</span>':'')
        +(!m.read?'<button class="btn btn-ghost" style="padding:5px 12px;font-size:12px" onclick="userMarkInboxRead(\''+m.id+'\')">Mark read</button>':'<span class="admin-badge off">READ</span>')
        +'<button class="btn btn-ghost" style="padding:5px 12px;font-size:12px;margin-left:auto" onclick="userDeleteInboxMsg(\''+m.id+'\')">Delete</button>'
      +'</div>'
    +'</div>';
  }).join('');
  appEl.innerHTML='<section class="admin-wrap">'
    +'<div class="back-row"><button class="back-btn" onclick="go(\'home\')">← Home</button></div>'
    +'<h2 class="section-title" style="margin-bottom:20px">Messages</h2>'
    +'<div class="admin-card">'
      +(userInboxMsgs.length?items:'<p class="admin-empty">You have no messages.</p>')
    +'</div>'
  +'</section>';
}
function userMarkInboxRead(id){
  window.KSFirebase.markInboxRead(id).catch(function(){});
}
function userDeleteInboxMsg(id){
  if(!confirm('Delete this message?')) return;
  window.KSFirebase.deleteInboxMessage(id).catch(function(err){
    alert('Could not delete: '+(err&&err.message?err.message:err));
  });
}

/* ═══════════════════════ PUBLIC ANNOUNCEMENT BANNER (added) ═══════════════════════
   Public, read-only, real-time. Uses the same window.KSFirebase.subscribeAnnouncements
   the admin dashboard uses (announcements/{id} allows "read: if true" for everyone in
   the rules, signed in or not) — so any create/edit/hide/delete an admin makes shows
   up here instantly via onSnapshot, no page refresh needed. This listener is started
   once at page load and runs for the whole session, independent of which page/tab of
   the app is open and independent of sign-in state. */
var announcementList=[];               // raw docs from the live listener
var announcementListenerStarted=false;
var announcementExpandedIds={};        // id -> true once "Show more" is clicked on a long one
var announcementStackExpanded=false;   // true once "Show N more announcements" is clicked
var ANNOUNCEMENT_VISIBLE_CAP=3;        // stacked banners shown before collapsing behind a toggle
var ANNOUNCEMENT_CLAMP_LEN=140;        // body length above which "Show more" appears

function announcementDismissedIds(){
  try{ return JSON.parse(localStorage.getItem('ksDismissedAnnouncements')||'[]'); }catch(e){ return []; }
}
function announcementDismiss(id){
  var ids=announcementDismissedIds();
  if(ids.indexOf(id)===-1){ ids.push(id); if(ids.length>50) ids=ids.slice(-50); }
  try{ localStorage.setItem('ksDismissedAnnouncements', JSON.stringify(ids)); }catch(e){}
  renderAnnouncementStack();
}
function announcementToggleExpand(id){
  announcementExpandedIds[id]=!announcementExpandedIds[id];
  renderAnnouncementStack();
}
function startAnnouncementsListener(){
  if(announcementListenerStarted) return;
  if(!window.KSFirebase||!window.KSFirebase.subscribeAnnouncements){ setTimeout(startAnnouncementsListener,300); return; }
  announcementListenerStarted=true;
  window.KSFirebase.subscribeAnnouncements(function(list,err){
    if(err){ return; } // public banner fails quietly — a read hiccup here shouldn't block the rest of the site
    announcementList=list||[];
    renderAnnouncementStack();
  });
}
function renderAnnouncementStack(){
  var el=document.getElementById('announcementStack');
  if(!el) return;
  var dismissed=announcementDismissedIds();
  // "active" mirrors the admin dashboard's own Live/Hidden toggle: active!==false
  var active=(announcementList||[]).filter(function(a){ return a.active!==false && dismissed.indexOf(a.id)===-1; });
  if(!active.length){ el.innerHTML=''; return; }
  var visible=announcementStackExpanded?active:active.slice(0,ANNOUNCEMENT_VISIBLE_CAP);
  var extra=active.length-visible.length;
  var html=visible.map(announcementBarHTML).join('');
  if(extra>0){
    html+='<button class="announcement-more-stack-btn" onclick="announcementStackExpanded=true;renderAnnouncementStack();">Show '+extra+' more announcement'+(extra===1?'':'s')+'</button>';
  }else if(announcementStackExpanded && active.length>ANNOUNCEMENT_VISIBLE_CAP){
    html+='<button class="announcement-more-stack-btn" onclick="announcementStackExpanded=false;renderAnnouncementStack();">Show less</button>';
  }
  el.innerHTML=html;
}
function announcementBarHTML(a){
  var when=(typeof communityTimeAgo==='function' && a.createdAt)?communityTimeAgo(a.createdAt):'';
  var expanded=!!announcementExpandedIds[a.id];
  var rawBody=a.body||'';
  var isLong=rawBody.length>ANNOUNCEMENT_CLAMP_LEN;
  return '<div class="announcement-bar">'
    +'<div class="announcement-icon">📣</div>'
    +'<div class="announcement-body">'
      +'<div class="announcement-title">'+escapeHTML(a.title||'Announcement')+(when?'<span class="announcement-time">'+escapeHTML(when)+'</span>':'')+'</div>'
      +'<div class="announcement-text'+(isLong&&!expanded?' clamped':'')+'">'+escapeHTML(rawBody)+'</div>'
      +(isLong?'<button class="announcement-more" onclick="announcementToggleExpand(\''+a.id+'\')">'+(expanded?'Show less':'Show more')+'</button>':'')
    +'</div>'
    +'<button class="announcement-dismiss" onclick="announcementDismiss(\''+a.id+'\')" title="Dismiss" aria-label="Dismiss">✕</button>'
  +'</div>';
}

applyFabPosition();
injectTimerPill();
updateNavAuthUI();
startAnnouncementsListener();

