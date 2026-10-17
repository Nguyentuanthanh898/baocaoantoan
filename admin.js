const C = window.APP_CONFIG, $ = id => document.getElementById(id);
const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
const sb = supabase.createClient(C.SUPABASE_URL, C.SUPABASE_ANON_KEY);
const LV = { 'Thấp': '#2f9e44', 'Trung bình': '#f08c00', 'Cao': '#d6336c' };
let rows = [], timer = null;
C.AREAS.forEach(a => $('f2').append(el('option', '', a)));
['f1', 'f2', 'f3'].forEach(i => $(i).onchange = render);
$('in').onclick = async () => {
  $('ls').textContent = 'Đang đăng nhập...';
  const { error } = await sb.auth.signInWithPassword({ email: $('em').value.trim(), password: $('pw').value });
  if (error) { $('ls').textContent = 'Sai email hoặc mật khẩu.'; return; } start();
};
$('out').onclick = async () => { await sb.auth.signOut(); clearInterval(timer); $('ap').hidden = true; $('lg').hidden = false; };
$('rf').onclick = load;
async function start() {
  const { data: adm } = await sb.rpc('is_admin');
  if (!adm) { $('ls').textContent = 'Tài khoản này chưa được cấp quyền quản trị.'; await sb.auth.signOut(); return; }
  $('lg').hidden = true; $('ap').hidden = false; await load(); clearInterval(timer); timer = setInterval(load, 30000);
}
async function load() {
  const { data, error } = await sb.from('reports').select('*').order('created_at', { ascending: false }).limit(1000);
  if (error) return; rows = data; render();
}
async function photo(path, box) {
  const { data } = await sb.storage.from('photos').createSignedUrl(path, 600);
  if (data) { const a = el('a'); a.href = data.signedUrl; a.target = '_blank'; a.rel = 'noopener'; const i = el('img', 'th'); i.src = data.signedUrl; i.alt = 'Ảnh hiện trường'; a.append(i); box.append(a); }
}
function render() {
  const f1 = $('f1').value, f2 = $('f2').value, f3 = $('f3').value, n = k => rows.filter(r => r.status === k).length;
  const kp = $('kp'); kp.textContent = '';
  [['Tổng', rows.length], ['Mới', n('Mới')], ['Đang xử lý', n('Đang xử lý')], ['Đã xử lý', n('Đã xử lý')], ['Mức Cao chưa xử lý', rows.filter(r => r.level === 'Cao' && r.status !== 'Đã xử lý').length]]
    .forEach(([l, v]) => { const d = el('div'); d.append(el('b', '', v), el('span', '', l)); kp.append(d); });
  const ls = $('list'); ls.textContent = '';
  const v = rows.filter(r => (!f1 || r.kind === f1) && (!f2 || r.area === f2) && (!f3 || r.status === f3));
  if (!v.length) ls.append(el('div', 'm', 'Không có báo cáo phù hợp.'));
  v.forEach(r => {
    const d = el('div', 'it'), h = el('div'), t1 = el('span', 'tg', r.level), t2 = el('span', 'tg', r.kind);
    t1.style.background = LV[r.level] || '#666'; t2.style.background = '#1f3864';
    h.append(t1, t2, el('b', '', r.area + (r.loc ? ' · ' + r.loc : ''))); d.append(h, el('div', '', r.description));
    if (r.suggestion) d.append(el('div', 'm', 'Đề xuất: ' + r.suggestion));
    if (r.photo_path) { const b = el('div'); d.append(b); photo(r.photo_path, b); }
    const m = el('div', 'm', new Date(r.created_at).toLocaleString('vi-VN') + ' · ' + (r.reporter || 'Ẩn danh') + ' · '), s = el('select');
    ['Mới', 'Đang xử lý', 'Đã xử lý'].forEach(o => { const op = el('option', '', o); op.selected = o === r.status; s.append(op); });
    s.style.cssText = 'width:auto;padding:3px';
    s.onchange = async () => { await sb.from('reports').update({ status: s.value, updated_at: new Date().toISOString() }).eq('id', r.id); load(); };
    const x = el('button', 'btn s', 'Xóa'); x.style.marginLeft = '6px';
    x.onclick = async () => { if (!confirm('Xóa báo cáo này?')) return; if (r.photo_path) await sb.storage.from('photos').remove([r.photo_path]); await sb.from('reports').delete().eq('id', r.id); load(); };
    m.append(s, x); d.append(m);
    const nt = el('input'); nt.placeholder = 'Ghi chú xử lý'; nt.maxLength = 500; nt.value = r.handler_note || ''; nt.style.marginTop = '6px';
    nt.onchange = async () => { await sb.from('reports').update({ handler_note: nt.value.trim() || null, updated_at: new Date().toISOString() }).eq('id', r.id); };
    d.append(nt); ls.append(d);
  });
}
$('csv').onclick = () => {
  const q = s => '"' + String(s ?? '').replace(/"/g, '""') + '"';
  const t = '\ufeffThời gian,Loại,Khu vực,Vị trí,Mức độ,Mô tả,Đề xuất,Người báo,Trạng thái,Ghi chú xử lý\n' +
    rows.map(r => [new Date(r.created_at).toLocaleString('vi-VN'), r.kind, r.area, r.loc, r.level, r.description, r.suggestion, r.reporter, r.status, r.handler_note].map(q).join(',')).join('\n');
  const a = el('a'); a.href = URL.createObjectURL(new Blob([t], { type: 'text/csv;charset=utf-8' })); a.download = 'bao-cao-an-toan.csv'; a.click();
};
sb.auth.getSession().then(({ data }) => { if (data.session) start(); });
