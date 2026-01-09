
import React, { useState, useEffect, useRef } from 'react';
import { AdPlanResponse, AssetMap, VoiceCharacter, ContentStyle } from '../types';
import { generateSceneImage, generateSpeech, playAudioBuffer, generateSceneVideo, handleGeminiError } from '../services/geminiService';
import { Play, Image as ImageIcon, Loader2, Download, Copy, Check, Video, Lightbulb, Box, RefreshCcw, Maximize2, Film } from 'lucide-react';

interface Props {
  plan: AdPlanResponse;
  files: File[];
  modelFile: File | null;
  contentStyle: ContentStyle;
  preserveFace: boolean;
  initialVoice: VoiceCharacter;
  initialRatio: string;
}

const VIDEO_LOADING_MESSAGES = [
  "Mempersiapkan panggung digital...",
  "AI Director sedang merancang gerakan...",
  "Merender pencahayaan sinematik...",
  "Hampir selesai, memfinalisasi pixel...",
  "Mengarahkan adegan terbaik untuk Anda..."
];

// Helper to convert PCM to WAV for downloading
const writeString = (view: DataView, offset: number, string: string) => {
  for (let i = 0; i < string.length; i++) view.setUint8(offset + i, string.charCodeAt(i));
};

const pcmToWav = (buffer: ArrayBuffer, sampleRate: number = 24000) => {
  const length = buffer.byteLength;
  const header = new ArrayBuffer(44);
  const view = new DataView(header);
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + length, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, 'data');
  view.setUint32(40, length, true);
  return new Blob([header, buffer], { type: 'audio/wav' });
};

