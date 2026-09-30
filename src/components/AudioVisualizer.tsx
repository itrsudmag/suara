import React, { useEffect, useRef } from 'react';

interface AudioVisualizerProps {
  isPlaying: boolean;
  audioElement?: HTMLAudioElement | null;
  audioBuffer?: AudioBuffer | null;
  accentColor?: string;
  height?: number;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  isPlaying,
  accentColor = '#f97316', // Railway orange
  height = 72,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let phase = 0;
    const barCount = 42;

    const render = () => {
      const width = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, width, h);

      const barWidth = width / barCount - 2;

      for (let i = 0; i < barCount; i++) {
        let barHeight = 4; // idle baseline
        if (isPlaying) {
          // Dynamic harmonic movement
          const wave1 = Math.sin(phase * 0.08 + i * 0.25);
          const wave2 = Math.cos(phase * 0.12 + i * 0.18);
          const factor = Math.abs(wave1 * 0.6 + wave2 * 0.4);
          barHeight = Math.max(6, factor * (h * 0.78) * (0.3 + 0.7 * Math.sin((i / barCount) * Math.PI)));
        }

        const x = i * (barWidth + 2);
        const y = (h - barHeight) / 2;

        // Gradient
        const grad = ctx.createLinearGradient(0, y, 0, y + barHeight);
        grad.addColorStop(0, '#f97316'); // KAI orange
        grad.addColorStop(0.5, '#38bdf8'); // Cyan rail
        grad.addColorStop(1, '#0284c7'); // Deep blue

        ctx.fillStyle = isPlaying ? grad : '#334155';
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, 2);
        ctx.fill();
      }

      if (isPlaying) {
        phase++;
      }
      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isPlaying]);

  return (
    <div className="w-full bg-slate-900/80 rounded-xl p-2 border border-slate-800 shadow-inner">
      <canvas
        ref={canvasRef}
        width={640}
        height={height}
        className="w-full h-16 rounded block"
      />
    </div>
  );
};
