/* ── ABOUT TEXTS ── */
const ABOUT={
  age:      'Precise real-time age & countdown tool. Created by Kiran Sankar with the assistance of AI.',
  lcmhcf:   'LCM & HCF for up to 10 numbers. Created by Kiran Sankar with the assistance of AI.',
  bmi:      'Body Mass Index calculator with WHO standards. Created by Kiran Sankar with the assistance of AI.',
  typing:   'Test your typing speed and accuracy. WPM scored in real time. Created by Kiran Sankar with the assistance of AI.',
  dayf:     'Find the weekday of any date in history. Created by Kiran Sankar with the assistance of AI.',
  passck:   'Real-time password strength analyser. Nothing is stored or sent. Created by Kiran Sankar with the assistance of AI.',
  baseconv: 'Convert numbers between Binary, Decimal, Octal and Hexadecimal instantly. Created by Kiran Sankar with the assistance of AI.',
  wordcount:'Count words, characters, sentences and reading time from any text. Created by Kiran Sankar with the assistance of AI.',
  emi:      'Calculate monthly EMI, total interest and total payable for any loan. Created by Kiran Sankar with the assistance of AI.',
  unitconv: 'Convert between temperature, length, weight and speed units. Created by Kiran Sankar with the assistance of AI.',
  timer:    'A clean stopwatch with lap tracking and a countdown timer. Created by Kiran Sankar with the assistance of AI.',
  decision: "Can't decide? Enter your options and let the spinner choose for you. Created by Kiran Sankar with the assistance of AI.",
  calchub:  'The ultimate Calculator Hub — Simple, Scientific, Engineering, Percentage and Financial calculators all in one place. Created by Kiran Sankar with the assistance of AI.',
  numwords: 'Convert numbers to words, words to numbers, numbers to Roman numerals and Roman numerals to numbers. Created by Kiran Sankar with the assistance of AI.',
  morse:    'Convert text to Morse code and Morse code back to text. Plays real beep sounds. Created by Kiran Sankar with the assistance of AI.',
  lifestats:'A fun look at your existence in numbers — heartbeats, breaths, blinks, sleep, hair & nail growth, distance walked and more, based on population averages. Created by Kiran Sankar with the assistance of AI.'
};

function showAbout(id){
  const m=document.createElement('div');m.className='modal-overlay';
  m.innerHTML=`<div class='modal-box'>
    <h3>ℹ️ About This App</h3>
    <p>${ABOUT[id]}</p>
    <p style='color:var(--accent);font-weight:600;'>👨‍💻 Created by Kiran Sankar</p>
    <button class='btn btn-secondary' style='margin-top:12px' onclick="this.closest('.modal-overlay').remove()">Close</button>
  </div>`;
  document.body.appendChild(m);
  m.addEventListener('click',e=>{if(e.target===m)m.remove();});
}

function scrollContact(){
  go('home');
  setTimeout(()=>{
    const el=document.getElementById('contact');
    if(el)el.scrollIntoView({behavior:'smooth'});
  },200);
}

/* ── MOBILE NAV ── */
function toggleMobileNav(){
  const menu=document.getElementById('navMobileMenu');
  const btn=document.getElementById('navGridBtn');
  const isOpen=menu.classList.contains('open');
  if(isOpen){ menu.classList.remove('open'); btn.classList.remove('open'); }
  else { menu.classList.add('open'); btn.classList.add('open'); }
}
function closeMobileNav(){
  const menu=document.getElementById('navMobileMenu');
  const btn=document.getElementById('navGridBtn');
  if(menu) menu.classList.remove('open');
  if(btn) btn.classList.remove('open');
}
function mobileGo(page){ closeMobileNav(); go(page); }
function mobileScrollContact(){
  closeMobileNav();
  scrollContact();
}
// Close menu when tapping outside
document.addEventListener('click',function(e){
  const menu=document.getElementById('navMobileMenu');
  const btn=document.getElementById('navGridBtn');
  if(menu&&menu.classList.contains('open')){
    if(!menu.contains(e.target)&&(!btn||!btn.contains(e.target))) closeMobileNav();
  }
});

/* ── APP FOOTER ── */
function appFooter(id){
  return `<div class='app-footer-btns'>
    <button class='btn btn-primary' onclick="window.open('${IG}','_blank')">📸 Instagram</button>
    <button class='btn btn-secondary' onclick="go('apps')">⚡ All Apps</button>
    <button class='btn btn-ghost' onclick="showAbout('${id}')">ℹ️ About</button>
  </div>`;
}

