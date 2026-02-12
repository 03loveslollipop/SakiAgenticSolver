// HeroPixelAnimation.tsx - Canvas-based particle system with mouse interaction
import React, { useEffect, useRef, useState } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  originalX: number;
  originalY: number;
}

export interface HeroPixelAnimationProps {
  particleCount?: number;
  repulsionRadius?: number;
  repulsionForce?: number;
  returnSpeed?: number;
  colors?: string[];
  className?: string;
  trackPointerOnWindow?: boolean;
}

export const HeroPixelAnimation: React.FC<HeroPixelAnimationProps> = ({
  particleCount = 150,
  repulsionRadius = 100,
  repulsionForce = 0.5,
  returnSpeed = 0.05,
  colors = ['#DBC70F', '#DB6495', '#1ABBDB', '#3D7A86', '#5C593E', '#5C3947'],
  className = '',
  trackPointerOnWindow = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const mouseRef = useRef({ x: -1000, y: -1000 });
  const animationFrameRef = useRef<number>();
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize particles
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const initParticles = () => {
      const particles: Particle[] = [];
      const width = canvas.width;
      const height = canvas.height;

      for (let i = 0; i < particleCount; i++) {
        const x = Math.random() * width;
        const y = Math.random() * height;
        particles.push({
          x,
          y,
          vx: 0,
          vy: 0,
          size: Math.random() * 3 + 2, // 2-5px pixel size
          color: colors[Math.floor(Math.random() * colors.length)],
          originalX: x,
          originalY: y,
        });
      }

      particlesRef.current = particles;
      setIsInitialized(true);
    };

    const handleResize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      initParticles();
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [particleCount, colors]);

  // Mouse tracking
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const updatePointerPosition = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = {
        x: clientX - rect.left,
        y: clientY - rect.top,
      };
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

    const resetPointer = () => {
      mouseRef.current = { x: -1000, y: -1000 };
    };

    const handleWindowMouseOut = (event: Event) => {
      if (event instanceof MouseEvent && !event.relatedTarget) {
        resetPointer();
      }
    };

    const pointerTarget: Window | HTMLCanvasElement = trackPointerOnWindow ? window : canvas;
    pointerTarget.addEventListener('mousemove', handleMouseMove as EventListener);
    pointerTarget.addEventListener('touchmove', handleTouchMove as EventListener, { passive: true });

    if (trackPointerOnWindow) {
      window.addEventListener('mouseout', handleWindowMouseOut);
      window.addEventListener('blur', resetPointer);
      window.addEventListener('touchend', resetPointer);
      window.addEventListener('touchcancel', resetPointer);
    } else {
      canvas.addEventListener('mouseleave', resetPointer);
      canvas.addEventListener('touchend', resetPointer);
      canvas.addEventListener('touchcancel', resetPointer);
    }

    return () => {
      pointerTarget.removeEventListener('mousemove', handleMouseMove as EventListener);
      pointerTarget.removeEventListener('touchmove', handleTouchMove as EventListener);

      if (trackPointerOnWindow) {
        window.removeEventListener('mouseout', handleWindowMouseOut);
        window.removeEventListener('blur', resetPointer);
        window.removeEventListener('touchend', resetPointer);
        window.removeEventListener('touchcancel', resetPointer);
      } else {
        canvas.removeEventListener('mouseleave', resetPointer);
        canvas.removeEventListener('touchend', resetPointer);
        canvas.removeEventListener('touchcancel', resetPointer);
      }
    };
  }, [trackPointerOnWindow]);

  // Animation loop
  useEffect(() => {
    if (!isInitialized) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    let ctx: CanvasRenderingContext2D | null = null;
    try {
      ctx = canvas.getContext('2d');
    } catch {
      return;
    }

    if (!canvas || !ctx) return;

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const particles = particlesRef.current;
      const mouse = mouseRef.current;

      particles.forEach((particle) => {
        // Calculate distance from mouse
        const dx = particle.x - mouse.x;
        const dy = particle.y - mouse.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Apply repulsion force if within radius
        if (distance < repulsionRadius) {
          const force = (1 - distance / repulsionRadius) * repulsionForce;
          const angle = Math.atan2(dy, dx);
          particle.vx += Math.cos(angle) * force;
          particle.vy += Math.sin(angle) * force;
        }

        // Return to original position
        const returnDx = particle.originalX - particle.x;
        const returnDy = particle.originalY - particle.y;
        particle.vx += returnDx * returnSpeed;
        particle.vy += returnDy * returnSpeed;

        // Apply velocity with damping
        particle.vx *= 0.95;
        particle.vy *= 0.95;
        particle.x += particle.vx;
        particle.y += particle.vy;

        // Draw pixel (square for 8-bit aesthetic)
        ctx.fillStyle = particle.color;
        ctx.fillRect(
          Math.floor(particle.x),
          Math.floor(particle.y),
          particle.size,
          particle.size
        );
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isInitialized, repulsionRadius, repulsionForce, returnSpeed]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 h-full w-full ${trackPointerOnWindow ? 'pointer-events-none' : 'pointer-events-auto'} ${className}`}
      style={{ imageRendering: 'pixelated' }}
      role="presentation"
      aria-hidden="true"
    />
  );
};
