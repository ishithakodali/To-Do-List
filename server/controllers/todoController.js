const Todo = require('../models/Todo');

// Create a new todo
exports.createTodo = async (req, res) => {
    try {
        const { title } = req.body;
        
        if (!title || title.trim() === '') {
            return res.status(400).json({ message: 'Title is required' });
        }

        const newTodo = new Todo({
            title,
            userId: req.user.id
        });

        const savedTodo = await newTodo.save();
        res.status(201).json(savedTodo);
    } catch (error) {
        console.error('Create Todo Error:', error);
        res.status(500).json({ message: 'Server error while creating task' });
    }
};

// Get all todos for current user
exports.getTodos = async (req, res) => {
    try {
        const { status, search } = req.query;
        let query = { userId: req.user.id };

        // Filtering
        if (status === 'completed') {
            query.completed = true;
        } else if (status === 'pending') {
            query.completed = false;
        }

        // Searching (case-insensitive on title)
        if (search) {
            query.title = { $regex: search, $options: 'i' };
        }

        const todos = await Todo.find(query).sort({ createdAt: -1 });
        res.json(todos);
    } catch (error) {
        console.error('Get Todos Error:', error);
        res.status(500).json({ message: 'Server error while fetching tasks' });
    }
};

// Update a todo
exports.updateTodo = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, completed } = req.body;

        // Ensure user owns the todo
        const todo = await Todo.findOne({ _id: id, userId: req.user.id });
        
        if (!todo) {
            return res.status(404).json({ message: 'Todo not found' });
        }

        if (title !== undefined) todo.title = title;
        if (completed !== undefined) todo.completed = completed;

        const updatedTodo = await todo.save();
        res.json(updatedTodo);
    } catch (error) {
        console.error('Update Todo Error:', error);
        res.status(500).json({ message: 'Server error while updating task' });
    }
};

// Delete a todo
exports.deleteTodo = async (req, res) => {
    try {
        const { id } = req.params;

        const todo = await Todo.findOneAndDelete({ _id: id, userId: req.user.id });

        if (!todo) {
            return res.status(404).json({ message: 'Todo not found' });
        }

        res.json({ message: 'Todo deleted successfully' });
    } catch (error) {
        console.error('Delete Todo Error:', error);
        res.status(500).json({ message: 'Server error while deleting task' });
    }
};
