"use client";

import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Camera, Download, RotateCcw, Sparkles, X, Grid3X3, Wand2 } from 'lucide-react';

// 10 photo styles applied via canvas manipulation
const PHOTO_STYLES = [
  { name: 'Original', apply: null },
  { name: 'B&W', apply: (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const img = ctx.getImageData(0, 0, w, h);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const g = d[i] * 0.299 + d[i+1] * 0.587 + d[i+2] * 0.114;
      d[i] = d[i+1] = d[i+2] = g;
    }
    ctx.putImageData(img, 0, 0);
  }},
  { name: 'High Contrast', apply: (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const img = ctx.getImageData(0, 0, w, h);
    const d = img.data;
    const factor = 1.6;
    for (let i = 0; i < d.length; i += 4) {
      d[i] = Math.min(255, Math.max(0, factor * (d[i] - 128) + 128));
      d[i+1] = Math.min(255, Math.max(0, factor * (d[i+1] - 128) + 128));
      d[i+2] = Math.min(255, Math.max(0, factor * (d[i+2] - 128) + 128));
    }
    ctx.putImageData(img, 0, 0);
  }},
  { name: 'Warm Vintage', apply: (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const img = ctx.getImageData(0, 0, w, h);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      d[i] = Math.min(255, d[i] * 1.1 + 20);
      d[i+1] = Math.min(255, d[i+1] * 0.95 + 10);
      d[i+2] = Math.max(0, d[i+2] * 0.8);
    }
    ctx.putImageData(img, 0, 0);
  }},
  { name: 'Cool Blue', apply: (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const img = ctx.getImageData(0, 0, w, h);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      d[i] = Math.max(0, d[i] * 0.85);
      d[i+1] = Math.min(255, d[i+1] * 0.95);
      d[i+2] = Math.min(255, d[i+2] * 1.2 + 15);
    }
    ctx.putImageData(img, 0, 0);
  }},
  { name: 'Sepia', apply: (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const img = ctx.getImageData(0, 0, w, h);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i], g = d[i+1], b = d[i+2];
      d[i] = Math.min(255, r * 0.393 + g * 0.769 + b * 0.189);
      d[i+1] = Math.min(255, r * 0.349 + g * 0.686 + b * 0.168);
      d[i+2] = Math.min(255, r * 0.272 + g * 0.534 + b * 0.131);
    }
    ctx.putImageData(img, 0, 0);
  }},
  { name: 'Dither', apply: (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const img = ctx.getImageData(0, 0, w, h);
    const d = img.data;
    // Convert to grayscale first
    const gray = new Float32Array(w * h);
    for (let i = 0; i < gray.length; i++) {
      gray[i] = d[i*4] * 0.299 + d[i*4+1] * 0.587 + d[i*4+2] * 0.114;
    }
    // Floyd-Steinberg dithering
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = y * w + x;
        const old = gray[idx];
        const nw = old < 128 ? 0 : 255;
        gray[idx] = nw;
        const err = old - nw;
        if (x + 1 < w) gray[idx + 1] += err * 7/16;
        if (y + 1 < h) {
          if (x > 0) gray[(y+1)*w + x - 1] += err * 3/16;
          gray[(y+1)*w + x] += err * 5/16;
          if (x + 1 < w) gray[(y+1)*w + x + 1] += err * 1/16;
        }
      }
    }
    for (let i = 0; i < gray.length; i++) {
      d[i*4] = d[i*4+1] = d[i*4+2] = Math.min(255, Math.max(0, gray[i]));
    }
    ctx.putImageData(img, 0, 0);
  }},
  { name: 'Saturated', apply: (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const img = ctx.getImageData(0, 0, w, h);
    const d = img.data;
    const boost = 1.8;
    for (let i = 0; i < d.length; i += 4) {
      const avg = (d[i] + d[i+1] + d[i+2]) / 3;
      d[i] = Math.min(255, Math.max(0, avg + (d[i] - avg) * boost));
      d[i+1] = Math.min(255, Math.max(0, avg + (d[i+1] - avg) * boost));
      d[i+2] = Math.min(255, Math.max(0, avg + (d[i+2] - avg) * boost));
    }
    ctx.putImageData(img, 0, 0);
  }},
  { name: 'Invert', apply: (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const img = ctx.getImageData(0, 0, w, h);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      d[i] = 255 - d[i];
      d[i+1] = 255 - d[i+1];
      d[i+2] = 255 - d[i+2];
    }
    ctx.putImageData(img, 0, 0);
  }},
  { name: 'Posterize', apply: (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const img = ctx.getImageData(0, 0, w, h);
    const d = img.data;
    const levels = 4;
    const step = 255 / levels;
    for (let i = 0; i < d.length; i += 4) {
      d[i] = Math.round(d[i] / step) * step;
      d[i+1] = Math.round(d[i+1] / step) * step;
      d[i+2] = Math.round(d[i+2] / step) * step;
    }
    ctx.putImageData(img, 0, 0);
  }},
];

