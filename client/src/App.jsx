import React, { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useSearchParams, useParams, Link } from 'react-router-dom';
import io from 'socket.io-client';
import { QRCodeSVG } from 'qrcode.react';
import { Play, Users, Trophy, Zap, Crown, Star, Plus, Edit3, Trash2, Clock, CheckCircle, XCircle, Lock, KeyRound } from 'lucide-react';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:3001";
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";
const HOST_PASSWORD = import.meta.env.VITE_HOST_PASSWORD || "340667";

const socket = io.connect(SOCKET_URL);
const API_BASE = `${API_URL}/api`;

// Game Context
const GameContext = createContext();

// Auth Context for Host Protection
const AuthContext = createContext();

function AuthProvider({ children }) {
  const [isHostAuthenticated, setIsHostAuthenticated] = useState(false);

  return (
    <AuthContext.Provider value={{ isHostAuthenticated, setIsHostAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
}

function GameProvider({ children }) {
  const [gameData, setGameData] = useState({
    pin: null,
    players: [],
    gameState: 'select',
    currentQuestion: null,
    answerStats: {}
  });

  return (
    <GameContext.Provider value={{ gameData, setGameData }}>
      {children}
    </GameContext.Provider>
  );
}

// === HOST ŞİFRE GİRİŞ EKRANI ===
function HostPasswordGate({ children }) {
  const { isHostAuthenticated, setIsHostAuthenticated } = useContext(AuthContext);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (password === HOST_PASSWORD) {
      setIsHostAuthenticated(true);
      setError('');
    } else {
      setError('Hatalı şifre! Lütfen tekrar deneyin.');
      setPassword('');
    }
  };

  if (isHostAuthenticated) {
    return children;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-indigo-700 to-blue-800 flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute top-20 left-10 w-64 h-64 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-80 h-80 bg-white/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="relative z-10 w-full max-w-md space-y-6 animate-slideUp">
        <div className="text-center mb-8">
          <div className="inline-block p-6 bg-white/10 backdrop-blur-sm rounded-full mb-4">
            <Lock className="w-16 h-16 text-white" />
          </div>
          <h1 className="text-5xl font-black text-white drop-shadow-2xl mb-2">Öğretmen Girişi</h1>
          <p className="text-white/90 text-xl font-semibold">Bu alan şifre ile korunmaktadır</p>
        </div>

        <div className="bg-white rounded-3xl shadow-2xl p-8 space-y-5">
          {error && (
            <div className="bg-red-100 border-2 border-red-500 text-red-700 px-4 py-3 rounded-xl text-center font-bold flex items-center justify-center gap-2">
              <XCircle className="w-5 h-5" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="block text-gray-700 font-bold text-sm pl-1 flex items-center gap-2">
                <KeyRound className="w-4 h-4" />
                Öğretmen Şifresi
              </label>
              <input
                type="password"
                placeholder="Şifrenizi girin"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border-4 border-gray-200 p-4 rounded-2xl text-center text-2xl font-black focus:outline-none focus:border-purple-500 transition-all bg-gray-50 focus:bg-white tracking-widest"
                maxLength={10}
                autoFocus
              />
            </div>

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-5 rounded-2xl font-black text-2xl hover:scale-105 transition-all shadow-[0_8px_0_rgb(79,70,229)] hover:shadow-[0_4px_0_rgb(79,70,229)] hover:translate-y-1 active:shadow-none active:translate-y-2 flex items-center justify-center gap-2"
            >
              <Lock className="w-6 h-6" />
              GİRİŞ YAP
            </button>
          </form>

          <button
            onClick={() => navigate('/')}
            className="w-full text-gray-600 hover:text-gray-800 font-bold py-2 transition-all"
          >
            ← Ana Sayfaya Dön
          </button>
        </div>
      </div>
    </div>
  );
}

// --- RENK PALETİ ---
const colors = [
  { bg: "bg-gradient-to-br from-red-500 to-red-600", shadow: "shadow-[0_8px_0_rgb(220,38,38)]", icon: "▲", name: "red" },
  { bg: "bg-gradient-to-br from-blue-500 to-blue-600", shadow: "shadow-[0_8px_0_rgb(37,99,235)]", icon: "◆", name: "blue" },
  { bg: "bg-gradient-to-br from-yellow-400 to-yellow-500", shadow: "shadow-[0_8px_0_rgb(234,179,8)]", icon: "●", name: "yellow" },
  { bg: "bg-gradient-to-br from-green-500 to-green-600", shadow: "shadow-[0_8px_0_rgb(22,163,74)]", icon: "■", name: "green" }
];

// === QUIZ OLUŞTURMA SAYFASI ===
function QuizCreator() {
  const navigate = useNavigate();
  const [quizTitle, setQuizTitle] = useState('');
  const [quizDescription, setQuizDescription] = useState('');
  const [questions, setQuestions] = useState([
    { question: '', options: ['', '', '', ''], correctAnswer: 0, timeLimit: 20 }
  ]);

  const addQuestion = () => {
    setQuestions([...questions, { question: '', options: ['', '', '', ''], correctAnswer: 0, timeLimit: 20 }]);
  };

  const removeQuestion = (index) => {
    if (questions.length > 1) {
      setQuestions(questions.filter((_, i) => i !== index));
    }
  };

  const updateQuestion = (index, field, value) => {
    const newQuestions = [...questions];
    newQuestions[index][field] = value;
    setQuestions(newQuestions);
  };

  const updateOption = (qIndex, oIndex, value) => {
    const newQuestions = [...questions];
    newQuestions[qIndex].options[oIndex] = value;
    setQuestions(newQuestions);
  };

  const saveQuiz = async () => {
    if (!quizTitle.trim()) {
      alert('Lütfen quiz başlığı girin!');
      return;
    }

    const invalidQ = questions.find(q => !q.question.trim() || q.options.some(o => !o.trim()));
    if (invalidQ) {
      alert('Lütfen tüm soruları ve şıkları doldurun!');
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/quiz/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: quizTitle,
          description: quizDescription,
          questions
        })
      });

      if (response.ok) {
        alert('Quiz başarıyla kaydedildi!');
        navigate('/host/library');
      }
    } catch (error) {
      alert('Quiz kaydedilemedi!');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 to-indigo-700 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-3xl shadow-2xl p-6 md:p-8 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl md:text-4xl font-black text-gray-800">Quiz Oluştur</h1>
            <Link to="/host" className="text-purple-600 hover:text-purple-800 font-bold">← Geri</Link>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Quiz Başlığı *</label>
              <input
                type="text"
                value={quizTitle}
                onChange={(e) => setQuizTitle(e.target.value)}
                placeholder="Örn: React Bilgi Yarışması"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-purple-500 text-lg font-semibold"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Açıklama (Opsiyonel)</label>
              <textarea
                value={quizDescription}
                onChange={(e) => setQuizDescription(e.target.value)}
                placeholder="Quiz hakkında kısa bir açıklama..."
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-purple-500 resize-none h-20"
              />
            </div>
          </div>
        </div>

        {/* Sorular */}
        <div className="space-y-4">
          {questions.map((q, qIndex) => (
            <div key={qIndex} className="bg-white rounded-3xl shadow-2xl p-6 md:p-8">
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-xl font-black text-gray-800">Soru {qIndex + 1}</h3>
                {questions.length > 1 && (
                  <button
                    onClick={() => removeQuestion(qIndex)}
                    className="text-red-500 hover:text-red-700 p-2"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Soru Metni *</label>
                  <input
                    type="text"
                    value={q.question}
                    onChange={(e) => updateQuestion(qIndex, 'question', e.target.value)}
                    placeholder="Sorunuzu yazın..."
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-purple-500 text-lg"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {q.options.map((opt, oIndex) => (
                    <div key={oIndex} className="relative">
                      <div
                        className={`absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 ${colors[oIndex].bg} rounded-lg flex items-center justify-center text-white text-xl font-bold shadow-lg`}
                      >
                        {colors[oIndex].icon}
                      </div>
                      <input
                        type="text"
                        value={opt}
                        onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                        placeholder={`Şık ${oIndex + 1}`}
                        className="w-full pl-14 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-purple-500"
                      />
                      <button
                        onClick={() => updateQuestion(qIndex, 'correctAnswer', oIndex)}
                        className={`absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full border-2 ${
                          q.correctAnswer === oIndex
                            ? 'bg-green-500 border-green-500'
                            : 'bg-white border-gray-300'
                        } flex items-center justify-center transition-all`}
                        title="Doğru cevap olarak işaretle"
                      >
                        {q.correctAnswer === oIndex && <CheckCircle className="w-5 h-5 text-white" />}
                      </button>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div>
                    <p className="text-sm text-gray-600 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      Doğru cevap: <span className="font-bold">{q.options[q.correctAnswer] || 'Seçilmedi'}</span>
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      <Clock className="w-4 h-4 inline mr-1" />
                      Süre (saniye)
                    </label>
                    <select
                      value={q.timeLimit || 20}
                      onChange={(e) => updateQuestion(qIndex, 'timeLimit', parseInt(e.target.value))}
                      className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-purple-500 font-semibold"
                    >
                      <option value={5}>5 saniye</option>
                      <option value={10}>10 saniye</option>
                      <option value={15}>15 saniye</option>
                      <option value={20}>20 saniye</option>
                      <option value={30}>30 saniye</option>
                      <option value={45}>45 saniye</option>
                      <option value={60}>60 saniye</option>
                      <option value={90}>90 saniye</option>
                      <option value={120}>120 saniye</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Alt Butonlar */}
        <div className="mt-6 flex gap-4">
          <button
            onClick={addQuestion}
            className="flex-1 bg-white text-purple-700 px-6 py-4 rounded-2xl font-bold text-lg hover:scale-105 transition-all shadow-xl flex items-center justify-center gap-2"
          >
            <Plus className="w-6 h-6" />
            Soru Ekle
          </button>
          <button
            onClick={saveQuiz}
            className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white px-6 py-4 rounded-2xl font-bold text-lg hover:scale-105 transition-all shadow-xl shadow-[0_8px_0_rgb(22,163,74)] hover:shadow-[0_4px_0_rgb(22,163,74)] hover:translate-y-1 active:shadow-none active:translate-y-2"
          >
            Quiz'i Kaydet
          </button>
        </div>
      </div>
    </div>
  );
}

// === QUIZ KÜTÜPHANESİ ===
function QuizLibrary() {
  const navigate = useNavigate();
  const { setGameData } = useContext(GameContext);
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadQuizzes();
  }, []);

  const loadQuizzes = async () => {
    try {
      const response = await fetch(`${API_BASE}/quiz/list`);
      const data = await response.json();
      setQuizzes(data.quizzes);
    } catch (error) {
      console.error('Quiz yüklenemedi:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteQuiz = async (quizId) => {
    if (confirm('Bu quiz\'i silmek istediğinize emin misiniz?')) {
      try {
        await fetch(`${API_BASE}/quiz/${quizId}`, { method: 'DELETE' });
        loadQuizzes();
      } catch (error) {
        alert('Quiz silinemedi!');
      }
    }
  };

  const startGame = (quiz) => {
    // Game state'i lobby olarak ayarla
    setGameData(prev => ({ ...prev, gameState: 'loading' }));

    // Socket event dinle
    const handleGameCreated = (newPin) => {
      socket.off('game_created', handleGameCreated);
      setGameData(prev => ({
        ...prev,
        pin: newPin,
        gameState: 'lobby',
        players: []
      }));
      // Quiz ID'sini route'a ekle
      navigate(`/host/${quiz._id || quiz.id}`);
    };

    socket.once('game_created', handleGameCreated);
    socket.emit('create_game', { questions: quiz.questions, quizTitle: quiz.title });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 to-indigo-700 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-3xl shadow-2xl p-6 md:p-8 mb-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-black text-gray-800">Quiz Kütüphanesi</h1>
              <p className="text-gray-600 mt-2">Oluşturduğunuz quizleri yönetin</p>
            </div>
            <div className="flex gap-3">
              <Link
                to="/host"
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-300 transition-all"
              >
                ← Geri
              </Link>
              <Link
                to="/host/create"
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-bold hover:scale-105 transition-all shadow-xl flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Yeni Quiz
              </Link>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center text-white text-2xl font-bold py-20">Yükleniyor...</div>
        ) : quizzes.length === 0 ? (
          <div className="bg-white rounded-3xl shadow-2xl p-12 text-center">
            <div className="text-6xl mb-4">📝</div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">Henüz Quiz Yok</h3>
            <p className="text-gray-600 mb-6">İlk quiz'inizi oluşturarak başlayın!</p>
            <Link
              to="/host/create"
              className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-2xl font-bold hover:scale-105 transition-all shadow-xl"
            >
              <Plus className="w-6 h-6" />
              Quiz Oluştur
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {quizzes.map((quiz) => (
              <div key={quiz._id || quiz.id} className="bg-white rounded-3xl shadow-2xl p-6 hover:scale-105 transition-all">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-black text-gray-800 mb-2">{quiz.title}</h3>
                    {quiz.description && (
                      <p className="text-sm text-gray-600 line-clamp-2">{quiz.description}</p>
                    )}
                  </div>
                  <button
                    onClick={() => deleteQuiz(quiz._id || quiz.id)}
                    className="text-red-500 hover:text-red-700 p-2"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
                  <Edit3 className="w-4 h-4" />
                  <span>{quiz.questions.length} Soru</span>
                </div>

                <button
                  onClick={() => startGame(quiz)}
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white py-3 rounded-xl font-bold hover:scale-105 transition-all shadow-lg flex items-center justify-center gap-2"
                >
                  <Play className="w-5 h-5" />
                  Oyunu Başlat
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// === HOST (YÖNETİCİ) EKRANI ===
function HostScreen() {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const { gameData, setGameData } = useContext(GameContext);
  const { pin, players, gameState, currentQuestion, answerStats } = gameData;

  useEffect(() => {
    socket.on("game_created", (newPin) => {
      console.log('Game created with PIN:', newPin);
      setGameData(prev => ({
        ...prev,
        pin: newPin,
        gameState: 'lobby'
      }));
    });

    socket.on("player_joined", (updatedPlayers) => {
      setGameData(prev => ({ ...prev, players: updatedPlayers }));
    });

    socket.on("new_question", (question) => {
      setGameData(prev => ({
        ...prev,
        gameState: 'game',
        currentQuestion: question,
        answerStats: {}
      }));
    });

    socket.on("answer_stats", (data) => {
      setGameData(prev => ({ ...prev, answerStats: data.stats }));
    });

    socket.on("show_scores", () => {
      setGameData(prev => ({ ...prev, gameState: 'scores' }));
    });

    socket.on("game_over", (data) => {
      setGameData(prev => ({ ...prev, gameState: 'result' }));
    });

    return () => {
      socket.off("game_created");
      socket.off("player_joined");
      socket.off("new_question");
      socket.off("answer_stats");
      socket.off("show_scores");
      socket.off("game_over");
    };
  }, [setGameData]);

  const startGame = () => {
    socket.emit("start_game", pin);
  };

  const nextQuestion = () => {
    socket.emit("next_question", pin);
  };

  // LOADING SCREEN
  if (gameState === 'loading') {
    return (
      <div className="h-screen bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800 flex items-center justify-center p-6">
        <div className="text-center text-white space-y-8 animate-fadeIn">
          <div className="relative">
            <div className="absolute inset-0 bg-white/30 rounded-full blur-3xl animate-ping"></div>
            <div className="relative text-9xl animate-bounce">🎮</div>
          </div>
          <div className="space-y-3">
            <h2 className="text-5xl font-black">Oyun Başlatılıyor...</h2>
            <p className="text-2xl font-semibold text-purple-200">Lütfen bekleyin</p>
          </div>
          <div className="flex gap-2 justify-center">
            <div className="w-3 h-3 bg-white rounded-full animate-bounce"></div>
            <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
            <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></div>
          </div>
        </div>
      </div>
    );
  }

  // SELECT SCREEN
  if (gameState === 'select') {
    return (
      <div className="h-screen bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800 flex items-center justify-center p-6">
        <div className="max-w-2xl w-full space-y-8">
          <div className="text-center text-white space-y-4">
            <h1 className="text-6xl font-black">Kahoot! Host</h1>
            <p className="text-2xl font-semibold text-purple-200">Quiz'inizi seçin veya oluşturun</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Link
              to="/host/library"
              className="bg-white p-8 rounded-3xl shadow-2xl hover:scale-105 transition-all text-center space-y-4"
            >
              <div className="text-6xl">📚</div>
              <h3 className="text-2xl font-black text-gray-800">Quiz Kütüphanesi</h3>
              <p className="text-gray-600">Kayıtlı quizlerden seçin</p>
            </Link>

            <Link
              to="/host/create"
              className="bg-gradient-to-br from-green-500 to-emerald-600 p-8 rounded-3xl shadow-2xl hover:scale-105 transition-all text-center space-y-4 text-white"
            >
              <div className="text-6xl">➕</div>
              <h3 className="text-2xl font-black">Yeni Quiz</h3>
              <p className="text-green-100">Sıfırdan oluştur</p>
            </Link>
          </div>

          <div className="text-center">
            <Link to="/" className="text-white/80 hover:text-white font-bold">← Ana Sayfaya Dön</Link>
          </div>
        </div>
      </div>
    );
  }

  // LOBBY SCREEN
  if (gameState === 'lobby') {
    const joinUrl = `http://${window.location.hostname}:5173/play?pin=${pin}`;

    return (
      <div className="h-screen bg-gradient-to-br from-purple-600 to-indigo-700 text-white flex flex-col">
        <div className="pt-8 pb-6 text-center space-y-4">
          <h2 className="text-3xl font-bold text-purple-200">Oyuncular Katılıyor...</h2>
          <div className="flex flex-col items-center gap-2">
            <div className="bg-white/20 backdrop-blur-sm px-6 py-2 rounded-t-2xl text-sm font-semibold">
              Oyun PIN Kodu
            </div>
            <div className="bg-white text-purple-900 px-12 py-6 rounded-3xl text-7xl font-black tracking-wider shadow-2xl border-8 border-purple-400 animate-pulse-slow">
              {pin}
            </div>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center px-8">
          <div className="flex gap-12 items-start max-w-6xl w-full">
            <div className="flex-shrink-0 bg-white p-8 rounded-3xl shadow-2xl transform hover:scale-105 transition-transform">
              <div className="space-y-4">
                <div className="bg-gradient-to-br from-purple-100 to-indigo-100 p-4 rounded-2xl">
                  <QRCodeSVG value={joinUrl} size={220} className="w-full h-full" />
                </div>
                <div className="text-center">
                  <p className="text-purple-900 font-bold text-lg">QR ile Katıl</p>
                  <p className="text-purple-600 text-sm">Mobil cihazınızla taratın</p>
                </div>
              </div>
            </div>

            <div className="flex-1 bg-white/10 backdrop-blur-lg rounded-3xl p-8 shadow-2xl border border-white/20">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-3xl font-bold flex items-center gap-3">
                  <Users className="w-8 h-8" />
                  Oyuncular
                </h3>
                <div className="bg-green-500 px-5 py-2 rounded-full text-2xl font-black shadow-lg">
                  {players.length}
                </div>
              </div>

              <div className="bg-purple-900/40 rounded-2xl p-4 h-80 overflow-y-auto custom-scrollbar">
                {players.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-purple-200 text-lg">
                    <div className="text-center space-y-3">
                      <div className="animate-bounce text-6xl">👥</div>
                      <p>Oyuncular bekleniyor...</p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {players.map((p, i) => (
                      <div
                        key={i}
                        className="bg-gradient-to-r from-purple-500 to-indigo-500 p-4 rounded-xl font-bold text-center shadow-lg transform hover:scale-105 transition-all animate-slideIn flex items-center justify-center gap-2"
                        style={{ animationDelay: `${i * 100}ms` }}
                      >
                        <Star className="w-5 h-5 text-yellow-300" />
                        <span className="truncate">{p.username}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="pb-10 flex justify-center">
          <button
            onClick={startGame}
            disabled={players.length === 0}
            className="group px-16 py-5 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full text-3xl font-black shadow-[0_10px_0_rgb(22,163,74)] hover:shadow-[0_6px_0_rgb(22,163,74)] hover:translate-y-1 active:shadow-none active:translate-y-2 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-[0_10px_0_rgb(22,163,74)] transition-all flex items-center gap-3"
          >
            <Play className="w-8 h-8 group-hover:animate-pulse" />
            BAŞLAT
          </button>
        </div>
      </div>
    );
  }

  // GAME SCREEN
  if (gameState === 'game' && currentQuestion) {
    return (
      <div className="h-screen bg-gradient-to-br from-indigo-600 to-purple-700 flex flex-col">
        <div className="bg-white p-10 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 animate-pulse"></div>
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-4">
              <span className="text-purple-600 font-bold text-lg">
                Soru {currentQuestion.questionNumber} / {currentQuestion.totalQuestions}
              </span>
              <span className="text-gray-600 font-semibold">
                {Object.values(answerStats).reduce((a, b) => a + b, 0)} / {players.length} cevap
              </span>
            </div>
            <h2 className="text-5xl font-black text-gray-800 leading-tight text-center animate-fadeIn">
              {currentQuestion.question}
            </h2>
          </div>
        </div>

        <div className="flex-1 grid grid-cols-2 gap-6 p-8">
          {currentQuestion.options.map((opt, i) => {
            const answerCount = answerStats[i] || 0;
            const percentage = players.length > 0 ? Math.round((answerCount / players.length) * 100) : 0;

            return (
              <div
                key={i}
                className={`${colors[i].bg} ${colors[i].shadow} rounded-3xl flex flex-col items-center justify-center text-white transition-all cursor-pointer group animate-scaleIn relative overflow-hidden`}
                style={{ animationDelay: `${i * 150}ms` }}
              >
                {/* Progress Bar */}
                {answerCount > 0 && (
                  <div className="absolute bottom-0 left-0 h-2 bg-white/50 transition-all duration-500" style={{ width: `${percentage}%` }}></div>
                )}

                <div className="text-8xl mb-4 group-hover:scale-125 transition-transform drop-shadow-2xl">
                  {colors[i].icon}
                </div>
                <div className="bg-black/30 backdrop-blur-sm px-8 py-4 rounded-2xl text-2xl font-bold text-center max-w-md">
                  {opt}
                </div>
                {answerCount > 0 && (
                  <div className="mt-4 text-3xl font-black">
                    {percentage}% ({answerCount})
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="p-6 bg-white/10 backdrop-blur-sm flex justify-end">
          <button
            onClick={nextQuestion}
            className="px-10 py-4 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-full font-bold text-xl shadow-[0_6px_0_rgb(67,56,202)] hover:shadow-[0_3px_0_rgb(67,56,202)] hover:translate-y-1 active:shadow-none active:translate-y-2 transition-all flex items-center gap-2"
          >
            {currentQuestion.questionNumber < currentQuestion.totalQuestions ? 'Sonraki Soru' : 'Sonuçları Göster'}
            <span className="text-2xl">→</span>
          </button>
        </div>
      </div>
    );
  }

  // SCORES SCREEN
  if (gameState === 'scores') {
    return (
      <div className="h-screen bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500 flex items-center justify-center p-8">
        <div className="text-center text-white space-y-8 animate-fadeIn max-w-4xl w-full">
          <Trophy className="w-32 h-32 mx-auto animate-bounce text-yellow-200" />
          <h1 className="text-7xl font-black drop-shadow-2xl">Ara Skor Tablosu</h1>
          <div className="bg-white/20 backdrop-blur-lg rounded-3xl p-8">
            <div className="space-y-3">
              {players
                .sort((a, b) => b.score - a.score)
                .slice(0, 5)
                .map((p, i) => (
                  <div key={i} className="bg-white/30 backdrop-blur-sm rounded-2xl p-6 flex items-center justify-between text-2xl font-bold">
                    <div className="flex items-center gap-4">
                      <span className="text-4xl">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}</span>
                      <span>{p.username}</span>
                    </div>
                    <span className="text-yellow-200">{p.score} puan</span>
                  </div>
                ))}
            </div>
          </div>
          <p className="text-2xl font-semibold">Sonraki soruya geçiliyor...</p>
        </div>
      </div>
    );
  }

  // RESULT SCREEN
  return (
    <div className="h-screen bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500 flex items-center justify-center">
      <div className="text-center text-white space-y-8 animate-fadeIn">
        <Trophy className="w-32 h-32 mx-auto animate-bounce text-yellow-200" />
        <h1 className="text-7xl font-black drop-shadow-2xl">Oyun Bitti!</h1>
        <p className="text-3xl font-semibold">Kazananlar belirleniyor...</p>
      </div>
    </div>
  );
}

// === PLAYER (OYUNCU) EKRANI ===
function PlayerScreen() {
  const [searchParams] = useSearchParams();
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState(searchParams.get("pin") || "");
  const [status, setStatus] = useState("login");
  const [answerResult, setAnswerResult] = useState(null);
  const [error, setError] = useState("");
  const [currentQuestion, setCurrentQuestion] = useState(null);

  useEffect(() => {
    socket.on("joined_success", () => {
      setStatus("waiting");
      setError("");
    });

    socket.on("game_started", () => {
      setStatus("ready");
      setTimeout(() => setStatus("playing"), 2000);
    });

    socket.on("new_question", (question) => {
      setCurrentQuestion(question);
      setStatus("playing");
      setAnswerResult(null);
    });

    socket.on("answer_result", (result) => {
      setAnswerResult(result);
      setStatus("answered");
    });

    socket.on("show_scores", () => {
      setStatus("scores");
    });

    socket.on("game_over", () => {
      setStatus("game_over");
    });

    socket.on("error", (msg) => {
      setError(msg);
    });

    socket.on("host_left", () => {
      setStatus("host_left");
    });

    return () => {
      socket.off("joined_success");
      socket.off("game_started");
      socket.off("new_question");
      socket.off("answer_result");
      socket.off("show_scores");
      socket.off("game_over");
      socket.off("error");
      socket.off("host_left");
    };
  }, []);

  const joinGame = () => {
    if(!username.trim() || !pin.trim()) {
      setError("Lütfen tüm alanları doldurun!");
      return;
    }
    socket.emit("join_game", { pin, username: username.trim() });
  };

  const sendAnswer = (index) => {
    socket.emit("submit_answer", { pin, answerIndex: index, timeLeft: 20 });
  };

  // LOGIN SCREEN
  if (status === 'login') {
    return (
      <div className="h-screen bg-gradient-to-br from-purple-600 via-pink-500 to-red-500 flex flex-col items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-32 h-32 bg-white/20 rounded-full blur-xl animate-float"></div>
          <div className="absolute bottom-20 right-10 w-40 h-40 bg-white/20 rounded-full blur-xl animate-float-delayed"></div>
        </div>

        <div className="relative z-10 w-full max-w-md space-y-6 animate-slideUp">
          <div className="text-center mb-8">
            <h1 className="text-6xl font-black text-white drop-shadow-2xl mb-2">Kahoot!</h1>
            <p className="text-white/90 text-xl font-semibold">Quiz'e katıl</p>
          </div>

          <div className="bg-white rounded-3xl shadow-2xl p-8 space-y-5">
            {error && (
              <div className="bg-red-100 border-2 border-red-500 text-red-700 px-4 py-3 rounded-xl text-center font-bold">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label className="block text-gray-700 font-bold text-sm pl-1">Game PIN</label>
              <input
                type="text"
                placeholder="PIN kodunu gir"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="w-full border-4 border-gray-200 p-4 rounded-2xl text-center text-3xl font-black focus:outline-none focus:border-purple-500 transition-all bg-gray-50 focus:bg-white"
                maxLength={6}
              />
            </div>

            <div className="space-y-2">
              <label className="block text-gray-700 font-bold text-sm pl-1">Nickname</label>
              <input
                type="text"
                placeholder="İsmini gir"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && joinGame()}
                className="w-full border-4 border-gray-200 p-4 rounded-2xl text-center text-2xl font-bold focus:outline-none focus:border-purple-500 transition-all bg-gray-50 focus:bg-white"
                maxLength={20}
              />
            </div>

            <button
              onClick={joinGame}
              disabled={!username || !pin}
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-5 rounded-2xl font-black text-2xl hover:scale-105 transition-all shadow-[0_8px_0_rgb(79,70,229)] hover:shadow-[0_4px_0_rgb(79,70,229)] hover:translate-y-1 active:shadow-none active:translate-y-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:translate-y-0"
            >
              GİR
            </button>
          </div>
        </div>
      </div>
    );
  }

  // WAITING/READY SCREEN
  if (status === 'waiting' || status === 'ready') {
    return (
      <div className="h-screen bg-gradient-to-br from-blue-500 to-cyan-500 flex flex-col items-center justify-center text-white p-6">
        <div className="text-center space-y-8 animate-fadeIn">
          <div className="relative">
            <div className="absolute inset-0 bg-white/30 rounded-full blur-3xl animate-ping"></div>
            <Crown className="relative w-32 h-32 mx-auto text-yellow-300 drop-shadow-2xl animate-bounce" />
          </div>
          <div className="space-y-3">
            <h2 className="text-5xl font-black">Harika, {username}!</h2>
            <p className="text-2xl font-semibold text-blue-100">
              {status === 'waiting' ? 'Oyun başlamak üzere...' : 'HAZIR OL!'}
            </p>
          </div>
          <div className="flex gap-2 justify-center">
            <div className="w-3 h-3 bg-white rounded-full animate-bounce"></div>
            <div className="w-3 h-3 bg-white rounded-full animate-bounce delay-150"></div>
            <div className="w-3 h-3 bg-white rounded-full animate-bounce delay-300"></div>
          </div>
        </div>
      </div>
    );
  }

  // ANSWERED SCREEN
  if (status === 'answered' && answerResult) {
    return (
      <div className={`h-screen flex flex-col items-center justify-center text-white p-6 ${
        answerResult.correct
          ? 'bg-gradient-to-br from-green-500 to-emerald-600'
          : 'bg-gradient-to-br from-red-500 to-pink-600'
      }`}>
        <div className="text-center space-y-8 animate-scaleIn">
          <div className="relative">
            <div className="absolute inset-0 bg-white/30 rounded-full blur-3xl"></div>
            <div className="relative text-9xl animate-bounce">
              {answerResult.correct ? '✓' : '✗'}
            </div>
          </div>
          <div className="space-y-3">
            <h2 className="text-5xl font-black">
              {answerResult.correct ? 'DOĞRU!' : 'YANLIŞ!'}
            </h2>
            {answerResult.correct ? (
              <div className="space-y-2">
                <p className="text-3xl font-bold text-yellow-200">+{answerResult.points} puan</p>
                <p className="text-xl">Toplam: {answerResult.newScore} puan</p>
              </div>
            ) : (
              <p className="text-2xl font-semibold opacity-90">Daha hızlı ol!</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // SCORES SCREEN
  if (status === 'scores') {
    return (
      <div className="h-screen bg-gradient-to-br from-indigo-500 to-purple-600 flex flex-col items-center justify-center text-white p-6">
        <div className="text-center space-y-8 animate-fadeIn">
          <Trophy className="w-24 h-24 mx-auto text-yellow-300 animate-bounce" />
          <div className="space-y-3">
            <h2 className="text-4xl font-black">Skorlar Gösteriliyor</h2>
            <p className="text-xl font-semibold text-purple-200">Sonraki soruya hazırlan!</p>
          </div>
        </div>
      </div>
    );
  }

  // GAME OVER
  if (status === 'game_over') {
    return (
      <div className="h-screen bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500 flex flex-col items-center justify-center text-white p-6">
        <div className="text-center space-y-8 animate-fadeIn">
          <Trophy className="w-32 h-32 mx-auto text-yellow-200 animate-bounce" />
          <h1 className="text-6xl font-black drop-shadow-2xl">Oyun Bitti!</h1>
          <p className="text-2xl font-semibold">Sonuçlar host ekranında...</p>
        </div>
      </div>
    );
  }

  // HOST LEFT
  if (status === 'host_left') {
    return (
      <div className="h-screen bg-gradient-to-br from-gray-600 to-gray-800 flex flex-col items-center justify-center text-white p-6">
        <div className="text-center space-y-8">
          <div className="text-9xl">😞</div>
          <h1 className="text-5xl font-black">Host Ayrıldı</h1>
          <p className="text-xl">Oyun sonlandırıldı</p>
          <a href="/play" className="inline-block px-8 py-4 bg-white text-gray-800 rounded-2xl font-bold hover:scale-105 transition-all">
            Yeni Oyuna Katıl
          </a>
        </div>
      </div>
    );
  }

  // PLAYING SCREEN (ANSWER BUTTONS)
  if (status === 'playing' && currentQuestion) {
    return (
      <div className="h-screen bg-gradient-to-br from-indigo-600 to-purple-700 flex flex-col">
        {/* Soru Başlığı */}
        <div className="bg-white p-6 md:p-10 shadow-2xl">
          <div className="max-w-4xl mx-auto text-center">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-purple-600 font-bold">
                Soru {currentQuestion.questionNumber} / {currentQuestion.totalQuestions}
              </div>
              {currentQuestion.timeLimit && (
                <div className="flex items-center gap-2 text-sm text-orange-600 font-bold">
                  <Clock className="w-4 h-4" />
                  {currentQuestion.timeLimit} saniye
                </div>
              )}
            </div>
            <h2 className="text-2xl md:text-4xl font-black text-gray-800 leading-tight">
              {currentQuestion.question}
            </h2>
          </div>
        </div>

        {/* Cevap Butonları */}
        <div className="flex-1 grid grid-cols-2 grid-rows-2 gap-4 p-4">
          {colors.map((color, i) => (
            <button
              key={i}
              onClick={() => sendAnswer(i)}
              className={`${color.bg} ${color.shadow} active:shadow-none active:translate-y-2 rounded-3xl flex flex-col items-center justify-center text-white transition-all hover:scale-105 group`}
            >
              <span className="text-6xl md:text-9xl drop-shadow-2xl group-hover:scale-125 transition-transform mb-2">
                {color.icon}
              </span>
              <span className="text-lg md:text-2xl font-bold bg-black/30 backdrop-blur-sm px-4 py-2 rounded-xl">
                {currentQuestion.options[i]}
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return null;
}

// === ANA SAYFA ===
function HomePage() {
  return (
    <div className="h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute top-0 left-0 w-96 h-96 bg-purple-400 rounded-full blur-3xl opacity-30 animate-pulse"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-pink-400 rounded-full blur-3xl opacity-30 animate-pulse delay-1000"></div>
      </div>

      <div className="relative z-10 text-center space-y-12 max-w-4xl">
        <div className="space-y-4 animate-fadeIn">
          <h1 className="text-8xl font-black text-white drop-shadow-2xl tracking-tight">
            Kahoot!
          </h1>
          <p className="text-3xl font-bold text-white/90">Öğrenmenin en eğlenceli yolu</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-6 justify-center animate-slideUp">
          <Link
            to="/host"
            className="group px-12 py-6 bg-white text-purple-700 rounded-2xl text-2xl font-black hover:scale-110 transition-all shadow-2xl hover:shadow-white/50 flex items-center justify-center gap-3"
          >
            <Crown className="w-8 h-8 group-hover:text-yellow-500 transition-colors" />
            Öğretmen (Host)
          </Link>
          <Link
            to="/play"
            className="group px-12 py-6 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-2xl text-2xl font-black hover:scale-110 transition-all shadow-2xl hover:shadow-green-500/50 flex items-center justify-center gap-3"
          >
            <Play className="w-8 h-8 group-hover:animate-pulse" />
            Öğrenci (Oyna)
          </Link>
        </div>

        <div className="flex flex-wrap gap-8 justify-center text-white/80 text-lg animate-fadeIn">
          <div className="flex items-center gap-2">
            <Zap className="w-6 h-6" />
            <span>Hızlı ve Eğlenceli</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="w-6 h-6" />
            <span>Çok Oyunculu</span>
          </div>
          <div className="flex items-center gap-2">
            <Trophy className="w-6 h-6" />
            <span>Yarışma Modu</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// === ANA ROUTING ===
function App() {
  return (
    <AuthProvider>
      <GameProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/host" element={<HostPasswordGate><HostScreen /></HostPasswordGate>} />
            <Route path="/host/create" element={<HostPasswordGate><QuizCreator /></HostPasswordGate>} />
            <Route path="/host/library" element={<HostPasswordGate><QuizLibrary /></HostPasswordGate>} />
            <Route path="/host/:gameId" element={<HostPasswordGate><HostScreen /></HostPasswordGate>} />
            <Route path="/play" element={<PlayerScreen />} />
          </Routes>
        </BrowserRouter>
      </GameProvider>
    </AuthProvider>
  );
}

export default App;
