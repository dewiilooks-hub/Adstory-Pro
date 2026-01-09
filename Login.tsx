import React, { useState } from 'react';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { auth } from '../services/firebase';
import { Lock, Mail, Loader2, ArrowRight, Video, AlertCircle, KeyRound, Eye, EyeOff } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'login' | 'reset'>('login');
  const [resetSent, setResetSent] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      console.error(err);
      let msg = "Failed to login.";
      if (err.code === 'auth/invalid-credential') msg = "Invalid email or password.";
      if (err.code === 'auth/too-many-requests') msg = "Too many failed attempts. Try again later.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError("Please enter your email address.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await sendPasswordResetEmail(auth, email);
      setResetSent(true);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to send reset email.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-brand-500/10 rounded-full blur-[100px]"></div>
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-brand-900/20 rounded-full blur-[100px]"></div>

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8 animate-in slide-in-from-top-5 duration-700">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 shadow-neon mb-4">
            <Video className="w-8 h-8 text-black" />
          </div>
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-brand-200 to-brand-500">
            AdStory Pro
          </h1>
          <p className="text-brand-500/60 text-sm tracking-[0.2em] uppercase font-medium mt-1">
            Authorized Access Only
          </p>
        </div>

        <div className="bg-neutral-900/50 backdrop-blur-xl border border-brand-900/30 rounded-2xl p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-500">
          
          {mode === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-5">
               <div className="text-center mb-6">
                 <h2 className="text-xl font-semibold text-white">Welcome Back</h2>
                 <p className="text-gray-400 text-sm">Enter your credentials to access the studio.</p>
               </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-brand-500 uppercase tracking-wider ml-1">Email</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-gray-500 group-focus-within:text-brand-400 transition-colors" />
                    </div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="block w-full pl-10 pr-3 py-3 bg-neutral-950 border border-neutral-800 rounded-xl text-gray-100 placeholder-gray-600 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition-all"
                      placeholder="director@studio.com"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-brand-500 uppercase tracking-wider ml-1">Password</label>
                  </div>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-500 group-focus-within:text-brand-400 transition-colors" />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="block w-full pl-10 pr-12 py-3 bg-neutral-950 border border-neutral-800 rounded-xl text-gray-100 placeholder-gray-600 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition-all"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-brand-400 transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end">
                <button
                    type="button"
                    onClick={() => { setMode('reset'); setError(null); }}
                    className="text-xs text-brand-400 hover:text-brand-300 transition-colors"
                >
                    Forgot Password?
                </button>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-950/30 border border-red-900/50 rounded-lg text-red-400 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-black font-bold rounded-xl shadow-neon hover:shadow-neon-strong transition-all transform hover:-translate-y-0.5 disabled:opacity-50 disabled:transform-none"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                  <>
                    Access Studio <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-5">
               <div className="text-center mb-6">
                 <div className="w-12 h-12 bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-3">
                    <KeyRound className="w-6 h-6 text-brand-500" />
                 </div>
                 <h2 className="text-xl font-semibold text-white">Reset Password</h2>
                 <p className="text-gray-400 text-sm">We'll send a recovery link to your email.</p>
               </div>

               {!resetSent ? (
                 <>
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-brand-500 uppercase tracking-wider ml-1">Email Address</label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Mail className="h-5 w-5 text-gray-500 group-focus-within:text-brand-400 transition-colors" />
                            </div>
                            <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="block w-full pl-10 pr-3 py-3 bg-neutral-950 border border-neutral-800 rounded-xl text-gray-100 placeholder-gray-600 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition-all"
                            placeholder="director@studio.com"
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="flex items-center gap-2 p-3 bg-red-950/30 border border-red-900/50 rounded-lg text-red-400 text-xs">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full flex items-center justify-center gap-2 py-3 bg-neutral-100 hover:bg-white text-black font-bold rounded-xl transition-all disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Send Reset Link"}
                    </button>
                 </>
               ) : (
                   <div className="text-center py-4 space-y-4">
                       <div className="p-3 bg-green-900/20 border border-green-500/30 text-green-400 text-sm rounded-lg">
                           Reset link sent to <strong>{email}</strong>
                       </div>
                   </div>
               )}

               <button
                 type="button"
                 onClick={() => { setMode('login'); setError(null); setResetSent(false); }}
                 className="w-full py-2 text-sm text-gray-500 hover:text-brand-400 transition-colors"
               >
                 Back to Login
               </button>
            </form>
          )}
        </div>
        
        <div className="mt-8 text-center space-y-2">
            <p className="text-xs text-neutral-600 font-mono">
                SECURE TERMINAL V1.0 • ADSTORY PRO
            </p>
            <p className="text-[10px] text-neutral-700">
                © {new Date().getFullYear()} dewiasryana
            </p>
        </div>
      </div>
    </div>
  );
}