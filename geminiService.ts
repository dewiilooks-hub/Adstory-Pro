
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { AdPlanResponse, SceneRow, VoiceCharacter, ContentStyle } from "../types";

export const fileToPart = async (file: File): Promise<{ inlineData: { data: string; mimeType: string } }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = () => {
      const result = reader.result;
      if (result && typeof result === 'string') {
        const commaIndex = result.indexOf(',');
        if (commaIndex !== -1) {
          const base64String = result.slice(commaIndex + 1);
          resolve({
            inlineData: {
              data: base64String,
              mimeType: file.type || 'image/jpeg',
            },
          });
        } else {
           resolve({
            inlineData: {
              data: result,
              mimeType: file.type || 'image/jpeg',
            },
          });
        }
      } else {
        reject(new Error("Failed to read file"));
      }
    };
    reader.readAsDataURL(file);
  });
};

const STORAGE_KEY = "ADSTORY_GEMINI_API_KEY";

export const getStoredApiKey = () => {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(STORAGE_KEY) || "";
  } catch {
    return "";
  }
};

export const setStoredApiKey = (key: string) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, key);
  } catch {}
};

export const clearStoredApiKey = () => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {}
};

const getAIClient = () => {
  // 1) Prefer API key saved by user on this device (trial-friendly)
  const storedKey = getStoredApiKey();

  // 2) Optional fallback for your own private deployments (NOT recommended for public)
  const envKey =
    (import.meta as any)?.env?.VITE_GEMINI_API_KEY ||
    "";

  const apiKey = (storedKey || envKey || "").trim();

  if (!apiKey) {
    throw new Error(
      "API Key belum di-set. Klik 'Settings Key' lalu paste API key Google AI Studio kamu."
    );
  }

  return new GoogleGenAI({ apiKey });
};

export const handleGeminiError = (error: unknown) => {
  console.error("Gemini API Error:", error);
  const message = error instanceof Error ? error.message : "Terjadi kesalahan yang tidak diketahui saat memproses AI.";
  alert(`AI Error: ${message}`);
};

export const playAudioBuffer = async (audioData: ArrayBuffer) => {
  const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContext) return;
  const ctx = new AudioContext({ sampleRate: 24000 });
  const decodeAudioData = (data: ArrayBuffer, ctx: AudioContext) => {
     const dataInt16 = new Int16Array(data);
     const float32 = new Float32Array(dataInt16.length);
     for(let i=0; i<dataInt16.length; i++) {
         float32[i] = dataInt16[i] / 32768.0;
     }
     const buffer = ctx.createBuffer(1, float32.length, 24000);
     buffer.getChannelData(0).set(float32);
     return buffer;
  }
  const audioBuffer = decodeAudioData(audioData, ctx);
  const source = ctx.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(ctx.destination);
  source.start();
};

