import type { ComponentType } from "react";
import type { GameCanvasProps } from "@/lib/types";
import { AsteroidsCanvas } from "./asteroids-canvas";

export const GAME_CANVASES: Record<string, ComponentType<GameCanvasProps>> = {
  rocas: AsteroidsCanvas,
};
