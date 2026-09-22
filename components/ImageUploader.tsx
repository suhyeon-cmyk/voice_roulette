'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ImageIcon, Trash2, Upload, ZoomIn, X, Sparkles } from 'lucide-react';

interface ImageUploaderProps {
  initialImageUrl?: string;
  initialImageName?: string;
  onImageChange: (imageFile: File | null, imageUrl: string | null, imageName?: string) => void;
}

export default function ImageUploader({
  initialImageUrl,
  initialImageName,
  onImageChange,
}: ImageUploaderProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialImageUrl || null);
  const [imageName, setImageName] = useState<string>(initialImageName || '');
  const [isZoomOpen, setIsZoomOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setPreviewUrl(initialImageUrl || null);
    setImageName(initialImageName || '');
  }, [initialImageUrl, initialImageName]);

  // 파일 선택 처리
  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('이미지 파일(JPG, PNG, GIF, WEBP 등)만 업로드할 수 있습니다.');
      return;
    }

    // 최대 15MB 제한
    if (file.size > 15 * 1024 * 1024) {
      alert('이미지 파일 용량은 최대 15MB까지 가능합니다.');
      return;
    }

    const localUrl = URL.createObjectURL(file);
    setPreviewUrl(localUrl);
    setImageName(file.name);
    onImageChange(file, localUrl, file.name);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  // 이미지 삭제
  const handleRemove = () => {
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setImageName('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onImageChange(null, null, undefined);
  };

  // 드래그 앤 드롭
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  return (
    <div className="w-full flex flex-col gap-2">
      {/* 숨겨진 파일 인풋 */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png, image/jpeg, image/jpg, image/webp, image/gif"
        onChange={handleInputChange}
        className="hidden"
      />

      {previewUrl ? (
        /* 이미지가 등록되어 있을 때: 썸네일 카드 */
        <div className="w-full bg-pink-50/70 border border-pink-200 rounded-2xl p-2.5 sm:p-3 flex items-center justify-between gap-3 shadow-xs">
          {/* 좌측 썸네일 + 확대 버튼 */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              onClick={() => setIsZoomOpen(true)}
              className="relative w-12 h-12 rounded-xl overflow-hidden border border-pink-200 bg-white flex-shrink-0 cursor-pointer group shadow-2xs"
              title="클릭하여 크게 보기"
            >
              <img
                src={previewUrl}
                alt="미리보기"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
              />
              <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                <ZoomIn className="w-4 h-4" />
              </div>
            </div>

            {/* 파일 정보 */}
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-gray-800 truncate max-w-[140px] sm:max-w-[200px]">
                {imageName || '등록된 이미지'}
              </span>
              <span className="text-[10px] text-pink-500 font-medium flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                <span>당첨 시 공개되는 이미지</span>
              </span>
            </div>
          </div>

          {/* 우측 버튼들 (사진 변경, 삭제) */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-pink-100/70 border border-pink-200 text-pink-600 text-xs font-bold transition-colors cursor-pointer shadow-2xs"
              title="다른 이미지로 변경"
            >
              변경
            </button>
            <button
              type="button"
              onClick={handleRemove}
              className="p-1.5 rounded-xl text-gray-400 hover:text-rose-500 hover:bg-rose-50 transition-colors cursor-pointer"
              title="이미지 삭제"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        /* 이미지가 없을 때: 업로드 영역 버튼 */
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`w-full py-2.5 px-3 border-2 border-dashed rounded-2xl flex items-center justify-center gap-2 cursor-pointer transition-all ${
            isDragging
              ? 'border-pink-500 bg-pink-100/60 scale-[1.01]'
              : 'border-pink-200/90 bg-pink-50/30 hover:bg-pink-50 hover:border-pink-300'
          }`}
          title="클릭하거나 드래그하여 이미지 등록"
        >
          <div className="w-7 h-7 rounded-xl bg-pink-100 text-pink-500 flex items-center justify-center flex-shrink-0 shadow-2xs">
            <ImageIcon className="w-4 h-4" />
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-600 font-semibold">
            <span className="text-pink-600 font-bold">이미지 파일 첨부</span>
            <span className="text-[11px] text-gray-400 font-normal hidden sm:inline">
              (JPG, PNG, GIF, WEBP)
            </span>
          </div>
        </div>
      )}

      {/* 이미지 확대 모달 */}
      {isZoomOpen && previewUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in"
          onClick={() => setIsZoomOpen(false)}
        >
          <div
            className="relative max-w-lg max-h-[85vh] bg-white rounded-3xl p-3 shadow-2xl flex flex-col items-center gap-3 animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setIsZoomOpen(false)}
              className="absolute top-3 right-3 p-1.5 rounded-full bg-white/80 hover:bg-white text-gray-700 shadow-md transition-colors cursor-pointer"
              aria-label="닫기"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="w-full max-h-[75vh] overflow-hidden rounded-2xl flex items-center justify-center bg-gray-50">
              <img
                src={previewUrl}
                alt="확대 보기"
                className="max-w-full max-h-[75vh] object-contain rounded-2xl"
              />
            </div>
            <span className="text-xs font-semibold text-gray-600 truncate max-w-xs">
              {imageName || '이미지 미리보기'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
