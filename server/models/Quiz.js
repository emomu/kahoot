const mongoose = require('mongoose');

const quizSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        default: ''
    },
    questions: [{
        question: {
            type: String,
            required: true
        },
        options: {
            type: [String],
            required: true,
            validate: {
                validator: function(v) {
                    return v.length === 4;
                },
                message: 'Her soruda tam 4 şık olmalı!'
            }
        },
        correctAnswer: {
            type: Number,
            required: true,
            min: 0,
            max: 3
        },
        timeLimit: {
            type: Number,
            default: 20,
            min: 5,
            max: 120
        }
    }],
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Quiz', quizSchema);