export const generateAdPlan = async (files: File[], modelFile: File | null, style: ContentStyle, languageLabel: string): Promise<AdPlanResponse> => {
  const ai = getAIClient();
  const parts: any[] = await Promise.all(files.map(fileToPart));
  let modelContextInstruction = "";
  if (modelFile) {
    const modelPart = await fileToPart(modelFile);
    parts.push(modelPart);
    modelContextInstruction = `Target Model is provided in the last image. Base character visual on this person. Ensure the model's anatomy is perfect (no extra fingers, no cut legs).`;
  }

  const prompt = `Role: Expert Commercial Director. Create a high-conversion video storyboard based on the images.
    Visual Style: ${style}. ${modelContextInstruction}
    LANGUAGE REQUIREMENT: The entire output (contentTitle, killerHook, productDescription, visualScene, audioScript, and textOverlay) MUST be written in ${languageLabel}.
    UNIVERSAL CTA: Do NOT use platform-specific terms like 'keranjang kuning'. Use professional, high-conversion calls-to-action suitable for TV, YouTube, Instagram, or TikTok.
    Provide 3-5 scenes in JSON format with title, hook, product description, and scene details including specific imagePrompt and videoPrompt.
    Image prompts must describe perfect human anatomy (5 fingers, full limbs) and absolutely NO watermarks or logos.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: { parts: parts.concat([{ text: prompt }]) },
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          contentTitle: { type: Type.STRING },
          killerHook: { type: Type.STRING },
          productDescription: { type: Type.STRING },
          scenes: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                no: { type: Type.INTEGER },
                visualScene: { type: Type.STRING },
                imagePrompt: { type: Type.STRING },
                videoPrompt: { type: Type.STRING },
                audioScript: { type: Type.STRING },
                textOverlay: { type: Type.STRING },
              },
              required: ["no", "visualScene", "imagePrompt", "videoPrompt", "audioScript", "textOverlay"]
            }
          }
        }
      }
    }
  });
  return JSON.parse(response.text || "{}") as AdPlanResponse;
};

export const generateSceneImage = async (
  prompt: string, 
  aspectRatio: string = "1:1", 
  productFile?: File, 
  modelFile?: File | null,
  style: ContentStyle = ContentStyle.Cinematic,
  preserveFace: boolean = false
): Promise<string> => {
  const ai = getAIClient();
  const parts: any[] = [];
  if (productFile) parts.push(await fileToPart(productFile));
  if (modelFile) parts.push(await fileToPart(modelFile));
  
  const refinedPrompt = `Professional high-end commercial advertising photography: ${prompt}. Style: ${style}. 
    Anatomical integrity: perfect human proportions, full body visible if described, five fingers per hand, proportional legs. 
    Aesthetic: sharp focus, high contrast, cinematic lighting, 8k. 
    NEGATIVE PROMPT (Strictly avoid): watermark, text, signature, logos, extra fingers, deformed limbs, cut off feet, missing legs, blurry face, six fingers, distorted body.`;
    
  parts.push({ text: refinedPrompt });
  
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image', 
    contents: { parts: parts },
    config: { 
      imageConfig: { 
        aspectRatio: aspectRatio as any
      } 
    }
  });

  const part = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
  if (part?.inlineData) return part.inlineData.data;
  throw new Error("Gagal menghasilkan gambar dari Gemini Flash Image.");
};

export const generateSceneVideo = async (
  prompt: string,
  base64Image: string,
  aspectRatio: string = "16:9"
): Promise<string> => {
  const apiKey = (typeof process !== 'undefined' && process.env?.API_KEY) || "";
  if (!apiKey) throw new Error("API Key diperlukan untuk pembuatan Video. Silakan pilih kunci berbayar.");
  
  const ai = new GoogleGenAI({ apiKey });
  
  const model = 'veo-3.1-fast-generate-preview';
  
  let operation = await ai.models.generateVideos({
    model: model,
    prompt: `${prompt}. High quality, cinematic motion, realistic textures, NO watermarks.`,
    image: {
      imageBytes: base64Image,
      mimeType: 'image/jpeg',
    },
    config: {
      numberOfVideos: 1,
      resolution: '720p',
      aspectRatio: aspectRatio as any
    }
  });

  while (!operation.done) {
    await new Promise(resolve => setTimeout(resolve, 10000));
    operation = await ai.operations.getVideosOperation({ operation: operation });
  }

  const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
  if (!downloadLink) throw new Error("Gagal membuat video. Tidak ada URI yang dikembalikan.");

  const response = await fetch(`${downloadLink}&key=${apiKey}`);
  if (!response.ok) throw new Error(`Gagal mengunduh video: ${response.statusText}`);
  
  const blob = await response.blob();
  return URL.createObjectURL(blob);
};

export const generateSpeech = async (text: string, voiceName: string): Promise<ArrayBuffer> => {
  const ai = getAIClient();
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-preview-tts',
    contents: { parts: [{ text: text }] },
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceName } } },
    }
  });
  const data = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!data) throw new Error("Gagal menghasilkan audio TTS.");
  
  const binaryString = atob(data);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
  return bytes.buffer;
};
