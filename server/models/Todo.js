const mongoose = require('mongoose');

const todoSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    completed: {
        type: Boolean,
        default: false
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    dueDate: {
        type: Date,
        default: null
    },
    reminderMinutes: {
        type: Number,
        default: 0
    },
    reminderSent: {
        type: Boolean,
        default: false
    },
    dueNotificationSent: {
        type: Boolean,
        default: false
    },
    overdueNotificationSent: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Todo', todoSchema);
