import { useState, useEffect, useRef, useCallback } from 'react';
import { ai } from '../services/geminiService';
// FIX: LiveSession is not an exported member of @google/genai
import { LiveServerMessage, Modality, Blob as GenaiBlob } from '@google/genai';
import { encode, decode, decodeAudioData } from '../utils/audio';
import type { TranscriptEntry } from '../types';

// FIX: Infer the type for the unexported LiveSession
type LiveSession = Awaited<ReturnType<typeof ai.live.connect>>;

type SessionStatus = 'IDLE' | 'CONNECTING' | 'ACTIVE' | 'ENDED' | 'ERROR';

const INPUT_SAMPLE_RATE = 16000;
const OUTPUT_SAMPLE_RATE = 24000;
const BUFFER_SIZE = 4096;

export const useLiveSession = ({ onComplete }: { onComplete: (summary: string) => void }) => {
  const [status, setStatus] = useState<SessionStatus>('IDLE');
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const sessionPromiseRef = useRef<Promise<LiveSession> | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const finalSummaryRef = useRef<string>('');
  
  const systemInstruction = "You are a friendly phone recommendation specialist. Your goal is to understand what the user is looking for in a phone. Start the conversation by greeting the user and asking them what they're looking for in their next phone. Ask clarifying questions about features, budget, and use cases. Do not answer any off-topic questions. When the user says they are done or asks for a summary, provide a concise, single-paragraph summary of all their priorities and then say 'SESSION_END' on a new line and nothing else.";

  const cleanup = useCallback(() => {
    scriptProcessorRef.current?.disconnect();
    scriptProcessorRef.current = null;
    mediaStreamRef.current?.getTracks().forEach(track => track.stop());
    mediaStreamRef.current = null;
    inputAudioContextRef.current?.close();
    inputAudioContextRef.current = null;
    sessionPromiseRef.current?.then(s => s.close());
    sessionPromiseRef.current = null;
  }, []);
  
  const handleMessage = useCallback(async (message: LiveServerMessage) => {
    let currentInputTranscription = '';
    let currentOutputTranscription = '';

    if (message.serverContent?.outputTranscription) {
        currentOutputTranscription += message.serverContent.outputTranscription.text;
    }
    if (message.serverContent?.inputTranscription) {
        currentInputTranscription += message.serverContent.inputTranscription.text;
    }

    if(currentInputTranscription) setTranscript(prev => [...prev, { speaker: 'user', text: currentInputTranscription }]);
    if(currentOutputTranscription) {
        if(currentOutputTranscription.includes('SESSION_END')) {
            const summary = finalSummaryRef.current + currentOutputTranscription.replace('SESSION_END', '').trim();
            finalSummaryRef.current = summary; // Update ref one last time
            onComplete(finalSummaryRef.current);
            setStatus('ENDED');
        } else {
            finalSummaryRef.current += currentOutputTranscription;
            setTranscript(prev => [...prev, { speaker: 'model', text: currentOutputTranscription }]);
        }
    }
    
    const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
    if (base64Audio && outputAudioContextRef.current) {
        const audioContext = outputAudioContextRef.current;
        nextStartTimeRef.current = Math.max(nextStartTimeRef.current, audioContext.currentTime);
        const audioBuffer = await decodeAudioData(decode(base64Audio), audioContext, OUTPUT_SAMPLE_RATE, 1);
        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContext.destination);
        source.addEventListener('ended', () => {
            sourcesRef.current.delete(source);
        });
        source.start(nextStartTimeRef.current);
        nextStartTimeRef.current += audioBuffer.duration;
        sourcesRef.current.add(source);
    }

    if (message.serverContent?.interrupted) {
        for (const source of sourcesRef.current.values()) {
            source.stop();
        }
        sourcesRef.current.clear();
        nextStartTimeRef.current = 0;
    }
  }, [onComplete]);

  const startSession = useCallback(async () => {
    if (sessionPromiseRef.current || status === 'CONNECTING' || status === 'ACTIVE') return;
    setStatus('CONNECTING');
    setTranscript([]);
    finalSummaryRef.current = '';
    
    try {
        mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
        // FIX: Cast window to `any` to allow for vendor-prefixed webkitAudioContext
        inputAudioContextRef.current = new ((window as any).AudioContext || (window as any).webkitAudioContext)({ sampleRate: INPUT_SAMPLE_RATE });
        // FIX: Cast window to `any` to allow for vendor-prefixed webkitAudioContext
        outputAudioContextRef.current = new ((window as any).AudioContext || (window as any).webkitAudioContext)({ sampleRate: OUTPUT_SAMPLE_RATE });

        sessionPromiseRef.current = ai.live.connect({
            model: 'gemini-2.5-flash-native-audio-preview-09-2025',
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
                systemInstruction: systemInstruction,
                inputAudioTranscription: {},
                outputAudioTranscription: {},
            },
            callbacks: {
                onopen: () => {
                    setStatus('ACTIVE');
                    const source = inputAudioContextRef.current!.createMediaStreamSource(mediaStreamRef.current!);
                    const scriptProcessor = inputAudioContextRef.current!.createScriptProcessor(BUFFER_SIZE, 1, 1);
                    scriptProcessor.onaudioprocess = (event) => {
                        const inputData = event.inputBuffer.getChannelData(0);
                        const l = inputData.length;
                        const int16 = new Int16Array(l);
                        for (let i = 0; i < l; i++) {
                            int16[i] = inputData[i] * 32768;
                        }
                        const pcmBlob: GenaiBlob = {
                            data: encode(new Uint8Array(int16.buffer)),
                            mimeType: `audio/pcm;rate=${INPUT_SAMPLE_RATE}`,
                        };
                        sessionPromiseRef.current?.then(session => {
                            session.sendRealtimeInput({ media: pcmBlob });
                        });
                    };
                    source.connect(scriptProcessor);
                    scriptProcessor.connect(inputAudioContextRef.current!.destination);
                    scriptProcessorRef.current = scriptProcessor;
                },
                onmessage: handleMessage,
                onerror: (e) => {
                    console.error('Session error:', e);
                    setStatus('ERROR');
                    cleanup();
                },
                onclose: () => {
                    setStatus('ENDED');
                    cleanup();
                },
            },
        });
        
        await sessionPromiseRef.current;
        
    } catch (error) {
        console.error('Failed to start session:', error);
        setStatus('ERROR');
        cleanup();
    }
  }, [cleanup, handleMessage, systemInstruction]);

  const endSession = useCallback(() => {
    if (status !== 'IDLE' && status !== 'ENDED') {
        setStatus('ENDED');
        cleanup();
    }
  }, [status, cleanup]);

  useEffect(() => {
    return () => {
        endSession(); // Cleanup on unmount
    };
  }, [endSession]);

  return { status, transcript, startSession, endSession };
};