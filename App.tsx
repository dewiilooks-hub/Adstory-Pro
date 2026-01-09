
import React, { useState, useEffect } from 'react';
import { Upload, Loader2, Video, Sparkles, Clapperboard, UserCheck, User, Music, Play, Layers, LogOut, Globe, KeyRound } from 'lucide-react';
import { onAuthStateChanged, signOut, User as FirebaseUser } from "firebase/auth";
import { auth } from './firebase';
import { generateAdPlan, generateSpeech, playAudioBuffer, handleGeminiError, getStoredApiKey, setStoredApiKey, clearStoredApiKey } from './services/geminiService';
import { AdPlanResponse, ContentStyle, VoiceCharacter, SUPPORTED_LANGUAGES } from './types';
import PlanDisplay from './components/PlanDisplay';
import Login from './components/Login';

const ASPECT_RATIOS = [
  { value: '1:1', label: '1:1 (Square)' },
  { value: '9:16', label: '9:16 (Story)' },
  { value: '16:9', label: '16:9 (Cinema)' },
];

export default function App() {
  // Auth State
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // App State
  const [productFiles, setProductFiles] = useState<File[]>([]);
  const [modelFile, setModelFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<AdPlanResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [contentStyle, setContentStyle] = useState<ContentStyle>(ContentStyle.Cinematic);
  const [preserveFace, setPreserveFace] = useState(false);
  
  // Settings
  const [selectedVoice, setSelectedVoice] = useState<VoiceCharacter>(VoiceCharacter.Zephyr);
  const [selectedLanguage, setSelectedLanguage] = useState(SUPPORTED_LANGUAGES[0]);
  const [aspectRatio, setAspectRatio] = useState<string>("1:1");
  const [previewingVoice, setPreviewingVoice] = useState(false);

  // Monitor Auth Status
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setPlan(null);
      setProductFiles([]);
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };

  const handleChangeKey = async () => {
    try {
      const currentKey = getStoredApiKey();
      const input = window.prompt(
  "Paste Gemini API Key (Google AI Studio).\n\nKosongkan lalu OK untuk menghapus.",
  currentKey ?? ""
);

      if (input === null) return; // user cancel

      const trimmed = input.trim();
      if (!trimmed) {
        clearStoredApiKey();
        alert("API Key dihapus dari perangkat ini.");
      } else {
        setStoredApiKey(trimmed);
        alert("API Key tersimpan. Silakan coba generate lagi.");
      }
    } catch (err) {
      console.error("Failed to set API key:", err);
    }
  };

  const handleProductChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selected = Array.from(e.target.files).slice(0, 3);
      setProductFiles(selected);
      setError(null);
    }
  };

  const handleModelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setModelFile(e.target.files[0]);
    }
  };

  const handlePreviewVoice = async () => {
    setPreviewingVoice(true);
    try {
      const greeting = selectedLanguage.code.startsWith('id') ? "Halo!" : 
                       selectedLanguage.code.startsWith('ms') ? "Selamat pagi!" :
                       selectedLanguage.code.startsWith('th') ? "Sawasdee krap!" : "Hello!";
      const text = `${greeting} I am ${selectedVoice}. I will speak in ${selectedLanguage.label} for your video.`;
      const audioBuffer = await generateSpeech(text, selectedVoice);
      await playAudioBuffer(audioBuffer);
    } catch (err) {
      handleGeminiError(err);
    } finally {
      setPreviewingVoice(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (productFiles.length === 0) {
      setError("Please upload at least one product image.");
      return;
    }

    setLoading(true);
    setError(null);
    setPlan(null);

    try {
      const result = await generateAdPlan(productFiles, modelFile, contentStyle, selectedLanguage.label);
      setPlan(result);
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-brand-900 border-t-brand-500 rounded-full animate-spin"></div>
          <p className="text-brand-500 text-sm tracking-widest uppercase animate-pulse">Initializing System...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <div className="min-h-screen bg-black text-yellow-50 selection:bg-brand-500 selection:text-black">
      {/* Header */}
      <header className="border-b border-brand-900/50 bg-black/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 group">
            <div className="bg-gradient-to-br from-brand-400 to-brand-600 p-2 rounded-lg shadow-neon group-hover:shadow-neon-strong transition-all duration-300">
              <Video className="w-6 h-6 text-black" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-brand-300 to-brand-500">AdStory Pro</h1>
              <p className="text-xs text-brand-500/70 tracking-widest uppercase">Golden Edition</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
             <button 
                onClick={handleChangeKey}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-neutral-900 border border-brand-900/50 text-brand-400 hover:bg-brand-900/20 hover:border-brand-500 transition-all text-xs font-bold uppercase tracking-wider shadow-sm"
                title="Manage API Key for Veo & AI Models"
             >
                <KeyRound className="w-4 h-4" />
                <span className="hidden sm:inline">Settings Key</span>
             </button>

             <div className="h-6 w-px bg-brand-900/50"></div>
             
             <button 
                onClick={handleLogout}
                className="flex items-center gap-2 text-gray-400 hover:text-red-400 transition-colors text-sm font-medium"
                title="Sign Out"
             >
                <span className="hidden sm:inline text-xs">{user?.email}</span>
                <LogOut className="w-5 h-5" />
             </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12 pb-20">
        {!plan && !loading && (
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-5xl font-bold mb-6 text-white drop-shadow-[0_0_15px_rgba(234,179,8,0.3)]">
              Transform Products into <span className="text-brand-400">Golden Plans</span>
            </h2>
            <p className="text-gray-400 text-lg">
              Upload your product shots. Our AI Director creates a cinematic storyboard in seconds.
            </p>
          </div>
        )}

        {!plan && (
          <div className={`max-w-xl mx-auto transition-all duration-500 ${loading ? 'opacity-50 pointer-events-none scale-95' : 'opacity-100 scale-100'}`}>
            <form onSubmit={handleSubmit} className="space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative group md:col-span-2">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-brand-500 to-brand-700 rounded-2xl blur opacity-30 group-hover:opacity-60 transition duration-1000"></div>
                  <div className="relative bg-neutral-900 border border-brand-900/50 rounded-xl p-6 text-center hover:border-brand-500/50 transition-colors">
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleProductChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-neutral-800 border border-brand-900 flex items-center justify-center group-hover:bg-brand-900/20 group-hover:border-brand-500 transition-all">
                        <Upload className="w-6 h-6 text-brand-400" />
                      </div>
                      <div>
                        <h3 className="text-base font-medium text-brand-100">Product Images (Required)</h3>
                        <p className="text-xs text-brand-500/60 mt-1">
                          {productFiles.length > 0 ? `${productFiles.length} files selected` : "Drop product shots here (max 3)"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="relative group md:col-span-2">
                  <div className="relative bg-neutral-900 border border-brand-900/30 rounded-xl p-4 text-center hover:border-brand-500/30 transition-colors border-dashed">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleModelChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className="flex flex-row items-center justify-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center">
                        <User className="w-5 h-5 text-brand-600" />
                      </div>
                      <div className="text-left">
                        <h3 className="text-sm font-medium text-brand-100">Model Reference (Optional)</h3>
                        <p className="text-xs text-gray-500">
                          {modelFile ? modelFile.name : "Upload a specific person"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-neutral-900 border border-brand-900/30 rounded-xl p-5 space-y-5 shadow-[0_0_20px_rgba(0,0,0,0.5)]">
                
                <div>
                  <label className="text-xs text-brand-500 font-bold uppercase tracking-widest mb-3 flex items-center gap-2">
                    <Clapperboard className="w-4 h-4" />
                    Content Style
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {Object.values(ContentStyle).map((style) => (
                      <button
                        key={style}
                        type="button"
                        onClick={() => setContentStyle(style)}
                        className={`px-4 py-3 rounded-lg text-sm font-medium text-left transition-all border ${
                          contentStyle === style
                            ? 'bg-brand-500/20 border-brand-500 text-brand-300 shadow-[0_0_10px_rgba(234,179,8,0.1)]'
                            : 'bg-neutral-800 border-neutral-700 text-gray-500 hover:bg-neutral-750 hover:border-brand-900'
                        }`}
                      >
                        {style}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2 border-t border-brand-900/20">
                    
                    {/* Voice Selection */}
                    <div>
                        <label className="text-xs text-brand-500 font-bold uppercase tracking-widest mb-3 flex items-center gap-2">
                           <Music className="w-4 h-4" /> Narrator Voice
                        </label>
                        <div className="flex gap-2">
                            <div className="relative flex-grow">
                                <select 
                                    value={selectedVoice}
                                    onChange={(e) => setSelectedVoice(e.target.value as VoiceCharacter)}
                                    className="w-full bg-neutral-800 text-brand-100 border border-neutral-700 rounded-lg px-3 py-2.5 text-sm focus:border-brand-500 outline-none transition-colors appearance-none"
                                >
                                    {Object.values(VoiceCharacter).map(v => (
                                    <option key={v} value={v}>{v}</option>
                                    ))}
                                </select>
                            </div>
                            <button
                                type="button"
                                onClick={handlePreviewVoice}
                                disabled={previewingVoice}
                                className="bg-neutral-800 hover:bg-brand-900 text-brand-400 p-2.5 rounded-lg border border-neutral-700 hover:border-brand-500 transition-colors disabled:opacity-50"
                                title="Preview Voice"
                            >
                                {previewingVoice ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
                            </button>
                        </div>
                    </div>

                    {/* Language Selection */}
                    <div>
                        <label className="text-xs text-brand-500 font-bold uppercase tracking-widest mb-3 flex items-center gap-2">
                           <Globe className="w-4 h-4" /> VO Language
                        </label>
                        <div className="relative">
                            <select 
                                value={selectedLanguage.code}
                                onChange={(e) => {
                                  const lang = SUPPORTED_LANGUAGES.find(l => l.code === e.target.value);
                                  if (lang) setSelectedLanguage(lang);
                                }}
                                className="w-full bg-neutral-800 text-brand-100 border border-neutral-700 rounded-lg px-3 py-2.5 text-sm focus:border-brand-500 outline-none transition-colors appearance-none"
                            >
                                {SUPPORTED_LANGUAGES.map(l => (
                                <option key={l.code} value={l.code}>{l.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2 border-t border-brand-900/20">
                    {/* Aspect Ratio Selection */}
                    <div>
                        <label className="text-xs text-brand-500 font-bold uppercase tracking-widest mb-3 flex items-center gap-2">
                           <Layers className="w-4 h-4" /> Aspect Ratio
                        </label>
                        <div className="relative">
                            <select 
                                value={aspectRatio}
                                onChange={(e) => setAspectRatio(e.target.value)}
                                className="w-full bg-neutral-800 text-brand-100 border border-neutral-700 rounded-lg px-3 py-2.5 text-sm focus:border-brand-500 outline-none transition-colors appearance-none"
                            >
                                {ASPECT_RATIOS.map(r => (
                                <option key={r.value} value={r.value}>{r.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 pt-6">
                        <div 
                        onClick={() => !modelFile && setPreserveFace(!preserveFace)}
                        className={`relative w-11 h-6 flex items-center rounded-full cursor-pointer transition-all border border-brand-900 ${preserveFace || modelFile ? 'bg-brand-500 shadow-neon' : 'bg-neutral-800'} ${modelFile ? 'cursor-not-allowed opacity-80' : ''}`}
                        >
                        <div className={`w-4 h-4 bg-black rounded-full shadow transform transition-transform ${(preserveFace || modelFile) ? 'translate-x-6' : 'translate-x-1'}`} />
                        </div>
                        <div className="flex flex-col">
                        <label 
                            onClick={() => !modelFile && setPreserveFace(!preserveFace)}
                            className={`text-xs text-brand-100 flex items-center gap-2 select-none font-bold uppercase ${modelFile ? 'cursor-default' : 'cursor-pointer'}`}
                        >
                            <UserCheck className="w-4 h-4 text-brand-500" />
                            Preserve Identity
                        </label>
                        </div>
                    </div>
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-950/30 border border-red-500/50 text-red-400 text-sm rounded-lg text-center">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || productFiles.length === 0}
                className="w-full py-4 bg-brand-500 hover:bg-brand-400 text-black font-bold rounded-xl transition-all shadow-neon hover:shadow-neon-strong flex items-center justify-center gap-2 disabled:opacity-50 disabled:shadow-none"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Directing in {selectedLanguage.label}...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 text-black" />
                    Generate {selectedLanguage.label} Plan
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {plan && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-10 duration-700">
             <div className="flex items-center justify-between">
               <h2 className="text-2xl font-bold flex items-center gap-2 text-brand-100">
                 <span className="bg-brand-500 w-1.5 h-8 rounded-full shadow-neon"></span>
                 Production Table ({selectedLanguage.label})
               </h2>
               <button 
                 onClick={() => { setPlan(null); setProductFiles([]); setModelFile(null); }}
                 className="text-sm text-brand-600 hover:text-brand-400 transition-colors uppercase tracking-widest font-semibold"
               >
                 Start New Project
               </button>
             </div>
             
             <PlanDisplay 
               plan={plan} 
               files={productFiles} 
               modelFile={modelFile}
               contentStyle={contentStyle} 
               preserveFace={preserveFace || !!modelFile}
               initialVoice={selectedVoice}
               initialRatio={aspectRatio}
             />
          </div>
        )}
      </main>

      <footer className="border-t border-brand-900/30 py-6 bg-black">
        <div className="max-w-7xl mx-auto px-6 text-center">
           <p className="text-xs text-neutral-600">
             © {new Date().getFullYear()} dewiasryana. All Rights Reserved.
           </p>
        </div>
      </footer>
    </div>
  );
}