/* ═══════════════════════ HOME ═══════════════════════ */
function renderHome(){
  if(typeof easyMode!=='undefined' && easyMode){ renderHomeEasy(); return; }
  appEl.innerHTML=`
  <section class='hero'>
    <h1 class='hero-title'>Welcome to<br><span class='accent'>KS Tech. 👋</span></h1>
    <p class='hero-sub'>Simple tools. Built for everyone. Free, forever. ⚡ Everything here is fast, clean and designed to just work — no fluff, no ads, no nonsense. 🚀</p>
    <div class='hero-cta'>
      <button class='btn btn-primary' onclick="go('apps')">⚡ Explore Apps</button>
      <button class='btn btn-secondary' onclick="window.open('${IG}','_blank')">📸 Follow on Instagram</button>
      <button class='btn btn-ghost' onclick="scrollContact()">✉️ Get in Touch</button>
    </div>
    

  <section class='features'>
    <div class='section-label'>🛠️ What I've Built</div>
    <h2 class='section-title'>Tools for everyday life</h2>
    <div class='feature-grid'>
      ${APPS.map(a=>`
      <div class='feature-card' onclick="go('${a.id}')">
        <span class='feat-icon'>${a.icon}</span>
        <div class='feat-title'>${a.name}</div>
        <div class='feat-desc'>${a.desc}</div>
      </div>`).join('')}
    </div>
  </section>

  <section class='about-section'>
    <div class='about-inner'>
      <div class='about-avatar' style='position:relative;'><img src='${liveAboutPhoto||DEFAULT_ABOUT_PHOTO}' alt='Kiran Sankar' style='width:100%;height:100%;object-fit:cover;border-radius:24px;'>${(typeof communityIsAdmin==='function' && communityIsAdmin())?"<label class='about-photo-edit-btn' title='Change About Me photo'>📷<input type='file' accept='image/*' style='display:none' onchange='aboutPhotoSelected(this)'></label>":''}</div>
      <div class='about-text'>
        <div class='section-label'>🙋 About Me</div>
        <h2>Built by Kiran Sankar. 🌎</h2>
        <p>KS Tech is a growing collection of free tools designed to make everyday tasks easier. Every tool is fast, clean and distraction-free — no ads, no nonsense, and most work instantly with no sign-up at all.</p>
        <p>A free, optional account unlocks a few extras — like the community feed — and only stores what's needed to run those (your email, display name, and anything you choose to post). Crafted with curiosity and the assistance of AI. Just tools that work. ✨</p>
        <div class='about-links'>
          <button class='btn btn-primary' onclick="window.open('${IG}','_blank')">📸 Official instagram</button>
          <button class='btn btn-ghost' onclick="scrollContact()">✉️ Say hello</button>
        </div>
      </div>
    </div>
  </section>

  <section class='contact-strip' id='contact'>
    <div class='section-label'>✉️ Contact</div>
    <h2>Let's connect 🤝</h2>
    <p>Have a suggestion, feedback, or just want to say hi? My inbox is always open.</p>
    <a class='email-chip' href='mailto:${EMAIL}'><span class='dot'></span>${EMAIL}</a>
  </section>

  <footer>
    Made with ❤️ by <strong>Kiran Sankar</strong> &nbsp;·&nbsp; All tools are free &nbsp;·&nbsp; No ads, ever
  </footer>`;
}

