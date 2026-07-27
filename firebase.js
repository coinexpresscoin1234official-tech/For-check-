  // Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, collection, addDoc, doc, setDoc, updateDoc, getDoc, deleteDoc, query, where, orderBy, limit, onSnapshot, serverTimestamp, deleteField, increment } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import {
  getAuth, onAuthStateChanged, GoogleAuthProvider, signInWithPopup,
  createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile,
  signOut, deleteUser, sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

  // Your web app's Firebase configuration
  const firebaseConfig = {
    apiKey: "AIzaSyDi3LDV9B2iuk_KAgDqRvQX9YRbtBKH9_k",
    authDomain: "kstech2008.firebaseapp.com",
    projectId: "kstech2008",
    storageBucket: "kstech2008.firebasestorage.app",
    messagingSenderId: "310685592604",
    appId: "1:310685592604:web:e17e0ce9eb48f36af183d9"
  };
// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore and get a reference to the service
const db = getFirestore(app);

// Initialize Auth for the sign-in / account system
const auth = getAuth(app);
// Must match the isAdmin() uid in your published Firestore rules — this is only a
// UI/client-side mirror of that so admin edit/delete calls aren't blocked before
// they even reach Firestore. The rules themselves are what actually enforce it. (added)
const ADMIN_UIDS = ['glDJ8yk42SNRBNfM84C9eXnXZvc2','G6YXZl9TSlOlD12YiGzjqXf3wkG3'];
const googleProvider = new GoogleAuthProvider();

// NOTE: Profile pictures are stored as small compressed thumbnails directly in
// Firestore (users/{uid}.photoDataUrl) rather than Cloud Storage for Firebase.
// Cloud Storage now requires the paid Blaze plan even for no-cost usage, so this
// keeps profile pictures working on the free Spark plan too.

function toPlainUser(user, photoDataUrl, prefs){
  if(!user) return null;
  return {
    uid: user.uid,
    displayName: user.displayName || '',
    email: user.email || '',
    photoDataUrl: photoDataUrl || null,
    providerId: (user.providerData && user.providerData[0] && user.providerData[0].providerId) || 'password',
    prefs: prefs || null
  };
}

function ensureUserDoc(user, extra){
  const data = Object.assign({
    displayName: user.displayName || '',
    email: user.email || '',
    updatedAt: new Date().toISOString()
  }, extra || {});
  return setDoc(doc(db, 'users', user.uid), data, { merge: true });
}

function saveProfilePic(dataUrl){
  const user = auth.currentUser;
  if(!user) return Promise.reject(new Error('Not signed in.'));
  return setDoc(doc(db, 'users', user.uid), { photoDataUrl: dataUrl, updatedAt: new Date().toISOString() }, { merge: true })
    .then(function(){
      return getDoc(doc(db, 'users', user.uid));
    }).then(function(snap){
      const prefs = snap.exists() ? (snap.data().prefs || null) : null;
      if(window.onKsAuthStateChanged) window.onKsAuthStateChanged(toPlainUser(user, dataUrl, prefs));
    });
}

// Lets a user set any display name/nickname they like — it does not have to match
// their real name or account email. Updates both the Auth profile (kept in sync
// for consistency) and the Firestore doc (the copy Community posts actually read from). (added)
function updateDisplayName(name){
  const user = auth.currentUser;
  if(!user) return Promise.reject(new Error('Not signed in.'));
  const clean = String(name||'').trim().slice(0,40);
  if(!clean) return Promise.reject(new Error('Please enter a name.'));
  return updateProfile(user, { displayName: clean }).then(function(){
    return setDoc(doc(db, 'users', user.uid), { displayName: clean, updatedAt: new Date().toISOString() }, { merge: true });
  }).then(function(){
    return getDoc(doc(db, 'users', user.uid));
  }).then(function(snap){
    const photoDataUrl = snap.exists() ? (snap.data().photoDataUrl || null) : null;
    const prefs = snap.exists() ? (snap.data().prefs || null) : null;
    if(window.onKsAuthStateChanged) window.onKsAuthStateChanged(toPlainUser(user, photoDataUrl, prefs));
  });
}

