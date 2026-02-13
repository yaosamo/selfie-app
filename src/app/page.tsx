"use client";

import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Camera, Download, RotateCcw, Sparkles, Share2, X } from 'lucide-react';

interface ScatteredPhoto {
  id: number;
  src: string;
  x: number;
  y: number;
  rotation: number;
  dragX: number;
  dragY: number;
}

export default function SelfieApp() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [flashVisible, setFlashVisible] = useState(false);
  const [canShare, setCanShare] = useState(false);
  const [scatteredPhotos, setScatteredPhotos] = useState<ScatteredPhoto[]>([]);
  const [dragging, setDragging] = useState<{id: number, startX: number, startY: number, origDragX: number, origDragY: number} | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const photoIdRef = useRef(0);

  useEffect(() => {
    setCanShare(typeof navigator !== 'undefined' && !!navigator.share);
  }, []);

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

        // Place photo within visible bounds
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const margin = 80;
        const x = (Math.random() - 0.5) * (vw - margin * 2);
        const y = (Math.random() - 0.5) * (vh - margin * 2);
        const rotation = (Math.random() - 0.5) * 30;

        setScatteredPhotos(prev => [...prev, {
          id: photoIdRef.current++,
          src: dataURL,
          x, y, rotation,
          dragX: 0, dragY: 0,
        }]);

        // Flash
        setFlashVisible(true);
        setTimeout(() => setFlashVisible(false), 200);
        // Camera stays active — no stopCamera()
      }
    }
  }, [facingMode]);

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
    // Bring to front by moving to end
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
            width: 'min(70vw, 22rem)',
            aspectRatio: '4/3',
            borderRadius: '8px',
            overflow: 'visible',
            zIndex: idx + 1,
            transform: `translate(calc(-50% + ${photo.x + photo.dragX}px), calc(-50% + ${photo.y + photo.dragY}px)) rotate(${photo.rotation}deg)`,
            cursor: dragging?.id === photo.id ? 'grabbing' : 'grab',
            transition: dragging?.id === photo.id ? 'none' : 'box-shadow 0.2s',
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
          {/* Download button */}
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

      <Card className="w-full max-w-lg mx-auto shadow-xl border-0 bg-white/80 backdrop-blur-sm relative z-[100]">
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

          {/* Action buttons — capture always visible when streaming */}
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
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
