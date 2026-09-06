document.getElementById('year').textContent = new Date().getFullYear();

// Sticky header shadow
const header = document.getElementById('site-header');
window.addEventListener('scroll', () => {
  header.classList.toggle('scrolled', window.scrollY > 8);
});

// Mobile nav
const burger = document.getElementById('burger-btn');
const mobileNav = document.getElementById('mobile-nav');
burger.addEventListener('click', () => {
  const open = mobileNav.classList.toggle('open');
  burger.setAttribute('aria-expanded', open ? 'true' : 'false');
});
mobileNav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
  mobileNav.classList.remove('open');
}));

// FAQ accordion
document.querySelectorAll('.faq-item').forEach(item => {
  item.querySelector('.faq-q').addEventListener('click', () => {
    const wasOpen = item.classList.contains('open');
    document.querySelectorAll('.faq-item.open').forEach(i => i.classList.remove('open'));
    if (!wasOpen) item.classList.add('open');
  });
});

const formatToman = (n) => new Intl.NumberFormat('fa-IR').format(n) + ' تومان';

// A fetch that always settles within `ms`, even if the network call itself hangs.
function withTimeout(promise, ms = 8000) {
  return Promise.race([
    promise,
    new Promise((resolve) => setTimeout(() => resolve({ data: null, error: { message: 'timeout' } }), ms)),
  ]);
}

function renderServicesList(services) {
  const list = document.getElementById('pricing');
  if (!services || services.length === 0) {
    list.innerHTML = `<div class="service-row"><div class="info"><h3>در حال حاضر خدمتی ثبت نشده است.</h3></div></div>`;
    return;
  }
  list.innerHTML = services.map((s, i) => `
    <div class="service-row ${i === 0 ? 'featured' : ''}">
      <div class="info">
        <h3>${s.name}</h3>
        <p>${s.description || ''}</p>
      </div>
      <div class="price">${formatToman(s.price)}</div>
    </div>
  `).join('');
}

function renderServicesError() {
  const list = document.getElementById('pricing');
  list.innerHTML = `
    <div class="service-row">
      <div class="info">
        <h3>در حال حاضر اطلاعات خدمات در دسترس نیست. لطفاً چند لحظه بعد دوباره تلاش کنید.</h3>
      </div>
      <button class="btn btn-ghost" id="retry-services-btn" style="flex-shrink:0;">تلاش دوباره</button>
    </div>
  `;
  const btn = document.getElementById('retry-services-btn');
  if (btn) btn.addEventListener('click', () => { loadServicesOnly(); });
}

async function loadServicesOnly() {
  const list = document.getElementById('pricing');
  list.innerHTML = `
    <div class="service-row skeleton-row"><div class="info"><div class="skeleton-line"></div></div></div>
    <div class="service-row skeleton-row"><div class="info"><div class="skeleton-line"></div></div></div>
    <div class="service-row skeleton-row"><div class="info"><div class="skeleton-line"></div></div></div>
  `;
  const { data: services, error } = await withTimeout(
    supabaseClient.from('services').select('*').eq('is_active', true).order('sort_order', { ascending: true })
  );
  if (error) {
    console.error('Failed to load services:', error);
    renderServicesError();
    window.__servicesCache = window.__servicesCache || [];
    return [];
  }
  renderServicesList(services);
  window.__servicesCache = services || [];
  return services || [];
}

