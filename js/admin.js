const loginScreen = document.getElementById('login-screen');
const adminApp = document.getElementById('admin-app');
const loginError = document.getElementById('login-error');

const toFaDigits = (str) => {
  const fa = ['۰','۱','۲','۳','۴','۵','۶','۷','۸','۹'];
  return String(str).replace(/[0-9]/g, d => fa[d]);
};
const formatToman = (n) => new Intl.NumberFormat('fa-IR').format(n) + ' تومان';
const todayISO = () => new Date().toISOString().slice(0,10);

const STATUS_LABELS = { pending: 'در انتظار', confirmed: 'تأیید شده', cancelled: 'لغو شده', completed: 'تکمیل شده' };

// -------- Auth --------
async function checkSession() {
  const { data } = await supabaseClient.auth.getSession();
  if (data.session) {
    showApp();
  } else {
    showLogin();
  }
}
function showLogin() { loginScreen.style.display = 'flex'; adminApp.style.display = 'none'; }
function showApp() {
  loginScreen.style.display = 'none';
  adminApp.style.display = 'flex';
  initTabs();
  loadDashboard();
}

document.getElementById('login-btn').addEventListener('click', async () => {
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  loginError.style.display = 'none';
  const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) {
    loginError.textContent = 'ایمیل یا رمز عبور اشتباه است.';
    loginError.style.display = 'block';
    return;
  }
  showApp();
});

document.getElementById('logout-btn').addEventListener('click', async () => {
  await supabaseClient.auth.signOut();
  showLogin();
});

checkSession();

// -------- Tabs --------
function initTabs() {
  document.querySelectorAll('.admin-nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.admin-nav-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
      if (btn.dataset.tab === 'appointments') loadAppointments();
      if (btn.dataset.tab === 'services') loadServices();
      if (btn.dataset.tab === 'hours') loadHours();
    });
  });
}

// -------- Dashboard --------
async function loadDashboard() {
  const grid = document.getElementById('stat-grid');
  grid.innerHTML = '<div class="empty-note">در حال بارگذاری…</div>';

  const today = todayISO();
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0,10);

  const [{ count: todayCount }, { count: tomorrowCount }, { count: totalCount }, { data: allAppts }] = await Promise.all([
    supabaseClient.from('appointments').select('*', { count: 'exact', head: true }).eq('appointment_date', today).neq('status', 'cancelled'),
    supabaseClient.from('appointments').select('*', { count: 'exact', head: true }).eq('appointment_date', tomorrow).neq('status', 'cancelled'),
    supabaseClient.from('appointments').select('*', { count: 'exact', head: true }),
    supabaseClient.from('appointments').select('total_price, phone, status'),
  ]);

  const activeAppts = (allAppts || []).filter(a => a.status !== 'cancelled');
  const revenue = activeAppts.reduce((sum, a) => sum + (a.total_price || 0), 0);
  const uniqueCustomers = new Set(activeAppts.map(a => a.phone)).size;

  grid.innerHTML = `
    <div class="stat-card"><div class="num">${toFaDigits(todayCount || 0)}</div><div class="label">نوبت‌های امروز</div></div>
    <div class="stat-card"><div class="num">${toFaDigits(tomorrowCount || 0)}</div><div class="label">نوبت‌های فردا</div></div>
    <div class="stat-card"><div class="num">${toFaDigits(totalCount || 0)}</div><div class="label">تعداد کل نوبت‌ها</div></div>
    <div class="stat-card"><div class="num">${toFaDigits(new Intl.NumberFormat('fa-IR').format(revenue))}</div><div class="label">درآمد تخمینی (تومان)</div></div>
    <div class="stat-card"><div class="num">${toFaDigits(uniqueCustomers)}</div><div class="label">تعداد مشتریان</div></div>
  `;
}

// -------- Appointments --------
const presetSelect = document.getElementById('filter-preset');
const dateInput = document.getElementById('filter-date');
const statusSelect = document.getElementById('filter-status');
presetSelect.addEventListener('change', () => {
  dateInput.style.display = presetSelect.value === 'date' ? 'inline-block' : 'none';
  loadAppointments();
});
dateInput.addEventListener('change', loadAppointments);
statusSelect.addEventListener('change', loadAppointments);

