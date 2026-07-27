/* ── COMMUNITY (added): text-only feed, backed by Firestore, live-synced across devices ── */
var COMMUNITY_MAX_LEN=500;
var communityPosts=[];
var communityLoadState='loading'; // 'loading' | 'ready' | 'error'
var communityBusy=false;

function communityTimeAgo(ts){
  if(!ts)return'just now';
  var ms=(typeof ts==='number')?ts:(ts.toDate?ts.toDate().getTime():new Date(ts).getTime());
  var diff=Math.max(0,Date.now()-ms);
  var m=Math.floor(diff/60000);
  if(m<1)return'just now';
  if(m<60)return m+'m ago';
  var h=Math.floor(m/60);
  if(h<24)return h+'h ago';
  var d=Math.floor(h/24);
  if(d<7)return d+'d ago';
  return new Date(ms).toLocaleDateString();
}
var communityEditingId=null; // id of the post currently being edited inline, if any (added)
var communityOpenMenu=null; // (added) key of the kebab menu currently open — a post id, or "postId:replyId" for a reply
var COMMUNITY_ADMIN_UIDS=['glDJ8yk42SNRBNfM84C9eXnXZvc2','G6YXZl9TSlOlD12YiGzjqXf3wkG3']; // (added) matches the isAdmin() uids in Firestore rules — UI-only convenience, the rules are what actually enforce this
function communityIsAdmin(){ return !!(currentUser && COMMUNITY_ADMIN_UIDS.indexOf(currentUser.uid)!==-1); }

// ── Reactions (added) ──
var REACTIONS=[
  {key:'like',emoji:'👍'},
  {key:'dislike',emoji:'👎'},
  {key:'love',emoji:'❤️'},
  {key:'fire',emoji:'🔥'},
  {key:'shock',emoji:'😲'},
  {key:'sad',emoji:'😢'},
  {key:'haha',emoji:'😂'}
];
function reactionEmoji(key){ var r=REACTIONS.find(function(x){return x.key===key;}); return r?r.emoji:''; }
function communityReactionCounts(p){
  var counts={};
  if(p.reactions){ for(var uid in p.reactions){ if(p.reactions.hasOwnProperty(uid)){ var k=p.reactions[uid]; counts[k]=(counts[k]||0)+1; } } }
  return counts;
}
var communityOpenReactionPopup=null; // postId whose reaction popup is currently open, if any

