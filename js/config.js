// ==============================================
// اتصال به Supabase
// این مقادیر بعد از ساخت پروژه در Supabase به‌صورت خودکار تنظیم شده‌اند.
// در صورت نیاز به تغییر: Project Settings > API
// ==============================================
const SUPABASE_URL = "https://vtlqybplqmosqgdimnio.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0bHF5YnBscW1vc3FnZGltbmlvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0NTMyMTYsImV4cCI6MjEwNDAyOTIxNn0.XZhlG6qmtz7LF_62bE1o-fPpYO1tgKtl1NXP2TnpXvc";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