// Saves the user's theme/palette/appearance preferences so they follow the account
// across devices and years later. Merges into the same per-user doc as the profile. (added)
function savePrefs(prefs){
  const user = auth.currentUser;
  if(!user) return Promise.reject(new Error('Not signed in.'));
  return setDoc(doc(db, 'users', user.uid), { prefs: prefs, updatedAt: new Date().toISOString() }, { merge: true });
}

// ── COMMUNITY (added): text-only posts, stored in their own collection so the
// live feed listener never has to touch (or be able to touch) per-user account data.
function postCommunityMessage(text){
  const user = auth.currentUser;
  if(!user) return Promise.reject(new Error('Not signed in.'));
  const clean = String(text||'').trim().slice(0,500);
  if(!clean) return Promise.reject(new Error('Please write something before posting.'));
  return getDoc(doc(db,'users',user.uid)).then(function(snap){
    const profile = snap.exists() ? snap.data() : {};
    return addDoc(collection(db,'communityPosts'), {
      text: clean,
      uid: user.uid,
      displayName: user.displayName || profile.displayName || '',
      photoDataUrl: profile.photoDataUrl || null,
      createdAt: serverTimestamp()
    });
  });
}
function subscribeCommunity(callback){
  const q = query(collection(db,'communityPosts'), orderBy('createdAt','desc'), limit(100));
  return onSnapshot(q, function(snap){
    const posts=[];
    snap.forEach(function(d){ posts.push(Object.assign({id:d.id}, d.data())); });
    callback(posts, null);
  }, function(err){
    callback(null, err);
  });
}

// Edit / delete for a user's own community post. Checked client-side against
// the post's stored uid before writing — Firestore security rules should also
// restrict these writes/deletes to request.auth.uid == resource.data.uid so
// this is enforced server-side too, not just in this client code. (added)
function editCommunityPost(postId, text){
  const user = auth.currentUser;
  if(!user) return Promise.reject(new Error('Not signed in.'));
  const clean = String(text||'').trim().slice(0,500);
  if(!clean) return Promise.reject(new Error('Message cannot be empty.'));
  const ref = doc(db,'communityPosts',postId);
  return getDoc(ref).then(function(snap){
    if(!snap.exists()) throw new Error('This post no longer exists.');
    if(snap.data().uid !== user.uid && ADMIN_UIDS.indexOf(user.uid)===-1) throw new Error('You can only edit your own posts.');
    return updateDoc(ref, { text: clean, edited: true, editedAt: serverTimestamp() });
  });
}
function deleteCommunityPost(postId){
  const user = auth.currentUser;
  if(!user) return Promise.reject(new Error('Not signed in.'));
  const ref = doc(db,'communityPosts',postId);
  return getDoc(ref).then(function(snap){
    if(!snap.exists()) return;
    if(snap.data().uid !== user.uid && ADMIN_UIDS.indexOf(user.uid)===-1) throw new Error('You can only delete your own posts.');
    return deleteDoc(ref);
  });
}

// Pin/unpin (added): admin-only — keeps a post at the top of the feed regardless of
// its age. The check here just fails fast with a clear message; the real enforcement
// has to live in Firestore rules (only an admin UID may write the "pinned"/"pinnedAt"
// fields on communityPosts), since a user could otherwise call this straight from
// the browser console.
function pinCommunityPost(postId, pinned){
  const user = auth.currentUser;
  if(!user) return Promise.reject(new Error('Not signed in.'));
  if(ADMIN_UIDS.indexOf(user.uid)===-1) return Promise.reject(new Error('Only the admin can pin posts.'));
  const ref = doc(db,'communityPosts',postId);
  return updateDoc(ref, { pinned: !!pinned, pinnedAt: pinned ? serverTimestamp() : null });
}