async function loadAppointments() {
  const wrap = document.getElementById('appointments-table-wrap');
  wrap.innerHTML = '<div class="empty-note">در حال بارگذاری…</div>';

  let query = supabaseClient.from('appointments').select('*').order('appointment_date', { ascending: true }).order('appointment_time', { ascending: true });

  const preset = presetSelect.value;
  const today = todayISO();
  if (preset === 'today') query = query.eq('appointment_date', today);
  else if (preset === 'tomorrow') query = query.eq('appointment_date', new Date(Date.now() + 86400000).toISOString().slice(0,10));
  else if (preset === 'week') {
    const end = new Date(Date.now() + 7 * 86400000).toISOString().slice(0,10);
    query = query.gte('appointment_date', today).lte('appointment_date', end);
  } else if (preset === 'date' && dateInput.value) {
    query = query.eq('appointment_date', dateInput.value);
  }
  if (statusSelect.value) query = query.eq('status', statusSelect.value);

  const { data, error } = await query;
  if (error || !data || data.length === 0) {
    wrap.innerHTML = '<div class="empty-note">امروز هیچ نوبتی ثبت نشده است.</div>';
    return;
  }

  wrap.innerHTML = `
    <table class="admin-table">
      <thead><tr>
        <th>نام مشتری</th><th>شماره موبایل</th><th>خدمت</th><th>تاریخ</th><th>ساعت</th><th>وضعیت</th>
      </tr></thead>
      <tbody>
        ${data.map(a => `
          <tr data-id="${a.id}">
            <td>${a.customer_name}</td>
            <td dir="ltr">${a.phone}</td>
            <td>${(a.services || []).map(s => s.name).join('، ')}</td>
            <td>${a.appointment_date}</td>
            <td>${a.appointment_time.slice(0,5)}</td>
            <td>
              <select class="status-select">
                ${Object.entries(STATUS_LABELS).map(([val, label]) => `<option value="${val}" ${a.status === val ? 'selected' : ''}>${label}</option>`).join('')}
              </select>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;

  wrap.querySelectorAll('.status-select').forEach(sel => {
    sel.addEventListener('change', async (e) => {
      const id = e.target.closest('tr').dataset.id;
      await supabaseClient.from('appointments').update({ status: e.target.value }).eq('id', id);
      loadDashboard();
    });
  });
}

// -------- Services --------
const serviceModal = document.getElementById('service-modal-overlay');
document.getElementById('add-service-btn').addEventListener('click', () => openServiceModal());
document.getElementById('service-modal-close').addEventListener('click', () => serviceModal.classList.remove('open'));

function openServiceModal(service) {
  document.getElementById('service-modal-title').textContent = service ? 'ویرایش سرویس' : 'سرویس جدید';
  document.getElementById('service-id-input').value = service ? service.id : '';
  document.getElementById('service-name-input').value = service ? service.name : '';
  document.getElementById('service-desc-input').value = service ? (service.description || '') : '';
  document.getElementById('service-price-input').value = service ? service.price : '';
  document.getElementById('service-duration-input').value = service ? service.duration_minutes : 30;
  serviceModal.classList.add('open');
}

document.getElementById('service-save-btn').addEventListener('click', async () => {
  const id = document.getElementById('service-id-input').value;
  const payload = {
    name: document.getElementById('service-name-input').value.trim(),
    description: document.getElementById('service-desc-input').value.trim(),
    price: Number(document.getElementById('service-price-input').value),
    duration_minutes: Number(document.getElementById('service-duration-input').value),
  };
  if (!payload.name || !payload.price) return;

  if (id) await supabaseClient.from('services').update(payload).eq('id', id);
  else await supabaseClient.from('services').insert({ ...payload, is_active: true, sort_order: 99 });

  serviceModal.classList.remove('open');
  loadServices();
});

async function loadServices() {
  const wrap = document.getElementById('services-table-wrap');
  wrap.innerHTML = '<div class="empty-note">در حال بارگذاری…</div>';
  const { data } = await supabaseClient.from('services').select('*').order('sort_order');
  if (!data || data.length === 0) {
    wrap.innerHTML = '<div class="empty-note">هیچ سرویسی ثبت نشده است.</div>';
    return;
  }
  wrap.innerHTML = `
    <table class="admin-table">
      <thead><tr><th>نام</th><th>قیمت</th><th>مدت (دقیقه)</th><th>وضعیت</th><th>عملیات</th></tr></thead>
      <tbody>
        ${data.map(s => `
          <tr data-id="${s.id}">
            <td>${s.name}</td>
            <td>${formatToman(s.price)}</td>
            <td>${toFaDigits(s.duration_minutes)}</td>
            <td><span class="status-badge ${s.is_active ? 'status-confirmed' : 'status-cancelled'}">${s.is_active ? 'فعال' : 'غیرفعال'}</span></td>
            <td>
              <button class="btn btn-ghost edit-service-btn" style="padding:6px 12px;">ویرایش</button>
              <button class="btn btn-ghost toggle-service-btn" style="padding:6px 12px;">${s.is_active ? 'غیرفعال کردن' : 'فعال کردن'}</button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
  wrap.querySelectorAll('.edit-service-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.target.closest('tr').dataset.id;
      const service = data.find(s => s.id === id);
      openServiceModal(service);
    });
  });
  wrap.querySelectorAll('.toggle-service-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.target.closest('tr').dataset.id;
      const service = data.find(s => s.id === id);
      await supabaseClient.from('services').update({ is_active: !service.is_active }).eq('id', id);
      loadServices();
    });
  });
}

