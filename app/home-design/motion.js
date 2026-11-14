/* eslint-disable */
// Reviewed animation code adapted from the user supplied homepage; lifecycle is scoped to its mount.
export function mountHomepage(root) {
let stopped=false;const controller=new AbortController();const listeners=[];const listen=(node,type,fn,opts)=>{node.addEventListener(type,fn,opts);listeners.push(()=>node.removeEventListener(type,fn,opts))};const frames=new Set(), timers=new Set(), observers=[];
const requestAnimationFrame=(fn)=>{if(stopped)return 0;const id=window.requestAnimationFrame(t=>{frames.delete(id);if(!stopped)fn(t)});frames.add(id);return id;};
const setTimeout=(fn,ms)=>{const id=window.setTimeout(()=>{timers.delete(id);if(!stopped)fn()},ms);timers.add(id);return id;};
const addEventListener=(type,fn,opts={})=>window.addEventListener(type,fn,{...opts,signal:controller.signal});
const IntersectionObserver=class extends window.IntersectionObserver{constructor(...args){super(...args);observers.push(this);}};
root.classList.add('motion-ready');
const cleanup=()=>{stopped=true;controller.abort();frames.forEach(id=>window.cancelAnimationFrame(id));timers.forEach(id=>window.clearTimeout(id));observers.forEach(o=>o.disconnect());listeners.forEach(remove=>remove());root.classList.remove('motion-ready','particles-on','menu-open');};
try {

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isMobile = () => innerWidth <= 860;
  const head = root.querySelector("#" + 'head'), prog = root.querySelector("#" + 'progress');
  const hero = root.querySelector("#" + 'hero'), heroInner = root.querySelector("#" + 'heroInner');
  const mouse = {x:0,y:0,sx:0,sy:0,px:-9999,py:-9999};
  addEventListener('pointermove', e => { mouse.x = e.clientX/innerWidth*2-1; mouse.y = -(e.clientY/innerHeight*2-1); mouse.px=e.clientX; mouse.py=e.clientY; }, {passive:true});

  /* menu */
  const mb = root.querySelector("#" + 'menuBtn'); addEventListener('keydown',e=>{if(e.key==='Escape' && root.classList.contains('menu-open')){root.classList.remove('menu-open');mb.setAttribute('aria-expanded','false');mb.focus()}});
  listen(mb,'click',()=>{const o=root.classList.toggle('menu-open');mb.setAttribute('aria-expanded',String(o));mb.setAttribute('aria-label',o?'关闭菜单':'打开菜单')});
  root.querySelectorAll('.nav a').forEach(a=>listen(a,'click',()=>{root.classList.remove('menu-open');mb.setAttribute('aria-expanded','false');}));

  /* ---------- WebGL starlight renderer (no external library) ---------- */
  function starGL(canvas, opts){
    let gl;
    try{ gl = canvas.getContext('webgl',{antialias:false,alpha:false,powerPreference:'high-performance'}); }catch(e){}
    if(!gl) return null;
    const vs='attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
    const fs=root.querySelector("#" + 'fs').textContent;
    const mk=(t,s)=>{const sh=gl.createShader(t);gl.shaderSource(sh,s);gl.compileShader(sh);if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS)){console.warn(gl.getShaderInfoLog(sh));return null;}return sh;};
    const v=mk(gl.VERTEX_SHADER,vs), f=mk(gl.FRAGMENT_SHADER,fs); if(!v||!f) return null;
    const pr=gl.createProgram(); gl.attachShader(pr,v); gl.attachShader(pr,f); gl.linkProgram(pr);
    if(!gl.getProgramParameter(pr,gl.LINK_STATUS)) return null;
    gl.useProgram(pr);
    const b=gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER,b); gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
    const loc=gl.getAttribLocation(pr,'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
    const U={}; ['uRes','uTime','uMouse','uScroll','uStar','uStarScale','uNebula','uWarp'].forEach(n=>U[n]=gl.getUniformLocation(pr,n));
    let quality = opts.quality || 1;
    const size=()=>{const dpr=Math.min(devicePixelRatio||1,1.5)*quality; const w=Math.max(1,Math.round(canvas.clientWidth*dpr)), h=Math.max(1,Math.round(canvas.clientHeight*dpr)); if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;gl.viewport(0,0,w,h);} };
    size();
    let last=performance.now(), slow=0;
    return {
      resize:size,
      draw(t, m, scroll){
        const now=performance.now(), dt=now-last; last=now;
        if(dt>40){ if(++slow>20 && quality>.55){quality-=.15;slow=0;size();} } else slow=Math.max(0,slow-1);
        const st=opts.star();
        gl.uniform2f(U.uRes,canvas.width,canvas.height); gl.uniform1f(U.uTime,t);
        gl.uniform2f(U.uMouse,m.x,m.y); gl.uniform1f(U.uScroll,scroll);
        gl.uniform2f(U.uStar,st[0],st[1]); gl.uniform1f(U.uStarScale,st[2]);
        gl.uniform1f(U.uNebula,opts.nebula); gl.uniform1f(U.uWarp,opts.warp);
        gl.drawArrays(gl.TRIANGLES,0,3);
      }
    };
  }
  const heroGL = starGL(root.querySelector("#" + 'gl'),{nebula:1,warp:1,star:()=> isMobile()? [0,.2,.8] : [0,.19,1]});
  const bannerCanvas=root.querySelector("#" + 'gl2');
  const bannerGL = starGL(bannerCanvas,{nebula:.7,warp:.6,quality:.9,star:()=>[0,0,1.15]});
  if(bannerGL) bannerCanvas.previousElementSibling.style.display='none';

  /* ---------- particle title: sparks burst out of the star and assemble ---------- */
  const pc=root.querySelector("#" + 'ptext'), pctx=pc.getContext('2d'), ptitle=root.querySelector("#" + 'ptitle');
  let parts=[], pW=0, pH=0, pdpr=1, pStart=0, particlesOK=false;
  function buildParticles(){
    pdpr=Math.min(devicePixelRatio||1,2); pW=hero.clientWidth; pH=hero.clientHeight;
    pc.width=pW*pdpr; pc.height=pH*pdpr; pctx.setTransform(pdpr,0,0,pdpr,0,0);
    const r=ptitle.getBoundingClientRect(), hr=hero.getBoundingClientRect();
    const cs=getComputedStyle(ptitle);
    const off=document.createElement('canvas'); const ow=Math.ceil(r.width), oh=Math.ceil(r.height); off.width=ow; off.height=oh;
    const o=off.getContext('2d'); o.fillStyle='#fff'; o.textAlign='center'; o.textBaseline='middle';
    o.font=`${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    if('letterSpacing' in o) o.letterSpacing=cs.letterSpacing;
    o.fillText(ptitle.textContent, ow/2, oh/2+parseFloat(cs.fontSize)*.04);
    const data=o.getImageData(0,0,ow,oh).data;
    const fs=parseFloat(cs.fontSize); const step=Math.max(2,Math.round(fs/66));
    const ox=r.left-hr.left, oy=r.top-hr.top;
    const starX=pW/2, starY=pH*(isMobile()?.30:.31);
    const prev=parts; parts=[];
    for(let y=0;y<oh;y+=step) for(let x=0;x<ow;x+=step){
      if(data[(y*ow+x)*4+3]>140){
        const a=Math.random()*Math.PI*2, sp=2+Math.random()*9;
        parts.push({tx:ox+x+(Math.random()-.5)*step*.6, ty:oy+y+(Math.random()-.5)*step*.6,
          x:starX+(Math.random()-.5)*10, y:starY+(Math.random()-.5)*10, vx:Math.cos(a)*sp, vy:Math.sin(a)*sp,
          s:Math.random()*1.4+.9, d:Math.random()*900, k:.018+Math.random()*.03, ph:Math.random()*6.28,
          c:Math.random()<.18?'255,250,235':(Math.random()<.5?'255,215,120':'255,190,80')});
      }
    }
    if(prev.length && !reduced){ /* on resize, morph from current positions */ parts.forEach((p,i)=>{const q=prev[i%prev.length];p.x=q.x;p.y=q.y;p.vx=0;p.vy=0;p.d=0;}); }
    if(reduced){ parts.forEach(p=>{p.x=p.tx;p.y=p.ty;}); }
    particlesOK=parts.length>50;
    root.classList.toggle('particles-on',particlesOK);
  }
  let pLast=0;
  function drawParticles(now){
    const el=now-pStart; const steps=Math.max(1,Math.min(4,Math.round((now-(pLast||now-16.7))/16.7))); pLast=now;
    pctx.clearRect(0,0,pW,pH);
    pctx.globalCompositeOperation='lighter';
    const mx=mouse.px-hero.getBoundingClientRect().left, my=mouse.py-hero.getBoundingClientRect().top;
    for(const p of parts){
     for(let k=0;k<steps;k++){
      if(el>p.d || reduced){
        let ax=(p.tx-p.x)*p.k, ay=(p.ty-p.y)*p.k;
        const dx=p.x-mx, dy=p.y-my, dd=dx*dx+dy*dy;
        if(dd<6400){ const f=(6400-dd)/6400*2.2; const l=Math.sqrt(dd)||1; ax+=dx/l*f; ay+=dy/l*f; }
        p.vx=(p.vx+ax)*.86; p.vy=(p.vy+ay)*.86;
      } else { p.vx*=.97; p.vy*=.97; p.vy+=.01; }
      p.x+=p.vx; p.y+=p.vy;
     }
      const sp=Math.abs(p.vx)+Math.abs(p.vy);
      const tw=.55+.45*Math.sin(now*.003+p.ph);
      pctx.fillStyle=`rgba(${p.c},${Math.min(1,.45+tw*.55)})`;
      if(sp>1.5){ pctx.fillRect(p.x,p.y,p.s+Math.min(sp,6)*.4,p.s); } else pctx.fillRect(p.x,p.y,p.s,p.s);
    }
    pctx.globalCompositeOperation='source-over';
  }

  /* ---------- statement: scroll-linked char fill ---------- */
  const st=root.querySelector("#" + 'statement'); st.textContent=''; const chars=[];
  st.dataset.text.split(/(【[^】]*】)/).forEach(seg=>{
    const key=seg.startsWith('【'); const txt=key?seg.slice(1,-1):seg;
    for(const ch of txt){const s=document.createElement('span');s.className='c'+(key?' k':'');s.textContent=ch;st.appendChild(s);chars.push(s);}
  });
  st.setAttribute('aria-label',st.textContent);
  let filled=0;
  function fillStatement(){
    const r=st.getBoundingClientRect(); const vh=innerHeight;
    const p=Math.min(1,Math.max(0,(vh*.85-r.top)/(r.height+vh*.35)));
    const n=Math.round(p*chars.length);
    if(n>filled) for(let i=filled;i<n;i++) chars[i].classList.add('on');
    else for(let i=n;i<filled;i++) chars[i].classList.remove('on');
    filled=n;
  }

  /* ---------- cinematic scene ---------- */
  const scene=root.querySelector("#" + 'scene'), sm=root.querySelector("#" + 'sceneMedia');
  const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v)), ease=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
  function sceneUpdate(){
    const r=scene.getBoundingClientRect(); const span=r.height-innerHeight;
    const p=clamp(-r.top/span); const e=ease(clamp(p/.62));
    const S=scene.style;
    S.setProperty('--iy',(22*(1-e))+'%'); S.setProperty('--ix',(26*(1-e))+'%'); S.setProperty('--ir',(18*(1-e))+'px');
    S.setProperty('--s',(1.28-.28*e).toFixed(4)); S.setProperty('--b',(10*(1-e)).toFixed(2)+'px'); S.setProperty('--br',(.92+.08*e).toFixed(3));
    S.setProperty('--ov',clamp((p-.45)/.3).toFixed(3)); S.setProperty('--to',clamp((p-.55)/.25).toFixed(3)); S.setProperty('--lo',(1-clamp(p/.25)).toFixed(3));
  }

  /* ---------- journey ---------- */
  const jSteps=[...root.querySelectorAll('.j-step')], jImgs=[...root.querySelectorAll('#jVisual img')];
  const jNum=root.querySelector("#" + 'jNum'), jLabel=root.querySelector("#" + 'jLabel'), jBar=root.querySelector("#" + 'jBar');
  let jActive=0, z=1;
  function setJourney(i){
    if(i===jActive) return; jActive=i;
    jSteps.forEach((s,k)=>s.classList.toggle('on',k===i));
    const im=jImgs[i]; im.classList.remove('on','base'); void im.offsetWidth; im.style.zIndex=++z; im.classList.add('on');
    jNum.textContent=String(i+1).padStart(2,'0'); jLabel.textContent=jSteps[i].dataset.label;
  }
  function journeyUpdate(){
    if(isMobile()) return;
    const c=innerHeight*.5; let best=0, bd=1e9;
    jSteps.forEach((s,k)=>{const r=s.getBoundingClientRect(); const d=Math.abs(r.top+r.height/2-c); if(d<bd){bd=d;best=k;}});
    setJourney(best);
    const a=jSteps[0].getBoundingClientRect(), b=jSteps[jSteps.length-1].getBoundingClientRect();
    root.querySelector("#" + 'jVisual').style.setProperty('--jp',clamp((c-a.top)/(b.bottom-a.top)).toFixed(3));
  }

  /* ---------- main loop ---------- */
  let heroVisible=true, bannerVisible=false;
  new IntersectionObserver(([e])=>heroVisible=e.isIntersecting).observe(hero);
  new IntersectionObserver(([e])=>bannerVisible=e.isIntersecting).observe(bannerCanvas);
  const t0=performance.now();
  function frame(now){
    mouse.sx+=(mouse.x-mouse.sx)*.05; mouse.sy+=(mouse.y-mouse.sy)*.05;
    const t=(now-t0)/1000;
    const hp=clamp(scrollY/hero.offsetHeight);
    if(heroVisible && !document.hidden){
      heroGL && heroGL.draw(t,{x:mouse.sx,y:mouse.sy},hp);
      if(particlesOK) drawParticles(now);
    }
    if(bannerVisible && bannerGL && !document.hidden) bannerGL.draw(t+40,{x:mouse.sx*.5,y:mouse.sy*.5},0);
    if(!reduced) requestAnimationFrame(frame);
  }
  function onScroll(){
    const y=scrollY, hh=hero.offsetHeight;
    const max=document.documentElement.scrollHeight-innerHeight;
    prog.style.setProperty('--p',max>0?y/max:0);
    head.classList.toggle('light', y>hh-80);
    head.classList.toggle('dark', y>30 && y<=hh-80);
    const hp=reduced ? 0 : clamp(y/hh);
    heroInner.style.transform=reduced ? "none" : `translate3d(${mouse.sx*-8}px,${y*.35}px,0)`;
    heroInner.style.opacity=(1-hp*1.5).toFixed(3);
    heroInner.style.filter=hp>.02?`blur(${(hp*10).toFixed(1)}px)`:'';
    pc.style.transform=`translate3d(0,${y*.35}px,0) scale(${1+hp*.15})`; pc.style.opacity=(1-hp*1.4).toFixed(3);
    fillStatement(); if(!reduced) sceneUpdate(); journeyUpdate();
  }
  let ticking=false;
  addEventListener('scroll',()=>{ if(!ticking){ticking=true;requestAnimationFrame(()=>{ticking=false;onScroll();});} },{passive:true});
  let rt; addEventListener('resize',()=>{clearTimeout(rt);rt=setTimeout(()=>{heroGL&&heroGL.resize();bannerGL&&bannerGL.resize();buildParticles();onScroll();if(reduced)frame(performance.now());},150);});

  const startParticles=()=>{ if(stopped)return; try{ buildParticles(); pStart=performance.now()+700; }catch(e){ particlesOK=false; root.classList.remove('particles-on'); } };
  (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(startParticles);
  onScroll(); requestAnimationFrame(frame);
  if(reduced) setTimeout(()=>frame(performance.now()),100);

  /* ---------- reveals ---------- */
  const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}}),{threshold:.14,rootMargin:'0px 0px -6% 0px'});
  root.querySelectorAll('.reveal,.mask,.offer div').forEach(el=>io.observe(el));

  /* ---------- 3D tilt cards ---------- */
  if(matchMedia('(hover:hover)').matches && !reduced) root.querySelectorAll('.role').forEach(card=>{
    listen(card,'pointermove',e=>{const r=card.getBoundingClientRect();const x=(e.clientX-r.left)/r.width, y=(e.clientY-r.top)/r.height;
      card.classList.add('tilting'); card.style.transform=`rotateX(${(.5-y)*9}deg) rotateY(${(x-.5)*11}deg) translateY(-6px)`;
      card.style.setProperty('--gx',x*100+'%'); card.style.setProperty('--gy',y*100+'%');});
    listen(card,'pointerleave',()=>{card.classList.remove('tilting');card.style.transform='';});
  });

  /* ---------- stories ---------- */
  const sImgs=[...root.querySelectorAll('#stMedia img')], sTxt=[...root.querySelectorAll('#stText article')], sBtn=[...root.querySelectorAll('#stCtrl button')], ctrl=root.querySelector("#" + 'stCtrl'), stage=root.querySelector("#" + 'stStage');
  let si=0, sz=1, timer; let userPaused=false; const pause=root.querySelector('#storyPause'); listen(pause,'click',()=>{userPaused=!userPaused;pause.textContent=userPaused?'继续播放':'暂停播放';pause.setAttribute('aria-pressed',String(userPaused));schedule();}); listen(stage,'focusin',()=>ctrl.classList.add('paused')); listen(stage,'focusout',e=>{if(!stage.contains(e.relatedTarget))ctrl.classList.remove('paused')});
  function showStory(i){ if(i===si) return; si=i;
    const im=sImgs[i]; im.classList.remove('on','base'); void im.offsetWidth; im.style.zIndex=++sz; im.classList.add('on');
    sTxt.forEach((a,k)=>a.classList.toggle('on',k===i));
    sBtn.forEach((b,k)=>{b.classList.remove('on'); if(k===i){void b.offsetWidth;b.classList.add('on');}});
    schedule(); }
  function schedule(){ clearTimeout(timer); if(!reduced) timer=setTimeout(()=>{ if(!userPaused && !document.hidden && !ctrl.classList.contains('paused')) showStory((si+1)%sImgs.length); else schedule(); },7000); }
  sBtn.forEach((b,i)=>listen(b,'click',()=>showStory(i)));
  listen(stage,'mouseenter',()=>ctrl.classList.add('paused')); listen(stage,'mouseleave',()=>ctrl.classList.remove('paused'));
  schedule();

  /* ---------- form (front-end only) ---------- */
  const form=root.querySelector("#" + 'form'), msg=root.querySelector("#" + 'formMsg');
  listen(form,'submit',e=>{ e.preventDefault();
    const email=form.elements.namedItem('email').value.trim();
    if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)){msg.style.color='#d9480f';msg.textContent='请输入有效的邮箱地址。';return;}
    if(!form.elements.namedItem('agree').checked){msg.style.color='#d9480f';msg.textContent='请先阅读并同意隐私政策与平台使用规则。';return;}
    const fields=new FormData(form);const subject='星光计划合作与咨询';const text='称呼：'+fields.get('name')+'\n身份：'+fields.get('role')+'\n联系邮箱：'+email+'\n\n我想咨询：'; window.location.href='mailto:ruthyanghao@hotmail.com?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(text);msg.style.color='';msg.textContent='已请求打开邮件应用，请在邮件应用中补充内容并发送。也可直接写信至 ruthyanghao@hotmail.com。'; });

} catch(error) {cleanup();console.error('Homepage animation unavailable',error);}
return cleanup;
}