// Reactions (added): one reaction per user per post, stored as reactions.<uid> = key
// on the post doc. Tapping the same reaction again clears it; tapping a different
// one switches it — same toggle/change/remove behavior as WhatsApp reactions.
function reactToPost(postId, reactionKey){
  const user = auth.currentUser;
  if(!user) return Promise.reject(new Error('Not signed in.'));
  const ref = doc(db,'communityPosts',postId);
  return getDoc(ref).then(function(snap){
    if(!snap.exists()) throw new Error('This post no longer exists.');
    const reactions = snap.data().reactions || {};
    const update = {};
    if(reactions[user.uid] === reactionKey){
      update['reactions.'+user.uid] = deleteField();
    }else{
      update['reactions.'+user.uid] = reactionKey;
    }
    return updateDoc(ref, update);
  });
}

// Replies (added): stored as a subcollection per post (communityPosts/{postId}/replies)
// so they're only fetched when someone actually expands a post's replies, not with
// every post in the main feed. replyCount on the post doc is kept in sync via
// increment() so the "N replies" toggle doesn't need to read the subcollection.
function addReply(postId, text){
  const user = auth.currentUser;
  if(!user) return Promise.reject(new Error('Not signed in.'));
  const clean = String(text||'').trim().slice(0,500);
  if(!clean) return Promise.reject(new Error('Please write something before replying.'));
  return getDoc(doc(db,'users',user.uid)).then(function(snap){
    const profile = snap.exists() ? snap.data() : {};
    const postRef = doc(db,'communityPosts',postId);
    return addDoc(collection(postRef,'replies'), {
      text: clean,
      uid: user.uid,
      displayName: user.displayName || profile.displayName || '',
      photoDataUrl: profile.photoDataUrl || null,
      createdAt: serverTimestamp()
    }).then(function(replyRef){
      return updateDoc(postRef, { replyCount: increment(1) }).catch(function(){}).then(function(){ return replyRef; });
    });
  });
}
function subscribeReplies(postId, callback){
  const q = query(collection(db,'communityPosts',postId,'replies'), orderBy('createdAt','asc'), limit(200));
  return onSnapshot(q, function(snap){
    const replies=[];
    snap.forEach(function(d){ replies.push(Object.assign({id:d.id}, d.data())); });
    callback(replies, null);
  }, function(err){
    callback(null, err);
  });
}
function editReply(postId, replyId, text){
  const user = auth.currentUser;
  if(!user) return Promise.reject(new Error('Not signed in.'));
  const clean = String(text||'').trim().slice(0,500);
  if(!clean) return Promise.reject(new Error('Reply cannot be empty.'));
  const ref = doc(db,'communityPosts',postId,'replies',replyId);
  return getDoc(ref).then(function(snap){
    if(!snap.exists()) throw new Error('This reply no longer exists.');
    if(snap.data().uid !== user.uid && ADMIN_UIDS.indexOf(user.uid)===-1) throw new Error('You can only edit your own replies.');
    return updateDoc(ref, { text: clean, edited: true, editedAt: serverTimestamp() });
  });
}
function deleteReply(postId, replyId){
  const user = auth.currentUser;
  if(!user) return Promise.reject(new Error('Not signed in.'));
  const ref = doc(db,'communityPosts',postId,'replies',replyId);
  return getDoc(ref).then(function(snap){
    if(!snap.exists()) return;
    if(snap.data().uid !== user.uid && ADMIN_UIDS.indexOf(user.uid)===-1) throw new Error('You can only delete your own replies.');
    return deleteDoc(ref).then(function(){
      return updateDoc(doc(db,'communityPosts',postId), { replyCount: increment(-1) }).catch(function(){});
    });
  });
}

// ── ADMIN DASHBOARD (added) ──
// These functions never decide who is "an admin" — every one of them just
// calls Firestore directly, and it's the published Security Rules'
// isAdmin() check that actually accepts or rejects the read/write. A
// non-admin calling any of these gets a permission-denied error from
// Firestore itself, regardless of what this client code does.

function adminGetSecurity(){
  return getDoc(doc(db,'adminConfig','security'));
}
function adminSetPin(pinHash){
  return setDoc(doc(db,'adminConfig','security'), { pinHash: pinHash, updatedAt: serverTimestamp() }, { merge: true });
}

