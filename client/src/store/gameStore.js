import { create } from 'zustand';

const useGameStore = create((set) => ({
  // Game state
  pin: null,
  players: [],
  gameState: 'select', // 'select', 'lobby', 'loading', 'game', 'question_results', 'scores', 'result'
  currentQuestion: null,
  answerStats: {},
  finalScores: [],
  winner: null,

  // Actions
  setPin: (pin) => set({ pin }),

  setPlayers: (players) => set({ players }),

  setGameState: (gameState) => set({ gameState }),

  setCurrentQuestion: (currentQuestion) => set({ currentQuestion }),

  setAnswerStats: (answerStats) => set({ answerStats }),

  setFinalScores: (finalScores, winner) => set({ finalScores, winner }),

  updateGameData: (data) => set((state) => ({ ...state, ...data })),

  resetGame: () => set({
    pin: null,
    players: [],
    gameState: 'select',
    currentQuestion: null,
    answerStats: {},
    finalScores: [],
    winner: null,
  }),
}));

export default useGameStore;
