'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  DEFAULT_PASTEL_COLORS,
  clamp,
  hexToRgb,
  rgbToHex,
  rgbToHsv,
  hsvToRgb,
  hsvTo255,
  hsvFrom255,
  sanitizeHexCode,
  HsvColor,
  RgbColor,
} from '@/lib/colorUtils';
import { Palette, X, Check, Sparkles } from 'lucide-react';

interface ColorPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentColor: string;
  onSelectColor: (color: string) => void;
  itemTitle?: string;
  itemIndex?: number;
}

export default function ColorPickerModal({
  isOpen,
  onClose,
  currentColor,
  onSelectColor,
  itemTitle,
  itemIndex,
}: ColorPickerModalProps) {
  // 현재 내부 색상 상태
  const [hsv, setHsv] = useState<HsvColor>({ h: 345, s: 0.29, v: 1 });
  const [rgb, setRgb] = useState<RgbColor>({ r: 255, g: 181, b: 197 });
  const [hexInput, setHexInput] = useState<string>('#FFB5C5');
  const [activeTab, setActiveTab] = useState<'hsv' | 'rgb'>('hsv');

  // 2D 캔버스 드래그 감지용 ref
  const mapRef = useRef<HTMLDivElement | null>(null);
  const isDraggingMap = useRef<boolean>(false);

  // 모달 오픈 시 초기 색상 세팅
  useEffect(() => {
    if (isOpen) {
      const sanitized = sanitizeHexCode(currentColor || '#FFB5C5');
      const rgbVal = hexToRgb(sanitized);
      const hsvVal = rgbToHsv(rgbVal);
      setHsv(hsvVal);
      setRgb(rgbVal);
      setHexInput(sanitized);
    }
  }, [isOpen, currentColor]);

  // HSV 변경 시 모든 값 동기화
  const updateFromHsv = useCallback((newHsv: HsvColor) => {
    setHsv(newHsv);
    const newRgb = hsvToRgb(newHsv);
    setRgb(newRgb);
    const newHex = rgbToHex(newRgb);
    setHexInput(newHex);
  }, []);

  // RGB 변경 시 모든 값 동기화
  const updateFromRgb = useCallback((newRgb: RgbColor) => {
    setRgb(newRgb);
    const newHsv = rgbToHsv(newRgb);
    setHsv(newHsv);
    const newHex = rgbToHex(newRgb);
    setHexInput(newHex);
  }, []);

  // 2D 색상표(채도, 명도) 포인터 이동 계산
  const handleMapPointer = useCallback(
    (clientX: number, clientY: number) => {
      if (!mapRef.current) return;
      const rect = mapRef.current.getBoundingClientRect();
      const x = clamp((clientX - rect.left) / rect.width, 0, 1);
      const y = clamp((clientY - rect.top) / rect.height, 0, 1);

      const newS = x;
      const newV = 1 - y;

      updateFromHsv({ ...hsv, s: newS, v: newV });
    },
    [hsv, updateFromHsv]
  );

  // 2D 영역 마우스 이벤트
  const handleMouseDownMap = (e: React.MouseEvent) => {
    isDraggingMap.current = true;
    handleMapPointer(e.clientX, e.clientY);

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (isDraggingMap.current) {
        handleMapPointer(moveEvent.clientX, moveEvent.clientY);
      }
    };

    const onMouseUp = () => {
      isDraggingMap.current = false;
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // 2D 영역 터치 이벤트 (모바일)
  const handleTouchStartMap = (e: React.TouchEvent) => {
    if (e.touches.length > 0) {
      handleMapPointer(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  const handleTouchMoveMap = (e: React.TouchEvent) => {
    if (e.touches.length > 0) {
      handleMapPointer(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  // 0~255 기준 HSV 값
  const hsv255 = hsvTo255(hsv);

  // 색상 채도 명도(0~255) 슬라이더/인풋 변경
  const handleHsv255Change = (channel: 'h' | 's' | 'v', val: number) => {
    const clamped = clamp(Math.round(val), 0, 255);
    const updated = { ...hsv255, [channel]: clamped };
    const newHsv = hsvFrom255(updated.h, updated.s, updated.v);
    updateFromHsv(newHsv);
  };

  // 마우스 휠 스크롤로 0~255 값 미세 증감 조절
  const handleWheelScrollHsv = (e: React.WheelEvent, channel: 'h' | 's' | 'v') => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 1 : -1;
    handleHsv255Change(channel, hsv255[channel] + delta);
  };

  // RGB (0~255) 슬라이더/인풋 변경
  const handleRgbChange = (channel: 'r' | 'g' | 'b', val: number) => {
    const clamped = clamp(Math.round(val), 0, 255);
    const updated = { ...rgb, [channel]: clamped };
    updateFromRgb(updated);
  };

  const handleWheelScrollRgb = (e: React.WheelEvent, channel: 'r' | 'g' | 'b') => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 1 : -1;
    handleRgbChange(channel, rgb[channel] + delta);
  };

  // RGB 코드 (HEX) 직접 입력 처리 (요구사항 3)
  // focusout 또는 버튼 클릭 시: "#" 없으면 붙이고, 여러 개면 1개로 축소
  const commitHexCode = () => {
    const sanitized = sanitizeHexCode(hexInput, rgbToHex(rgb));
    setHexInput(sanitized);
    const newRgb = hexToRgb(sanitized);
    const newHsv = rgbToHsv(newRgb);
    setRgb(newRgb);
    setHsv(newHsv);
  };

  // 다섯 가지 기본 색상 선택 (요구사항 4)
  const handleSelectPreset = (presetColor: string) => {
    const sanitized = sanitizeHexCode(presetColor);
    const newRgb = hexToRgb(sanitized);
    const newHsv = rgbToHsv(newRgb);
    setRgb(newRgb);
    setHsv(newHsv);
    setHexInput(sanitized);
  };

  // 최종 적용
  const handleConfirm = () => {
    const currentHex = rgbToHex(rgb);
    onSelectColor(currentHex);
    onClose();
  };

  if (!isOpen) return null;

  const hexColor = rgbToHex(rgb);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/45 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-sm sm:max-w-md bg-white rounded-3xl p-5 sm:p-6 border-2 border-pink-200 shadow-2xl flex flex-col gap-4 text-gray-800 animate-scale-up max-h-[92vh] overflow-y-auto">
        {/* 모달 헤더 */}
        <div className="flex items-center justify-between border-b border-pink-100 pb-3">
          <div className="flex items-center gap-2">
            <div
              style={{ backgroundColor: hexColor }}
              className="w-7 h-7 rounded-full shadow-inner border border-white ring-2 ring-pink-300"
            />
            <div>
              <h3 className="text-sm sm:text-base font-black text-gray-800 flex items-center gap-1.5">
                <Palette className="w-4 h-4 text-pink-500" />
                <span>룰렛 색상 지정</span>
              </h3>
              <p className="text-[11px] text-gray-400 font-medium truncate max-w-[200px]">
                {itemIndex !== undefined ? `#${itemIndex + 1} ` : ''}
                {itemTitle || '항목 색상'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-pink-600 rounded-full hover:bg-pink-50 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 4. 기본 5개 색상 퀵 선택 (요구사항 4) */}
        <div className="flex flex-col gap-1.5 bg-pink-50/50 p-2.5 rounded-2xl border border-pink-100">
          <span className="text-[11px] font-bold text-pink-600 flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            <span>기본 파스텔 색상 5종 (원클릭 선택)</span>
          </span>
          <div className="flex items-center justify-between gap-1.5 px-1">
            {DEFAULT_PASTEL_COLORS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => handleSelectPreset(preset)}
                style={{ backgroundColor: preset }}
                className={`w-9 h-9 rounded-2xl transition-all shadow-xs cursor-pointer ${
                  hexColor.toUpperCase() === preset.toUpperCase()
                    ? 'ring-3 ring-pink-500 scale-110 shadow-md'
                    : 'opacity-80 hover:opacity-100 hover:scale-105'
                }`}
                title={preset}
              />
            ))}
          </div>
        </div>

        {/* 1. 2차원 색상표 (요구사항 1: 마우스 드래그 / 터치 조작) */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-700">2차원 색상표 (채도 × 명도)</span>
            <span className="text-[10px] text-gray-400 font-medium">드래그 또는 터치로 조절</span>
          </div>

          <div
            ref={mapRef}
            onMouseDown={handleMouseDownMap}
            onTouchStart={handleTouchStartMap}
            onTouchMove={handleTouchMoveMap}
            style={{
              backgroundColor: `hsl(${hsv.h}, 100%, 50%)`,
            }}
            className="relative w-full h-36 sm:h-40 rounded-2xl cursor-crosshair overflow-hidden shadow-inner select-none touch-none"
          >
            {/* 채도 레이어: 좌측 백색 -> 우측 투명 */}
            <div className="absolute inset-0 bg-gradient-to-r from-white to-transparent pointer-events-none" />
            {/* 명도 레이어: 상단 투명 -> 하단 흑색 */}
            <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent pointer-events-none" />

            {/* 포인터 */}
            <div
              style={{
                left: `${hsv.s * 100}%`,
                top: `${(1 - hsv.v) * 100}%`,
              }}
              className="absolute w-5 h-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_4px_rgba(0,0,0,0.6)] pointer-events-none bg-transparent"
            />
          </div>

          {/* 색상(Hue) 레인보우 바 슬라이더 */}
          <div className="flex flex-col gap-1 mt-1">
            <div className="flex items-center justify-between text-[11px] text-gray-500 font-semibold">
              <span>색조 (Hue)</span>
              <span>{Math.round(hsv.h)}°</span>
            </div>
            <input
              type="range"
              min={0}
              max={360}
              value={Math.round(hsv.h)}
              onChange={(e) => updateFromHsv({ ...hsv, h: Number(e.target.value) })}
              style={{
                background:
                  'linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)',
              }}
              className="w-full h-3 rounded-lg appearance-none cursor-pointer accent-white shadow-inner"
            />
          </div>
        </div>

        {/* 2. 색상 채도 명도 직접 입력 (0 ~ 255) 및 스크롤 입력 (요구사항 2) */}
        <div className="bg-gray-50/80 p-3 rounded-2xl border border-gray-200 flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setActiveTab('hsv')}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'hsv'
                    ? 'bg-pink-500 text-white shadow-xs'
                    : 'bg-white text-gray-600 hover:bg-gray-100'
                }`}
              >
                색상 · 채도 · 명도 (0~255)
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('rgb')}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'rgb'
                    ? 'bg-pink-500 text-white shadow-xs'
                    : 'bg-white text-gray-600 hover:bg-gray-100'
                }`}
              >
                RGB (0~255)
              </button>
            </div>
            <span className="text-[10px] text-pink-500 font-medium">휠 스크롤 가능 ↕</span>
          </div>

          {activeTab === 'hsv' ? (
            <div className="flex flex-col gap-2 text-xs">
              {/* 색상 (H) */}
              <div className="flex items-center gap-2">
                <span className="w-10 font-bold text-gray-600 flex-shrink-0">색상 (H)</span>
                <input
                  type="range"
                  min={0}
                  max={255}
                  value={hsv255.h}
                  onChange={(e) => handleHsv255Change('h', Number(e.target.value))}
                  onWheel={(e) => handleWheelScrollHsv(e, 'h')}
                  className="flex-1 accent-pink-500 cursor-pointer"
                />
                <input
                  type="number"
                  min={0}
                  max={255}
                  value={hsv255.h}
                  onChange={(e) => handleHsv255Change('h', Number(e.target.value))}
                  onWheel={(e) => handleWheelScrollHsv(e, 'h')}
                  className="w-14 px-1.5 py-1 bg-white border border-gray-300 rounded-lg text-center font-bold text-xs"
                />
              </div>

              {/* 채도 (S) */}
              <div className="flex items-center gap-2">
                <span className="w-10 font-bold text-gray-600 flex-shrink-0">채도 (S)</span>
                <input
                  type="range"
                  min={0}
                  max={255}
                  value={hsv255.s}
                  onChange={(e) => handleHsv255Change('s', Number(e.target.value))}
                  onWheel={(e) => handleWheelScrollHsv(e, 's')}
                  className="flex-1 accent-pink-500 cursor-pointer"
                />
                <input
                  type="number"
                  min={0}
                  max={255}
                  value={hsv255.s}
                  onChange={(e) => handleHsv255Change('s', Number(e.target.value))}
                  onWheel={(e) => handleWheelScrollHsv(e, 's')}
                  className="w-14 px-1.5 py-1 bg-white border border-gray-300 rounded-lg text-center font-bold text-xs"
                />
              </div>

              {/* 명도 (V) */}
              <div className="flex items-center gap-2">
                <span className="w-10 font-bold text-gray-600 flex-shrink-0">명도 (V)</span>
                <input
                  type="range"
                  min={0}
                  max={255}
                  value={hsv255.v}
                  onChange={(e) => handleHsv255Change('v', Number(e.target.value))}
                  onWheel={(e) => handleWheelScrollHsv(e, 'v')}
                  className="flex-1 accent-pink-500 cursor-pointer"
                />
                <input
                  type="number"
                  min={0}
                  max={255}
                  value={hsv255.v}
                  onChange={(e) => handleHsv255Change('v', Number(e.target.value))}
                  onWheel={(e) => handleWheelScrollHsv(e, 'v')}
                  className="w-14 px-1.5 py-1 bg-white border border-gray-300 rounded-lg text-center font-bold text-xs"
                />
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2 text-xs">
              {/* R */}
              <div className="flex items-center gap-2">
                <span className="w-10 font-bold text-rose-600 flex-shrink-0">Red (R)</span>
                <input
                  type="range"
                  min={0}
                  max={255}
                  value={rgb.r}
                  onChange={(e) => handleRgbChange('r', Number(e.target.value))}
                  onWheel={(e) => handleWheelScrollRgb(e, 'r')}
                  className="flex-1 accent-rose-500 cursor-pointer"
                />
                <input
                  type="number"
                  min={0}
                  max={255}
                  value={rgb.r}
                  onChange={(e) => handleRgbChange('r', Number(e.target.value))}
                  onWheel={(e) => handleWheelScrollRgb(e, 'r')}
                  className="w-14 px-1.5 py-1 bg-white border border-gray-300 rounded-lg text-center font-bold text-xs"
                />
              </div>

              {/* G */}
              <div className="flex items-center gap-2">
                <span className="w-10 font-bold text-emerald-600 flex-shrink-0">Green (G)</span>
                <input
                  type="range"
                  min={0}
                  max={255}
                  value={rgb.g}
                  onChange={(e) => handleRgbChange('g', Number(e.target.value))}
                  onWheel={(e) => handleWheelScrollRgb(e, 'g')}
                  className="flex-1 accent-emerald-500 cursor-pointer"
                />
                <input
                  type="number"
                  min={0}
                  max={255}
                  value={rgb.g}
                  onChange={(e) => handleRgbChange('g', Number(e.target.value))}
                  onWheel={(e) => handleWheelScrollRgb(e, 'g')}
                  className="w-14 px-1.5 py-1 bg-white border border-gray-300 rounded-lg text-center font-bold text-xs"
                />
              </div>

              {/* B */}
              <div className="flex items-center gap-2">
                <span className="w-10 font-bold text-blue-600 flex-shrink-0">Blue (B)</span>
                <input
                  type="range"
                  min={0}
                  max={255}
                  value={rgb.b}
                  onChange={(e) => handleRgbChange('b', Number(e.target.value))}
                  onWheel={(e) => handleWheelScrollRgb(e, 'b')}
                  className="flex-1 accent-blue-500 cursor-pointer"
                />
                <input
                  type="number"
                  min={0}
                  max={255}
                  value={rgb.b}
                  onChange={(e) => handleRgbChange('b', Number(e.target.value))}
                  onWheel={(e) => handleWheelScrollRgb(e, 'b')}
                  className="w-14 px-1.5 py-1 bg-white border border-gray-300 rounded-lg text-center font-bold text-xs"
                />
              </div>
            </div>
          )}
        </div>

        {/* 3. RGB (HEX) 코드 직접 입력 (요구사항 3) */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-gray-700 flex items-center justify-between">
            <span>RGB 색상 코드 (HEX)</span>
            <span className="text-[10px] text-gray-400 font-normal">
              포커스 아웃 / 엔터 시 '#' 자동 보정
            </span>
          </label>
          <div className="flex items-center gap-2">
            <div
              style={{ backgroundColor: hexColor }}
              className="w-9 h-9 rounded-xl border border-gray-300 shadow-inner flex-shrink-0"
            />
            <input
              type="text"
              value={hexInput}
              onChange={(e) => setHexInput(e.target.value)}
              onBlur={commitHexCode}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  commitHexCode();
                }
              }}
              placeholder="예: FFB5C5 또는 #FFB5C5"
              className="flex-1 px-3 py-2 bg-white border border-pink-200 rounded-xl text-xs font-mono font-bold text-gray-800 uppercase focus:outline-none focus:ring-2 focus:ring-pink-300"
            />
            <button
              type="button"
              onClick={commitHexCode}
              className="px-3 py-2 bg-gray-100 hover:bg-pink-100 text-gray-700 hover:text-pink-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              적용
            </button>
          </div>
        </div>

        {/* 모달 하단 버튼 */}
        <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-2xl text-xs font-bold transition-colors cursor-pointer"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="flex-1 py-2.5 bg-gradient-to-r from-pink-500 to-rose-400 hover:from-pink-600 hover:to-rose-500 text-white rounded-2xl text-xs font-bold shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>이 색상으로 적용</span>
          </button>
        </div>
      </div>
    </div>
  );
}
