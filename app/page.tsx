'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import KanbanBoard from '@/components/KanbanBoard';

export default function Home() {
  const [session, setSession] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) await supabase.auth.signUp({ email, password });
  };

  const handleLogout = () => supabase.auth.signOut();

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-xl border border-gray-100">
          <h1 className="text-3xl font-black text-center text-indigo-600 mb-8 tracking-tight">TaskFlow 🚀</h1>
          <form onSubmit={handleAuth} className="flex flex-col gap-4">
            <input type="email" placeholder="E-posta" value={email} onChange={(e) => setEmail(e.target.value)} className="p-3 rounded-xl border border-gray-200 outline-none focus:border-indigo-500 text-gray-900" required />
            <input type="password" placeholder="Şifre" value={password} onChange={(e) => setPassword(e.target.value)} className="p-3 rounded-xl border border-gray-200 outline-none focus:border-indigo-500 text-gray-900" required />
            <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white p-3 rounded-xl font-bold transition-all active:scale-95">Giriş Yap / Kayıt Ol</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 p-4 sm:p-8 flex flex-col items-center">
      {/* MOBİL UYUMLU HEADER: flex-col sm:flex-row */}
      <div className="w-full max-w-6xl flex flex-col sm:flex-row justify-between items-center gap-4 mb-10 px-4">
        <h1 className="text-4xl font-extrabold text-indigo-600 tracking-tighter">TaskFlow 🚀</h1>
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-gray-500 bg-white px-4 py-2 rounded-full shadow-sm border border-gray-100 truncate max-w-[150px] sm:max-w-none">
            👤 {session.user.email}
          </span>
          <button onClick={handleLogout} className="bg-red-50 hover:bg-red-100 text-red-600 px-4 py-2 rounded-lg text-sm font-bold border border-red-200 transition-colors shrink-0">
            Çıkış
          </button>
        </div>
      </div>
      <KanbanBoard />
    </main>
  );
}