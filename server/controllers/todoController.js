const Todo = require('../models/Todo');

// Create a new todo
exports.createTodo = async (req, res) => {
    try {
        const { title, dueDate, reminderMinutes } = req.body;
        
        if (!title || title.trim() === '') {
            return res.status(400).json({ message: 'Title is required' });
        }

        const newTodo = new Todo({
            title,
            dueDate: dueDate ? new Date(dueDate) : null,
            reminderMinutes: reminderMinutes || 0,
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
        console.log('UPDATE REQUEST:', req.body);
        const { title, completed, dueDate, reminderMinutes, reminderSent, dueNotificationSent, overdueNotificationSent } = req.body;

        // Ensure user owns the todo
        const todo = await Todo.findOne({ _id: id, userId: req.user.id });
        
        if (!todo) {
            return res.status(404).json({ message: 'Todo not found' });
        }

        if (title !== undefined) todo.title = title;
        if (completed !== undefined) todo.completed = completed;
        
        // Update flags if explicitly sent (for scheduler updates)
        if (reminderSent !== undefined) todo.reminderSent = reminderSent;
        if (dueNotificationSent !== undefined) todo.dueNotificationSent = dueNotificationSent;
        if (overdueNotificationSent !== undefined) todo.overdueNotificationSent = overdueNotificationSent;

        // Reset flags if due date or reminder changes
        let resetFlags = false;
        
        if (dueDate !== undefined) {
            const newDate = dueDate ? new Date(dueDate) : null;
            if (String(todo.dueDate) !== String(newDate)) {
                todo.dueDate = newDate;
                resetFlags = true;
            }
        }
        
        if (reminderMinutes !== undefined && todo.reminderMinutes !== reminderMinutes) {
            todo.reminderMinutes = reminderMinutes;
            resetFlags = true;
        }

        if (resetFlags) {
            todo.reminderSent = false;
            todo.dueNotificationSent = false;
            todo.overdueNotificationSent = false;
        }

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