/* ═══════════════════════ EASY MODE HOME (added) ═══════════════════════ */
/* ═══════════════════════ TUTORIALS / HELP SYSTEM (added) ═══════════════════════ */
// Designated place for future tutorials. To add one: TUTORIALS.<appId> = {text:'...', videoId:'youtubeVideoId'};
// videoId can be left out until a clip exists — the help box will just say "video coming soon".
const TUTORIALS={
  planetweight:{text:'Enter your weight, tap Calculate, and see what you\'d weigh on every other planet and moon in the solar system based on their actual gravity compared to Earth\'s.'},
  agemars:{text:'Enter your date of birth and tap Calculate to see your age in Martian years and sols, plus your age on every other planet based on its real orbital period.'},
  moonphase:{text:'Pick any date (defaults to today) and tap Show Phase to see what the moon looked like — or will look like — that night, plus roughly how illuminated it was.'},
  whatif:{text:'Enter your date of birth for a few playful hypotheticals — like how much you\'d have if you\'d earned money every second since birth, or invested a little each day.'},
  age:{text:'Enter your date of birth (name and a target age are optional), tap Calculate, and you\'ll see your exact age broken down into years, months and days — updating live down to the second.'},
  lcmhcf:{text:'Add up to 10 numbers using the + button, then tap Calculate to get both the LCM (Lowest Common Multiple) and HCF (Highest Common Factor) of the whole set at once.'},
  bmi:{text:'Enter your height and weight, tap Calculate, and you\'ll instantly see your BMI along with the WHO category it falls into (underweight, normal, overweight, or obese).'},
  typing:{text:'Tap Start, type the passage shown as accurately and quickly as you can, and once you finish (or time runs out) you\'ll see your words-per-minute and accuracy score.'},
  dayf:{text:'Enter any date — past or future — and tap Find to instantly see which day of the week it fell (or falls) on, plus the days right before and after it.'},
  passck:{text:'Type a password into the box and watch it get scored in real time against length, character variety and common patterns. Nothing you type is stored or sent anywhere — it\'s all checked right in your browser.'},
  baseconv:{text:'Type a number in any base (Binary, Decimal, Octal or Hex) into its field, and the other three update instantly to show the same value.'},
  wordcount:{text:'Paste or type any text into the box to instantly see word count, character count, sentence count, and an estimated reading time.'},
  emi:{text:'Enter your loan amount, interest rate and tenure, then tap Calculate to see your monthly EMI, total interest, and total amount payable.'},
  unitconv:{text:'Pick a category (temperature, length, weight, or speed), choose your "from" and "to" units, type a value, and the converted result updates instantly.'},
  timer:{text:'Choose Stopwatch to count up with lap tracking, or Timer to count down from a set time.'},
  stopwatch:{text:'Tap Start to begin counting up. Tap Lap anytime to record a split without stopping the clock, and tap Start again (now labeled Resume) to keep going after a pause.'},
  countdown:{text:'Set hours, minutes and seconds — or tap a quick preset — then tap Start. While it\'s running you can Pause/Resume or Cancel to go back and set a new time.'},
  decision:{text:'Type in your options (one per line, or using the + button), tap Spin, and let the wheel randomly pick one for you when you can\'t decide.'},
  calchub:{text:'Pick a calculator type from the tabs — Simple, Scientific, Engineering, Percentage, or Financial — and use it just like a regular calculator for that purpose.'},
  numwords:{text:'Switch modes to convert a number into written words, words back into a number, or to/from Roman numerals — type your input and see the result instantly.'},
  morse:{text:'Type any text to see it converted to Morse code (with real beep sounds), or paste Morse code to convert it back to readable text.'},
  ttt:{text:'Pick a difficulty (or play against a friend on the same device), tap a square to place your mark, and try to get three in a row before your opponent.'},
  g2048:{text:'Swipe in any direction to slide all tiles that way — matching numbers merge into their sum. Keep merging tiles to try to reach 2048 and beyond.'},
  memory:{text:'Tap any two cards to flip them. If they match, they stay revealed; if not, they flip back. Match every pair in as few tries as possible.'},
  snake:{text:'Use swipe gestures (or arrow keys on desktop) to steer the snake toward the food. Each bite makes it grow — avoid hitting the walls or yourself.'},
  sudoku:{text:'Pick a difficulty, then tap a cell and choose a number from the number pad to fill it in. Turn on Pencil Marks from the toggles in the top-right if you want to jot down possible numbers before committing.'},
  wordsearch:{text:'Pick a difficulty, then drag your finger across letters in the grid to select a hidden word from the list. Find them all to win.'},
  breath:{text:'Choose a breathing pattern (Box, 4-7-8, or Deep Breathing) and follow the expanding and contracting circle on screen to pace your inhale, hold, and exhale.'},
  lunghold:{text:'Tap Start and hold your breath for as long as comfortably possible, then tap Stop — the timer shows how long you held it. Never push past what feels safe.'},
  breathrate:{text:'Tap Start and count your natural breaths for the timed interval; the tool then calculates your breaths per minute.'},
  heartrate:{text:'Tap in rhythm with your pulse (find it on your wrist or neck) for the timed interval, and it\'ll calculate your beats per minute.'},
  heartzone:{text:'Enter your age (and resting heart rate if you know it), and it\'ll calculate your estimated max heart rate along with your training zones — fat burn, cardio, peak, and so on.'},
  stress:{text:'Tap Start and follow the guided breathing pauses and calming prompts for a short relaxation session.'},
  eyetimer:{text:'Tap Start and it\'ll quietly remind you every 20 minutes to look at something 20 feet away for 20 seconds — the classic eye-strain rule for screen use.'},
  water:{text:'Tap the + button each time you drink a glass of water to track progress toward your daily hydration goal.'},
  cycle:{text:'Pick the first day of your last period, adjust the two sliders to match your usual cycle and period length, then tap Calculate to see your current phase, next predicted period, and fertile window.'},
  science:{text:'Pick a subject tab (Maths, Physics, Chemistry, or General), type your question in plain language, and tap "Solve with AI" to get a step-by-step explanation.'},
  auth:{text:'To sign up: tap "Sign Up", then either tap "Continue with Google" for one-tap sign-in, or fill in your name, email and a password (6+ characters) and tap "Create Account". To sign in later, tap "Sign In" and use the same Google account or email/password. Forgot your password? Tap "Forgot password?" on the Sign In tab and a reset link will be emailed to you. Once signed in, manage your profile picture, log out, or delete your account anytime from Settings → Account.'}
};
const MAIN_TUTORIAL_VIDEO_ID=null; // TODO: paste your unlisted YouTube video ID here once it's uploaded
const HUB_PAGES=['home','apps','games','health','services','about','timer','community'];

