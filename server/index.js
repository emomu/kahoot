require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/database');
const Quiz = require('./models/Quiz');
const GameHistory = require('./models/GameHistory');

// MongoDB bağlantısı
connectDB();

const app = express();
app.use(cors());
app.use(express.json());

// Serve static files from the React app (production)
app.use(express.static(path.join(__dirname, '../client/dist')));

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: process.env.CLIENT_URL || "http://localhost:5173",
        methods: ["GET", "POST"]
    }
});

// Oyun için geçici veri tutucu (Socket.IO için)
let games = {};

// Rastgele 6 haneli PIN oluşturucu
const generatePin = () => Math.floor(100000 + Math.random() * 900000).toString();

// === REST API ENDPOINTS ===

// Quiz oluştur
app.post('/api/quiz/create', async (req, res) => {
    try {
        const { title, description, questions } = req.body;

        if (!title || !questions || questions.length === 0) {
            return res.status(400).json({ error: 'Başlık ve sorular gerekli' });
        }

        const quiz = new Quiz({
            title,
            description: description || '',
            questions
        });

        await quiz.save();

        res.json({ success: true, quizId: quiz._id, quiz });
    } catch (error) {
        console.error('Quiz oluşturma hatası:', error);
        res.status(500).json({ error: 'Quiz oluşturulamadı', details: error.message });
    }
});

// Tüm quizleri getir
app.get('/api/quiz/list', async (req, res) => {
    try {
        const quizzes = await Quiz.find().sort({ createdAt: -1 });
        res.json({ quizzes });
    } catch (error) {
        console.error('Quiz listesi getirme hatası:', error);
        res.status(500).json({ error: 'Quizler getirilemedi' });
    }
});

// Belirli bir quiz'i getir
app.get('/api/quiz/:quizId', async (req, res) => {
    try {
        const quiz = await Quiz.findById(req.params.quizId);
        if (!quiz) {
            return res.status(404).json({ error: 'Quiz bulunamadı' });
        }
        res.json({ quiz });
    } catch (error) {
        console.error('Quiz getirme hatası:', error);
        res.status(404).json({ error: 'Quiz bulunamadı' });
    }
});

// Quiz sil
app.delete('/api/quiz/:quizId', async (req, res) => {
    try {
        const quiz = await Quiz.findByIdAndDelete(req.params.quizId);
        if (!quiz) {
            return res.status(404).json({ error: 'Quiz bulunamadı' });
        }
        res.json({ success: true });
    } catch (error) {
        console.error('Quiz silme hatası:', error);
        res.status(500).json({ error: 'Quiz silinemedi' });
    }
});

// === GAME HISTORY API ENDPOINTS ===

// Tüm oyun geçmişini getir (en yeniden en eskiye)
app.get('/api/history', async (req, res) => {
    try {
        const history = await GameHistory.find()
            .sort({ createdAt: -1 })
            .select('pin quizTitle startedAt finishedAt totalPlayers finalScores')
            .limit(50); // Son 50 oyun
        res.json(history);
    } catch (error) {
        console.error('Oyun geçmişi getirme hatası:', error);
        res.status(500).json({ error: 'Oyun geçmişi getirilemedi' });
    }
});

// Belirli bir oyunun detaylı istatistiklerini getir
app.get('/api/history/:historyId', async (req, res) => {
    try {
        const history = await GameHistory.findById(req.params.historyId);
        if (!history) {
            return res.status(404).json({ error: 'Oyun bulunamadı' });
        }
        res.json(history);
    } catch (error) {
        console.error('Oyun detayı getirme hatası:', error);
        res.status(500).json({ error: 'Oyun detayı getirilemedi' });
    }
});

