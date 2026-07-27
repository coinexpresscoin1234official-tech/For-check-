/* ── CANVAS BACKGROUND (dark=stars, light=geometric) ── */
const canvas=document.getElementById('stars'),ctx=canvas.getContext('2d');
function rsz(){canvas.width=innerWidth;canvas.height=innerHeight;}rsz();
addEventListener('resize',rsz);

/* Dark mode — twinkling stars */
const stars=Array.from({length:180},()=>({
  x:Math.random(),y:Math.random(),
  r:Math.random()*1.5+.3,a:Math.random()
}));

/* Light mode — floating rings + golden particles */
const rings=Array.from({length:7},(_,i)=>({
  x:Math.random()*0.9+0.05,
  y:Math.random()*0.9+0.05,
  r:80+Math.random()*120,
  speed:0.00015+Math.random()*0.0002,
  phase:Math.random()*Math.PI*2,
  rot:Math.random()*Math.PI*2,
  rotSpeed:(Math.random()-0.5)*0.003,
  sides:i%2===0?6:0,   /* hexagon or circle */
  drift:{x:(Math.random()-0.5)*0.00008,y:(Math.random()-0.5)*0.00008}
}));

const particles=Array.from({length:55},()=>({
  x:Math.random(),y:Math.random(),
  vx:(Math.random()-0.5)*0.00018,
  vy:(Math.random()-0.5)*0.00018,
  r:Math.random()*2+0.8,
  a:Math.random()*0.5+0.1,
  pulse:Math.random()*Math.PI*2,
  pulseSpeed:0.02+Math.random()*0.02
}));

function hexPath(cx,cy,r,rot){
  ctx.beginPath();
  for(let i=0;i<6;i++){
    const a=rot+(Math.PI/3)*i;
    i===0?ctx.moveTo(cx+r*Math.cos(a),cy+r*Math.sin(a))
         :ctx.lineTo(cx+r*Math.cos(a),cy+r*Math.sin(a));
  }
  ctx.closePath();
}

function isLight(){return document.documentElement.getAttribute('data-theme')==='light';}

function drawBg(){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  const W=canvas.width,H=canvas.height;

  if(!isLight()){
    /* ── DARK: twinkling stars ── */
    stars.forEach(s=>{
      s.a+=.003*(Math.random()>.5?1:-1);
      s.a=Math.max(.1,Math.min(.9,s.a));
      ctx.globalAlpha=s.a;ctx.fillStyle='#fff';
      ctx.beginPath();ctx.arc(s.x*W,s.y*H,s.r,0,Math.PI*2);ctx.fill();
    });
  } else {
    /* ── LIGHT: geometric rings + particles ── */

    /* 1. Soft radial gradient blobs in background */
    const blobs=[
      {x:0.15,y:0.2, r:280, c:'rgba(245,166,35,0.06)'},
      {x:0.85,y:0.75,r:320, c:'rgba(100,120,255,0.05)'},
      {x:0.5, y:0.9, r:250, c:'rgba(245,166,35,0.04)'},
    ];
    blobs.forEach(b=>{
      const g=ctx.createRadialGradient(b.x*W,b.y*H,0,b.x*W,b.y*H,b.r);
      g.addColorStop(0,b.c);g.addColorStop(1,'transparent');
      ctx.globalAlpha=1;ctx.fillStyle=g;
      ctx.fillRect(0,0,W,H);
    });

    /* 2. Floating hexagons and circles (rings) */
    rings.forEach(ring=>{
      ring.phase+=ring.speed;
      ring.rot+=ring.rotSpeed;
      ring.x+=ring.drift.x; ring.y+=ring.drift.y;
      if(ring.x<-0.1)ring.x=1.1; if(ring.x>1.1)ring.x=-0.1;
      if(ring.y<-0.1)ring.y=1.1; if(ring.y>1.1)ring.y=-0.1;

      const pulse=Math.sin(ring.phase)*0.18+0.82;
      const cx=ring.x*W, cy=ring.y*H, r=ring.r*pulse;
      const alpha=0.07+Math.sin(ring.phase)*0.04;

      ctx.globalAlpha=alpha;
      ctx.strokeStyle='#F5A623';
      ctx.lineWidth=1.5;

      if(ring.sides===6){
        hexPath(cx,cy,r,ring.rot);
        ctx.stroke();
        /* inner smaller hex */
        ctx.globalAlpha=alpha*0.5;
        hexPath(cx,cy,r*0.6,ring.rot+0.3);
        ctx.stroke();
      } else {
        ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.stroke();
        ctx.globalAlpha=alpha*0.4;
        ctx.beginPath();ctx.arc(cx,cy,r*0.55,0,Math.PI*2);ctx.stroke();
      }

      /* connecting dot at center */
      ctx.globalAlpha=alpha*0.8;
      ctx.fillStyle='#F5A623';
      ctx.beginPath();ctx.arc(cx,cy,2,0,Math.PI*2);ctx.fill();
    });

    /* 3. Golden floating particles */
    particles.forEach(p=>{
      p.x+=p.vx; p.y+=p.vy;
      if(p.x<0)p.x=1; if(p.x>1)p.x=0;
      if(p.y<0)p.y=1; if(p.y>1)p.y=0;
      p.pulse+=p.pulseSpeed;
      const a=p.a*(0.7+Math.sin(p.pulse)*0.3);
      ctx.globalAlpha=a;
      ctx.fillStyle='#E8860A';
      ctx.beginPath();ctx.arc(p.x*W,p.y*H,p.r,0,Math.PI*2);ctx.fill();
    });

    /* 4. Subtle grid lines */
    ctx.globalAlpha=0.025;
    ctx.strokeStyle='#F5A623';
    ctx.lineWidth=0.8;
    const gridSize=80;
    for(let x=0;x<W;x+=gridSize){
      ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();
    }
    for(let y=0;y<H;y+=gridSize){
      ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();
    }
  }

  ctx.globalAlpha=1;
  requestAnimationFrame(drawBg);
}
drawBg();

/* ── THEME ── */
function toggleTheme(){
  const t=document.documentElement.getAttribute('data-theme')==='dark'?'light':'dark';
  document.documentElement.setAttribute('data-theme',t);
}