function injectHelpButton(page){
  const old=document.getElementById('helpFab');
  if(old)old.remove();
  if(HUB_PAGES.indexOf(page)!==-1)return;
  const h2=appEl.querySelector('h2');
  if(!h2)return;
  const btn=document.createElement('button');
  btn.id='helpFab';
  btn.className='help-inline-btn';
  btn.innerHTML='❓';
  btn.title='How to use this';
  btn.onclick=function(){showHelpBox(page);};
  h2.appendChild(btn);
}
function showHelpBox(pageId){
  const t=TUTORIALS[pageId];
  let body='';
  if(t && t.text){
    body+="<p style='font-size:13.5px;line-height:1.7;margin-bottom:14px;color:var(--text)'>"+t.text+"</p>";
  }else{
    body+="<p style='font-size:13.5px;color:var(--muted);margin-bottom:14px;'>A written how-to for this tool is coming soon.</p>";
  }
  if(t && t.videoId){
    body+="<div style='position:relative;padding-top:56.25%;border-radius:14px;overflow:hidden;'><iframe src='https://www.youtube.com/embed/"+t.videoId+"' style='position:absolute;top:0;left:0;width:100%;height:100%;border:0;' allowfullscreen></iframe></div>";
  }else{
    body+="<p style='font-size:12px;color:var(--muted);'>🎬 A short video clip for this tool isn't up yet — check back later.</p>";
  }
  const m=document.createElement('div');m.className='modal-overlay';
  m.innerHTML=`<div class='modal-box'>
    <h3>❓ How to use this</h3>
    ${body}
    <button class='btn btn-secondary' style='width:100%;margin-top:12px' onclick="this.closest('.modal-overlay').remove()">Close</button>
  </div>`;
  document.body.appendChild(m);
}

function renderHomeEasy(){
  appEl.innerHTML=`
  <div class='easy-wrap'>
    <div class='easy-header'>
      <h1>👋 Welcome</h1>
      <p>Tap a big button below to get started</p>
    </div>
    <div class='easy-grid'>
      <div class='easy-tile' onclick="go('apps')"><span class='easy-icon'>🧰</span><span class='easy-label'>All Apps</span></div>
      <div class='easy-tile' onclick="go('games')"><span class='easy-icon'>🎮</span><span class='easy-label'>Games</span></div>
      <div class='easy-tile' onclick="go('health')"><span class='easy-icon'>🩺</span><span class='easy-label'>Health</span></div>
      <div class='easy-tile' onclick="go('science')"><span class='easy-icon'>🔬</span><span class='easy-label'>Science</span></div>
      <div class='easy-tile' onclick="go('services')"><span class='easy-icon'>🌐</span><span class='easy-label'>Services</span></div>
      <div class='easy-tile wide' onclick="scrollContact()"><span class='easy-icon'>✉️</span><span class='easy-label'>Contact / Say Hello</span></div>
    </div>
    <button class='easy-exit' onclick="settingsToggleEasyMode()">Turn off Simple Mode</button>
  </div>`;
}

