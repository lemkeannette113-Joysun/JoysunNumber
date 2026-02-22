/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, 
  Timer, 
  RotateCcw, 
  Play, 
  Pause, 
  Settings, 
  ChevronLeft,
  Zap,
  AlertCircle
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { GameMode, GameStatus, Block, GameState } from './types';
import { GRID_COLS, GRID_ROWS, INITIAL_ROWS, TARGET_MIN, TARGET_MAX, TIME_PER_ROUND } from './constants';

const generateId = () => Math.random().toString(36).substr(2, 9);

const createBlock = (value?: number): Block => ({
  id: generateId(),
  value: value ?? Math.floor(Math.random() * 9) + 1,
  isSelected: false,
});

export default function App() {
  const [gameState, setGameState] = useState<GameState>({
    grid: Array(GRID_ROWS).fill(null).map(() => Array(GRID_COLS).fill(null)),
    target: 0,
    score: 0,
    level: 1,
    mode: GameMode.CLASSIC,
    status: GameStatus.IDLE,
    timeLeft: TIME_PER_ROUND,
    maxTime: TIME_PER_ROUND,
  });

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize Game
  const initGame = useCallback((mode: GameMode) => {
    const newGrid = Array(GRID_ROWS).fill(null).map(() => Array(GRID_COLS).fill(null));
    
    // Fill initial rows from bottom
    for (let r = GRID_ROWS - 1; r >= GRID_ROWS - INITIAL_ROWS; r--) {
      for (let c = 0; c < GRID_COLS; c++) {
        newGrid[r][c] = createBlock();
      }
    }

    setGameState({
      grid: newGrid,
      target: Math.floor(Math.random() * (TARGET_MAX - TARGET_MIN + 1)) + TARGET_MIN,
      score: 0,
      level: 1,
      mode,
      status: GameStatus.PLAYING,
      timeLeft: TIME_PER_ROUND,
      maxTime: TIME_PER_ROUND,
    });
  }, []);

  // Add a new row to the bottom
  const addNewRow = useCallback(() => {
    setGameState(prev => {
      const newGrid = [...prev.grid.map(row => [...row])];
      
      // Check if top row has any blocks (Game Over)
      if (newGrid[0].some(cell => cell !== null)) {
        return { ...prev, status: GameStatus.GAMEOVER };
      }

      // Shift everything up
      for (let r = 0; r < GRID_ROWS - 1; r++) {
        newGrid[r] = newGrid[r + 1];
      }

      // Add new row at bottom
      newGrid[GRID_ROWS - 1] = Array(GRID_COLS).fill(null).map(() => createBlock());

      return { ...prev, grid: newGrid };
    });
  }, []);

  // Timer logic for Time Mode
  useEffect(() => {
    if (gameState.status === GameStatus.PLAYING && gameState.mode === GameMode.TIME) {
      timerRef.current = setInterval(() => {
        setGameState(prev => {
          if (prev.timeLeft <= 0) {
            addNewRow();
            return { ...prev, timeLeft: prev.maxTime };
          }
          return { ...prev, timeLeft: prev.timeLeft - 1 };
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameState.status, gameState.mode, addNewRow]);

  // Handle Block Click
  const handleBlockClick = useCallback((row: number, col: number) => {
    if (gameState.status !== GameStatus.PLAYING) return;

    setGameState(prev => {
      const block = prev.grid[row][col];
      if (!block) return prev;

      // Create a deep-ish copy of the grid with the toggled block
      const newGrid = prev.grid.map((r, ri) => 
        r.map((b, ci) => {
          if (ri === row && ci === col && b) {
            return { ...b, isSelected: !b.isSelected };
          }
          return b;
        })
      );

      // Calculate current sum from the new grid
      const selectedBlocks: {r: number, c: number, val: number}[] = [];
      newGrid.forEach((r, ri) => r.forEach((b, ci) => {
        if (b?.isSelected) selectedBlocks.push({r: ri, c: ci, val: b.value});
      }));

      const currentSum = selectedBlocks.reduce((acc, b) => acc + b.val, 0);

      if (currentSum === prev.target) {
        // SUCCESS! Clear blocks
        selectedBlocks.forEach(b => {
          newGrid[b.r][b.c] = null;
        });

        // Apply gravity (blocks fall down)
        for (let c = 0; c < GRID_COLS; c++) {
          let emptyRow = GRID_ROWS - 1;
          for (let r = GRID_ROWS - 1; r >= 0; r--) {
            if (newGrid[r][c] !== null) {
              const temp = newGrid[r][c];
              newGrid[r][c] = null;
              newGrid[emptyRow][c] = temp;
              emptyRow--;
            }
          }
        }

        const newScore = prev.score + (selectedBlocks.length * 10);
        const newTarget = Math.floor(Math.random() * (TARGET_MAX - TARGET_MIN + 1)) + TARGET_MIN;
        
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#10b981', '#34d399', '#6ee7b7']
        });

        // Side effect: Add row for classic mode
        // We use a small delay to allow the clear animation to be seen
        if (prev.mode === GameMode.CLASSIC) {
          setTimeout(() => {
            addNewRow();
          }, 200);
        }

        return {
          ...prev,
          grid: newGrid,
          target: newTarget,
          score: newScore,
          timeLeft: prev.maxTime,
        };
      } else if (currentSum > prev.target) {
        // OVERFLOW! Deselect all in the new grid
        const resetGrid = newGrid.map(r => r.map(b => b ? { ...b, isSelected: false } : null));
        return { ...prev, grid: resetGrid };
      }

      return { ...prev, grid: newGrid };
    });
  }, [gameState.status, gameState.target, addNewRow]);

  const currentSum = gameState.grid.flat().reduce((acc, b) => acc + (b?.isSelected ? b.value : 0), 0);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 md:p-8 bg-zinc-950">
      {/* Background Decorative Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-20">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/20 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/20 blur-[120px] rounded-full" />
      </div>

      <AnimatePresence mode="wait">
        {gameState.status === GameStatus.IDLE && (
          <motion.div 
            key="menu"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="glass-panel p-8 w-full max-w-md text-center space-y-8 z-10"
          >
            <div className="space-y-2">
              <h1 className="text-5xl font-display font-extrabold tracking-tighter text-white">
                数字<span className="text-emerald-400">叠叠乐</span>
              </h1>
              <p className="text-zinc-400 font-medium">掌握数学，消除方块</p>
            </div>

            <div className="grid gap-4">
              <button 
                onClick={() => initGame(GameMode.CLASSIC)}
                className="group relative flex items-center justify-between p-6 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl transition-all duration-300 overflow-hidden"
              >
                <div className="text-left z-10">
                  <span className="block text-lg font-bold">经典模式</span>
                  <span className="text-sm opacity-80">每次成功后新增一行</span>
                </div>
                <Zap className="w-8 h-8 opacity-50 group-hover:scale-110 transition-transform" />
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
              </button>

              <button 
                onClick={() => initGame(GameMode.TIME)}
                className="group relative flex items-center justify-between p-6 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl transition-all duration-300"
              >
                <div className="text-left">
                  <span className="block text-lg font-bold">计时模式</span>
                  <span className="text-sm text-zinc-400">在倒计时结束前完成</span>
                </div>
                <Timer className="w-8 h-8 text-zinc-500 group-hover:text-emerald-400 transition-colors" />
              </button>
            </div>

            <div className="pt-4 border-t border-white/5">
              <p className="text-xs text-zinc-500 uppercase tracking-widest font-bold">游戏玩法</p>
              <p className="text-sm text-zinc-400 mt-2">
                选择数字使它们的总和等于目标值。不要让方块堆积到顶部！
              </p>
            </div>
          </motion.div>
        )}

        {gameState.status !== GameStatus.IDLE && (
          <motion.div 
            key="game"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8 z-10"
          >
            {/* Main Game Area */}
            <div className="flex flex-col gap-4">
              {/* Header Info */}
              <div className="flex items-center justify-between glass-panel px-6 py-4">
                <button 
                  onClick={() => setGameState(prev => ({ ...prev, status: GameStatus.IDLE }))}
                  className="p-2 hover:bg-white/5 rounded-lg transition-colors"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                
                <div className="text-center">
                  <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">目标数字</span>
                  <div className="text-4xl font-display font-black text-emerald-400 animate-pulse-target">
                    {gameState.target}
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="text-right">
                    <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">得分</span>
                    <div className="text-2xl font-mono font-bold">{gameState.score.toLocaleString()}</div>
                  </div>
                </div>
              </div>

              {/* Grid */}
              <div className="relative glass-panel p-2 aspect-[6/10] w-full max-w-[400px] mx-auto overflow-hidden">
                <div className="grid grid-cols-6 grid-rows-10 gap-1 h-full relative z-10">
                  {gameState.grid.map((row, ri) => (
                    row.map((block, ci) => (
                      <div key={`${ri}-${ci}`} className="relative w-full h-full">
                        <AnimatePresence>
                          {block && (
                            <motion.div
                              key={block.id}
                              initial={{ scale: 0.5, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              exit={{ scale: 0, opacity: 0 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => handleBlockClick(ri, ci)}
                              className={`
                                absolute inset-0 number-block z-20
                                ${block.isSelected ? 'number-block-selected' : 'bg-zinc-800/50 hover:bg-zinc-700/50 text-zinc-300'}
                                ${ri === 0 ? 'border-t-2 border-red-500/50' : ''}
                              `}
                            >
                              {block.value}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    ))
                  ))}
                </div>

                {/* Danger Overlay */}
                {gameState.grid[0].some(b => b !== null) && (
                  <div className="absolute inset-0 pointer-events-none bg-red-500/10 animate-pulse" />
                )}
              </div>
            </div>

            {/* Sidebar / Stats */}
            <div className="flex flex-col gap-6">
              {/* Mode Info */}
              <div className="glass-panel p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-500/20 rounded-lg">
                    {gameState.mode === GameMode.CLASSIC ? <Zap className="w-5 h-5 text-emerald-400" /> : <Timer className="w-5 h-5 text-emerald-400" />}
                  </div>
                  <div>
                    <h3 className="font-bold text-white">{gameState.mode === GameMode.CLASSIC ? '经典模式' : '计时模式'}</h3>
                    <p className="text-xs text-zinc-500">等级 {gameState.level}</p>
                  </div>
                </div>

                {gameState.mode === GameMode.TIME && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-bold uppercase tracking-wider">
                      <span className="text-zinc-500">剩余时间</span>
                      <span className={gameState.timeLeft < 5 ? 'text-red-400' : 'text-emerald-400'}>{gameState.timeLeft}秒</span>
                    </div>
                    <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                      <motion.div 
                        className={`h-full ${gameState.timeLeft < 5 ? 'bg-red-500' : 'bg-emerald-500'}`}
                        initial={{ width: '100%' }}
                        animate={{ width: `${(gameState.timeLeft / gameState.maxTime) * 100}%` }}
                        transition={{ duration: 1, ease: "linear" }}
                      />
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t border-white/5">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-zinc-400">当前总和</span>
                    <span className={`text-xl font-mono font-bold ${currentSum > gameState.target ? 'text-red-400' : 'text-white'}`}>
                      {currentSum} / {gameState.target}
                    </span>
                  </div>
                </div>
              </div>

              {/* Controls */}
              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => initGame(gameState.mode)}
                  className="flex flex-col items-center justify-center p-4 glass-panel hover:bg-white/10 transition-colors gap-2"
                >
                  <RotateCcw className="w-6 h-6 text-zinc-400" />
                  <span className="text-xs font-bold uppercase tracking-widest text-zinc-500">重新开始</span>
                </button>
                <button 
                  className="flex flex-col items-center justify-center p-4 glass-panel hover:bg-white/10 transition-colors gap-2"
                >
                  <Settings className="w-6 h-6 text-zinc-400" />
                  <span className="text-xs font-bold uppercase tracking-widest text-zinc-500">设置</span>
                </button>
              </div>

              {/* High Scores (Mock) */}
              <div className="glass-panel p-6 flex-1">
                <div className="flex items-center gap-2 mb-4">
                  <Trophy className="w-4 h-4 text-yellow-500" />
                  <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-400">最高纪录</h4>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-zinc-500">经典模式</span>
                    <span className="text-sm font-mono font-bold text-white">12,450</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-zinc-500">计时模式</span>
                    <span className="text-sm font-mono font-bold text-white">8,920</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Game Over Modal */}
      <AnimatePresence>
        {gameState.status === GameStatus.GAMEOVER && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="glass-panel p-10 w-full max-w-md text-center space-y-8 shadow-2xl border-red-500/20"
            >
              <div className="space-y-2">
                <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="w-10 h-10 text-red-500" />
                </div>
                <h2 className="text-4xl font-display font-black text-white">游戏结束</h2>
                <p className="text-zinc-400">方块已经堆积到顶了！</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-white/5 rounded-xl">
                  <span className="block text-xs font-bold text-zinc-500 uppercase tracking-widest">最终得分</span>
                  <span className="text-3xl font-mono font-bold text-emerald-400">{gameState.score.toLocaleString()}</span>
                </div>
                <div className="p-4 bg-white/5 rounded-xl">
                  <span className="block text-xs font-bold text-zinc-500 uppercase tracking-widest">模式</span>
                  <span className="text-xl font-bold text-white">{gameState.mode === GameMode.CLASSIC ? '经典' : '计时'}</span>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => initGame(gameState.mode)}
                  className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-white font-bold rounded-xl transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-5 h-5" />
                  再试一次
                </button>
                <button 
                  onClick={() => setGameState(prev => ({ ...prev, status: GameStatus.IDLE }))}
                  className="w-full py-4 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-xl transition-all"
                >
                  返回主菜单
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
