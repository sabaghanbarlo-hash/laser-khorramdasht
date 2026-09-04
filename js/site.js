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

// Load services + settings for public display
async function loadPublicData() {
  const list = document.getElementById('pricing');
  try {
    const { data: services, error } = await supabaseClient
      .from('services')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });
    if (error) throw error;

    if (!services || services.length === 0) {
      list.innerHTML = '<div class="service-row"><div class="info"><h3>در حال حاضر خدمتی ثبت نشده است.</h3></div></div>';
    } else {
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
    window.__servicesCache = services || [];
  } catch (e) {
    list.innerHTML = '<div class="service-row"><div class="info"><h3>خطا در بارگذاری خدمات. لطفاً صفحه را رفرش کنید.</h3></div></div>';
  }

  try {
    const { data: settings } = await supabaseClient
      .from('business_settings')
      .select('*')
      .eq('id', 1)
      .single();
    if (settings) {
      const hoursText = `هر روز هفته — ${settings.open_time.slice(0,5)} تا ${settings.close_time.slice(0,5)}`;
      document.getElementById('hours-text').textContent = hoursText;
      document.getElementById('contact-hours').textContent = hoursText;
      if (settings.phone) document.getElementById('contact-phone').textContent = settings.phone;
      window.__settingsCache = settings;
    }
  } catch (e) { /* keep defaults */ }
}
loadPublicData();
