// ==============================================
// اتصال به Supabase
// این مقادیر بعد از ساخت پروژه در Supabase به‌صورت خودکار تنظیم شده‌اند.
// در صورت نیاز به تغییر: Project Settings > API
// ==============================================
const SUPABASE_URL = "https://vtlqybplqmosqgdimnio.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_jfpD169cIkBh3yMuUJ5_zQ_UpOWsRvH";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
