document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/index.html';
        return;
    }

    const userGreeting = document.getElementById('user-greeting');
    const logoutBtn = document.getElementById('logout-btn');
    const taskList = document.getElementById('task-list');
    const addTaskForm = document.getElementById('add-task-form');
    const taskTitleInput = document.getElementById('task-title');
    const addTaskBtn = document.getElementById('add-task-btn');
    const addTaskError = document.getElementById('add-task-error');
    const searchInput = document.getElementById('search-input');
    const filterSelect = document.getElementById('filter-select');
    const emptyState = document.getElementById('empty-state');
    const pendingCount = document.getElementById('pending-count');

    // Fetch user profile
    async function fetchUser() {
        try {
            const res = await fetch('/api/auth/me', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.status === 401) {
                throw new Error('Session expired');
            }
            const data = await res.json();
            userGreeting.innerText = `Hello, ${data.username}!`;
        } catch (error) {
            console.error('Error fetching user:', error);
            localStorage.removeItem('token');
            window.location.href = '/index.html';
        }
    }

    // Fetch tasks
    async function fetchTasks() {
        try {
            const search = searchInput.value.trim();
            const status = filterSelect.value;
            let url = '/api/todos?';
            
            if (search) url += `search=${encodeURIComponent(search)}&`;
            if (status !== 'all') url += `status=${status}&`;

            const res = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (res.status === 401) {
                localStorage.removeItem('token');
                window.location.href = '/index.html';
                return;
            }

            const tasks = await res.json();
            renderTasks(tasks);
        } catch (error) {
            console.error('Error fetching tasks:', error);
        }
    }

    // Render tasks
    function renderTasks(tasks) {
        taskList.innerHTML = '';
        
        let pending = 0;

        if (tasks.length === 0) {
            emptyState.style.display = 'block';
        } else {
            emptyState.style.display = 'none';
            tasks.forEach(task => {
                if (!task.completed) pending++;

                const li = document.createElement('li');
                li.className = task.completed ? 'task-item completed' : 'task-item';
                li.innerHTML = `
                    <div class="task-content">
                        <input type="checkbox" class="task-checkbox" data-id="${task._id}" ${task.completed ? 'checked' : ''}>
                        <span class="task-title">${escapeHTML(task.title)}</span>
                    </div>
                    <div class="task-actions">
                        <button class="delete-btn" data-id="${task._id}" aria-label="Delete task" title="Delete task">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="pointer-events: none;"><path d="M3 6h18"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                        </button>
                    </div>
                `;
                taskList.appendChild(li);
            });
        }

        pendingCount.innerText = `${pending} task${pending !== 1 ? 's' : ''} pending`;
    }

    function escapeHTML(str) {
        const div = document.createElement('div');
        div.innerText = str;
        return div.innerHTML;
    }

    // Add Task
    addTaskForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        addTaskError.innerText = '';
        const title = taskTitleInput.value.trim();

        if (!title) {
            addTaskError.innerText = 'Task cannot be empty';
            return;
        }

        try {
            addTaskBtn.disabled = true;
            addTaskBtn.innerText = 'Saving...';

            const res = await fetch('/api/todos', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ title })
            });

            if (!res.ok) {
                throw new Error('Failed to add task');
            }

            taskTitleInput.value = '';
            fetchTasks();
        } catch (error) {
            addTaskError.innerText = error.message;
        } finally {
            addTaskBtn.disabled = false;
            addTaskBtn.innerText = 'Add Task';
        }
    });

    // Event delegation for complete/delete
    taskList.addEventListener('click', async (e) => {
        if (e.target.classList.contains('task-checkbox')) {
            const id = e.target.getAttribute('data-id');
            const completed = e.target.checked;
            
            try {
                await fetch(`/api/todos/${id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ completed })
                });
                fetchTasks();
            } catch (error) {
                console.error('Error updating task:', error);
                e.target.checked = !completed; // revert
            }
        }

        if (e.target.classList.contains('delete-btn')) {
            const id = e.target.getAttribute('data-id');
            const btn = e.target;
            const originalHTML = btn.innerHTML;
            
            try {
                btn.disabled = true;
                btn.innerHTML = '<span style="font-size: 0.8rem;">...</span>';
                await fetch(`/api/todos/${id}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                fetchTasks();
            } catch (error) {
                console.error('Error deleting task:', error);
                btn.disabled = false;
                btn.innerHTML = originalHTML;
            }
        }
    });

    // Search and Filter
    let searchTimeout;
    searchInput.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(fetchTasks, 300);
    });

    filterSelect.addEventListener('change', fetchTasks);

    // Logout
    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('token');
        window.location.href = '/index.html';
    });

    // Initial fetch
    fetchUser();
    fetchTasks();
});
