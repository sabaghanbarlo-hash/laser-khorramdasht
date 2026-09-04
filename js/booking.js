(function () {
  const overlay = document.getElementById('booking-overlay');
  const body = document.getElementById('booking-body');
  const stepperEl = document.getElementById('stepper');
  const closeBtn = document.getElementById('booking-close');

  const legalOverlay = document.getElementById('legal-overlay');
  document.getElementById('legal-close').addEventListener('click', () => legalOverlay.classList.remove('open'));

  const PERSIAN_WEEKDAYS = ['ی', 'د', 'س', 'چ', 'پ', 'ج', 'ش'];
  const PERSIAN_MONTHS = ['فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور','مهر','آبان','آذر','دی','بهمن','اسفند'];

  const state = {
    step: 1,
    selectedServices: [],
    viewDate: new Date(),
    selectedDateISO: null,
    selectedDateFa: '',
    selectedTime: null,
    takenSlots: [],
    closedDates: [],
    blockedSlots: [],
    settings: null,
    name: '',
    phone: '',
    notes: '',
    agreed: false,
    submitting: false,
    result: null,
  };

  function toFaDigits(str) {
    const fa = ['۰','۱','۲','۳','۴','۵','۶','۷','۸','۹'];
    return String(str).replace(/[0-9]/g, d => fa[d]);
  }

  function toPersianDate(date) {
    try {
      const fmt = new Intl.DateTimeFormat('fa-IR-u-ca-persian', { year: 'numeric', month: 'long', day: 'numeric' });
      return fmt.format(date);
    } catch (e) {
      return date.toLocaleDateString('fa-IR');
    }
  }

  function openModal() {
    resetState();
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    render();
    ensureSupportingData();
  }
  function closeModal() {
    overlay.classList.remove('open');
    document.body.style.overflow = '';
  }
  closeBtn.addEventListener('click', closeModal);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });

  ['open-booking-header','open-booking-hero','open-booking-offer','open-booking-contact','open-booking-sticky']
    .forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('click', openModal);
    });

  function resetState() {
    state.step = 1;
    state.selectedServices = [];
    state.viewDate = new Date();
    state.selectedDateISO = null;
    state.selectedTime = null;
    state.name = '';
    state.phone = '';
    state.notes = '';
    state.agreed = false;
    state.submitting = false;
    state.result = null;
  }

  async function ensureSupportingData() {
    if (!state.settings) {
      const { data } = await supabaseClient.from('business_settings').select('*').eq('id', 1).single();
      state.settings = data;
    }
    if (!state.closedDatesLoaded) {
      const { data } = await supabaseClient.from('closed_dates').select('*');
      state.closedDates = (data || []).map(d => d.closed_date);
      state.closedDatesLoaded = true;
    }
  }

  function updateStepper() {
    stepperEl.querySelectorAll('.dot').forEach((dot, i) => {
      dot.classList.toggle('active', i < state.step);
    });
  }

  function render() {
    updateStepper();
    if (state.result) return renderSuccess();
    if (state.step === 1) return renderStep1();
    if (state.step === 2) return renderStep2();
    if (state.step === 3) return renderStep3();
    if (state.step === 4) return renderStep4();
  }

  // -------- Step 1: choose service(s) --------
  function renderStep1() {
    const services = window.__servicesCache || [];
    body.innerHTML = `
      <h3 class="modal-title" id="booking-title">۱. انتخاب خدمت</h3>
      <p class="modal-sub">می‌توانید یک یا چند خدمت را انتخاب کنید.</p>
      <div class="option-list" id="service-options">
        ${services.map(s => `
          <div class="option-row ${state.selectedServices.find(x=>x.id===s.id) ? 'selected' : ''}" data-id="${s.id}">
            <div>
              <div class="name">${s.name}</div>
              <div class="desc">${s.description || ''}</div>
            </div>
            <div class="price">${new Intl.NumberFormat('fa-IR').format(s.price)}</div>
          </div>
        `).join('')}
      </div>
      <button class="btn btn-primary btn-block" id="step1-next" ${state.selectedServices.length === 0 ? 'disabled' : ''}>ادامه</button>
    `;
    body.querySelectorAll('.option-row').forEach(row => {
      row.addEventListener('click', () => {
        const id = row.dataset.id;
        const svc = services.find(s => s.id === id);
        const idx = state.selectedServices.findIndex(s => s.id === id);
        if (idx >= 0) state.selectedServices.splice(idx, 1);
        else state.selectedServices.push(svc);
        renderStep1();
      });
    });
    document.getElementById('step1-next').addEventListener('click', () => {
      if (state.selectedServices.length === 0) return;
      state.step = 2;
      render();
    });
  }

  // -------- Step 2: choose date + time --------
  function renderStep2() {
    body.innerHTML = `
      <h3 class="modal-title" id="booking-title">۲. انتخاب تاریخ و ساعت</h3>
      <p class="modal-sub">تاریخ موردنظر را انتخاب کنید.</p>
      <div class="cal-nav">
        <button id="cal-prev" aria-label="ماه قبل">‹</button>
        <div class="label" id="cal-label"></div>
        <button id="cal-next" aria-label="ماه بعد">›</button>
      </div>
      <div class="calendar-grid" id="cal-grid"></div>
      <div id="slots-wrap"></div>
      <div class="modal-footer-nav">
        <button class="btn btn-ghost" id="step2-back">بازگشت</button>
        <button class="btn btn-primary" id="step2-next" disabled>ادامه</button>
      </div>
    `;
    document.getElementById('step2-back').addEventListener('click', () => { state.step = 1; render(); });
    document.getElementById('step2-next').addEventListener('click', () => {
      if (!state.selectedDateISO || !state.selectedTime) return;
      state.step = 3;
      render();
    });
    document.getElementById('cal-prev').addEventListener('click', () => {
      state.viewDate = new Date(state.viewDate.getFullYear(), state.viewDate.getMonth() - 1, 1);
      renderCalendar();
    });
    document.getElementById('cal-next').addEventListener('click', () => {
      state.viewDate = new Date(state.viewDate.getFullYear(), state.viewDate.getMonth() + 1, 1);
      renderCalendar();
    });
    renderCalendar();
    if (state.selectedDateISO) renderSlots();
  }

  function renderCalendar() {
    const label = document.getElementById('cal-label');
    const grid = document.getElementById('cal-grid');
    const y = state.viewDate.getFullYear();
    const m = state.viewDate.getMonth();
    label.textContent = state.viewDate.toLocaleDateString('fa-IR-u-ca-persian', { year: 'numeric', month: 'long' });

    const firstDay = new Date(y, m, 1);
    const startWeekday = firstDay.getDay(); // 0=Sun
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const today = new Date(); today.setHours(0,0,0,0);

    let html = PERSIAN_WEEKDAYS.map(d => `<div class="cal-weekday">${d}</div>`).join('');
    for (let i = 0; i < startWeekday; i++) html += `<div class="cal-day empty"></div>`;

    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(y, m, day);
      const iso = d.toISOString().slice(0,10);
      const isPast = d < today;
      const isClosed = state.closedDates.includes(iso);
      const disabled = isPast || isClosed;
      const selected = state.selectedDateISO === iso;
      html += `<div class="cal-day ${disabled ? 'disabled' : ''} ${selected ? 'selected' : ''}" data-iso="${iso}">${toFaDigits(day)}</div>`;
    }
    grid.innerHTML = html;
    grid.querySelectorAll('.cal-day:not(.disabled):not(.empty)').forEach(cell => {
      cell.addEventListener('click', async () => {
        state.selectedDateISO = cell.dataset.iso;
        state.selectedTime = null;
        renderCalendar();
        await renderSlots();
      });
    });
  }

  function generateSlots() {
    const settings = state.settings || { open_time: '09:00:00', close_time: '22:00:00', slot_interval_minutes: 30 };
    const [oh, om] = settings.open_time.split(':').map(Number);
    const [ch, cm] = settings.close_time.split(':').map(Number);
    const interval = settings.slot_interval_minutes || 30;
    const slots = [];
    let mins = oh * 60 + om;
    const endMins = ch * 60 + cm;
    while (mins + interval <= endMins) {
      const h = Math.floor(mins / 60).toString().padStart(2, '0');
      const mm = (mins % 60).toString().padStart(2, '0');
      slots.push(`${h}:${mm}`);
      mins += interval;
    }
    return slots;
  }

  async function renderSlots() {
    const wrap = document.getElementById('slots-wrap');
    wrap.innerHTML = `<p class="empty-note">در حال بارگذاری زمان‌های آزاد…</p>`;

    const { data: taken } = await supabaseClient
      .from('public_taken_slots')
      .select('appointment_time')
      .eq('appointment_date', state.selectedDateISO);
    const takenTimes = new Set((taken || []).map(t => t.appointment_time.slice(0,5)));

    const { data: blocked } = await supabaseClient
      .from('blocked_slots')
      .select('*')
      .eq('blocked_date', state.selectedDateISO);

    const allSlots = generateSlots();
    const now = new Date();
    const isToday = state.selectedDateISO === now.toISOString().slice(0,10);

    const isBlocked = (time) => {
      if (!blocked) return false;
      return blocked.some(b => time >= b.start_time.slice(0,5) && time < b.end_time.slice(0,5));
    };

    const visibleSlots = allSlots.filter(t => {
      if (!isToday) return true;
      const [h, m] = t.split(':').map(Number);
      const slotDate = new Date(now); slotDate.setHours(h, m, 0, 0);
      return slotDate > now;
    });

    if (visibleSlots.length === 0) {
      wrap.innerHTML = `<p class="empty-note">برای این روز زمان خالی وجود ندارد.</p>`;
      document.getElementById('step2-next').disabled = true;
      return;
    }

    wrap.innerHTML = `<div class="slots-grid">${visibleSlots.map(t => {
      const taken = takenTimes.has(t) || isBlocked(t);
      const selected = state.selectedTime === t;
      return `<button type="button" class="slot-btn ${taken ? 'taken' : ''} ${selected ? 'selected' : ''}" data-time="${t}" ${taken ? 'disabled' : ''}>${toFaDigits(t)}</button>`;
    }).join('')}</div>`;

    wrap.querySelectorAll('.slot-btn:not(.taken)').forEach(btn => {
      btn.addEventListener('click', () => {
        state.selectedTime = btn.dataset.time;
        document.getElementById('step2-next').disabled = false;
        wrap.querySelectorAll('.slot-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
      });
    });
  }

  // -------- Step 3: customer info --------
  function renderStep3() {
    body.innerHTML = `
      <h3 class="modal-title" id="booking-title">۳. اطلاعات شما</h3>
      <p class="modal-sub">لطفاً اطلاعات زیر را برای ثبت نوبت وارد کنید.</p>
      <div class="field" id="field-name">
        <label for="input-name">نام و نام خانوادگی</label>
        <input type="text" id="input-name" value="${state.name}" placeholder="مثلاً سارا محمدی">
        <div class="error-text">لطفاً نام و نام خانوادگی را وارد کنید.</div>
      </div>
      <div class="field" id="field-phone">
        <label for="input-phone">شماره موبایل</label>
        <input type="tel" id="input-phone" inputmode="numeric" value="${state.phone}" placeholder="۰۹xxxxxxxxx">
        <div class="error-text">لطفاً یک شماره موبایل معتبر ایران وارد کنید.</div>
      </div>
      <div class="field">
        <label for="input-notes">توضیحات / درخواست خاص (اختیاری)</label>
        <textarea id="input-notes" rows="3">${state.notes}</textarea>
      </div>
      <div class="modal-footer-nav">
        <button class="btn btn-ghost" id="step3-back">بازگشت</button>
        <button class="btn btn-primary" id="step3-next">ادامه</button>
      </div>
    `;
    document.getElementById('step3-back').addEventListener('click', () => { state.step = 2; render(); });
    document.getElementById('step3-next').addEventListener('click', () => {
      const name = document.getElementById('input-name').value.trim();
      let phone = document.getElementById('input-phone').value.trim();
      phone = phone.replace(/[^0-9]/g, '');
      const phoneOk = /^09[0-9]{9}$/.test(phone);
      const nameField = document.getElementById('field-name');
      const phoneField = document.getElementById('field-phone');
      nameField.classList.toggle('invalid', name.length < 2);
      phoneField.classList.toggle('invalid', !phoneOk);
      if (name.length < 2 || !phoneOk) return;
      state.name = name;
      state.phone = phone;
      state.notes = document.getElementById('input-notes').value.trim();
      state.step = 4;
      render();
    });
  }

  // -------- Step 4: confirm --------
  function renderStep4() {
    const total = state.selectedServices.reduce((sum, s) => sum + s.price, 0);
    const dateObj = new Date(state.selectedDateISO);
    body.innerHTML = `
      <h3 class="modal-title" id="booking-title">۴. تأیید نهایی</h3>
      <p class="modal-sub">لطفاً اطلاعات زیر را بررسی کنید.</p>
      <div class="summary-box">
        <div class="summary-row"><span class="label">خدمت</span><span>${state.selectedServices.map(s=>s.name).join('، ')}</span></div>
        <div class="summary-row"><span class="label">تاریخ</span><span>${toPersianDate(dateObj)}</span></div>
        <div class="summary-row"><span class="label">ساعت</span><span>${toFaDigits(state.selectedTime)}</span></div>
        <div class="summary-row"><span class="label">نام</span><span>${state.name}</span></div>
        <div class="summary-row"><span class="label">شماره موبایل</span><span dir="ltr">${toFaDigits(state.phone)}</span></div>
        <div class="summary-row"><span class="label">هزینه کل</span><span>${new Intl.NumberFormat('fa-IR').format(total)} تومان</span></div>
      </div>
      <div id="banner-slot" ></div>
      <label class="checkbox-row">
        <input type="checkbox" id="agree-check" ${state.agreed ? 'checked' : ''}>
        <span><a href="#" id="open-rules">قوانین رزرو و شرایط مراجعه</a> را مطالعه کرده‌ام.</span>
      </label>
      <div class="modal-footer-nav">
        <button class="btn btn-ghost" id="step4-back">بازگشت</button>
        <button class="btn btn-primary" id="step4-submit" ${state.agreed ? '' : 'disabled'}>تأیید و ثبت نوبت</button>
      </div>
    `;
    document.getElementById('open-rules').addEventListener('click', (e) => {
      e.preventDefault();
      legalOverlay.classList.add('open');
    });
    document.getElementById('agree-check').addEventListener('change', (e) => {
      state.agreed = e.target.checked;
      document.getElementById('step4-submit').disabled = !state.agreed;
    });
    document.getElementById('step4-back').addEventListener('click', () => { state.step = 3; render(); });
    document.getElementById('step4-submit').addEventListener('click', submitBooking);
  }

  async function submitBooking() {
    if (state.submitting) return;
    state.submitting = true;
    const submitBtn = document.getElementById('step4-submit');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner"></span> در حال ثبت…';

    const total = state.selectedServices.reduce((sum, s) => sum + s.price, 0);
    const payload = {
      customer_name: state.name,
      phone: state.phone,
      services: state.selectedServices.map(s => ({ id: s.id, name: s.name, price: s.price })),
      total_price: total,
      appointment_date: state.selectedDateISO,
      appointment_time: state.selectedTime,
      notes: state.notes || null,
      status: 'pending',
    };

    const { data, error } = await supabaseClient.from('appointments').insert(payload).select().single();

    state.submitting = false;
    if (error) {
      const banner = document.getElementById('banner-slot');
      if (error.code === '23505') {
        banner.innerHTML = `<div class="banner-msg error">این ساعت همین الان توسط شخص دیگری رزرو شد. لطفاً زمان دیگری انتخاب کنید.</div>`;
        state.step = 2;
        state.selectedTime = null;
        setTimeout(() => render(), 900);
      } else {
        banner.innerHTML = `<div class="banner-msg error">امکان ثبت نوبت وجود ندارد. لطفاً دوباره تلاش کنید.</div>`;
        submitBtn.disabled = false;
        submitBtn.textContent = 'تأیید و ثبت نوبت';
      }
      return;
    }

    state.result = data;
    render();
  }

  // -------- Success --------
  function renderSuccess() {
    const r = state.result;
    const dateObj = new Date(r.appointment_date);
    const address = (state.settings && state.settings.address) || 'خرمدشت، خیابان ولیعصر، روبه‌روی میثم، ساختمان پزشکان امید';
    body.innerHTML = `
      <div class="success-screen">
        <svg class="check-circle" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="10"/><path d="M8 12.5l2.5 2.5L16 9"/></svg>
        <h3>نوبت شما با موفقیت ثبت شد ✓</h3>
        <div class="code">کد رزرو: ${r.id.slice(0,8).toUpperCase()}</div>
        <div class="success-summary">
          <div class="summary-row"><span class="label">نام</span><span>${r.customer_name}</span></div>
          <div class="summary-row"><span class="label">خدمت</span><span>${state.selectedServices.map(s=>s.name).join('، ')}</span></div>
          <div class="summary-row"><span class="label">تاریخ</span><span>${toPersianDate(dateObj)}</span></div>
          <div class="summary-row"><span class="label">ساعت</span><span>${toFaDigits(r.appointment_time.slice(0,5))}</span></div>
          <div class="summary-row"><span class="label">آدرس مرکز</span><span>${address}</span></div>
        </div>
        <p style="color:var(--ink-soft);font-size:0.9rem;margin-bottom:24px;">لطفاً در زمان تعیین‌شده در مرکز حضور داشته باشید.</p>
        <div class="success-actions">
          <button class="btn btn-primary btn-block" id="add-to-calendar">افزودن به تقویم</button>
          <button class="btn btn-ghost btn-block" id="close-success">بازگشت به صفحه اصلی</button>
        </div>
      </div>
    `;
    document.getElementById('close-success').addEventListener('click', closeModal);
    document.getElementById('add-to-calendar').addEventListener('click', () => {
      const start = new Date(`${r.appointment_date}T${r.appointment_time}`);
      const end = new Date(start.getTime() + 60 * 60000);
      const fmt = (d) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      const url = `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent('نوبت لیزر - ' + (state.settings?.business_name || 'مرکز لیزر آرامیس'))}&dates=${fmt(start)}/${fmt(end)}&location=${encodeURIComponent(address)}`;
      window.open(url, '_blank');
    });
  }
})();
