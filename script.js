/* Wi-Fi QR generator (client-side). Uses QRious (included via CDN). */
(() => {
  const ssidEl = document.getElementById('ssid');
  const passEl = document.getElementById('password');
  const secEl = document.getElementById('security');
  const hiddenEl = document.getElementById('hidden');
  const pwToggle = document.getElementById('pwToggle');
  const pwStrengthEl = document.getElementById('pwStrength');
  const pwText = document.getElementById('pw-strength-text');
  const form = document.getElementById('wifiForm');
  const payloadEl = document.getElementById('payload');
  const downloadBtn = document.getElementById('download');
  const copyBtn = document.getElementById('copy');
  const clearBtn = document.getElementById('clear');

  const canvas = document.getElementById('qrCanvas');
  const qr = new QRious({element: canvas, size: 256, value: ''});

  function escapeVal(v){
    return String(v).replace(/([\\;,:"])/g,'\\$1');
  }

  function buildPayload(){
    const ssid = ssidEl.value.trim();
    const pass = passEl.value;
    const type = secEl.value;
    const hidden = hiddenEl ? hiddenEl.checked : false;
    if(!ssid) return '';
    const s = escapeVal(ssid);
    const h = hidden ? 'true' : 'false';
    let payload = '';
    if(type === 'nopass'){
      payload = `WIFI:T:nopass;S:${s};H:${h};;`;
    } else {
      const p = escapeVal(pass);
      payload = `WIFI:T:${type};S:${s};P:${p};H:${h};;`;
    }
    return payload;
  }

  function updateSize(){
    const wrap = document.querySelector('.qr-wrap');
    const max = Math.min(600, Math.round(wrap.clientWidth * 0.9));
    const size = Math.max(128, max);
    qr.size = size;
    // force canvas CSS to match
    canvas.style.width = size + 'px';
    canvas.style.height = size + 'px';
  }

  let resizeTimer = null;
  window.addEventListener('resize', ()=>{
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(updateSize, 120);
  });

  form.addEventListener('submit', (e)=>{
    e.preventDefault();
    const payload = buildPayload();
    if(!payload) return;
    updateSize();
    qr.value = payload;
    payloadEl.value = payload;
  });

  // Password visibility toggle
  if(pwToggle && passEl){
    pwToggle.addEventListener('click', ()=>{
      const revealed = pwToggle.classList.toggle('revealed');
      pwToggle.setAttribute('aria-pressed', revealed ? 'true' : 'false');
      const eyeOpen = pwToggle.querySelector('.eye-open');
      const eyeClosed = pwToggle.querySelector('.eye-closed');
      if(eyeOpen) eyeOpen.style.display = revealed ? 'none' : 'block';
      if(eyeClosed) eyeClosed.style.display = revealed ? 'block' : 'none';
      passEl.type = revealed ? 'text' : 'password';
    });
  }

  // Password strength meter (uses zxcvbn if available)
  if(pwStrengthEl && passEl){
    passEl.addEventListener('input', ()=>{
      const val = passEl.value || '';
      let score = 0;
      let warning = '';
      if(window.zxcvbn){
        try{
          const res = zxcvbn(val);
          score = res.score || 0;
          warning = (res.feedback && res.feedback.warning) ? res.feedback.warning : '';
        }catch(e){
          score = 0;
        }
      } else {
        // Fallback heuristic
        if(val.length >= 12) score = 3;
        else if(val.length >= 8) score = 2;
        else if(val.length > 0) score = 1;
        else score = 0;
      }

      // Map zxcvbn (0-4) to three buckets: weak, ok, strong
      let level = 'weak';
      if(score <= 1) level = 'weak';
      else if(score === 2) level = 'ok';
      else level = 'strong';

      pwStrengthEl.classList.remove('level-weak','level-ok','level-strong');
      pwStrengthEl.classList.add('level-' + level);
      const labels = {weak: 'Weak', ok: 'Ok', strong: 'Strong'};
      pwText.textContent = val ? (labels[level] + (warning ? ' — ' + warning : '')) : 'Enter password';
    });
  }

  clearBtn.addEventListener('click', ()=>{
    ssidEl.value = '';
    passEl.value = '';
    payloadEl.value = '';
    qr.value = '';
  });

  downloadBtn.addEventListener('click', ()=>{
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    const name = (ssidEl.value.trim() || 'wifi') + '.png';
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
  });

  copyBtn.addEventListener('click', async ()=>{
    try{
      await navigator.clipboard.writeText(payloadEl.value);
      const textSpan = copyBtn.querySelector('.btn-text');
      if(textSpan){
        const prev = textSpan.textContent;
        textSpan.textContent = 'Copied';
        setTimeout(()=> textSpan.textContent = prev, 1200);
      } else {
        copyBtn.textContent = 'Copied';
        setTimeout(()=>copyBtn.textContent = 'Copy payload', 1200);
      }
    }catch(e){
      console.warn('copy failed', e);
    }
  });

  // initialize responsive size
  updateSize();
})();
