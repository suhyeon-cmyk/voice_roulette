'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Play, Pause, RotateCcw, Upload, Volume2, Trash2 } from 'lucide-react';

interface AudioRecorderProps {
  initialAudioUrl?: string;
  initialAudioName?: string;
  onAudioChange: (audioBlob: Blob | null, audioUrl: string | null, duration?: number) => void;
}

export default function AudioRecorder({
  initialAudioUrl,
  initialAudioName,
  onAudioChange,
}: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordTime, setRecordTime] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(initialAudioUrl || null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioDuration, setAudioDuration] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [hasMicPermission, setHasMicPermission] = useState<boolean | null>(null);
  const [isWebAudioSupported, setIsWebAudioSupported] = useState<boolean>(true);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const recordTimeRef = useRef<number>(0);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const MAX_RECORD_SECONDS = 5;

  useEffect(() => {
    setAudioUrl(initialAudioUrl || null);
  }, [initialAudioUrl]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isSecure = window.isSecureContext || window.location.hostname === 'localhost' || window.location.protocol === 'https:';
      const hasMedia = Boolean(
        typeof navigator !== 'undefined' &&
        navigator.mediaDevices &&
        typeof navigator.mediaDevices.getUserMedia === 'function' &&
        typeof MediaRecorder !== 'undefined'
      );
      setIsWebAudioSupported(Boolean(isSecure && hasMedia));
    }
  }, []);

  // 녹음 중지
  const stopRecording = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // 마이크 녹음 시작
  const startRecording = async () => {
    // 1. 브라우저 보안(HTTPS/SecureContext) 및 Web API 지원 여부 검증
    if (
      typeof window === 'undefined' ||
      !navigator?.mediaDevices ||
      typeof navigator.mediaDevices.getUserMedia !== 'function' ||
      typeof MediaRecorder === 'undefined'
    ) {
      const isHttp = typeof window !== 'undefined' && window.location.protocol === 'http:' && window.location.hostname !== 'localhost';
      const msg = isHttp
        ? '⚠️ 브라우저 보안 정책(Web API)상 HTTP(IP) 접속 환경에서는 웹 마이크 직접 녹음이 제한됩니다.\n(HTTPS 또는 localhost 환경 필요)\n\n대신 바로 스마트폰의 기본 음성 녹음기 앱으로 녹음하거나 오디오 파일을 등록할 수 있습니다! 🎙️📁\n\n지금 파일 선택을 여시겠습니까?'
        : '⚠️ 사용 중인 브라우저 환경에서 마이크 녹음 기능을 지원하지 않습니다.\n대신 [파일 선택] 버튼으로 음성 파일을 등록해주세요.';

      if (confirm(msg)) {
        fileInputRef.current?.click();
      }
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setHasMicPermission(true);

      const mimeType = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4')
          ? 'audio/mp4'
          : '';

      const options = mimeType ? { mimeType } : undefined;
      const mediaRecorder = new MediaRecorder(stream, options);

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const mime = mediaRecorder.mimeType || 'audio/webm';
        const blob = new Blob(audioChunksRef.current, { type: mime });
        const localUrl = URL.createObjectURL(blob);
        setAudioUrl(localUrl);
        const finalSec = recordTimeRef.current || 1;
        setAudioDuration(finalSec);
        onAudioChange(blob, localUrl, finalSec);

        // 스트림 트랙 중지
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      recordTimeRef.current = 0;
      setRecordTime(0);

      const startTime = Date.now();
      timerIntervalRef.current = setInterval(() => {
        const elapsed = Math.min(MAX_RECORD_SECONDS, Math.floor((Date.now() - startTime) / 1000));
        recordTimeRef.current = elapsed;
        setRecordTime(elapsed);

        // 5초 도달 시 자동 종료
        if (elapsed >= MAX_RECORD_SECONDS) {
          stopRecording();
        }
      }, 200);
    } catch (err: any) {
      console.error('Microphone access denied or error:', err);
      setHasMicPermission(false);
      if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
        alert('마이크 사용 권한이 차단되었습니다. 브라우저 설정에서 마이크 권한을 허용해주세요.');
      } else {
        alert('마이크를 시작할 수 없습니다. 대신 [파일 선택]으로 음성을 등록해주세요.');
      }
    }
  };

  // 오디오 파일 직접 업로드 처리
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const localUrl = URL.createObjectURL(file);
      const audio = new Audio(localUrl);
      audio.onloadedmetadata = () => {
        const dur = Math.round(audio.duration);
        if (dur > 6) {
          alert(`⚠️ 업로드하신 음성이 ${dur}초입니다.\n룰렛 몰입도를 위해 5초 이내의 음성을 권장합니다! 💕`);
        }
        setAudioUrl(localUrl);
        setAudioDuration(dur);
        onAudioChange(file, localUrl, dur);
      };
      audio.onerror = () => {
        setAudioUrl(localUrl);
        onAudioChange(file, localUrl);
      };
    }
  };

  // 재생 / 일시정지 토글
  const togglePlay = () => {
    if (!audioElementRef.current || !audioUrl) return;

    if (isPlaying) {
      audioElementRef.current.pause();
      setIsPlaying(false);
    } else {
      audioElementRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch((e) => {
        console.warn('Audio play failed:', e);
      });
    }
  };

  // 음성 삭제
  const handleRemoveAudio = () => {
    if (audioElementRef.current) {
      audioElementRef.current.pause();
    }
    setIsPlaying(false);
    setAudioUrl(null);
    setRecordTime(0);
    setCurrentTime(0);
    onAudioChange(null, null);
  };

  // 시간 포맷 (00:00)
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="bg-pink-50/70 border border-pink-200/80 rounded-2xl p-3.5 flex flex-col gap-2.5">
      {/* 1. 녹음된 오디오가 없을 때: 녹음하기 or 파일 올리기 */}
      {!audioUrl && !isRecording && (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-2">
            {isWebAudioSupported ? (
              <button
                type="button"
                onClick={startRecording}
                className="flex-1 py-2 px-3.5 bg-gradient-to-r from-rose-400 to-pink-400 hover:from-rose-500 hover:to-pink-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-transform active:scale-95 cursor-pointer"
              >
                <Mic className="w-3.5 h-3.5" />
                <span>음성 직접 녹음 (최대 5초)</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 py-2 px-3.5 bg-gradient-to-r from-rose-400 to-pink-400 hover:from-rose-500 hover:to-pink-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-transform active:scale-95 cursor-pointer"
              >
                <Mic className="w-3.5 h-3.5" />
                <span>음성 녹음 / 파일 첨부</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="py-2 px-3 bg-white hover:bg-pink-100 text-pink-700 border border-pink-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition-colors flex-shrink-0 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>파일 선택</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              className="hidden"
              onChange={handleFileUpload}
            />
          </div>

          {!isWebAudioSupported && (
            <p className="text-[10px] text-pink-500/90 font-medium px-0.5 leading-tight">
              💡 HTTP(IP) 환경에서는 버튼을 누르면 스마트폰의 기본 녹음기/오디오 앱으로 연결됩니다.
            </p>
          )}
        </div>
      )}

      {/* 2. 현재 녹음 진행 중일 때 */}
      {isRecording && (
        <div className="flex flex-col gap-2 bg-white/95 px-3.5 py-2.5 rounded-xl border border-rose-300 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
              <span className="text-xs font-bold text-rose-600">
                녹음 중... {recordTime}초 / {MAX_RECORD_SECONDS}초
              </span>
            </div>

            <button
              type="button"
              onClick={stopRecording}
              className="py-1 px-3 bg-rose-500 hover:bg-rose-600 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
            >
              <Square className="w-3 h-3 fill-current" />
              <span>완료</span>
            </button>
          </div>

          <div className="w-full h-1.5 bg-rose-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-pink-400 to-rose-500 transition-all duration-200"
              style={{ width: `${Math.min(100, Math.max(8, (recordTime / MAX_RECORD_SECONDS) * 100))}%` }}
            />
          </div>
        </div>
      )}

      {/* 3. 녹음 완료 또는 기존 음성이 등록되어 있을 때 */}
      {audioUrl && !isRecording && (
        <div className="flex items-center justify-between bg-white/95 px-3 py-2 rounded-xl border border-pink-200 gap-2">
          {/* 재생 컨트롤 */}
          <button
            type="button"
            onClick={togglePlay}
            className="w-8 h-8 rounded-full bg-pink-400 hover:bg-pink-500 text-white flex items-center justify-center shadow-sm flex-shrink-0"
          >
            {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
          </button>

          {/* 오디오 파일 정보 & 시간 */}
          <div className="flex-1 flex flex-col justify-center min-w-0">
            <div className="flex items-center gap-1 text-xs font-bold text-gray-700 truncate">
              <Volume2 className="w-3.5 h-3.5 text-pink-500 flex-shrink-0" />
              <span className="truncate">{initialAudioName || '음성 메시지'}</span>
            </div>
            <span className="text-[10px] text-pink-500/70 font-mono">
              {formatTime(currentTime)} / {formatTime(audioDuration || 0)}
            </span>
          </div>

          {/* 다시 녹음 / 삭제 버튼 */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={startRecording}
              title="다시 녹음"
              className="p-1.5 text-gray-500 hover:text-pink-600 hover:bg-pink-100 rounded-lg transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleRemoveAudio}
              title="음성 삭제"
              className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* 오디오 엘리먼트 (숨김) */}
          <audio
            ref={audioElementRef}
            src={audioUrl}
            onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
            onLoadedMetadata={(e) => setAudioDuration(e.currentTarget.duration)}
            onEnded={() => {
              setIsPlaying(false);
              setCurrentTime(0);
            }}
          />
        </div>
      )}

      {hasMicPermission === false && (
        <p className="text-[11px] text-rose-500 text-center">
          마이크 접근이 차단되어 있습니다. 오디오 파일을 업로드하여 등록할 수도 있습니다!
        </p>
      )}
    </div>
  );
}