function communityReactionsRowHTML(p){
  var counts=communityReactionCounts(p);
  var myReaction=(currentUser && p.reactions)?p.reactions[currentUser.uid]:null;
  var chips=REACTIONS.filter(function(r){return counts[r.key];}).map(function(r){
    return '<span class="reaction-chip'+(myReaction===r.key?' mine':'')+'">'+r.emoji+' '+counts[r.key]+'</span>';
  }).join('');
  var popupOpen=(communityOpenReactionPopup===p.id);
  var reactBtnLabel=myReaction?(reactionEmoji(myReaction)+' Reacted'):'😊 React';
  var popupHTML='';
  if(popupOpen){
    popupHTML='<div class="reaction-popup-overlay" onclick="communityCloseReactionPopup()"></div>'
      +'<div class="reaction-popup">'
      +REACTIONS.map(function(r){
        return '<button class="reaction-popup-btn'+(myReaction===r.key?' active':'')+'" onclick="communityReact(\''+p.id+'\',\''+r.key+'\')" title="'+r.key+'">'+r.emoji+'</button>';
      }).join('')
      +'</div>';
  }
  return '<div class="community-reactions-row">'
    +chips
    +'<span class="reaction-popup-wrap">'
    +'<button class="community-action-btn react-btn" onclick="communityToggleReactionPopup(\''+p.id+'\')">'+reactBtnLabel+'</button>'
    +popupHTML
    +'</span>'
    +'</div>';
}
// ── Kebab (⋮) menu for edit/delete — top-right of a message (added) ──
var communityUidPopupFor=null;   // menu key currently showing the UID sub-view, or null
var communityUidCopiedFor=null;  // menu key whose "Copy" button should show the "Copied!" state
function communityToggleMenu(key){
  communityOpenMenu=(communityOpenMenu===key)?null:key;
  communityUidPopupFor=null;
  renderCommunityFeedList();
}
function communityCloseMenu(){
  communityOpenMenu=null;
  communityUidPopupFor=null;
  renderCommunityFeedList();
}
// Admin-only: switches the open kebab menu into a "View User ID" sub-view.
function communityShowUid(key){
  communityUidPopupFor=key;
  communityUidCopiedFor=null;
  renderCommunityFeedList();
}
function communityBackFromUid(){
  communityUidPopupFor=null;
  renderCommunityFeedList();
}
// Admin-only: copies a raw UID to the clipboard so it can be pasted straight
// into the Inbox composer's "Recipient UID" field. Falls back to a hidden
// textarea + execCommand for browsers/contexts without navigator.clipboard.
function communityCopyUid(key,uid){
  function markCopied(){
    communityUidCopiedFor=key;
    renderCommunityFeedList();
    setTimeout(function(){ if(communityUidCopiedFor===key){ communityUidCopiedFor=null; renderCommunityFeedList(); } },1500);
  }
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(uid).then(markCopied).catch(function(){ communityFallbackCopyUid(uid); markCopied(); });
  }else{
    communityFallbackCopyUid(uid); markCopied();
  }
}
function communityFallbackCopyUid(text){
  try{
    var ta=document.createElement('textarea');
    ta.value=text; ta.style.position='fixed'; ta.style.opacity='0'; ta.style.top='0';
    document.body.appendChild(ta); ta.focus(); ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  }catch(e){}
}
// editFn/deleteFn are called with no args — callers close over the ids they need.
// extraHTML (optional) is a full <button> string inserted above Edit — used for
// the admin-only Pin/Unpin action on posts.
// authorUid (optional): when provided AND the viewer is an admin, adds a
// "Copy UID" item that opens a small badge + one-click clipboard-copy view —
// this is purely a front-end convenience for pasting into the Inbox composer
// and never changes what Firestore itself allows the admin to do.
function communityMenuHTML(key,editFn,deleteFn,extraHTML,authorUid){
  var open=(communityOpenMenu===key);
  if(!open){
    return '<span class="community-menu-wrap">'
      +'<button class="community-menu-btn" onclick="communityToggleMenu(\''+key+'\')" aria-label="Message options" title="Options">⋮</button>'
      +'</span>';
  }
  var showUidItem=(authorUid && communityIsAdmin());
  var uidView=(showUidItem && communityUidPopupFor===key);
  var uidJs=showUidItem?String(authorUid).replace(/\\/g,'\\\\').replace(/'/g,"\\'"):'';
  var popupHTML;
  if(uidView){
    var copied=(communityUidCopiedFor===key);
    popupHTML='<div class="community-menu-popup-overlay" onclick="communityCloseMenu()"></div>'
      +'<div class="community-menu-popup uid-view">'
      +'<div class="community-uid-label">User ID</div>'
      +'<div class="community-uid-badge">'+escapeHTML(authorUid)+'</div>'
      +'<button class="community-menu-item community-uid-copy-btn'+(copied?' copied':'')+'" onclick="communityCopyUid(\''+key+'\',\''+uidJs+'\')">'+(copied?'✅ Copied!':'📋 Copy to Clipboard')+'</button>'
      +'<button class="community-menu-item" onclick="communityBackFromUid()">← Back</button>'
      +'</div>';
  }else{
    popupHTML='<div class="community-menu-popup-overlay" onclick="communityCloseMenu()"></div>'
      +'<div class="community-menu-popup">'
      +(extraHTML||'')
      +(showUidItem?'<button class="community-menu-item" onclick="communityShowUid(\''+key+'\')">🆔 Copy UID</button>':'')
      +'<button class="community-menu-item" onclick="'+editFn+';communityCloseMenu();">Edit</button>'
      +'<button class="community-menu-item danger" onclick="'+deleteFn+';communityCloseMenu();">Delete</button>'
      +'</div>';
  }
  return '<span class="community-menu-wrap">'
    +'<button class="community-menu-btn" onclick="communityToggleMenu(\''+key+'\')" aria-label="Message options" title="Options">⋮</button>'
    +popupHTML
    +'</span>';
}
function communityToggleReactionPopup(postId){
  communityOpenReactionPopup=(communityOpenReactionPopup===postId)?null:postId;
  renderCommunityFeedList();
}
function communityCloseReactionPopup(){
  communityOpenReactionPopup=null;
  renderCommunityFeedList();
}
function communityReact(postId,key){
  communityOpenReactionPopup=null;
  if(!currentUser){ renderCommunityFeedList(); return; }
  if(!window.KSFirebase||!window.KSFirebase.reactToPost){ renderCommunityFeedList(); return; }
  window.KSFirebase.reactToPost(postId,key).catch(function(err){
    alert(ksFriendlyAuthError?ksFriendlyAuthError(err):'Could not save your reaction.');
  });
  renderCommunityFeedList();
}

// ── Replies (added) ──
var communityReplies={};       // postId -> array of reply objects
var communityReplyState={};    // postId -> 'loading' | 'ready' | 'error' (absent = collapsed)
var communityReplyUnsubs={};   // postId -> unsubscribe fn for its live listener
var communityReplyEditingId=null; // "postId:replyId" of the reply currently being edited, if any

function communityUnsubAllReplies(){
  for(var pid in communityReplyUnsubs){ if(communityReplyUnsubs.hasOwnProperty(pid)){ try{communityReplyUnsubs[pid]();}catch(e){} } }
  communityReplyUnsubs={};
  communityReplyState={};
  communityReplies={};
}
function communityToggleReplies(postId){
  if(communityReplyState[postId]){
    if(communityReplyUnsubs[postId]){ communityReplyUnsubs[postId](); delete communityReplyUnsubs[postId]; }
    delete communityReplyState[postId];
    delete communityReplies[postId];
    renderCommunityFeedList();
    return;
  }
  communityReplyState[postId]='loading';
  renderCommunityFeedList();
  if(!window.KSFirebase||!window.KSFirebase.subscribeReplies){
    communityReplyState[postId]='error';
    renderCommunityFeedList();
    return;
  }
  communityReplyUnsubs[postId]=window.KSFirebase.subscribeReplies(postId,function(replies,err){
    if(err){ communityReplyState[postId]='error'; renderCommunityFeedList(); return; }
    communityReplies[postId]=replies;
    communityReplyState[postId]='ready';
    renderCommunityFeedList();
  });
}
function communityRepliesToggleHTML(p){
  var count=p.replyCount||0;
  var expanded=!!communityReplyState[p.id];
  var label=expanded?'Hide replies':(count>0?('💬 '+count+' repl'+(count===1?'y':'ies')):'💬 Reply');
  return '<div class="community-post-actions">'
    +'<button class="community-action-btn" onclick="communityToggleReplies(\''+p.id+'\')">'+label+'</button>'
    +'</div>';
}
function communityReplyHTML(postId,r){
  var pic=r.photoDataUrl;
  var name=(r.displayName&&r.displayName.trim())?r.displayName:'KS Tech user';
  var avatar=pic?'<img src="'+pic+'" alt="">':(name[0]||'?').toUpperCase();
  var isMine=!!(currentUser && r.uid && currentUser.uid===r.uid);
  var canManage=isMine||communityIsAdmin(); // (added) admin can manage everyone's replies, not just their own
  var editedTag=r.edited?' <span class="community-post-edited">(edited)</span>':'';
  var adminTag=(COMMUNITY_ADMIN_UIDS.indexOf(r.uid)!==-1)?' <span class="community-admin-badge">Admin</span>':''; // (added)
  var editKey=postId+':'+r.id;
  var isEditing=(canManage && communityReplyEditingId===editKey);
  var bodyHTML;
  if(isEditing){
    bodyHTML='<textarea class="ks-input community-edit-box" id="communityReplyEditInput_'+r.id+'" maxlength="'+COMMUNITY_MAX_LEN+'">'+escapeHTML(r.text||'')+'</textarea>'
      +'<div class="community-post-actions">'
      +'<button class="community-action-btn" onclick="communitySaveReplyEdit(\''+postId+'\',\''+r.id+'\')">Save</button>'
      +'<button class="community-action-btn" onclick="communityCancelReplyEdit()">Cancel</button>'
      +'</div>';
  }else{
    bodyHTML='<div class="community-post-text">'+escapeHTML(r.text||'')+'</div>';
  }
  var menuHTML=(canManage && !isEditing)?communityMenuHTML(editKey,
    "communityStartReplyEdit('"+postId+"','"+r.id+"')",
    "communityDeleteReply('"+postId+"','"+r.id+"')",
    null, r.uid):'';
  return '<div class="community-reply">'
    +'<div class="community-avatar community-avatar-sm">'+avatar+'</div>'
    +'<div class="community-post-body">'
    +'<div class="community-post-head">'
    +'<span class="community-post-name">'+escapeHTML(name)+'</span>'
    +adminTag
    +editedTag
    +'<span class="community-post-time">'+communityTimeAgo(r.createdAt)+'</span>'
    +menuHTML
    +'</div>'
    +bodyHTML
    +'</div></div>';
}
function communityRepliesSectionHTML(p){
  var state=communityReplyState[p.id];
  if(!state)return'';
  var inner;
  if(state==='loading'){
    inner='<div class="community-empty" style="padding:12px;">Loading replies...</div>';
  }else if(state==='error'){
    inner='<div class="community-empty" style="padding:12px;">Could not load replies right now.</div>';
  }else{
    var list=communityReplies[p.id]||[];
    inner=list.length?list.map(function(r){return communityReplyHTML(p.id,r);}).join(''):'<div class="community-empty" style="padding:12px;">No replies yet.</div>';
  }
  var composer='';
  if(currentUser){
    composer='<div class="community-reply-composer">'
      +'<textarea class="ks-input community-edit-box" id="communityReplyInput_'+p.id+'" maxlength="'+COMMUNITY_MAX_LEN+'" placeholder="Write a reply..."></textarea>'
      +'<button class="btn" style="margin-top:8px" onclick="communityPostReply(\''+p.id+'\')">Reply</button>'
      +'</div>';
  }
  return '<div class="community-replies-section">'+inner+composer+'</div>';
}
function communityPostReply(postId){
  var ta=document.getElementById('communityReplyInput_'+postId);
  if(!ta)return;
  var text=ta.value.trim().slice(0,COMMUNITY_MAX_LEN);
  if(!text)return;
  if(!currentUser){ alert('Please sign in to reply.'); return; }
  if(!window.KSFirebase||!window.KSFirebase.addReply)return;
  ta.disabled=true;
  window.KSFirebase.addReply(postId,text).then(function(){
    ta.value='';
    ta.disabled=false;
  }).catch(function(err){
    ta.disabled=false;
    alert(ksFriendlyAuthError?ksFriendlyAuthError(err):'Could not post your reply.');
  });
}
function communityStartReplyEdit(postId,replyId){
  communityReplyEditingId=postId+':'+replyId;
  renderCommunityFeedList();
  setTimeout(function(){
    var ta=document.getElementById('communityReplyEditInput_'+replyId);
    if(ta){ ta.focus(); ta.selectionStart=ta.selectionEnd=ta.value.length; }
  },0);
}
function communityCancelReplyEdit(){
  communityReplyEditingId=null;
  renderCommunityFeedList();
}
function communitySaveReplyEdit(postId,replyId){
  var ta=document.getElementById('communityReplyEditInput_'+replyId);
  if(!ta)return;
  var text=ta.value.trim().slice(0,COMMUNITY_MAX_LEN);
  if(!text)return;
  if(!window.KSFirebase||!window.KSFirebase.editReply)return;
  ta.disabled=true;
  window.KSFirebase.editReply(postId,replyId,text).then(function(){
    communityReplyEditingId=null;
    renderCommunityFeedList();
  }).catch(function(err){
    ta.disabled=false;
    alert(ksFriendlyAuthError?ksFriendlyAuthError(err):'Could not save your edit.');
  });
}
function communityDeleteReply(postId,replyId){
  if(!confirm('Delete this reply? This cannot be undone.'))return;
  if(!window.KSFirebase||!window.KSFirebase.deleteReply)return;
  window.KSFirebase.deleteReply(postId,replyId).catch(function(err){
    alert(ksFriendlyAuthError?ksFriendlyAuthError(err):'Could not delete your reply.');
  });
}

function communityPostHTML(p){
  var pic=p.photoDataUrl;
  var name=(p.displayName&&p.displayName.trim())?p.displayName:'KS Tech user';
  var avatar=pic?'<img src="'+pic+'" alt="">':(name[0]||'?').toUpperCase();
  var isMine=!!(currentUser && p.uid && currentUser.uid===p.uid);
  var canManage=isMine||communityIsAdmin(); // (added) admin can manage everyone's posts, not just their own
  var editedTag=p.edited?' <span class="community-post-edited">(edited)</span>':'';
  var adminTag=(COMMUNITY_ADMIN_UIDS.indexOf(p.uid)!==-1)?' <span class="community-admin-badge">Admin</span>':''; // (added)
  var pinTag=p.pinned?' <span class="community-pin-badge">📌 Pinned</span>':''; // (added)
  var isEditing=(canManage && communityEditingId===p.id);
  var bodyHTML;
  if(isEditing){
    bodyHTML='<textarea class="ks-input community-edit-box" id="communityEditInput_'+p.id+'" maxlength="'+COMMUNITY_MAX_LEN+'">'+escapeHTML(p.text||'')+'</textarea>'
      +'<div class="community-post-actions">'
      +'<button class="community-action-btn" onclick="communitySaveEdit(\''+p.id+'\')">Save</button>'
      +'<button class="community-action-btn" onclick="communityCancelEdit()">Cancel</button>'
      +'</div>';
  }else{
    bodyHTML='<div class="community-post-text">'+escapeHTML(p.text||'')+'</div>'
      +communityReactionsRowHTML(p)
      +communityRepliesToggleHTML(p)
      +communityRepliesSectionHTML(p);
  }
  // Admin-only: pin/unpin this post to the top of the feed regardless of age. (added)
  var pinMenuHTML=communityIsAdmin()
    ?'<button class="community-menu-item" onclick="communityTogglePin(\''+p.id+'\','+(!p.pinned)+');communityCloseMenu();">'+(p.pinned?'📌 Unpin':'📌 Pin to top')+'</button>'
    :'';
  var menuHTML=(canManage && !isEditing)?communityMenuHTML(p.id,
    "communityStartEdit('"+p.id+"')",
    "communityDeletePost('"+p.id+"')",
    pinMenuHTML, p.uid):'';
  return '<div class="community-post'+(p.pinned?' pinned':'')+'">'
    +'<div class="community-avatar">'+avatar+'</div>'
    +'<div class="community-post-body">'
    +'<div class="community-post-head">'
    +'<span class="community-post-name">'+escapeHTML(name)+'</span>'
    +adminTag
    +pinTag
    +editedTag
    +'<span class="community-post-time">'+communityTimeAgo(p.createdAt)+'</span>'
    +menuHTML
    +'</div>'
    +bodyHTML
    +'</div></div>';
}

// Admin-only: pin or unpin a post so it stays at the top of the feed. (added)
// PIN_LIMIT is a soft, client-side cap only — it just keeps the top of the feed from
// getting cluttered. It is NOT enforced by Firestore rules (the rules only check who
// is allowed to pin, not how many pins exist), so treat it as a courtesy limit, not
// a hard guarantee — e.g. pinning from a second open tab at the same moment could
// briefly exceed it.
var PIN_LIMIT=12;
function communityTogglePin(postId,pin){
  if(!window.KSFirebase||!window.KSFirebase.pinCommunityPost)return;
  if(pin){
    var pinnedCount=communityPosts.filter(function(p){return p.pinned;}).length;
    if(pinnedCount>=PIN_LIMIT){
      alert('You can pin up to '+PIN_LIMIT+' messages at a time. Unpin one first before pinning another.');
      return;
    }
  }
  window.KSFirebase.pinCommunityPost(postId,pin).catch(function(err){
    alert(ksFriendlyAuthError?ksFriendlyAuthError(err):'Could not update pin status.');
  });
}

// Inline edit/delete handlers for the current user's own posts (added)
function communityStartEdit(id){
  communityEditingId=id;
  renderCommunityFeedList();
  setTimeout(function(){
    var ta=document.getElementById('communityEditInput_'+id);
    if(ta){ ta.focus(); ta.selectionStart=ta.selectionEnd=ta.value.length; }
  },0);
}
function communityCancelEdit(){
  communityEditingId=null;
  renderCommunityFeedList();
}
function communitySaveEdit(id){
  var ta=document.getElementById('communityEditInput_'+id);
  if(!ta)return;
  var text=ta.value.trim().slice(0,COMMUNITY_MAX_LEN);
  if(!text)return;
  if(!window.KSFirebase||!window.KSFirebase.editCommunityPost)return;
  ta.disabled=true;
  window.KSFirebase.editCommunityPost(id,text).then(function(){
    communityEditingId=null;
    renderCommunityFeedList();
  }).catch(function(err){
    ta.disabled=false;
    alert(ksFriendlyAuthError?ksFriendlyAuthError(err):'Could not save your edit.');
  });
}
function communityDeletePost(id){
  if(!confirm('Delete this message? This cannot be undone.'))return;
  if(!window.KSFirebase||!window.KSFirebase.deleteCommunityPost)return;
  window.KSFirebase.deleteCommunityPost(id).catch(function(err){
    alert(ksFriendlyAuthError?ksFriendlyAuthError(err):'Could not delete your message.');
  });
}
function escapeHTML(s){
  return String(s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});
}
function renderCommunityFeedList(){
  var el=document.getElementById('communityFeed');
  if(!el)return;
  if(communityLoadState==='error'){
    el.innerHTML='<div class="community-empty">⚠️ Could not load the community feed right now. Please try again shortly.</div>';
  }else if(communityLoadState==='loading'){
    el.innerHTML='<div class="community-empty">Loading posts...</div>';
  }else if(!communityPosts.length){
    el.innerHTML='<div class="community-empty">No posts yet — be the first to say something! 👋</div>';
  }else{
    el.innerHTML='<div class="community-feed">'+communityPosts.map(communityPostHTML).join('')+'</div>';
  }
}
function communityUpdateCharCount(){
  var ta=document.getElementById('communityInput');
  var cc=document.getElementById('communityCharCount');
  if(ta&&cc) cc.textContent=(COMMUNITY_MAX_LEN-ta.value.length)+' characters left';
}
function postCommunityMessage(){
  if(communityBusy)return;
  var ta=document.getElementById('communityInput');
  var status=document.getElementById('communityStatus');
  if(!ta)return;
  var text=ta.value.trim().slice(0,COMMUNITY_MAX_LEN);
  if(!text){ if(status){status.textContent='Write something first.';status.className='fb-status err';} return; }
  if(!currentUser){ if(status){status.textContent='Please sign in to post.';status.className='fb-status err';} return; }
  if(!window.KSFirebase||!window.KSFirebase.postCommunityMessage){ if(status){status.textContent='Still connecting — try again in a moment.';status.className='fb-status err';} return; }
  communityBusy=true;
  var btn=document.getElementById('communityPostBtn');
  if(btn){btn.disabled=true;btn.textContent='Posting...';}
  if(status){status.textContent='';status.className='fb-status';}
  window.KSFirebase.postCommunityMessage(text).then(function(){
    ta.value='';
    communityUpdateCharCount();
  }).catch(function(err){
    if(status){status.textContent=ksFriendlyAuthError(err);status.className='fb-status err';}
  }).finally(function(){
    communityBusy=false;
    if(btn){btn.disabled=false;btn.textContent='Post';}
  });
}
function renderCommunity(){
  communityEditingId=null;
  communityOpenReactionPopup=null;
  communityOpenMenu=null;
  communityUnsubAllReplies();
  communityReplyEditingId=null;
  var composerHTML;
  if(currentUser){
    composerHTML='<div class="community-composer">'
      +'<textarea id="communityInput" class="ks-input" maxlength="'+COMMUNITY_MAX_LEN+'" placeholder="Say something to the KS Tech community... (text only)" oninput="communityUpdateCharCount()"></textarea>'
      +'<div class="community-composer-row">'
      +'<span class="community-char-count" id="communityCharCount">'+COMMUNITY_MAX_LEN+' characters left</span>'
      +'<button class="btn" id="communityPostBtn" onclick="postCommunityMessage()">Post</button>'
      +'</div>'
      +'<div class="fb-status" id="communityStatus" style="margin-top:8px"></div>'
      +'</div>';
  }else{
    composerHTML='<div class="community-signin-prompt">'
      +'<p>Sign in to post — anyone can read the feed, but posting needs a free KS Tech account.</p>'
      +'<button class="btn" onclick="go(\'auth\')">Sign In / Sign Up</button>'
      +'</div>';
  }
  appEl.innerHTML=`<div class='page-wrap'>
    <div class='back-row'><button class='back-btn' onclick="go('home')">← Home</button></div>
    <div class='page-header'>
      <div>
        <div class='section-label'>💬 Community</div>
        <h2>Say hello</h2>
      </div>
    </div>
    <p style='color:var(--muted);font-size:13px;margin-top:-24px;margin-bottom:24px'>A simple, text-only space to chat with other KS Tech users. No photos, no files — just words.</p>
    ${composerHTML}
    <div id="communityFeed"></div>
  </div>`;
  communityLoadState='loading';
  renderCommunityFeedList();
  if(!window.KSFirebase||!window.KSFirebase.subscribeCommunity){
    communityLoadState='error';
    renderCommunityFeedList();
    return;
  }
  communityUnsub=window.KSFirebase.subscribeCommunity(function(posts,err){
    if(err){ communityLoadState='error'; renderCommunityFeedList(); return; }
    // Pinned posts always float to the top, regardless of age (Array.sort is
    // stable, so createdAt-desc order from Firestore is preserved within each group). (added)
    communityPosts=posts.slice().sort(function(a,b){ return (b.pinned?1:0)-(a.pinned?1:0); });
    communityLoadState='ready';
    renderCommunityFeedList();
  });
}

