const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/kahoot';
        const conn = await mongoose.connect(mongoURI);

        console.log(`✅ MongoDB Bağlantısı Başarılı: ${conn.connection.host}`);
        console.log(`📊 Database: ${conn.connection.name}`);
    } catch (error) {
        console.error(`❌ MongoDB Bağlantı Hatası: ${error.message}`);
        console.error('💡 MongoDB\'nin çalıştığından emin olun: brew services start mongodb-community');
        process.exit(1);
    }
};

module.exports = connectDB;
