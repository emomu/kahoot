# Kahoot Clone - Quiz Oyunu

Modern, eğlenceli ve etkileşimli bir quiz oyunu platformu. React, Node.js, MongoDB ve Socket.IO ile geliştirilmiştir.

## 🎮 Özellikler

- ✨ **Quiz Oluşturma**: Özel quizlerinizi oluşturun
- ⏱️ **Soru Süreleri**: Her soru için farklı süre ayarlayın (5-120 saniye)
- 🎯 **Gerçek Zamanlı Oyun**: Socket.IO ile anlık çok oyunculu deneyim
- 📱 **Mobil Uyumlu**: Telefonlardan oynanabilir
- 🏆 **Puan Sistemi**: Hız bonuslu puanlama
- 📊 **MongoDB Entegrasyonu**: Kalıcı veri depolama
- 🔗 **QR Kod**: Kolay katılım için QR kod desteği

## 📋 Gereksinimler

- Node.js (v16 veya üzeri)
- MongoDB (v5 veya üzeri)
- npm veya yarn

## 🚀 Kurulum

### 1. Projeyi İndirin

```bash
git clone <repository-url>
cd kahoot
```

### 2. MongoDB'yi Başlatın

```bash
# MongoDB kurulu değilse (macOS)
brew install mongodb-community

# MongoDB'yi başlatın
brew services start mongodb-community

# VEYA manuel olarak
mongod --dbpath ./mongodb-data --port 27017
```

### 3. Server Kurulumu

```bash
cd server
npm install

# .env dosyasını oluşturun
cp .env.example .env

# Server'ı başlatın
npm run dev
```

### 4. Client Kurulumu

```bash
cd client
npm install

# .env dosyasını oluşturun
cp .env.example .env

# Client'ı başlatın
npm run dev
```

## 🔧 Yapılandırma

### Server (.env)

```env
PORT=3001
MONGODB_URI=mongodb://localhost:27017/kahoot
CLIENT_URL=http://localhost:5173
NODE_ENV=development
```

### Client (.env)

```env
VITE_API_URL=http://localhost:3001
VITE_SOCKET_URL=http://localhost:3001
```

## 📖 Kullanım

1. **Quiz Oluşturma**:
   - Host ekranından "Yeni Quiz" seçin
   - Soru ve şıkları girin
   - Her soru için süre ayarlayın
   - Quiz'i kaydedin

2. **Oyun Başlatma**:
   - Quiz kütüphanesinden bir quiz seçin
   - "Oyunu Başlat" butonuna tıklayın
   - PIN kodunu oyunculara verin

3. **Oyuna Katılma**:
   - `/play` sayfasına gidin
   - PIN kodunu girin
   - İsminizi girin ve katılın

## 🏗️ Proje Yapısı

```
kahoot/
├── server/                # Backend (Node.js + Express)
│   ├── config/           # Yapılandırma dosyaları
│   ├── models/           # MongoDB modelleri
│   ├── index.js          # Ana server dosyası
│   └── .env              # Ortam değişkenleri
│
├── client/               # Frontend (React + Vite)
│   ├── src/
│   │   ├── App.jsx       # Ana uygulama
│   │   └── main.jsx      # Giriş noktası
│   └── .env              # Ortam değişkenleri
│
└── mongodb-data/         # MongoDB veri dizini (gitignore'da)
```

## 🛠️ Teknolojiler

### Backend
- Node.js
- Express.js
- Socket.IO
- MongoDB + Mongoose
- dotenv

### Frontend
- React 18
- React Router v6
- Socket.IO Client
- Tailwind CSS
- Lucide React (İkonlar)
- qrcode.react

## 📡 API Endpoints

### Quiz Endpoints
- `POST /api/quiz/create` - Yeni quiz oluştur
- `GET /api/quiz/list` - Tüm quizleri listele
- `GET /api/quiz/:quizId` - Quiz detayı
- `DELETE /api/quiz/:quizId` - Quiz sil

### Socket Events

**Host Events:**
- `create_game` - Oyun oluştur
- `start_game` - Oyunu başlat
- `next_question` - Sonraki soru

**Player Events:**
- `join_game` - Oyuna katıl
- `submit_answer` - Cevap gönder

## 🎯 Route Yapısı

- `/` - Ana sayfa
- `/host` - Host seçim ekranı
- `/host/create` - Quiz oluştur
- `/host/library` - Quiz kütüphanesi
- `/host/:gameId` - Oyun ekranı
- `/play` - Oyuncu giriş ekranı

## 🐛 Sorun Giderme

### MongoDB Bağlantı Hatası
```bash
# MongoDB'nin çalıştığını kontrol edin
mongosh --eval "db.adminCommand('ping')"

# Çalışmıyorsa başlatın
brew services start mongodb-community
```

### Port Zaten Kullanılıyor
```bash
# Portları değiştirin (.env dosyasında)
# VEYA çalışan işlemi sonlandırın
lsof -ti:3001 | xargs kill -9
```

## 📝 Lisans

Bu proje eğitim amaçlıdır.

## 👨‍💻 Geliştirici

Emirhan Soylu

---

🎮 Eğlenceli oyunlar!
