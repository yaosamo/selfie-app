"use client";

import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Camera, Download, RotateCcw, Sparkles } from 'lucide-react';

export default function SelfieApp() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      
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
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setIsStreaming(false);
    }
  }, []);

  const capturePhoto = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      const context = canvas.getContext('2d');
      
      if (context) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0);
        
        const dataURL = canvas.toDataURL('image/jpeg', 0.9);
        setCapturedPhoto(dataURL);
      }
    }
  }, []);

  const downloadPhoto = useCallback(() => {
    if (capturedPhoto) {
      const link = document.createElement('a');
      link.href = capturedPhoto;
      link.download = `selfie-${new Date().toISOString().slice(0, 19)}.jpg`;
      link.click();
    }
  }, [capturedPhoto]);

  const flipCamera = useCallback(() => {
    stopCamera();
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
    setTimeout(startCamera, 100);
  }, [startCamera, stopCamera]);

  const retakePhoto = useCallback(() => {
    setCapturedPhoto(null);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg mx-auto shadow-xl border-0 bg-white/80 backdrop-blur-sm">
        <CardContent className="p-6 space-y-6">
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-2">
              <Sparkles className="h-6 w-6 text-blue-500" />
              <h1 className="text-2xl font-semibold text-slate-800">Quick Selfie</h1>
            </div>
            <p className="text-slate-500 text-sm">Look good, capture it, share it ✨</p>
          </div>

          <div className="relative overflow-hidden rounded-xl bg-slate-900">
            {!capturedPhoto ? (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-80 object-cover"
                  style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'scaleX(1)' }}
                />
                {!isStreaming && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center space-y-3">
                      <Camera className="h-12 w-12 text-slate-400 mx-auto" />
                      <p className="text-slate-300 text-sm">Camera not active</p>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <img
                src={capturedPhoto}
                alt="Captured selfie"
                className="w-full h-80 object-cover"
              />
            )}
            <canvas ref={canvasRef} className="hidden" />
          </div>

          <div className="flex gap-3 justify-center">
            {!capturedPhoto ? (
              <>
                {!isStreaming ? (
                  <Button
                    onClick={startCamera}
                    size="lg"
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    Start Camera
                  </Button>
                ) : (
                  <>
                    <Button
                      onClick={flipCamera}
                      variant="outline"
                      size="lg"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                    <Button
                      onClick={capturePhoto}
                      size="lg"
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      <Camera className="h-4 w-4 mr-2" />
                      Capture
                    </Button>
                  </>
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
                  className="flex-1 bg-purple-600 hover:bg-purple-700"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Save
                </Button>
              </>
            )}
          </div>

          {isStreaming && (
            <div className="text-center">
              <p className="text-xs text-slate-500">
                Tap capture when you're ready 📸
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}