function subscribeFeatureFlags(callback){
  return onSnapshot(doc(db,'appConfig','features'), function(snap){
    callback(snap.exists() ? snap.data() : {}, null);
  }, function(err){
    callback(null, err);
  });
}
function setFeatureFlag(key, value){
  var patch = {}; patch[key] = !!value;
  return setDoc(doc(db,'appConfig','features'), patch, { merge: true });
}
function deleteFeatureFlag(key){
  var patch = {}; patch[key] = deleteField();
  return updateDoc(doc(db,'appConfig','features'), patch);
}

// ── ABOUT ME PHOTO (added): lets the admin replace the home-page About Me photo
// without editing code. Public read (siteConfig/about), admin-only write — enforced
// by Firestore Security Rules' isAdmin() check, same pattern as appConfig/features.
function subscribeAboutPhoto(callback){
  return onSnapshot(doc(db,'siteConfig','about'), function(snap){
    callback(snap.exists() ? (snap.data().photoDataUrl || null) : null, null);
  }, function(err){
    callback(null, err);
  });
}
function saveAboutPhoto(dataUrl){
  return setDoc(doc(db,'siteConfig','about'), { photoDataUrl: dataUrl, updatedAt: serverTimestamp() }, { merge: true });
}

function subscribeAnnouncements(callback){
  const q = query(collection(db,'announcements'), orderBy('createdAt','desc'), limit(50));
  return onSnapshot(q, function(snap){
    const list=[];
    snap.forEach(function(d){ list.push(Object.assign({id:d.id}, d.data())); });
    callback(list, null);
  }, function(err){
    callback(null, err);
  });
}
function createAnnouncement(data){
  return addDoc(collection(db,'announcements'), Object.assign({}, data, { createdAt: serverTimestamp() }));
}
function updateAnnouncement(id, data){
  return updateDoc(doc(db,'announcements',id), data);
}
function deleteAnnouncement(id){
  return deleteDoc(doc(db,'announcements',id));
}

// Admin can read every inboxMessages doc (isAdmin() OR clause in the rules),
// so this lists everything ever sent for the dashboard's "Sent messages" view.
function subscribeAllInboxMessages(callback){
  const q = query(collection(db,'inboxMessages'), orderBy('createdAt','desc'), limit(100));
  return onSnapshot(q, function(snap){
    const list=[];
    snap.forEach(function(d){ list.push(Object.assign({id:d.id}, d.data())); });
    callback(list, null);
  }, function(err){
    callback(null, err);
  });
}
function sendInboxMessage(toUid, text){
  const user = auth.currentUser;
  if(!user) return Promise.reject(new Error('Not signed in.'));
  const clean = String(text||'').trim().slice(0,1000);
  if(!clean) return Promise.reject(new Error('Please write a message.'));
  if(!toUid) return Promise.reject(new Error('Please provide a recipient UID.'));
  return addDoc(collection(db,'inboxMessages'), {
    toUid: String(toUid).trim(),
    fromUid: user.uid,
    text: clean,
    createdAt: serverTimestamp(),
    read: false
  });
}
function deleteInboxMessage(id){
  return deleteDoc(doc(db,'inboxMessages',id));
}

// Regular users can only read messages addressed to them (rules: toUid == auth.uid || isAdmin()).
// NOTE: deliberately no orderBy() here. Combining where('toUid','==',...) with
// orderBy('createdAt') on a different field requires a Firestore *composite*
// index that isn't created automatically — without it this query fails with a
// failed-precondition error. Sorting client-side avoids needing that index at
// all, so messages show up immediately with zero Firebase console setup.
function subscribeMyInbox(callback){
  const user = auth.currentUser;
  if(!user) return function(){};
  const q = query(collection(db,'inboxMessages'), where('toUid','==',user.uid), limit(100));
  return onSnapshot(q, function(snap){
    const list=[];
    snap.forEach(function(d){ list.push(Object.assign({id:d.id}, d.data())); });
    list.sort(function(a,b){
      const at = a.createdAt && a.createdAt.toMillis ? a.createdAt.toMillis() : 0;
      const bt = b.createdAt && b.createdAt.toMillis ? b.createdAt.toMillis() : 0;
      return bt - at;
    });
    callback(list, null);
  }, function(err){
    callback(null, err);
  });
}
function markInboxRead(id){
  return updateDoc(doc(db,'inboxMessages',id), { read: true });
}

