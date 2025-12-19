const mongoose = require('mongoose');

const gameHistorySchema = new mongoose.Schema({
  pin: {
    type: String,
    required: true,
    index: true
  },
  quizTitle: {
    type: String,
    required: true
  },
  quizId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Quiz',
    required: true
  },
  startedAt: {
    type: Date,
    required: true,
    default: Date.now
  },
  finishedAt: {
    type: Date,
    required: true,
    default: Date.now
  },
  totalPlayers: {
    type: Number,
    required: true
  },
  questions: [{
    questionText: String,
    answers: [String],
    correctAnswer: Number,
    timeLimit: Number,
    // Her oyuncunun bu soruya verdiği cevap
    playerAnswers: [{
      username: String,
      answerIndex: Number,  // -1 = cevap vermedi
      timeLeft: Number,
      isCorrect: Boolean,
      pointsEarned: Number
    }]
  }],
  finalScores: [{
    username: String,
    score: Number,
    rank: Number,
    correctAnswers: Number,
    totalQuestions: Number
  }]
}, {
  timestamps: true
});

// Index for faster queries
gameHistorySchema.index({ createdAt: -1 });
gameHistorySchema.index({ pin: 1, createdAt: -1 });

module.exports = mongoose.model('GameHistory', gameHistorySchema);
