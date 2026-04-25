'use client';
import { useState, useEffect } from 'react';
import KanbanBoard from '../components/KanbanBoard';
import { supabase } from '../lib/supabaseClient';

export default function Home() {
  const [session, setSession] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true); // Giriş mi, Kayıt mı ekranı?
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Sayfa açıldığında kullanıcının oturumu var mı kontrol et
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Kayıt Ol veya Giriş Yap Fonksiyonu
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMessage("Giriş başarısız: " + error.message);
    } else {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) setMessage("Kayıt başarısız: " + error.message);
      else setMessage('Kayıt başarılı! Artık giriş yapabilirsiniz.');
    }
    setLoading(false);
  };

  // Çıkış Yap Fonksiyonu
  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  // 1. EĞER KULLANICI GİRİŞ YAPMAMIŞSA (GİRİŞ EKRANINI GÖSTER)
  if (!session) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-md border border-gray-100">
          <h1 className="text-3xl font-extrabold mb-2 text-center text-indigo-600">TaskFlow 🚀</h1>
          <p className="text-center text-gray-500 mb-8">
            {isLogin ? "Projelerine dönmek için giriş yap" : "Yeni bir hesap oluştur"}
          </p>
          
          <form onSubmit={handleAuth} className="flex flex-col gap-4">
            <input
              type="email"
              placeholder="E-posta adresiniz"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              // text-gray-900 ve bg-white eklendi
              className="p-3 rounded-xl border border-gray-300 outline-none focus:border-indigo-500 transition-colors text-gray-900 bg-white placeholder-gray-400"
              required
            />
            <input
              type="password"
              placeholder="Şifreniz"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              // text-gray-900 ve bg-white eklendi
              className="p-3 rounded-xl border border-gray-300 outline-none focus:border-indigo-500 transition-colors text-gray-900 bg-white placeholder-gray-400"
              required
            />
            <button 
              type="submit" 
              disabled={loading}
              className="bg-indigo-600 hover:bg-indigo-700 text-white p-3 rounded-xl font-bold transition-colors disabled:bg-indigo-400"
            >
              {loading ? 'İşleniyor...' : (isLogin ? 'Giriş Yap' : 'Kayıt Ol')}
            </button>
          </form>

          {message && (
             <p className={`mt-4 text-center text-sm font-medium ${message.includes('başarılı') ? 'text-green-600' : 'text-red-500'}`}>
               {message}
             </p>
          )}

          <button 
            onClick={() => setIsLogin(!isLogin)}
            className="w-full text-center mt-6 text-sm text-gray-500 hover:text-indigo-600 transition-colors"
          >
            {isLogin ? "Hesabın yok mu? Kayıt Ol" : "Zaten hesabın var mı? Giriş Yap"}
          </button>
        </div>
      </main>
    );
  }

  // 2. EĞER KULLANICI GİRİŞ YAPMIŞSA (KANBAN TAHTASINI GÖSTER)
  return (
    <main className="min-h-screen bg-gray-50 p-8 flex flex-col items-center">
      <div className="w-full max-w-6xl flex justify-between items-center mb-8 px-4">
        <h1 className="text-4xl font-extrabold text-indigo-600">
          TaskFlow 🚀
        </h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500 font-medium bg-white px-4 py-2 rounded-full shadow-sm border border-gray-100">
            👤 {session.user.email}
          </span>
          <button 
            onClick={handleLogout}
            className="bg-red-50 hover:bg-red-100 text-red-600 px-4 py-2 rounded-lg text-sm font-bold transition-colors border border-red-200"
          >
            Çıkış Yap
          </button>
        </div>
      </div>
      
      <KanbanBoard />
    </main>
  );
}