interface ScatteredPhoto {
  id: number;
  src: string;        // original
  displaySrc: string; // current (possibly styled)
  x: number;
  y: number;
  rotation: number;
  dragX: number;
  dragY: number;
  placed: boolean;
  styleName: string;
}

export default function SelfieApp() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cameraCardRef = useRef<HTMLDivElement>(null);
  const styleCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [flashVisible, setFlashVisible] = useState(false);
  const [scatteredPhotos, setScatteredPhotos] = useState<ScatteredPhoto[]>([]);
  const [dragging, setDragging] = useState<{id: number, startX: number, startY: number, origDragX: number, origDragY: number} | null>(null);
  const [showGrid, setShowGrid] = useState(false);
  const [gridScroll, setGridScroll] = useState(0);
  const gridRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const photoIdRef = useRef(0);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Track grid scroll
  useEffect(() => {
    if (!showGrid || !gridRef.current) return;
    const el = gridRef.current;
    const onScroll = () => setGridScroll(el.scrollTop);
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [showGrid]);

  useEffect(() => {
    if (showGrid) setGridScroll(0);
  }, [showGrid]);

  // Drag handlers
  useEffect(() => {
    if (!dragging) return;
    const onMove = (clientX: number, clientY: number) => {
      const dx = clientX - dragging.startX;
      const dy = clientY - dragging.startY;
      setScatteredPhotos(prev => prev.map(p =>
        p.id === dragging.id ? { ...p, dragX: dragging.origDragX + dx, dragY: dragging.origDragY + dy } : p
      ));
    };
    const onMouseMove = (e: MouseEvent) => onMove(e.clientX, e.clientY);
    const onTouchMove = (e: TouchEvent) => { e.preventDefault(); onMove(e.touches[0].clientX, e.touches[0].clientY); };
    const onUp = () => setDragging(null);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onUp);
    };
  }, [dragging]);

  const startCamera = useCallback(async (mode?: 'user' | 'environment') => {
    const useMode = mode ?? facingMode;
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: useMode, width: { ideal: 1920 }, height: { ideal: 1080 } }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsStreaming(true);
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      alert('Unable to access camera. Please ensure you have granted permission.');
    }
  }, [facingMode]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setIsStreaming(false);
  }, []);

  const getScatterPosition = useCallback(() => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const cardRect = cameraCardRef.current?.getBoundingClientRect();
    const cardCX = cardRect ? cardRect.left + cardRect.width / 2 : vw / 2;
    const cardCY = cardRect ? cardRect.top + cardRect.height / 2 : vh / 2;
    const safeW = cardRect ? cardRect.width / 2 + 60 : 220;
    const safeH = cardRect ? cardRect.height / 2 + 60 : 280;

    let x: number, y: number;
    for (let i = 0; i < 30; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 200 + Math.random() * Math.max(vw, vh) * 0.4;
      x = Math.cos(angle) * dist;
      y = Math.sin(angle) * dist;
      const photoX = vw / 2 + x;
      const photoY = vh / 2 + y;
      if (photoX < 20 || photoX > vw - 20 || photoY < 20 || photoY > vh - 20) continue;
      if (Math.abs(photoX - cardCX) < safeW && Math.abs(photoY - cardCY) < safeH) continue;
      return { x, y };
    }
    return { x: -vw * 0.3, y: -vh * 0.35 };
  }, []);

  const capturePhoto = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      const context = canvas.getContext('2d');
      if (context) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        if (facingMode === 'user') {
          context.translate(canvas.width, 0);
          context.scale(-1, 1);
        }
        context.drawImage(video, 0, 0);
        context.setTransform(1, 0, 0, 1, 0, 0);
        const dataURL = canvas.toDataURL('image/jpeg', 0.92);

        const { x, y } = getScatterPosition();
        const rotation = (Math.random() - 0.5) * 30;
        const newId = photoIdRef.current++;

        setScatteredPhotos(prev => [...prev, {
          id: newId,
          src: dataURL,
          displaySrc: dataURL,
          x: 0, y: 0,
          rotation: 0,
          dragX: 0, dragY: 0,
          placed: false,
          styleName: 'Original',
        }]);

        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setScatteredPhotos(prev => prev.map(p =>
              p.id === newId ? { ...p, x, y, rotation, placed: true } : p
            ));
          });
        });

        setFlashVisible(true);
        setTimeout(() => setFlashVisible(false), 200);
      }
    }
  }, [facingMode, getScatterPosition]);

  const applyRandomStyle = useCallback((photoId: number) => {
    const photo = scatteredPhotos.find(p => p.id === photoId);
    if (!photo) return;

    // Pick a random style different from current
    let style;
    do {
      style = PHOTO_STYLES[Math.floor(Math.random() * PHOTO_STYLES.length)];
    } while (style.name === photo.styleName && PHOTO_STYLES.length > 1);

    if (!style.apply) {
      // Original
      setScatteredPhotos(prev => prev.map(p =>
        p.id === photoId ? { ...p, displaySrc: p.src, styleName: 'Original' } : p
      ));
      return;
    }

    // Apply style via offscreen canvas
    const img = new Image();
    img.onload = () => {
      const c = styleCanvasRef.current || document.createElement('canvas');
      if (!styleCanvasRef.current) styleCanvasRef.current = c;
      c.width = img.width;
      c.height = img.height;
      const ctx = c.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      style.apply!(ctx, c.width, c.height);
      const result = c.toDataURL('image/jpeg', 0.92);
      setScatteredPhotos(prev => prev.map(p =>
        p.id === photoId ? { ...p, displaySrc: result, styleName: style.name } : p
      ));
    };
    img.src = photo.src; // always apply from original
  }, [scatteredPhotos]);

  const downloadScatteredPhoto = useCallback((src: string, id: number) => {
    const link = document.createElement('a');
    link.href = src;
    link.download = `selfie-${id}.jpg`;
    link.click();
  }, []);

  const flipCamera = useCallback(() => {
    const newMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newMode);
    startCamera(newMode);
  }, [facingMode, startCamera]);

  const startDrag = (id: number, clientX: number, clientY: number) => {
    const photo = scatteredPhotos.find(p => p.id === id);
    if (!photo) return;
    setScatteredPhotos(prev => [...prev.filter(p => p.id !== id), photo]);
    setDragging({ id, startX: clientX, startY: clientY, origDragX: photo.dragX, origDragY: photo.dragY });
  };

  // Grid positions
  const getGridPositions = useCallback(() => {
    if (typeof window === 'undefined') return [];
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const cols = vw > 768 ? 3 : 2;
    const gap = 12;
    const padding = 16;
    const topOffset = 80;
    const availW = Math.min(vw - padding * 2, 900);
    const cellW = (availW - gap * (cols - 1)) / cols;
    const cellH = cellW * 0.75;
    const startX = (vw - availW) / 2;

    return scatteredPhotos.map((_, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const rows = Math.ceil(scatteredPhotos.length / cols);
      return {
        x: startX + col * (cellW + gap) + cellW / 2 - vw / 2,
        y: topOffset + row * (cellH + gap) + cellH / 2 - vh / 2,
        w: cellW,
        h: cellH,
        totalH: topOffset + rows * (cellH + gap) + 32,
      };
    });
  }, [scatteredPhotos]);

  const gridPositions = showGrid ? getGridPositions() : [];

  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4 overflow-hidden relative">
      {flashVisible && (
        <div className="fixed inset-0 bg-white pointer-events-none z-50" style={{ animation: 'flash 0.25s ease-out forwards' }} />
      )}

      {/* Grid overlay — scrollable backdrop */}
      {showGrid && (
        <div
          ref={gridRef}
          className="fixed inset-0 z-[150] backdrop-blur-md overflow-auto"
          style={{ background: 'color-mix(in oklab, #ffffff00 80%, transparent)' }}
          onClick={() => setShowGrid(false)}
        >
          {/* Spacer to make container scrollable */}
          <div style={{ height: `${gridPositions[0]?.totalH ?? 0}px`, pointerEvents: 'none' }} />
        </div>
      )}

      {/* Grid header */}
      {showGrid && (
        <div className="fixed top-0 left-0 right-0 z-[210] flex items-center justify-between p-4">
          <h2 className="text-white text-lg font-medium drop-shadow-lg">All Photos ({scatteredPhotos.length})</h2>
          <button
            onClick={() => setShowGrid(false)}
            className="bg-white/20 hover:bg-white/30 rounded-full p-3 text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* Photos — unified, transition between scattered and grid */}
      {scatteredPhotos.map((photo, idx) => {
        const gridPos = showGrid ? gridPositions[idx] : null;
        const tx = showGrid && gridPos ? gridPos.x : photo.x + photo.dragX;
        const ty = showGrid && gridPos ? gridPos.y - gridScroll : photo.y + photo.dragY;
        const rot = showGrid ? 0 : photo.rotation;
        const z = showGrid ? 160 + idx : idx + 1;

        return (
          <div
            key={photo.id}
            className="absolute select-none group"
            style={{
              left: '50%',
              top: '50%',
              width: showGrid && gridPos ? `${gridPos.w}px` : 'min(70vw, 22rem)',
              aspectRatio: '4/3',
              borderRadius: '8px',
              overflow: 'visible',
              zIndex: z,
              transform: `translate(calc(-50% + ${tx}px), calc(-50% + ${ty}px)) rotate(${rot}deg)`,
              transition: dragging?.id === photo.id
                ? 'none'
                : showGrid
                  ? 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1), width 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
                  : !photo.placed
                    ? 'none'
                    : 'transform 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
              cursor: showGrid ? 'default' : (dragging?.id === photo.id ? 'grabbing' : 'grab'),
            }}
            onMouseDown={(e) => { if (showGrid) return; e.preventDefault(); startDrag(photo.id, e.clientX, e.clientY); }}
            onTouchStart={(e) => { if (showGrid) return; startDrag(photo.id, e.touches[0].clientX, e.touches[0].clientY); }}
          >
            <div className="w-full h-full rounded-lg overflow-hidden transition-shadow duration-200 group-hover:shadow-[0_12px_40px_rgba(0,0,0,0.3)]" style={{
              boxShadow: showGrid ? '0 4px 20px rgba(0,0,0,0.3)' : '0 8px 30px rgba(0,0,0,0.2)',
              border: '3px solid white',
            }}>
              <img src={photo.displaySrc} alt="" className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-[1.02]" draggable={false} />
            </div>
            {/* Style name badge */}
            {photo.styleName !== 'Original' && (
              <div className="absolute -top-2 -left-2 bg-black/70 text-white text-[10px] px-2 py-0.5 rounded-full font-medium">
                {photo.styleName}
              </div>
            )}
            {/* Action buttons */}
            <div className="absolute -bottom-3 -right-3 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity" style={{ zIndex: 999 }}>
              <button
                onClick={(e) => { e.stopPropagation(); applyRandomStyle(photo.id); }}
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                className="bg-white rounded-full p-2 shadow-lg hover:bg-slate-50 active:scale-95 transition-transform cursor-pointer"
              >
                <Wand2 className="h-4 w-4 text-purple-600" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); downloadScatteredPhoto(photo.displaySrc, photo.id); }}
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                className="bg-white rounded-full p-2 shadow-lg hover:bg-slate-50 active:scale-95 transition-transform cursor-pointer"
              >
                <Download className="h-4 w-4 text-slate-600" />
              </button>
            </div>
          </div>
        );
      })}

      {/* Camera card */}
      <Card
        ref={cameraCardRef}
        className="w-full max-w-lg mx-auto shadow-xl border-0 bg-white/80 backdrop-blur-sm relative"
        style={{ zIndex: showGrid ? 50 : 100 }}
      >
        <CardContent className="p-5 sm:p-6 space-y-5">
          <div className="text-center space-y-1">
            <div className="flex items-center justify-center gap-2">
              <Sparkles className="h-5 w-5 text-blue-500" />
              <h1 className="text-xl sm:text-2xl font-semibold text-slate-800">Quick Selfie</h1>
            </div>
            <p className="text-slate-500 text-sm">Look good, capture it, share it ✨</p>
          </div>

          <div className="relative overflow-hidden rounded-2xl bg-slate-900 aspect-[4/3]">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 w-full h-full object-cover"
              style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'scaleX(1)' }}
            />
            {!isStreaming && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center space-y-3">
                  <Camera className="h-12 w-12 text-slate-500 mx-auto" />
                  <p className="text-slate-400 text-sm">Tap &ldquo;Start Camera&rdquo; below</p>
                </div>
              </div>
            )}
            <canvas ref={canvasRef} className="hidden" aria-hidden="true" />

            {isStreaming && (
              <div className="absolute top-3 right-3 flex gap-2">
                <Button
                  onClick={flipCamera}
                  variant="secondary"
                  size="icon"
                  className="rounded-full bg-black/40 hover:bg-black/60 text-white border-0 backdrop-blur-sm h-9 w-9"
                  aria-label="Flip camera"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
                <Button
                  onClick={stopCamera}
                  variant="secondary"
                  size="icon"
                  className="rounded-full bg-black/40 hover:bg-black/60 text-white border-0 backdrop-blur-sm h-9 w-9"
                  aria-label="Stop camera"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          <div className="flex gap-3 justify-center">
            {!isStreaming ? (
              <Button
                onClick={() => startCamera()}
                size="lg"
                className="flex-1 bg-blue-600 hover:bg-blue-700 focus-visible:ring-blue-400"
              >
                <Camera className="h-4 w-4 mr-2" />
                Start Camera
              </Button>
            ) : (
              <Button
                onClick={capturePhoto}
                size="lg"
                className="flex-1 bg-red-500 hover:bg-red-600 focus-visible:ring-red-400 text-white font-medium"
              >
                <div className="h-5 w-5 mr-2 rounded-full border-2 border-white" />
                Capture
              </Button>
            )}

            {scatteredPhotos.length > 0 && (
              <Button
                onClick={() => setShowGrid(!showGrid)}
                size="lg"
                variant="outline"
                className="bg-white/80 backdrop-blur-sm"
              >
                <Grid3X3 className="h-4 w-4 mr-2" />
                All ({scatteredPhotos.length})
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
