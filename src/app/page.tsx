"use client";

import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Camera, Download, RotateCcw, Sparkles, X, Grid3X3 } from 'lucide-react';

interface ScatteredPhoto {
  id: number;
  src: string;
  x: number;
  y: number;
  rotation: number;
  dragX: number;
  dragY: number;
  placed: boolean;
}

export default function SelfieApp() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cameraCardRef = useRef<HTMLDivElement>(null);
  const gridScrollRef = useRef<HTMLDivElement>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [flashVisible, setFlashVisible] = useState(false);
  const [scatteredPhotos, setScatteredPhotos] = useState<ScatteredPhoto[]>([]);
  const [dragging, setDragging] = useState<{id: number, startX: number, startY: number, origDragX: number, origDragY: number} | null>(null);
  const [showGrid, setShowGrid] = useState(false);
  const [gridScroll, setGridScroll] = useState(0);
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
    if (!showGrid) { setGridScroll(0); return; }
    const el = gridScrollRef.current;
    if (!el) return;
    el.scrollTop = 0;
    const onScroll = () => setGridScroll(el.scrollTop);
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
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
      if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: useMode, width: { ideal: 1920 }, height: { ideal: 1080 } }
      });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; setIsStreaming(true); }
    } catch (error) {
      console.error('Error accessing camera:', error);
      alert('Unable to access camera. Please ensure you have granted permission.');
    }
  }, [facingMode]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) { streamRef.current.getTracks().forEach(track => track.stop()); streamRef.current = null; }
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
        if (facingMode === 'user') { context.translate(canvas.width, 0); context.scale(-1, 1); }
        context.drawImage(video, 0, 0);
        context.setTransform(1, 0, 0, 1, 0, 0);
        const dataURL = canvas.toDataURL('image/jpeg', 0.92);
        const { x, y } = getScatterPosition();
        const rotation = (Math.random() - 0.5) * 30;
        const newId = photoIdRef.current++;

        setScatteredPhotos(prev => [...prev, {
          id: newId, src: dataURL, x: 0, y: 0, rotation: 0, dragX: 0, dragY: 0, placed: false,
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

  // Grid positions — relative to viewport center, adjusted by scroll
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
      return {
        x: startX + col * (cellW + gap) + cellW / 2 - vw / 2,
        y: topOffset + row * (cellH + gap) + cellH / 2 - vh / 2,
        w: cellW,
        h: cellH,
      };
    });
  }, [scatteredPhotos]);

  const getGridTotalHeight = useCallback(() => {
    if (typeof window === 'undefined') return 0;
    const vw = window.innerWidth;
    const cols = vw > 768 ? 3 : 2;
    const gap = 12;
    const padding = 16;
    const availW = Math.min(vw - padding * 2, 900);
    const cellW = (availW - gap * (cols - 1)) / cols;
    const cellH = cellW * 0.75;
    const rows = Math.ceil(scatteredPhotos.length / cols);
    return 80 + rows * (cellH + gap) + 32;
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
          ref={gridScrollRef}
          className="fixed inset-0 z-[150] overflow-y-auto backdrop-blur-md"
          style={{ background: 'color-mix(in oklab, #ffffff00 80%, transparent)' }}
          onClick={() => setShowGrid(false)}
        >
          {/* Invisible spacer to create scroll height */}
          <div style={{ height: `${getGridTotalHeight()}px`, pointerEvents: 'none' }} />
        </div>
      )}

      {/* Grid header */}
      {showGrid && (
        <div className="fixed top-0 left-0 right-0 z-[210] flex items-center justify-between p-4 bg-gradient-to-b from-black/40 to-transparent">
          <h2 className="text-white text-lg font-medium">All Photos ({scatteredPhotos.length})</h2>
          <button
            onClick={() => setShowGrid(false)}
            className="bg-white/20 hover:bg-white/30 rounded-full p-3 text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* Photos — same elements animate between scattered and grid */}
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
              <img src={photo.src} alt="" className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-[1.02]" draggable={false} />
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); downloadScatteredPhoto(photo.src, photo.id); }}
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              className="absolute -bottom-3 -right-3 bg-white rounded-full p-2 shadow-lg hover:bg-slate-50 active:scale-95 transition-all cursor-pointer opacity-0 group-hover:opacity-100"
              style={{ zIndex: 999 }}
            >
              <Download className="h-4 w-4 text-slate-600" />
            </button>
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
            <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover" style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'scaleX(1)' }} />
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
                <Button onClick={flipCamera} variant="secondary" size="icon" className="rounded-full bg-black/40 hover:bg-black/60 text-white border-0 backdrop-blur-sm h-9 w-9" aria-label="Flip camera">
                  <RotateCcw className="h-4 w-4" />
                </Button>
                <Button onClick={stopCamera} variant="secondary" size="icon" className="rounded-full bg-black/40 hover:bg-black/60 text-white border-0 backdrop-blur-sm h-9 w-9" aria-label="Stop camera">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          <div className="flex gap-3 justify-center">
            {!isStreaming ? (
              <Button onClick={() => startCamera()} size="lg" className="flex-1 bg-blue-600 hover:bg-blue-700 focus-visible:ring-blue-400">
                <Camera className="h-4 w-4 mr-2" />
                Start Camera
              </Button>
            ) : (
              <Button onClick={capturePhoto} size="lg" className="flex-1 bg-red-500 hover:bg-red-600 focus-visible:ring-red-400 text-white font-medium">
                <div className="h-5 w-5 mr-2 rounded-full border-2 border-white" />
                Capture
              </Button>
            )}
            {scatteredPhotos.length > 0 && (
              <Button onClick={() => setShowGrid(!showGrid)} size="lg" variant="outline" className="bg-white/80 backdrop-blur-sm">
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
