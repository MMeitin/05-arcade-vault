"use client";

import { useEffect, useRef } from "react";
import type { GameCanvasProps } from "@/lib/types";
import {
  createAsteroids,
  type AsteroidsHandle,
} from "@/lib/games/asteroids/engine";

export function AsteroidsCanvas({
  paused,
  onScore,
  onLives,
  onLevel,
  onGameOver,
  onAutoPause,
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handleRef = useRef<AsteroidsHandle | null>(null);
  // Callbacks por ref: el motor siempre invoca la versión más reciente
  const cbRef = useRef({ onScore, onLives, onLevel, onGameOver, onAutoPause });

  useEffect(() => {
    cbRef.current = { onScore, onLives, onLevel, onGameOver, onAutoPause };
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const handle = createAsteroids(canvas, {
      onScore: (v) => cbRef.current.onScore(v),
      onLives: (v) => cbRef.current.onLives(v),
      onLevel: (v) => cbRef.current.onLevel(v),
      onGameOver: (v) => cbRef.current.onGameOver(v),
      onAutoPause: () => cbRef.current.onAutoPause(),
    });
    handleRef.current = handle;
    return () => {
      handle.destroy();
      handleRef.current = null;
    };
  }, []);

  useEffect(() => {
    handleRef.current?.setPaused(paused);
  }, [paused]);

  return (
    <canvas
      ref={canvasRef}
      aria-label="Juego ROCAS"
      style={{ display: "block", width: "100%", height: "100%" }}
    />
  );
}
