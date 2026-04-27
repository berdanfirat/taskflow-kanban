'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import KanbanBoard from '@/components/KanbanBoard';

export default function Home() {
  const [session, setSession] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) alert("Hata: " + error.message);
    } else {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) alert("Kayıt Hatası: " + error.message);
      else alert("Kayıt başarılı! Giriş yapabilirsiniz.");
    }
  };

  const handleLogout = () => supabase.auth.signOut();

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-xl border border-gray-100">
          <h1 className="text-3xl font-black text-center text-indigo-600 mb-8 tracking-tight">TaskFlow 🚀</h1>
          <form onSubmit={handleAuth} className="flex flex-col gap-4">
            <input type="email" placeholder="E-posta" value={email} onChange={(e) => setEmail(e.target.value)} className="p-3 rounded-xl border border-gray-200 outline-none focus:border-indigo-500 text-gray-900 bg-white" required />
            <input type="password" placeholder="Şifre" value={password} onChange={(e) => setPassword(e.target.value)} className="p-3 rounded-xl border border-gray-200 outline-none focus:border-indigo-500 text-gray-900 bg-white" required />
            <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white p-3 rounded-xl font-bold transition-all active:scale-95">
              {isLogin ? 'Giriş Yap' : 'Kayıt Ol'}
            </button>
          </form>
          <button onClick={() => setIsLogin(!isLogin)} className="mt-6 w-full text-sm text-gray-500 hover:text-indigo-600 font-medium transition-colors">
            {isLogin ? "Hesabınız yok mu? Hemen Kayıt Olun" : "Zaten hesabınız var mı? Giriş Yapın"}
          </button>
        </div>
      </div>
    );
  }

  return (
    // KRİTİK DEĞİŞİKLİK: h-screen ve flex-col eklendi. Uygulama ekran dışına taşmaz.
    <main className="h-screen bg-gray-50 flex flex-col overflow-hidden">
      
      {/* SABİT TAVAN (Asla kaymaz) */}
      <header className="flex-shrink-0 w-full bg-white shadow-sm border-b border-gray-200 px-4 py-3 flex justify-between items-center z-50">
        <h1 className="text-xl sm:text-2xl font-extrabold text-indigo-600 tracking-tighter">TaskFlow 🚀</h1>
        <div className="flex items-center gap-2 sm:gap-4">
          <span className="text-[10px] sm:text-xs font-bold text-gray-500 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100 truncate max-w-[120px] sm:max-w-none">
            👤 {session.user.email}
          </span>
          <button onClick={handleLogout} className="bg-red-50 hover:bg-red-100 text-red-600 px-3 py-1.5 rounded-lg text-xs font-bold border border-red-200 transition-colors shrink-0">
            Çıkış
          </button>
        </div>
      </header>

      {/* KAYDIRILABİLİR İÇERİK ALANI (Sadece bu alan kayar) */}
      <div className="flex-1 overflow-y-auto relative scrollbar-hide">
        <KanbanBoard />
      </div>
    </main>
  );
}