function applyBusinessSettings(settings) {
  if (!settings) return;
  window.__settingsCache = settings;

  const name = settings.business_name && settings.business_name.trim();
  if (name) {
    document.title = `لیزر موهای زائد در خرمدشت کرج | ${name}`;
    const metaDesc = document.getElementById('meta-description');
    if (metaDesc) metaDesc.setAttribute('content', `${name} در خرمدشت کرج — رزرو نوبت کاملاً آنلاین، بدون تماس تلفنی.`);
    ['logo-text-header', 'logo-text-footer'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = name;
    });
    const aboutHeading = document.getElementById('about-heading');
    if (aboutHeading) aboutHeading.textContent = `${name}، مرکز لیزر موهای زائد در خرمدشت کرج`;
    const footerName = document.getElementById('footer-business-name');
    if (footerName) footerName.textContent = name;

    const ld = document.getElementById('ld-json');
    if (ld) {
      try {
        const json = JSON.parse(ld.textContent);
        json.name = name;
        if (settings.phone) json.telephone = settings.phone;
        if (settings.hero_image_url) json.image = settings.hero_image_url;
        ld.textContent = JSON.stringify(json);
      } catch (e) { /* leave static JSON-LD as-is */ }
    }
  }

  if (settings.description) {
    const aboutDesc = document.getElementById('about-desc');
    if (aboutDesc) aboutDesc.textContent = settings.description;
  }

  const hoursText = `هر روز هفته — ${settings.open_time.slice(0,5)} تا ${settings.close_time.slice(0,5)}`;
  const hoursEl = document.getElementById('hours-text');
  const contactHoursEl = document.getElementById('contact-hours');
  if (hoursEl) hoursEl.textContent = hoursText;
  if (contactHoursEl) contactHoursEl.textContent = hoursText;

  if (settings.phone) {
    const phoneCard = document.getElementById('contact-phone-card');
    const phoneEl = document.getElementById('contact-phone');
    if (phoneEl) phoneEl.textContent = settings.phone;
    if (phoneCard) phoneCard.style.display = '';
  }

  if (settings.address) {
    const addr = document.getElementById('address-text');
    const addr2 = document.getElementById('address-text-2');
    if (addr) addr.textContent = settings.address;
    if (addr2) addr2.textContent = settings.address;
  }
  const floorEl = document.getElementById('floor-text');
  if (floorEl && settings.floor && settings.floor.trim()) {
    floorEl.textContent = `، طبقه ${settings.floor.trim()}`;
  }

  if (settings.google_maps_url) {
    const mapsLink = document.getElementById('maps-link');
    const mapIframe = document.getElementById('map-iframe');
    if (mapsLink) { mapsLink.href = settings.google_maps_url; mapsLink.style.display = 'inline-block'; }
    if (mapIframe && settings.google_maps_url.includes('output=embed')) mapIframe.src = settings.google_maps_url;
  }

  if (settings.instagram_url) {
    const igLink = document.getElementById('instagram-link');
    if (igLink) { igLink.href = settings.instagram_url; igLink.style.display = 'inline'; }
  }

  if (settings.logo_url) {
    document.querySelectorAll('.logo').forEach(el => {
      if (el.querySelector('img')) return;
      const img = document.createElement('img');
      img.src = settings.logo_url;
      img.alt = name || 'لوگو';
      img.style.height = '32px';
      img.style.marginLeft = '8px';
      img.style.verticalAlign = 'middle';
      el.prepend(img);
    });
  }

  if (settings.hero_image_url) {
    const heroArt = document.querySelector('.hero-art');
    if (heroArt) {
      heroArt.innerHTML = `<img src="${settings.hero_image_url}" alt="${name || 'مرکز لیزر'}" style="border-radius:22px;width:100%;height:auto;object-fit:cover;">`;
    }
  }
}

async function loadSettingsOnly() {
  const { data: settings, error } = await withTimeout(
    supabaseClient.from('business_settings').select('*').eq('id', 1).single()
  );
  if (error) {
    console.error('Failed to load business settings:', error);
    return null;
  }
  applyBusinessSettings(settings);
  return settings;
}

async function loadPublicData() {
  await Promise.all([loadServicesOnly(), loadSettingsOnly()]);
}
window.__servicesReady = loadPublicData();

