/* Wi-Fi QR generator (client-side). Uses QRious (included via CDN). */
(() => {
  const ssidEl = document.getElementById('ssid');
  const passEl = document.getElementById('password');
  const secEl = document.getElementById('security');
  const hiddenEl = document.getElementById('hidden');
  const pwToggle = document.getElementById('pwToggle');
  const pwStrengthEl = document.getElementById('pwStrength');
  const pwText = document.getElementById('pw-strength-text');
  const generatePasswordBtn = document.getElementById('generatePassword');
  const form = document.getElementById('wifiForm');
  const downloadBtn = document.getElementById('download');
  const clearBtn = document.getElementById('clear');

  const canvas = document.getElementById('qrCanvas');
  const qr = new QRious({element: canvas, size: 256, value: ''});

  const passwordWords = [
    'able','acid','acre','acorn','aloe','area','army','atom','aqua','arch',
    'area','arid','army','atom','aura','away','baby','back','bacon','badge',
    'bagel','baker','balmy','banana','banjo','basic','beach','beard','beast',
    'bench','berry','black','blade','blank','blend','blind','blink','block',
    'blood','bloom','board','boast','bonus','boost','bound','brain','brake',
    'brave','bread','break','brick','bride','brief','bring','broad','brown',
    'brush','buddy','build','built','bunch','cabin','cable','caddy','cafe','cake',
    'candy','cargo','carry','catch','cause','cedar','chair','chalk','charm','chart',
    'chase','cheap','cheek','cheer','chess','chick','chief','child','china',
    'chill','chime','chimp','choir','choke','chore','cloud','clown','coach',
    'coast','crate','crisp','cross','crown','crush','curve','cycle'
  ];
  const specialChars = ['!','$','%','&','*'];

  function capitalizeWord(word){
    return word.charAt(0).toUpperCase() + word.slice(1);
  }

  function createGeneratedPassword(){
    const maxAttempts = 200;
    for(let attempt = 0; attempt < maxAttempts; attempt++){
      const word1 = passwordWords[Math.floor(Math.random() * passwordWords.length)];
      const word2 = passwordWords[Math.floor(Math.random() * passwordWords.length)];
      const word3 = passwordWords[Math.floor(Math.random() * passwordWords.length)];
      const total = word1.length + word2.length + word3.length;
      if(total > 14) continue;
      const suffix = `${Math.floor(Math.random() * 90 + 10)}${specialChars[Math.floor(Math.random() * specialChars.length)]}`;
      const candidate = [word1, word2, word3].map(capitalizeWord).join('-') + suffix;
      if(candidate.length < 20) return candidate;
    }
    return 'Fox-Dig-Hope0$';
  }

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
    const updateStrength = ()=>{
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
    };

    passEl.addEventListener('input', updateStrength);
    updateStrength();

    if(generatePasswordBtn){
      generatePasswordBtn.addEventListener('click', ()=>{
        passEl.value = createGeneratedPassword();
        passEl.dispatchEvent(new Event('input', { bubbles: true }));
      });
    }
  }

  clearBtn.addEventListener('click', ()=>{
    ssidEl.value = '';
    passEl.value = '';
    qr.value = '';
  });
  downloadBtn.addEventListener('click', async ()=>{
    // export canvas as PNG blob
    canvas.toBlob(async (blob)=>{
      if(!blob) return;
      const name = (ssidEl.value.trim() || 'wifi') + '.png';
      const file = new File([blob], name, {type: 'image/png'});

      // Try Web Share API with files (saves to user's choice, on mobile can save to Photos)
      try{
        if(navigator.canShare && navigator.canShare({files: [file]})){
          await navigator.share({files: [file], title: name, text: 'Wi-Fi QR Code'});
          return;
        }
      }catch(e){
        // fall through to download fallback
        console.warn('share failed', e);
      }

      const url = URL.createObjectURL(blob);
      const isIOS = /iP(ad|hone|od)/.test(navigator.userAgent) && !window.MSStream;
      if(isIOS){
        // iOS Safari: open image in new tab so user can long-press Save Image to Photos
        window.open(url, '_blank');
        setTimeout(()=> URL.revokeObjectURL(url), 10000);
        return;
      }

      // Default: trigger download
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(()=> URL.revokeObjectURL(url), 10000);
    }, 'image/png');
  });

  // initialize responsive size
  updateSize();
})();