// -------- Hours & settings --------
async function loadHours() {
  const { data: settings } = await supabaseClient.from('business_settings').select('*').eq('id', 1).single();
  if (settings) {
    document.getElementById('open-time-input').value = settings.open_time.slice(0,5);
    document.getElementById('close-time-input').value = settings.close_time.slice(0,5);
    document.getElementById('slot-interval-input').value = settings.slot_interval_minutes;
    document.getElementById('business-name-input').value = settings.business_name || '';
    document.getElementById('business-phone-input').value = settings.phone || '';
    document.getElementById('business-address-input').value = settings.address || '';
  }
  loadClosedDates();
  loadBlockedSlots();
}

document.getElementById('save-hours-btn').addEventListener('click', async () => {
  await supabaseClient.from('business_settings').update({
    open_time: document.getElementById('open-time-input').value,
    close_time: document.getElementById('close-time-input').value,
    slot_interval_minutes: Number(document.getElementById('slot-interval-input').value),
  }).eq('id', 1);
  alert('ذخیره شد.');
});

document.getElementById('save-settings-btn').addEventListener('click', async () => {
  await supabaseClient.from('business_settings').update({
    business_name: document.getElementById('business-name-input').value.trim(),
    phone: document.getElementById('business-phone-input').value.trim(),
    address: document.getElementById('business-address-input').value.trim(),
  }).eq('id', 1);
  alert('ذخیره شد.');
});

async function loadClosedDates() {
  const { data } = await supabaseClient.from('closed_dates').select('*').order('closed_date');
  const list = document.getElementById('closed-dates-list');
  if (!data || data.length === 0) { list.innerHTML = ''; return; }
  list.innerHTML = data.map(d => `
    <div class="chip">${d.closed_date}${d.reason ? ' — ' + d.reason : ''} <button data-id="${d.id}" class="remove-closed-btn">×</button></div>
  `).join('');
  list.querySelectorAll('.remove-closed-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      await supabaseClient.from('closed_dates').delete().eq('id', btn.dataset.id);
      loadClosedDates();
    });
  });
}

document.getElementById('add-closed-date-btn').addEventListener('click', async () => {
  const date = document.getElementById('closed-date-input').value;
  const reason = document.getElementById('closed-reason-input').value.trim();
  if (!date) return;
  await supabaseClient.from('closed_dates').insert({ closed_date: date, reason: reason || null });
  document.getElementById('closed-date-input').value = '';
  document.getElementById('closed-reason-input').value = '';
  loadClosedDates();
});

async function loadBlockedSlots() {
  const { data } = await supabaseClient.from('blocked_slots').select('*').order('blocked_date');
  const list = document.getElementById('blocked-slots-list');
  if (!data || data.length === 0) { list.innerHTML = ''; return; }
  list.innerHTML = data.map(b => `
    <div class="chip">${b.blocked_date} — ${b.start_time.slice(0,5)} تا ${b.end_time.slice(0,5)} <button data-id="${b.id}" class="remove-blocked-btn">×</button></div>
  `).join('');
  list.querySelectorAll('.remove-blocked-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      await supabaseClient.from('blocked_slots').delete().eq('id', btn.dataset.id);
      loadBlockedSlots();
    });
  });
}

document.getElementById('add-blocked-btn').addEventListener('click', async () => {
  const date = document.getElementById('blocked-date-input').value;
  const start = document.getElementById('blocked-start-input').value;
  const end = document.getElementById('blocked-end-input').value;
  if (!date || !start || !end) return;
  await supabaseClient.from('blocked_slots').insert({ blocked_date: date, start_time: start, end_time: end });
  loadBlockedSlots();
});
