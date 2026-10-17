const C = window.APP_CONFIG, $ = id => document.getElementById(id);
const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
let kind = 'Hành vi không an toàn';
document.title = C.TITLE; $('ti').textContent = C.TITLE; $('fa').textContent = C.FACTORY + '. Thấy nguy cơ thì gửi ngay, không cần đăng nhập.';
C.AREAS.forEach(a => $('area').append(el('option', '', a)));
$('seg').onclick = e => { const b = e.target.closest('button'); if (!b) return; kind = b.dataset.v; [...$('seg').children].forEach(x => x.classList.toggle('on', x === b)); };
const ok = C.SUPABASE_ANON_KEY.startsWith('sb_publishable_') || C.SUPABASE_ANON_KEY.startsWith('eyJ');
const sb = ok ? supabase.createClient(C.SUPABASE_URL, C.SUPABASE_ANON_KEY) : null;
if (!ok) { $('warn').hidden = false; $('warn').textContent = 'Chưa cấu hình config.js (SUPABASE_URL và SUPABASE_ANON_KEY).'; $('go').disabled = true; }

function uuid() { return crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16); }); }
function resize(file) {  // thu nhỏ ảnh về tối đa 1280 px, JPEG, để gửi nhanh trên mạng yếu
  return new Promise((res, rej) => {
    const img = new Image(), u = URL.createObjectURL(file);
    img.onload = () => { const k = Math.min(1, 1280 / Math.max(img.width, img.height)), cv = document.createElement('canvas');
      cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k); cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
      URL.revokeObjectURL(u); cv.toBlob(b => b ? res(b) : rej(new Error('img')), 'image/jpeg', 0.8); };
    img.onerror = () => rej(new Error('img')); img.src = u; });
}
$('go').onclick = async () => {
  const st = $('st'), ds = $('ds').value.trim();
  if ($('hp').value) return;                                   // bẫy bot
  if (ds.length < 5) { st.textContent = 'Hãy nhập mô tả (ít nhất 5 ký tự).'; return; }
  if (Date.now() - Number(localStorage.getItem('lastSend') || 0) < 20000) { st.textContent = 'Vui lòng chờ vài giây rồi gửi tiếp.'; return; }
  $('go').disabled = true; st.textContent = 'Đang gửi...';
  try {
    let photo = null; const f = $('ph').files[0];
    if (f) { const path = uuid() + '.jpg';
      const { error } = await sb.storage.from('photos').upload(path, await resize(f), { contentType: 'image/jpeg' });
      if (error) throw error; photo = path; }
    const { error } = await sb.from('reports').insert({ kind, area: $('area').value, level: $('lv').value, reporter: $('who').value.trim() || null,
      loc: $('loc').value.trim() || null, description: ds, suggestion: $('sg').value.trim() || null, photo_path: photo });
    if (error) throw error;
    localStorage.setItem('lastSend', Date.now()); ['ds', 'loc', 'sg', 'ph'].forEach(i => $(i).value = ''); st.textContent = 'Đã gửi, cảm ơn bạn.'; stats();
  } catch (e) { st.textContent = 'Chưa gửi được, kiểm tra mạng rồi thử lại.'; console.error(e); }
  $('go').disabled = false;
};
async function stats() {
  if (!sb) return; const { data } = await sb.rpc('get_stats'); if (!data) return;
  const kp = $('kp'); kp.textContent = '';
  [['Tổng báo cáo', data.total], ['Hành vi', data.by_kind['Hành vi không an toàn'] || 0], ['Điều kiện', data.by_kind['Điều kiện không an toàn'] || 0], ['Đã xử lý', data.by_status['Đã xử lý'] || 0]]
    .forEach(([l, v]) => { const d = el('div'); d.append(el('b', '', v), el('span', '', l)); kp.append(d); });
  const ch = $('ch'); ch.textContent = ''; const ks = Object.keys(data.by_area).sort((a, b) => data.by_area[b] - data.by_area[a]), mx = Math.max(1, ...Object.values(data.by_area));
  ks.forEach(k => { const b = el('div', 'bar'), i = el('i'); i.style.width = (data.by_area[k] / mx * 70) + '%'; b.append(el('u', '', k), i, el('span', '', data.by_area[k])); ch.append(b); });
}
stats(); setInterval(stats, 60000);
