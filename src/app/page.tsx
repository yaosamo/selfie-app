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
  animating: boolean;
}

export default function SelfieApp() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cameraCardRef = useRef<HTMLDivElement>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [flashVisible, setFlashVisible] = useState(false);
  const [scatteredPhotos, setScatteredPhotos] = useState<ScatteredPhoto[]>([]);
  const [dragging, setDragging] = useState<{id: number, startX: number, startY: number, origDragX: number, origDragY: number} | null>(null);
  const [showGrid, setShowGrid] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);
  const photoIdRef = useRef(0);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

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

    // Get camera card bounds to avoid placing photos under it
    const cardRect = cameraCardRef.current?.getBoundingClientRect();
    const cardCenterX = cardRect ? cardRect.left + cardRect.width / 2 : vw / 2;
    const cardCenterY = cardRect ? cardRect.top + cardRect.height / 2 : vh / 2;
    const cardHalfW = cardRect ? cardRect.width / 2 + 40 : 200;
    const cardHalfH = cardRect ? cardRect.height / 2 + 40 : 250;

    // Generate positions outside the camera card zone
    const photoW = Math.min(vw * 0.35, 180);
    const photoH = photoW * 0.75;
    let x: number, y: number;
    let attempts = 0;

    do {
      // Bias towards edges — pick a side (top, bottom, left, right)
      const side = Math.floor(Math.random() * 4);
      switch (side) {
        case 0: // left
          x = Math.random() * (vw * 0.3) - vw / 2 + photoW / 2 + 10;
          y = (Math.random() - 0.5) * (vh - photoH - 20);
          break;
        case 1: // right
          x = vw / 2 - Math.random() * (vw * 0.3) - photoW / 2 - 10;
          y = (Math.random() - 0.5) * (vh - photoH - 20);
          break;
        case 2: // top
          x = (Math.random() - 0.5) * (vw - photoW - 20);
          y = -vh / 2 + Math.random() * (vh * 0.25) + photoH / 2 + 10;
          break;
        default: // bottom
          x = (Math.random() - 0.5) * (vw - photoW - 20);
          y = vh / 2 - Math.random() * (vh * 0.25) - photoH / 2 - 10;
          break;
      }
      attempts++;
      // Check if overlapping camera card (in viewport coords: card center is at cardCenterX, cardCenterY; photo center at vw/2+x, vh/2+y)
      const photoCenterX = vw / 2 + x;
      const photoCenterY = vh / 2 + y;
      const overlapX = Math.abs(photoCenterX - cardCenterX) < cardHalfW;
      const overlapY = Math.abs(photoCenterY - cardCenterY) < cardHalfH;
      if (!overlapX || !overlapY || attempts > 20) break;
    } while (true);

    return { x, y };
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

        // Start at camera center (0,0 offset) and animate to final position
        setScatteredPhotos(prev => [...prev, {
          id: newId,
          src: dataURL,
          x: 0, y: 0, // start at center (camera position)
          rotation: 0,
          dragX: 0, dragY: 0,
          animating: true,
        }]);

        // After a tick, set the final position so CSS transition kicks in
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setScatteredPhotos(prev => prev.map(p =>
              p.id === newId ? { ...p, x, y, rotation, animating: false } : p
            ));
          });
        });

        // Flash
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

  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4 overflow-hidden relative">
      {/* Full-screen flash */}
      {flashVisible && (
        <div className="fixed inset-0 bg-white pointer-events-none z-50" style={{ animation: 'flash 0.25s ease-out forwards' }} />
      )}

      {/* Scattered photos */}
      {scatteredPhotos.map((photo, idx) => (
        <div
          key={photo.id}
          className="absolute select-none"
          style={{
            left: '50%',
            top: '50%',
            width: 'min(35vw, 11rem)',
            aspectRatio: '4/3',
            borderRadius: '8px',
            overflow: 'visible',
            zIndex: idx + 1,
            transform: `translate(calc(-50% + ${photo.x + photo.dragX}px), calc(-50% + ${photo.y + photo.dragY}px)) rotate(${photo.rotation}deg) scale(${photo.animating ? 0.3 : 1})`,
            opacity: photo.animating ? 0 : 1,
            transition: dragging?.id === photo.id ? 'none' : 'transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease-out',
            cursor: dragging?.id === photo.id ? 'grabbing' : 'grab',
          }}
          onMouseDown={(e) => { e.preventDefault(); startDrag(photo.id, e.clientX, e.clientY); }}
          onTouchStart={(e) => { startDrag(photo.id, e.touches[0].clientX, e.touches[0].clientY); }}
        >
          <div style={{
            width: '100%',
            height: '100%',
            borderRadius: '8px',
            overflow: 'hidden',
            boxShadow: '0 8px 30px rgba(0,0,0,0.2)',
            border: '3px solid white',
          }}>
            <img src={photo.src} alt="" className="w-full h-full object-cover" draggable={false} />
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); downloadScatteredPhoto(photo.src, photo.id); }}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            className="absolute -bottom-3 -right-3 bg-white rounded-full p-2 shadow-lg hover:bg-slate-50 active:scale-95 transition-transform"
            style={{ zIndex: 999 }}
          >
            <Download className="h-4 w-4 text-slate-600" />
          </button>
        </div>
      ))}

      {/* Camera card */}
      <Card ref={cameraCardRef} className="w-full max-w-lg mx-auto shadow-xl border-0 bg-white/80 backdrop-blur-sm relative z-[100]">
        <CardContent className="p-5 sm:p-6 space-y-5">
          <div className="text-center space-y-1">
            <div className="flex items-center justify-center gap-2">
              <Sparkles className="h-5 w-5 text-blue-500" />
              <h1 className="text-xl sm:text-2xl font-semibold text-slate-800">Quick Selfie</h1>
            </div>
            <p className="text-slate-500 text-sm">Look good, capture it, share it ✨</p>
          </div>

          {/* Viewfinder */}
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

          {/* Action buttons */}
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
                onClick={() => setShowGrid(true)}
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

      {/* Grid overlay */}
      {showGrid && (
        <div
          className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md overflow-y-auto"
          onClick={() => setShowGrid(false)}
        >
          <div className="min-h-full p-4 pt-16 pb-8">
            {/* Close button */}
            <button
              onClick={() => setShowGrid(false)}
              className="fixed top-4 right-4 z-[210] bg-white/20 hover:bg-white/30 rounded-full p-3 text-white transition-colors"
            >
              <X className="h-6 w-6" />
            </button>

            <h2 className="text-white text-center text-lg font-medium mb-6">
              All Photos ({scatteredPhotos.length})
            </h2>

            <div
              className="grid gap-3 max-w-4xl mx-auto"
              style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(45vw, 200px), 1fr))' }}
              onClick={(e) => e.stopPropagation()}
            >
              {scatteredPhotos.map((photo) => (
                <div key={photo.id} className="relative group aspect-[4/3] rounded-xl overflow-hidden bg-slate-800">
                  <img src={photo.src} alt="" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                  <button
                    onClick={() => downloadScatteredPhoto(photo.src, photo.id)}
                    className="absolute bottom-2 right-2 bg-white/90 hover:bg-white rounded-full p-2 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity active:scale-95"
                  >
                    <Download className="h-4 w-4 text-slate-700" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