// Catch-all handler: React Router için (tüm API route'larından sonra!)
app.use((req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

// === SOCKET.IO EVENTS ===

io.on('connection', (socket) => {
    console.log(`Kullanıcı bağlandı: ${socket.id}`);

    // --- HOST EVENTLERİ ---

    socket.on('create_game', ({ questions, quizTitle, quizId }) => {
        const pin = generatePin();
        games[pin] = {
            hostId: socket.id,
            quizTitle: quizTitle || 'Kahoot Quiz',
            quizId: quizId,
            players: [],
            questions: questions,
            currentQuestionIndex: -1, // -1 = lobby, 0+ = soru indeksi
            gameState: 'LOBBY',
            scores: {},
            answers: {}, // Her soru için cevapları sakla
            startedAt: null,
            questionDetails: [] // Her soru için detaylı cevap bilgileri
        };
        socket.join(pin);
        socket.emit('game_created', pin);
        console.log(`Oyun oluşturuldu. PIN: ${pin}, Başlık: ${quizTitle}`);
    });

    socket.on('start_game', (pin) => {
        const game = games[pin];
        if (game && game.gameState === 'LOBBY') {
            game.gameState = 'QUESTION';
            game.currentQuestionIndex = 0;
            game.startedAt = new Date(); // Oyun başlangıç zamanını kaydet

            // Her soru için detay objeleri oluştur
            game.questionDetails = game.questions.map(q => ({
                questionText: q.question,
                answers: q.answers,
                correctAnswer: q.correctAnswer,
                timeLimit: q.timeLimit,
                playerAnswers: []
            }));

            io.to(pin).emit('game_started');

            // İlk soruyu gönder
            setTimeout(() => {
                io.to(pin).emit('new_question', {
                    ...game.questions[0],
                    questionNumber: 1,
                    totalQuestions: game.questions.length
                });
            }, 2000); // 2 saniye hazırlık süresi
        }
    });

    socket.on('next_question', (pin) => {
        const game = games[pin];
        if (!game) return;

        game.currentQuestionIndex++;
        const idx = game.currentQuestionIndex;

        if (idx < game.questions.length) {
            game.answers[idx] = []; // Yeni soru için cevapları sıfırla
            io.to(pin).emit('new_question', {
                ...game.questions[idx],
                questionNumber: idx + 1,
                totalQuestions: game.questions.length
            });
        } else {
            // Oyun bitti
            const finalScores = game.players
                .map(p => ({ username: p.username, score: p.score }))
                .sort((a, b) => b.score - a.score);

            io.to(pin).emit('game_over', {
                scores: finalScores,
                winner: finalScores[0]
            });
        }
    });

    // --- OYUNCU EVENTLERİ ---

    socket.on('join_game', ({ pin, username }) => {
        const game = games[pin];
        if (game && game.gameState === 'LOBBY') {
            // Aynı isimli oyuncu var mı kontrol et
            const existingPlayer = game.players.find(p => p.username === username);
            if (existingPlayer) {
                socket.emit('error', 'Bu isim zaten kullanılıyor!');
                return;
            }

            socket.join(pin);
            game.players.push({
                id: socket.id,
                username,
                score: 0
            });
            game.scores[username] = 0;

            socket.emit('joined_success', { username, pin });
            io.to(game.hostId).emit('player_joined', game.players);

            console.log(`${username} oyuna katıldı: ${pin}`);
        } else if (game && game.gameState !== 'LOBBY') {
            socket.emit('error', 'Oyun zaten başladı!');
        } else {
            socket.emit('error', 'Oyun bulunamadı!');
        }
    });

    socket.on('submit_answer', ({ pin, answerIndex, timeLeft }) => {
        const game = games[pin];
        if (!game) return;

        const currentQ = game.questions[game.currentQuestionIndex];
        const player = game.players.find(p => p.id === socket.id);

        if (!player) return;

        // Zaten cevap vermiş mi kontrol et
        if (!game.answers[game.currentQuestionIndex]) {
            game.answers[game.currentQuestionIndex] = [];
        }

        const alreadyAnswered = game.answers[game.currentQuestionIndex].find(a => a.playerId === socket.id);
        if (alreadyAnswered) {
            return; // Zaten cevap vermiş
        }

        // Cevabı kaydet
        game.answers[game.currentQuestionIndex].push({
            playerId: socket.id,
            username: player.username,
            answerIndex,
            timeLeft
        });

        // Doğru cevap kontrolü
        const isCorrect = currentQ.correctAnswer === answerIndex;

        // Puanlama
        let totalPoints = 0;
        if (isCorrect) {
            // Puanlama: Doğru cevap + hız bonusu
            const basePoints = 1000;
            const timeBonus = Math.floor(timeLeft * 10);
            totalPoints = basePoints + timeBonus;

            player.score += totalPoints;
            game.scores[player.username] = player.score;
        }

        // Detaylı cevabı kaydet
        game.questionDetails[game.currentQuestionIndex].playerAnswers.push({
            username: player.username,
            answerIndex: answerIndex,
            timeLeft: timeLeft,
            isCorrect: isCorrect,
            pointsEarned: totalPoints
        });

        if (isCorrect) {
            socket.emit('answer_result', {
                correct: true,
                points: totalPoints,
                newScore: player.score
            });
        } else {
            socket.emit('answer_result', {
                correct: false,
                points: 0,
                correctAnswer: currentQ.correctAnswer
            });
        }

        // Host'a cevap istatistiği gönder
        const answerStats = game.answers[game.currentQuestionIndex].reduce((acc, ans) => {
            acc[ans.answerIndex] = (acc[ans.answerIndex] || 0) + 1;
            return acc;
        }, {});

        io.to(game.hostId).emit('answer_stats', {
            questionIndex: game.currentQuestionIndex,
            stats: answerStats,
            totalAnswered: game.answers[game.currentQuestionIndex].length,
            totalPlayers: game.players.length
        });
    });

    // Soru süresi bitti - Cevap dağılımını gönder
    socket.on('time_up', (pin) => {
        const game = games[pin];
        if (!game || game.hostId !== socket.id) return;

        const currentAnswers = game.answers[game.currentQuestionIndex] || [];
        const answerStats = currentAnswers.reduce((acc, ans) => {
            acc[ans.answerIndex] = (acc[ans.answerIndex] || 0) + 1;
            return acc;
        }, {});

        // Tüm odaya cevap dağılımını ve question_results state'ini gönder
        io.to(pin).emit('show_question_results', {
            stats: answerStats,
            totalAnswered: currentAnswers.length,
            totalPlayers: game.players.length,
            correctAnswer: game.questions[game.currentQuestionIndex].correctAnswer
        });
    });

    // Oyun istatistiklerini kaydet
    socket.on('save_game_stats', async (pin) => {
        const game = games[pin];
        if (!game || game.hostId !== socket.id) return;

        try {
            const finalScores = game.players
                .map((p, index) => ({
                    username: p.username,
                    score: p.score,
                    rank: index + 1,
                    correctAnswers: game.questionDetails.reduce((count, q) => {
                        const playerAnswer = q.playerAnswers.find(pa => pa.username === p.username);
                        return count + (playerAnswer?.isCorrect ? 1 : 0);
                    }, 0),
                    totalQuestions: game.questions.length
                }))
                .sort((a, b) => b.score - a.score)
                .map((p, index) => ({ ...p, rank: index + 1 }));

            const gameHistory = new GameHistory({
                pin: pin,
                quizTitle: game.quizTitle,
                quizId: game.quizId,
                startedAt: game.startedAt,
                finishedAt: new Date(),
                totalPlayers: game.players.length,
                questions: game.questionDetails,
                finalScores: finalScores
            });

            await gameHistory.save();
            console.log(`Oyun istatistikleri kaydedildi: ${pin}`);

            // Client'a istatistik ID'sini gönder
            socket.emit('stats_saved', { historyId: gameHistory._id });
        } catch (error) {
            console.error('İstatistik kaydetme hatası:', error);
            socket.emit('stats_save_error', { message: 'İstatistikler kaydedilemedi' });
        }
    });

    socket.on('disconnect', () => {
        console.log(`Kullanıcı ayrıldı: ${socket.id}`);

        // Oyundan ayrılan oyuncuyu temizle
        for (let pin in games) {
            const game = games[pin];
            const playerIndex = game.players.findIndex(p => p.id === socket.id);

            if (playerIndex !== -1) {
                const player = game.players[playerIndex];
                game.players.splice(playerIndex, 1);
                delete game.scores[player.username];

                // Host'a güncelleme gönder
                io.to(game.hostId).emit('player_joined', game.players);
                console.log(`${player.username} oyundan ayrıldı`);
            }

            // Host ayrıldıysa oyunu sil
            if (game.hostId === socket.id) {
                io.to(pin).emit('host_left');
                delete games[pin];
                console.log(`Oyun silindi: ${pin}`);
            }
        }
    });
});

const PORT = process.env.PORT || 3001;

// BURASI ÖNEMLİ: İkinci parametre olarak "0.0.0.0" ekle
server.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 SERVER ÇALIŞIYOR: http://0.0.0.0:${PORT}`);
    console.log(`📝 Quiz API: http://0.0.0.0:${PORT}/api/quiz`);
    // Loglarda localhost yazsa da olur ama dinlediği yer 0.0.0.0 olmalı
    console.log(`🌍 CORS Origin: ${process.env.CLIENT_URL || "http://localhost:5173"}`);
});