const PlanDisplay: React.FC<Props> = ({ plan, files, modelFile, contentStyle, preserveFace, initialVoice, initialRatio }) => {
  const [assets, setAssets] = useState<AssetMap>({});
  const [selectedVoice, setSelectedVoice] = useState<VoiceCharacter>(initialVoice);
  const [aspectRatio, setAspectRatio] = useState<string>(initialRatio);
  const [generating, setGenerating] = useState<{ [key: string]: boolean }>({});
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
  const [copyFeedback, setCopyFeedback] = useState<{ [key: string]: boolean }>({});
  const hasInitialized = useRef(false);

  useEffect(() => {
    let interval: number;
    const isVideoGenerating = Object.keys(generating).some(k => k.startsWith('vid-') && generating[k]);
    
    if (isVideoGenerating) {
      interval = window.setInterval(() => {
        setLoadingMessageIndex(prev => (prev + 1) % VIDEO_LOADING_MESSAGES.length);
      }, 4000);
    }
    
    return () => clearInterval(interval);
  }, [generating]);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopyFeedback(prev => ({ ...prev, [key]: true }));
    setTimeout(() => {
      setCopyFeedback(prev => ({ ...prev, [key]: false }));
    }, 2000);
  };

  const handleGenerateImage = async (rowIndex: number, prompt: string) => {
    const key = `img-${rowIndex}`;
    if (generating[key]) return;
    
    setGenerating(prev => ({ ...prev, [key]: true }));
    try {
      const productFile = files.length > 0 ? files[0] : undefined;
      const base64 = await generateSceneImage(prompt, aspectRatio, productFile, modelFile, contentStyle, preserveFace);
      setAssets(prev => ({
        ...prev,
        [rowIndex]: { ...prev[rowIndex], image: { type: 'image', data: base64, loading: false } }
      }));
    } catch (e) {
      handleGeminiError(e);
    } finally {
      setGenerating(prev => ({ ...prev, [key]: false }));
    }
  };

  const handleGenerateVideo = async (rowIndex: number, motionPrompt: string) => {
    const key = `vid-${rowIndex}`;
    if (generating[key]) return;

    const base64Image = assets[rowIndex]?.image?.data;
    if (!base64Image) {
      alert("Silakan buat gambar visual terlebih dahulu.");
      return;
    }

    try {
      // @ts-ignore
      const hasKey = await window.aistudio.hasSelectedApiKey();
      if (!hasKey) {
        alert("Model Veo memerlukan API Key berbayar. Silakan pilih key Anda di dialog berikutnya.");
        // @ts-ignore
        await window.aistudio.openSelectKey();
      }

      setGenerating(prev => ({ ...prev, [key]: true }));
      setLoadingMessageIndex(0);

      const videoUrl = await generateSceneVideo(motionPrompt, base64Image, aspectRatio);
      setAssets(prev => ({
        ...prev,
        [rowIndex]: { ...prev[rowIndex], video: { type: 'video', data: videoUrl, loading: false } }
      }));
    } catch (e: any) {
      if (e?.message?.includes("Requested entity was not found")) {
        alert("Proyek atau kunci API tidak ditemukan/tidak aktif. Pastikan Anda memilih proyek dengan penagihan aktif.");
        // @ts-ignore
        await window.aistudio.openSelectKey();
      } else {
        handleGeminiError(e);
      }
    } finally {
      setGenerating(prev => ({ ...prev, [key]: false }));
    }
  };

  useEffect(() => {
    if (!hasInitialized.current && plan.scenes.length > 0) {
      hasInitialized.current = true;
      plan.scenes.forEach((scene, index) => {
        handleGenerateImage(index, scene.imagePrompt);
      });
    }
  }, [plan]);

  const handleGenerateAudio = async (rowIndex: number, script: string) => {
    const key = `audio-${rowIndex}`;
    if (generating[key]) return;

    setGenerating(prev => ({ ...prev, [key]: true }));
    try {
      const buffer = await generateSpeech(script, selectedVoice);
      setAssets(prev => ({
        ...prev,
        [rowIndex]: { ...prev[rowIndex], audio: { type: 'audio', data: buffer as any, loading: false } }
      }));
    } catch (e) {
      handleGeminiError(e);
    } finally {
      setGenerating(prev => ({ ...prev, [key]: false }));
    }
  };

  const downloadImage = (base64: string, index: number) => {
    const link = document.createElement('a');
    link.href = `data:image/png;base64,${base64}`;
    link.download = `adstory_image_${index + 1}.png`;
    link.click();
  };

  const downloadAudio = (buffer: ArrayBuffer, index: number) => {
    const blob = pcmToWav(buffer);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `adstory_vo_${index + 1}.wav`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const downloadVideo = (url: string, index: number) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `adstory_video_${index + 1}.mp4`;
    link.click();
  };

  return (
    <div className="space-y-12 animate-fade-in pb-20">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-neutral-900 border border-brand-900/50 p-6 rounded-2xl shadow-neon relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Box className="w-24 h-24 text-brand-500" />
            </div>
            <div className="relative z-10">
                <h3 className="text-brand-400 font-bold mb-3 text-xs uppercase tracking-widest flex items-center gap-2"><Box className="w-4 h-4" /> Core Product</h3>
                <p className="text-brand-100 text-sm leading-relaxed font-medium">{plan.productDescription}</p>
            </div>
        </div>
        <div className="bg-gradient-to-br from-brand-900/40 to-black border border-brand-500/30 p-6 rounded-2xl shadow-neon relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Lightbulb className="w-24 h-24 text-brand-400" />
            </div>
            <div className="relative z-10">
                <h3 className="text-brand-300 font-bold mb-3 text-xs uppercase tracking-widest flex items-center gap-2"><Lightbulb className="w-4 h-4" /> Killer Hook</h3>
                <div className="flex flex-col gap-2">
                     <span className="text-2xl font-bold text-white tracking-tight">{plan.contentTitle}</span>
                     <p className="text-gray-400 text-sm italic border-l-2 border-brand-500 pl-3">"{plan.killerHook}"</p>
                </div>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-12">
        {plan.scenes.map((scene, idx) => {
          const isGeneratingImg = generating[`img-${idx}`];
          const isGeneratingVid = generating[`vid-${idx}`];
          const hasImage = assets[idx]?.image?.data;
          const hasVideo = assets[idx]?.video?.data;
          const hasAudio = assets[idx]?.audio?.data;

          return (
            <div key={idx} className="bg-black border border-brand-900 rounded-3xl overflow-hidden shadow-[0_0_30px_rgba(0,0,0,0.5)] flex flex-col md:flex-row">
              <div className="md:w-5/12 bg-neutral-900/50 p-6 flex flex-col justify-between border-b md:border-b-0 md:border-r border-brand-900/30 relative">
                <div className="absolute top-4 left-4 z-20 bg-brand-500 text-black font-bold text-xl w-10 h-10 flex items-center justify-center rounded-lg shadow-neon">{scene.no}</div>

                <div className="flex-grow flex items-center justify-center min-h-[300px] relative rounded-lg overflow-hidden bg-black/20 mb-4 group/media">
                    {(isGeneratingImg || isGeneratingVid) && (
                      <div className="absolute inset-0 z-30 bg-black/90 flex flex-col items-center justify-center backdrop-blur-md">
                         <div className="w-12 h-12 border-4 border-brand-900 border-t-brand-500 rounded-full animate-spin"></div>
                         <p className="text-brand-200 text-xs font-bold mt-4 tracking-widest uppercase animate-pulse text-center px-6">
                            {isGeneratingVid ? VIDEO_LOADING_MESSAGES[loadingMessageIndex] : "Menghasilkan Visual..."}
                         </p>
                      </div>
                    )}

                    {hasVideo ? (
                      <video src={hasVideo} controls className="w-full h-full object-contain" autoPlay loop muted />
                    ) : hasImage ? (
                      <img src={`data:image/jpeg;base64,${hasImage}`} alt={`Frame ${idx}`} className="max-h-[400px] w-auto object-contain shadow-2xl" />
                    ) : (
                      <div className="w-16 h-16 rounded-full border-2 border-dashed border-neutral-700 flex items-center justify-center animate-pulse"><ImageIcon className="w-6 h-6 text-neutral-700" /></div>
                    )}
                </div>

                <div className="flex flex-wrap gap-2 justify-center border-b border-brand-900/30 pb-4">
                    <button 
                      onClick={() => handleGenerateImage(idx, scene.imagePrompt)} 
                      disabled={isGeneratingImg || isGeneratingVid} 
                      className="flex items-center gap-2 px-3 py-2 bg-neutral-800 hover:bg-neutral-700 text-brand-200 text-xs font-medium rounded-lg border border-neutral-700 transition-all disabled:opacity-50"
                    >
                        <RefreshCcw className={`w-3.5 h-3.5 ${isGeneratingImg ? 'animate-spin' : ''}`} /> Redraw
                    </button>
                    <button 
                      onClick={() => handleGenerateVideo(idx, scene.videoPrompt)} 
                      disabled={!hasImage || isGeneratingImg || isGeneratingVid} 
                      className="flex items-center gap-2 px-3 py-2 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold rounded-lg shadow-neon transition-all disabled:opacity-50"
                    >
                        <Film className={`w-3.5 h-3.5 ${isGeneratingVid ? 'animate-pulse' : ''}`} /> {hasVideo ? 'Regen' : 'Animate'}
                    </button>
                    
                    <div className="flex gap-1 items-center ml-auto">
                        {hasImage && !hasVideo && (
                            <button 
                                onClick={() => downloadImage(hasImage, idx)}
                                className="p-2 bg-neutral-800 text-brand-400 rounded-lg border border-neutral-700 hover:border-brand-500 transition-colors"
                                title="Download Image"
                            >
                                <Download className="w-3.5 h-3.5" />
                            </button>
                        )}
                        {hasVideo && (
                            <button 
                                onClick={() => downloadVideo(hasVideo, idx)} 
                                className="p-2 bg-brand-900/40 text-brand-400 rounded-lg border border-brand-500/50 hover:border-brand-500 transition-colors"
                                title="Download Video"
                            >
                                <Download className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>
                </div>

                <div className="mt-4">
                    {!hasAudio ? (
                        <div className="flex items-center gap-3 bg-black p-2 rounded-lg border border-brand-900/30">
                            <p className="text-gray-500 text-xs italic flex-grow px-2 truncate">"{scene.audioScript}"</p>
                            <button onClick={() => handleGenerateAudio(idx, scene.audioScript)} disabled={generating[`audio-${idx}`]} className="bg-neutral-800 text-gray-300 p-2 rounded transition-colors">{generating[`audio-${idx}`] ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}</button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 bg-brand-900/20 p-2 rounded-lg border border-brand-500/30">
                          <button onClick={() => playAudioBuffer(hasAudio as any)} className="bg-brand-500 text-black p-2 rounded-full shadow-neon"><Play className="w-3 h-3 fill-current" /></button>
                          <div className="flex-grow h-1 bg-brand-900/50 rounded-full overflow-hidden">
                            <div className="h-full bg-brand-500 w-full animate-pulse opacity-50"></div>
                          </div>
                          <button 
                            onClick={() => downloadAudio(hasAudio as any, idx)}
                            className="p-1.5 text-brand-400 hover:text-brand-300 transition-colors"
                            title="Download Voice-over"
                          >
                             <Download className="w-3.5 h-3.5" />
                          </button>
                        </div>
                    )}
                </div>
              </div>

              <div className="md:w-7/12 p-6 md:p-8 flex flex-col gap-6 bg-gradient-to-br from-black to-neutral-950">
                  <div className="flex justify-between items-start">
                    <div>
                        <h4 className="text-white font-medium text-lg mb-2">{scene.visualScene}</h4>
                        <div className="h-0.5 w-12 bg-brand-500 rounded-full shadow-neon"></div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                      {/* Image Prompt */}
                      <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-4 relative group">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-xs text-brand-300 font-bold uppercase tracking-wider">Visual Composition</span>
                            <button 
                                onClick={() => handleCopy(scene.imagePrompt, `img-p-${idx}`)}
                                className="p-1.5 text-gray-500 hover:text-brand-400 hover:bg-neutral-800 rounded transition-all"
                                title="Copy Image Prompt"
                            >
                                {copyFeedback[`img-p-${idx}`] ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                          <p className="text-gray-400 text-xs leading-relaxed font-mono">{scene.imagePrompt}</p>
                      </div>

                      {/* Video Prompt */}
                      <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-4 relative group">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-xs text-purple-400 font-bold uppercase tracking-wider">Motion Dynamics</span>
                            <button 
                                onClick={() => handleCopy(scene.videoPrompt, `vid-p-${idx}`)}
                                className="p-1.5 text-gray-500 hover:text-purple-400 hover:bg-neutral-800 rounded transition-all"
                                title="Copy Motion Prompt"
                            >
                                {copyFeedback[`vid-p-${idx}`] ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                          <p className="text-gray-400 text-xs leading-relaxed font-mono">{scene.videoPrompt}</p>
                      </div>

                      {/* Audio Script */}
                      <div className="bg-brand-900/10 p-4 rounded-xl border border-dashed border-brand-900/30">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-xs text-brand-600 font-bold uppercase tracking-wider">Audio Narrative</span>
                            <button 
                                onClick={() => handleCopy(scene.audioScript, `aud-s-${idx}`)}
                                className="p-1.5 text-brand-900 hover:text-brand-500 hover:bg-brand-900/20 rounded transition-all"
                                title="Copy Script"
                            >
                                {copyFeedback[`aud-s-${idx}`] ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                          <p className="text-gray-200 italic text-sm">"{scene.audioScript}"</p>
                      </div>

                      <div className="flex items-center justify-between text-xs font-bold uppercase tracking-tighter opacity-70">
                        <div className="flex items-center gap-2 text-brand-500">
                            <Maximize2 className="w-3 h-3" /> Overlay: <span className="text-white">{scene.textOverlay}</span>
                        </div>
                        <button 
                            onClick={() => handleCopy(scene.textOverlay, `overlay-${idx}`)}
                            className="p-1 text-gray-600 hover:text-white transition-colors"
                        >
                            {copyFeedback[`overlay-${idx}`] ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                  </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PlanDisplay;