/* ═══════════════════════ ABOUT PAGE (added) ═══════════════════════ */
const IG_PERSONAL='https://instagram.com/kiransankar_';
function renderAbout(){
  appEl.innerHTML=`
  <section class='about-hero'>
    <div class='section-label'>ℹ️ About</div>
    <h2 class='section-title'>About KS Tech</h2>
  </section>
  <div class='about-block'>

    <div class='about-card'>
      <h3>👋 Who's behind this</h3>
      <p>KS Tech is built and maintained by <strong>Kiran Sankar</strong> — a small, one-person collection of free tools built out of curiosity, with the assistance of AI along the way.</p>
      <div class='about-links-row'>
        <button class='btn btn-primary' onclick="window.open(IG,'_blank')">📸 Official Instagram</button>
        <button class='btn btn-secondary' onclick="window.open(IG_PERSONAL,'_blank')">👤 Personal Instagram</button>
        <a class='btn btn-ghost' href='mailto:${EMAIL}'>✉️ Email</a>
      </div>
    </div>

    <div class='about-card'>
      <h3>🔒 How your data is handled</h3>
      <p>Every calculator, game and tool on KS Tech runs entirely inside your own browser, on your own device. None of that activity — scores, entries, results — is ever sent to or stored on a server. It's gone the moment you refresh or close the page, so don't rely on this site to hold onto anything important.</p>
      <p>The one exception is your optional <strong>account</strong>. If you choose to sign up, your email address (or Google profile), display name and profile picture are stored securely using Firebase, Google's app platform, so you can sign back in from any device. You can update or permanently delete that information at any time from Settings → Account.</p>
    </div>

    <div class='about-card'>
      <h3>🤖 About the AI assistant</h3>
      <p>The optional AI button (when enabled in Settings) is a helper for questions about the tools on this site. It depends on a third-party AI API and may occasionally be unavailable — that's expected and not a bug.</p>
    </div>

    <div class='about-card'>
      <h3>⚖️ Terms & disclaimer</h3>
      <p>All tools are provided free, "as is," with no warranty of any kind. They're built for everyday convenience, not as a substitute for professional advice — this especially applies to the Health and Science tools, which are for general informational purposes only and are not medical, financial or professional advice.</p>
      <p>Kiran Sankar is not liable for any loss, damage or decision made based on the use of this site. Use your own judgement, and consult a qualified professional for anything important. (This is a plain-language summary, not a formal legal document.)</p>
    </div>

    <div class='about-card'>
      <h3>💡 Quick tips</h3>
      <p>• Tap the ⚙️ Settings icon (top corner) to switch theme, enable/disable the AI button, move it around, or send feedback.</p>
      <p>• Everything is free forever — no ads, no paywalls. Creating an account is optional and only needed if you want your settings to follow you across devices.</p>
      <p>• Found a bug or want a new tool added? Use the Feedback box in Settings — it comes straight to Kiran's inbox.</p>
    </div>

  </div>`;
}

/* ═══════════════════════ APP LIST ═══════════════════════ */
function renderAppList(){
  appEl.innerHTML=`<div class='page-wrap'>
    <div class='back-row'><button class='back-btn' onclick="go('home')">← Back</button></div>
    <div class='page-header'>
      <div>
        <div class='section-label'>⚡ All Apps</div>
        <h2>Apps by Kiran Sankar</h2>
      </div>
    </div>
    <div style='position:relative;margin-bottom:16px'>
      <span style='position:absolute;left:16px;top:50%;transform:translateY(-50%);font-size:16px;pointer-events:none'>🔍</span>
      <input class='ks-input' id='appSearch' placeholder='Search apps...' oninput='filterApps(this.value)' style='padding-left:44px;'>
    </div>
    <div class='apps-grid' id='appsGrid'>
      ${APPS.map(a=>`
      <div class='app-card' onclick="go('${a.id}')" data-name='${a.name.toLowerCase()}' data-desc='${a.desc.toLowerCase()}'>
        <div class='app-card-left'>
          <div class='app-icon'>${a.icon}</div>
          <div>
            <div class='app-name'>${a.name}</div>
            <div class='app-desc'>${a.desc}</div>
          </div>
        </div>
        <div class='app-arrow'>→</div>
      </div>`).join('')}
    </div>
    <div id='noAppsMsg' style='display:none;text-align:center;padding:32px;color:var(--muted);font-size:14px'>😕 No apps found for that search.</div>
  </div>`;
}

function filterApps(query){
  const q = query.toLowerCase().trim();
  const cards = document.querySelectorAll('#appsGrid .app-card');
  let visible = 0;
  cards.forEach(card => {
    const name = card.dataset.name || '';
    const desc = card.dataset.desc || '';
    const match = !q || name.includes(q) || desc.includes(q);
    card.style.display = match ? '' : 'none';
    if(match) visible++;
  });
  const noMsg = document.getElementById('noAppsMsg');
  if(noMsg) noMsg.style.display = visible === 0 ? 'block' : 'none';
}

