// HeroPixelAnimation.tsx - GSAP-powered random pixel block background animation
import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';

const DEFAULT_COLORS = ['#DBC70F', '#DB6495', '#1ABBDB', '#3D7A86', '#5C593E', '#5C3947'];

interface PixelBlock {
  x: number;
  y: number;
  originX: number;
  originY: number;
  size: number;
  scale: number;
  color: string;
  wavePhase: number;
  waveFrequency: number;
  waveAmplitude: number;
}

interface PointerState {
  x: number;
  y: number;
  isOver: boolean;
  moved: boolean;
}

export interface HeroPixelAnimationProps {
  particleCount?: number;
  repulsionRadius?: number;
  repulsionForce?: number;
  returnSpeed?: number;
  idleWaveAmplitude?: number;
  colors?: string[];
  className?: string;
  trackPointerOnWindow?: boolean;
}

export const HeroPixelAnimation: React.FC<HeroPixelAnimationProps> = ({
  particleCount = 250,
  repulsionRadius = 75,
  repulsionForce = 0.6,
  returnSpeed = 0.05,
  idleWaveAmplitude = 4,
  colors = DEFAULT_COLORS,
  className = '',
  trackPointerOnWindow = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const blocksRef = useRef<PixelBlock[]>([]);
  const pointerRef = useRef<PointerState>({ x: -1000, y: -1000, isOver: false, moved: false });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let ctx: CanvasRenderingContext2D | null = null;
    try {
      ctx = canvas.getContext('2d');
    } catch {
      return;
    }

    if (!ctx) return;

    const initializeBlocks = () => {
      const blocks: PixelBlock[] = [];
      const width = canvas.width;
      const height = canvas.height;
      const safeCount = Math.max(24, particleCount);

      for (let i = 0; i < safeCount; i += 1) {
        blocks.push({
          x: 0,
          y: 0,
          originX: Math.random() * width,
          originY: Math.random() * height,
          size: Math.max(2, Math.round(Math.random() * 5 + 2)),
          scale: 1,
          color: colors[Math.floor(Math.random() * colors.length)],
          wavePhase: Math.random() * Math.PI * 2,
          waveFrequency: 0.65 + Math.random() * 0.75,
          waveAmplitude: (0.8 + Math.random() * 1.4) * idleWaveAmplitude,
        });
      }

      blocksRef.current = blocks;
    };

    const updateCanvasSize = () => {
      canvas.width = Math.max(1, canvas.offsetWidth);
      canvas.height = Math.max(1, canvas.offsetHeight);
      initializeBlocks();
    };

    const resetBlocks = () => {
      const baseDuration = Math.max(0.7, 1.4 - returnSpeed * 6);

      blocksRef.current.forEach((block) => {
        gsap.to(block, {
          x: 0,
          y: 0,
          scale: 1,
          duration: baseDuration,
          delay: (block.wavePhase % 1) * 0.2,
          ease: 'sine.out',
          overwrite: 'auto',
        });
      });
    };

    const updateBlockTargets = () => {
      const pointer = pointerRef.current;

      if (!pointer.isOver) {
        resetBlocks();
        return;
      }

      const maxDimension = Math.max(canvas.width, canvas.height, 1);
      const minRadius = Math.max(80, repulsionRadius);
      const maxOffset = minRadius * repulsionForce;

      blocksRef.current.forEach((block) => {
        // Vector from pointer to particle => outward repulsion direction
        const dx = block.originX - pointer.x;
        const dy = block.originY - pointer.y;
        const distance = Math.sqrt(dx * dx + dy * dy) || 1;

        // Affect all particles with exponential decay over distance.
        const influence = Math.exp(-distance / minRadius);
        const angle = Math.atan2(dy, dx);

        const targetX = Math.cos(angle) * maxOffset * influence;
        const targetY = Math.sin(angle) * maxOffset * influence;
        const targetScale = 1 + influence * 1.2;

        // Distance-based delay creates a wave-like propagation from cursor.
        const distanceNorm = Math.min(1, distance / maxDimension);
        const propagationDelay = distanceNorm * 0.24;
        const travelDuration = 0.55 + distanceNorm * 0.45;

        gsap.to(block, {
          x: targetX,
          y: targetY,
          scale: targetScale,
          duration: travelDuration,
          delay: propagationDelay,
          ease: 'sine.out',
          overwrite: 'auto',
        });
      });
    };

    const draw = () => {
      if (!ctx) return;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (pointerRef.current.moved) {
        updateBlockTargets();
        pointerRef.current.moved = false;
      }

      const time = gsap.ticker.time;

      blocksRef.current.forEach((block) => {
        // Idle 2D wave keeps particles subtly alive even when not interacting.
        const waveX = Math.sin(block.originY * 0.017 + time * block.waveFrequency + block.wavePhase) * block.waveAmplitude;
        const waveY = Math.cos(block.originX * 0.013 - time * block.waveFrequency + block.wavePhase * 1.1) * block.waveAmplitude * 0.8;

        ctx.save();
        ctx.setTransform(
          block.scale,
          0,
          0,
          block.scale,
          block.originX + block.x + waveX,
          block.originY + block.y + waveY
        );
        ctx.fillStyle = block.color;
        ctx.fillRect(
          -block.size / 2,
          -block.size / 2,
          block.size,
          block.size
        );
        ctx.restore();
      });
    };

    const updatePointerPosition = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      pointerRef.current.x = clientX - rect.left;
      pointerRef.current.y = clientY - rect.top;
      pointerRef.current.isOver = true;
      pointerRef.current.moved = true;
    };

    const handleMouseMove = (event: MouseEvent) => {
      updatePointerPosition(event.clientX, event.clientY);
    };

    const handleTouchMove = (event: TouchEvent) => {
      if (event.touches.length === 0) {
        return;
      }
      const touch = event.touches[0];
      updatePointerPosition(touch.clientX, touch.clientY);
    };

    const handlePointerEnter = () => {
      pointerRef.current.isOver = true;
    };

    const handlePointerLeave = () => {
      pointerRef.current.isOver = false;
      pointerRef.current.moved = false;
      resetBlocks();
    };

    const handleWindowMouseOut = (event: Event) => {
      if (event instanceof MouseEvent && !event.relatedTarget) {
        handlePointerLeave();
      }
    };

    const pointerTarget: Window | HTMLCanvasElement = trackPointerOnWindow ? window : canvas;

    pointerTarget.addEventListener('mousemove', handleMouseMove as EventListener);
    pointerTarget.addEventListener('touchmove', handleTouchMove as EventListener, { passive: true });

    if (trackPointerOnWindow) {
      window.addEventListener('mouseout', handleWindowMouseOut);
      window.addEventListener('blur', handlePointerLeave);
      window.addEventListener('touchend', handlePointerLeave);
      window.addEventListener('touchcancel', handlePointerLeave);
    } else {
      canvas.addEventListener('mouseenter', handlePointerEnter);
      canvas.addEventListener('mouseleave', handlePointerLeave);
      canvas.addEventListener('touchend', handlePointerLeave);
      canvas.addEventListener('touchcancel', handlePointerLeave);
    }

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    gsap.ticker.add(draw);

    return () => {
      gsap.ticker.remove(draw);
      gsap.killTweensOf(blocksRef.current);
      window.removeEventListener('resize', updateCanvasSize);

      pointerTarget.removeEventListener('mousemove', handleMouseMove as EventListener);
      pointerTarget.removeEventListener('touchmove', handleTouchMove as EventListener);

      if (trackPointerOnWindow) {
        window.removeEventListener('mouseout', handleWindowMouseOut);
        window.removeEventListener('blur', handlePointerLeave);
        window.removeEventListener('touchend', handlePointerLeave);
        window.removeEventListener('touchcancel', handlePointerLeave);
      } else {
        canvas.removeEventListener('mouseenter', handlePointerEnter);
        canvas.removeEventListener('mouseleave', handlePointerLeave);
        canvas.removeEventListener('touchend', handlePointerLeave);
        canvas.removeEventListener('touchcancel', handlePointerLeave);
      }
    };
  }, [colors, idleWaveAmplitude, particleCount, repulsionForce, repulsionRadius, returnSpeed, trackPointerOnWindow]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 h-full w-full ${trackPointerOnWindow ? 'pointer-events-none' : 'pointer-events-auto'} ${className}`}
      style={{ imageRendering: 'pixelated', touchAction: 'none' }}
      role="presentation"
      aria-hidden="true"
    />
  );
};
