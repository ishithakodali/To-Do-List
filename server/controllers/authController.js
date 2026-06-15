const User = require('../models/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { validationResult, body } = require('express-validator');

// Register a new user
exports.register = [
    // Validation middleware
    body('username').notEmpty().withMessage('Username is required').trim(),
    body('email').isEmail().withMessage('Invalid email format').normalizeEmail(),
    body('password')
        .isLength({ min: 8 }).withMessage('Password must contain at least 8 characters, one uppercase letter, one lowercase letter and one number')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/).withMessage('Password must contain at least 8 characters, one uppercase letter, one lowercase letter and one number'),
    body('confirmPassword').custom((value, { req }) => {
        if (value !== req.body.password) {
            throw new Error('Passwords do not match');
        }
        return true;
    }),

    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ message: errors.array()[0].msg });
        }

        const { username, email, password } = req.body;

        try {
            const existingUsername = await User.findOne({ username });
            if (existingUsername) {
                return res.status(400).json({ message: 'Username already exists' });
            }

            const existingEmail = await User.findOne({ email });
            if (existingEmail) {
                return res.status(400).json({ message: 'Email already exists' });
            }

            const salt = await bcrypt.genSalt(10);
            const passwordHash = await bcrypt.hash(password, salt);

            const user = new User({
                username,
                email,
                passwordHash
            });

            await user.save();

            res.status(201).json({ message: 'User registered successfully' });
        } catch (error) {
            console.error('Registration Error:', error);
            res.status(500).json({ message: 'Server error during registration' });
        }
    }
];

// Login user
exports.login = async (req, res) => {
    const { email, username, password } = req.body;

    if (!password || (!email && !username)) {
        return res.status(400).json({ message: 'Invalid credentials' });
    }

    try {
        const query = email ? { email: email.toLowerCase() } : { username };
        const user = await User.findOne(query);

        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({ token, username: user.username });
    } catch (error) {
        console.error('Login Error:', error);
        res.status(500).json({ message: 'Server error during login' });
    }
};

// Get current user
exports.getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('username email -_id');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(user);
    } catch (error) {
        console.error('GetMe Error:', error);
        res.status(500).json({ message: 'Server error fetching user profile' });
    }
};
