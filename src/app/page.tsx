"use client";

import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Camera, Download, RotateCcw, Sparkles, Share2, X } from 'lucide-react';

export default function SelfieApp() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [flashVisible, setFlashVisible] = useState(false);
  const [canShare, setCanShare] = useState(false);
  const [scatteredPhotos, setScatteredPhotos] = useState<Array<{id: number, src: string, x: number, y: number, rotation: number, direction: {x: number, y: number}}>>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const photoIdRef = useRef(0);

  // Check Web Share API support
  useEffect(() => {
    setCanShare(typeof navigator !== 'undefined' && !!navigator.share);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const startCamera = useCallback(async (mode?: 'user' | 'environment') => {
    const useMode = mode ?? facingMode;
    try {
      // Stop any existing stream first
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: useMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
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
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
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

        // Mirror the capture for front camera to match what user sees
        if (facingMode === 'user') {
          context.translate(canvas.width, 0);
          context.scale(-1, 1);
        }

        context.drawImage(video, 0, 0);
        context.setTransform(1, 0, 0, 1, 0, 0); // reset

        const dataURL = canvas.toDataURL('image/jpeg', 0.92);
        setCapturedPhoto(dataURL);

        // Scatter photo into background
        const angle = Math.random() * Math.PI * 2;
        const distance = 150 + Math.random() * 200;
        const newPhoto = {
          id: photoIdRef.current++,
          src: dataURL,
          x: Math.cos(angle) * distance,
          y: Math.sin(angle) * distance,
          rotation: (Math.random() - 0.5) * 40,
          direction: { x: Math.cos(angle), y: Math.sin(angle) },
        };
        setScatteredPhotos(prev => [...prev, newPhoto]);

        // Flash animation
        setFlashVisible(true);
        setTimeout(() => setFlashVisible(false), 150);

        // Stop camera after capture to save battery
        stopCamera();
      }
    }
  }, [facingMode, stopCamera]);

  const downloadPhoto = useCallback(() => {
    if (capturedPhoto) {
      const link = document.createElement('a');
      link.href = capturedPhoto;
      link.download = `selfie-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.jpg`;
      link.click();
    }
  }, [capturedPhoto]);

  const sharePhoto = useCallback(async () => {
    if (!capturedPhoto) return;
    try {
      const res = await fetch(capturedPhoto);
      const blob = await res.blob();
      const file = new File([blob], 'selfie.jpg', { type: 'image/jpeg' });
      await navigator.share({ files: [file], title: 'My Selfie' });
    } catch (err) {
      // User cancelled or share failed — ignore
      console.log('Share cancelled or failed:', err);
    }
  }, [capturedPhoto]);

  const flipCamera = useCallback(() => {
    const newMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newMode);
    startCamera(newMode);
  }, [facingMode, startCamera]);

  const retakePhoto = useCallback(() => {
    setCapturedPhoto(null);
    startCamera();
  }, [startCamera]);

  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4 overflow-hidden relative">
      {/* Scattered photos in background */}
      {scatteredPhotos.map((photo) => (
        <div
          key={photo.id}
          className="absolute pointer-events-none scattered-photo"
          style={{
            left: '50%',
            top: '50%',
            width: '120px',
            height: '90px',
            borderRadius: '8px',
            overflow: 'hidden',
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            border: '3px solid white',
            zIndex: 0,
            opacity: 0,
            transform: `translate(-50%, -50%)`,
            '--scatter-x': `${photo.x}px`,
            '--scatter-y': `${photo.y}px`,
            '--scatter-rot': `${photo.rotation}deg`,
            animation: 'scatter 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards',
          } as React.CSSProperties}
        >
          <img src={photo.src} alt="" className="w-full h-full object-cover" />
        </div>
      ))}
      <Card className="w-full max-w-lg mx-auto shadow-xl border-0 bg-white/80 backdrop-blur-sm relative z-10">
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
            {!capturedPhoto ? (
              <>
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
                {/* Capture flash overlay */}
                {flashVisible && (
                  <div className="absolute inset-0 bg-white animate-pulse pointer-events-none" />
                )}
              </>
            ) : (
              <img
                src={capturedPhoto}
                alt="Captured selfie"
                className="absolute inset-0 w-full h-full object-cover"
              />
            )}
            <canvas ref={canvasRef} className="hidden" aria-hidden="true" />

            {/* Floating flip & stop buttons when streaming */}
            {isStreaming && !capturedPhoto && (
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
            {!capturedPhoto ? (
              <>
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
              </>
            ) : (
              <>
                <Button
                  onClick={retakePhoto}
                  variant="outline"
                  size="lg"
                  className="flex-1"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Retake
                </Button>
                <Button
                  onClick={downloadPhoto}
                  size="lg"
                  className="flex-1 bg-purple-600 hover:bg-purple-700 focus-visible:ring-purple-400"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Save
                </Button>
                {canShare && (
                  <Button
                    onClick={sharePhoto}
                    size="lg"
                    variant="outline"
                    className="border-purple-200 text-purple-700 hover:bg-purple-50"
                    aria-label="Share photo"
                  >
                    <Share2 className="h-4 w-4" />
                  </Button>
                )}
              </>
            )}
          </div>

          {isStreaming && !capturedPhoto && (
            <p className="text-center text-xs text-slate-400">
              Tap capture when you&apos;re ready 📸
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
