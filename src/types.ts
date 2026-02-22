import { Type } from "@google/genai";

export enum GameMode {
  CLASSIC = "CLASSIC",
  TIME = "TIME",
}

export enum GameStatus {
  IDLE = "IDLE",
  PLAYING = "PLAYING",
  GAMEOVER = "GAMEOVER",
}

export interface Block {
  id: string;
  value: number;
  isSelected: boolean;
}

export interface GameState {
  grid: (Block | null)[][]; // [row][col]
  target: number;
  score: number;
  level: number;
  mode: GameMode;
  status: GameStatus;
  timeLeft: number;
  maxTime: number;
}