// -------- Track / cancel a booking --------
(function () {
  const trigger = document.getElementById('open-track-booking');
  const overlay = document.getElementById('track-overlay');
  const body = document.getElementById('track-body');
  if (!trigger || !overlay || !body) return;

  document.getElementById('track-close').addEventListener('click', () => overlay.classList.remove('open'));
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.classList.remove('open'); });

  function renderLookupForm(errorMsg) {
    body.innerHTML = `
      <h3 class="modal-title">پیگیری یا لغو نوبت</h3>
      <p class="modal-sub">کد رزرو و شماره موبایلی که با آن نوبت گرفته‌اید را وارد کنید.</p>
      ${errorMsg ? `<div class="banner-msg error">${errorMsg}</div>` : ''}
      <div class="field"><label>کد رزرو</label><input type="text" id="track-id-input" placeholder="مثلاً 0D4F5BBC"></div>
      <div class="field"><label>شماره موبایل</label><input type="tel" id="track-phone-input" placeholder="۰۹xxxxxxxxx"></div>
      <button class="btn btn-primary btn-block" id="track-lookup-btn">مشاهده نوبت</button>
    `;
    document.getElementById('track-lookup-btn').addEventListener('click', doLookup);
  }

  async function doLookup() {
    const idPrefix = document.getElementById('track-id-input').value.trim();
    const phone = document.getElementById('track-phone-input').value.trim().replace(/[^0-9]/g, '');
    if (!idPrefix || !phone) {
      renderLookupForm('لطفاً هر دو فیلد را پر کنید.');
      return;
    }
    body.innerHTML = `<p class="empty-note">در حال جست‌وجو…</p>`;
    const { data: matchId } = await supabaseClient.rpc('lookup_appointment', {
      p_id_prefix: idPrefix,
      p_phone: phone,
    }).maybeSingle();

    if (!matchId) {
      renderLookupForm('نوبتی با این مشخصات پیدا نشد. لطفاً کد رزرو کامل (نمایش داده‌شده در پیام موفقیت) و شماره موبایل را بررسی کنید.');
      return;
    }
    renderResult(matchId);
  }

  function renderResult(appt) {
    const statusLabels = { pending: 'در انتظار تأیید', confirmed: 'تأیید شده', cancelled: 'لغو شده', completed: 'انجام‌شده', no_show: 'عدم حضور' };
    const canCancel = appt.status === 'pending' || appt.status === 'confirmed';
    body.innerHTML = `
      <h3 class="modal-title">جزئیات نوبت</h3>
      <div class="summary-box">
        <div class="summary-row"><span class="label">نام</span><span>${appt.customer_name}</span></div>
        <div class="summary-row"><span class="label">خدمت</span><span>${(appt.services||[]).map(s=>s.name).join('، ')}</span></div>
        <div class="summary-row"><span class="label">تاریخ</span><span>${appt.appointment_date}</span></div>
        <div class="summary-row"><span class="label">ساعت</span><span>${String(appt.appointment_time).slice(0,5)}</span></div>
        <div class="summary-row"><span class="label">وضعیت</span><span>${statusLabels[appt.status] || appt.status}</span></div>
      </div>
      <div id="track-action-result"></div>
      ${canCancel ? `<button class="btn btn-ghost btn-block" id="track-cancel-btn">لغو این نوبت</button>` : ''}
    `;
    const cancelBtn = document.getElementById('track-cancel-btn');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', async () => {
        cancelBtn.disabled = true;
        cancelBtn.textContent = 'در حال لغو…';
        const phone = document.getElementById('track-phone-input') ? document.getElementById('track-phone-input').value.trim().replace(/[^0-9]/g,'') : '';
        const { data: ok, error } = await supabaseClient.rpc('cancel_appointment', { p_id_prefix: appt.id, p_phone: phone || appt.phone });
        const resultBox = document.getElementById('track-action-result');
        if (error || !ok) {
          resultBox.innerHTML = `<div class="banner-msg error">لغو نوبت در حال حاضر ممکن نیست. لطفاً با مرکز تماس بگیرید.</div>`;
          cancelBtn.disabled = false;
          cancelBtn.textContent = 'لغو این نوبت';
        } else {
          resultBox.innerHTML = `<div class="banner-msg success">نوبت شما با موفقیت لغو شد.</div>`;
          cancelBtn.remove();
        }
      });
    }
  }

  trigger.addEventListener('click', () => {
    overlay.classList.add('open');
    renderLookupForm();
  });
})();