function deleteAccount(){
  const user = auth.currentUser;
  if(!user) return Promise.reject(new Error('Not signed in.'));
  // Delete the Firestore profile doc first, while still authenticated, then the auth account itself.
  return deleteDoc(doc(db, 'users', user.uid)).catch(function(){}).then(function(){
    return deleteUser(user);
  });
}

function loadAndBroadcastUser(user){
  if(!user){
    if(window.onKsAuthStateChanged) window.onKsAuthStateChanged(null);
    return;
  }
  getDoc(doc(db, 'users', user.uid)).then(function(snap){
    const photoDataUrl = snap.exists() ? (snap.data().photoDataUrl || null) : null;
    const prefs = snap.exists() ? (snap.data().prefs || null) : null;
    if(window.onKsAuthStateChanged) window.onKsAuthStateChanged(toPlainUser(user, photoDataUrl, prefs));
  }).catch(function(){
    // If Firestore read fails (e.g. rules not set up yet), still sign the user in without a photo/prefs
    if(window.onKsAuthStateChanged) window.onKsAuthStateChanged(toPlainUser(user, null, null));
  });
}

// Expose a small, stable API to the rest of the (non-module) app
window.KSFirebase = {
  googleSignIn: function(){
    return signInWithPopup(auth, googleProvider).then(function(cred){
      return ensureUserDoc(cred.user).then(function(){ return cred; });
    });
  },
  emailSignUp: function(email, password, name){
    return createUserWithEmailAndPassword(auth, email, password).then(function(cred){
      const p = name ? updateProfile(cred.user, { displayName: name }) : Promise.resolve();
      return p.then(function(){ return ensureUserDoc(cred.user, { displayName: name || '' }); }).then(function(){ return cred; });
    });
  },
  emailSignIn: function(email, password){ return signInWithEmailAndPassword(auth, email, password); },
  doSignOut: function(){ return signOut(auth); },
  sendReset: function(email){ return sendPasswordResetEmail(auth, email); },
  saveProfilePic: saveProfilePic,
  updateDisplayName: updateDisplayName,
  deleteAccount: deleteAccount,
  savePrefs: savePrefs,
  postCommunityMessage: postCommunityMessage,
  subscribeCommunity: subscribeCommunity,
  editCommunityPost: editCommunityPost,
  deleteCommunityPost: deleteCommunityPost,
  pinCommunityPost: pinCommunityPost,
  reactToPost: reactToPost,
  addReply: addReply,
  subscribeReplies: subscribeReplies,
  editReply: editReply,
  deleteReply: deleteReply,
  // admin dashboard (added)
  adminGetSecurity: adminGetSecurity,
  adminSetPin: adminSetPin,
  subscribeFeatureFlags: subscribeFeatureFlags,
  setFeatureFlag: setFeatureFlag,
  deleteFeatureFlag: deleteFeatureFlag,
  subscribeAboutPhoto: subscribeAboutPhoto,
  saveAboutPhoto: saveAboutPhoto,
  subscribeAnnouncements: subscribeAnnouncements,
  createAnnouncement: createAnnouncement,
  updateAnnouncement: updateAnnouncement,
  deleteAnnouncement: deleteAnnouncement,
  subscribeAllInboxMessages: subscribeAllInboxMessages,
  sendInboxMessage: sendInboxMessage,
  deleteInboxMessage: deleteInboxMessage,
  subscribeMyInbox: subscribeMyInbox,
  markInboxRead: markInboxRead
};

onAuthStateChanged(auth, loadAndBroadcastUser);

