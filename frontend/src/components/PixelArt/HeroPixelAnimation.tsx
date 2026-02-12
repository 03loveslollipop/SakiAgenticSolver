// HeroPixelAnimation.tsx - GSAP-powered random pixel block background animation
import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';

const DEFAULT_COLORS = ['#DBC70F', '#DB6495', '#1ABBDB', '#3D7A86', '#5C593E', '#5C3947'];

interface PixelBlock {
  x: number;
  y: number;
  originX: number;
  originY: number;
  responseLag: number;
  size: number;
  scale: number;
  velocityX: number;
  velocityY: number;
  color: string;
  wavePhase: number;
  waveFrequency: number;
  waveAmplitude: number;
}

interface PointerState {
  x: number;
  y: number;
  isOver: boolean;
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
  enablePointerInteraction?: boolean;
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
  enablePointerInteraction = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const blocksRef = useRef<PixelBlock[]>([]);
  const pointerRef = useRef<PointerState>({ x: -1000, y: -1000, isOver: false });

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
    pointerRef.current = { x: -1000, y: -1000, isOver: false };

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
          responseLag: 0.012 + Math.random() * 0.028,
          size: Math.max(2, Math.round(Math.random() * 5 + 2)),
          scale: 1,
          velocityX: 0,
          velocityY: 0,
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

    const draw = () => {
      if (!ctx) return;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const time = gsap.ticker.time;
      const pointer = pointerRef.current;
      const maxDimension = Math.max(canvas.width, canvas.height, 1);
      const radius = Math.max(80, repulsionRadius);
      const maxOffset = radius * repulsionForce;
      const baseReturn = Math.max(0.006, Math.min(0.09, returnSpeed * 0.65));
      let currentColor = '';

      blocksRef.current.forEach((block) => {
        let targetX = 0;
        let targetY = 0;
        let targetScale = 1;

        if (pointer.isOver && enablePointerInteraction) {
          // Repel outward from pointer while letting influence decay with distance.
          const dx = block.originX - pointer.x;
          const dy = block.originY - pointer.y;
          const distance = Math.sqrt(dx * dx + dy * dy) || 1;
          const influence = Math.exp(-distance / radius);
          const distanceNorm = Math.min(1, distance / maxDimension);
          const directionX = dx / distance;
          const directionY = dy / distance;
          const propagation = Math.max(0.22, 1 - distanceNorm);

          targetX = directionX * maxOffset * influence;
          targetY = directionY * maxOffset * influence;
          targetScale = 1 + influence * 1.15;

          // Near particles react faster; far particles react more slowly (flow effect).
          const response = block.responseLag * propagation;
          block.velocityX += (targetX - block.x) * response;
          block.velocityY += (targetY - block.y) * response;
        } else {
          // Smoothly settle back to origin when pointer is away.
          block.velocityX += (targetX - block.x) * baseReturn;
          block.velocityY += (targetY - block.y) * baseReturn;
        }

        const damping = pointer.isOver && enablePointerInteraction ? 0.9 : 0.85;
        block.velocityX *= damping;
        block.velocityY *= damping;
        block.x += block.velocityX;
        block.y += block.velocityY;
        block.scale += (targetScale - block.scale) * 0.14;

        // Idle 2D wave keeps particles subtly alive even when not interacting.
        const waveX = Math.sin(block.originY * 0.017 + time * block.waveFrequency + block.wavePhase) * block.waveAmplitude;
        const waveY = Math.cos(block.originX * 0.013 - time * block.waveFrequency + block.wavePhase * 1.1) * block.waveAmplitude * 0.8;
        const drawSize = block.size * block.scale;
        const drawX = block.originX + block.x + waveX - drawSize / 2;
        const drawY = block.originY + block.y + waveY - drawSize / 2;

        if (block.color !== currentColor) {
          currentColor = block.color;
          ctx.fillStyle = currentColor;
        }
        ctx.fillRect(drawX, drawY, drawSize, drawSize);
      });
    };

    const updatePointerPosition = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      pointerRef.current.x = clientX - rect.left;
      pointerRef.current.y = clientY - rect.top;
      pointerRef.current.isOver = true;
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
    };

    const handleWindowMouseOut = (event: Event) => {
      if (event instanceof MouseEvent && !event.relatedTarget) {
        handlePointerLeave();
      }
    };

    const pointerTarget: Window | HTMLCanvasElement = trackPointerOnWindow ? window : canvas;
    if (enablePointerInteraction) {
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
    }

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    gsap.ticker.add(draw);

    return () => {
      gsap.ticker.remove(draw);
      window.removeEventListener('resize', updateCanvasSize);

      if (enablePointerInteraction) {
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
      }
    };
  }, [colors, enablePointerInteraction, idleWaveAmplitude, particleCount, repulsionForce, repulsionRadius, returnSpeed, trackPointerOnWindow]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 h-full w-full ${(trackPointerOnWindow || !enablePointerInteraction) ? 'pointer-events-none' : 'pointer-events-auto'} ${className}`}
      style={{ imageRendering: 'pixelated', touchAction: 'none' }}
      role="presentation"
      aria-hidden="true"
    />
  );
};
