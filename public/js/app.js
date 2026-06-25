document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/index.html';
        return;
    }

    // DOM Elements
    const userGreeting = document.getElementById('user-greeting');
    const logoutBtn = document.getElementById('logout-btn');
    const taskList = document.getElementById('task-list');
    const addTaskForm = document.getElementById('add-task-form');
    const taskTitleInput = document.getElementById('task-title');
    const taskDueDateInput = document.getElementById('task-due-date');
    const taskReminderSelect = document.getElementById('task-reminder');
    const addTaskBtn = document.getElementById('add-task-btn');
    const addTaskError = document.getElementById('add-task-error');
    
    const searchInput = document.getElementById('search-input');
    const filterSelect = document.getElementById('filter-select');
    const emptyState = document.getElementById('empty-state');
    const pendingCount = document.getElementById('pending-count');

    // Modal Elements
    const editModal = document.getElementById('edit-modal');
    const closeEditBtn = document.getElementById('close-modal-btn');
    const cancelEditBtn = document.getElementById('cancel-edit-btn');
    const editTaskForm = document.getElementById('edit-task-form');
    const editTaskId = document.getElementById('edit-task-id');
    const editTaskTitle = document.getElementById('edit-task-title');
    const editTaskDue = document.getElementById('edit-task-due');
    const editTaskReminder = document.getElementById('edit-task-reminder');
    const editTaskError = document.getElementById('edit-task-error');
    const saveEditBtn = document.getElementById('save-edit-btn');

    let currentTasks = [];

    // Helper: Convert local datetime-local string to UTC ISO string
    function localToUTC(localString) {
        if (!localString) return null;
        const [datePart, timePart] = localString.split('T');
        const [yyyy, mm, dd] = datePart.split('-').map(Number);
        const [hh, min] = timePart.split(':').map(Number);
        return new Date(yyyy, mm - 1, dd, hh, min).toISOString();
    }

    // Helper: Convert UTC ISO string to local datetime-local string
    function utcToLocalInput(utcString) {
        if (!utcString) return '';
        const date = new Date(utcString);
        const yyyy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        const hh = String(date.getHours()).padStart(2, '0');
        const min = String(date.getMinutes()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
    }

    // 1. Generate Reminder Options
    const reminderOptions = [
        { label: 'None', value: 0 },
        { label: '5 minutes', value: 5 },
        { label: '15 minutes', value: 15 },
        { label: '30 minutes', value: 30 },
        { label: '1 hour', value: 60 }
    ];

    reminderOptions.forEach(opt => {
        taskReminderSelect.add(new Option(opt.label, opt.value));
        editTaskReminder.add(new Option(opt.label, opt.value));
    });

    // 2. Notification Permissions
    if ('Notification' in window) {
        if (Notification.permission === 'default') {
            Notification.requestPermission();
        } else if (Notification.permission === 'denied') {
            const banner = document.createElement('div');
            banner.style.cssText = 'background: var(--bg-surface-hover); padding: 0.5rem; text-align: center; font-size: 0.85rem; color: var(--text-secondary); border-bottom: 1px solid var(--border-subtle);';
            banner.innerText = 'Browser notifications are disabled. Enable them in your browser settings to receive reminders.';
            document.querySelector('.app-header').prepend(banner);
        }
    }

    // Utility: Send Notification
    function sendNotification(title, body) {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(title, { body, icon: '/favicon.ico' });
        }
    }

    // 3. Fetch User
    async function fetchUser() {
        try {
            const res = await fetch('/api/auth/me', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.status === 401) throw new Error('Session expired');
            const data = await res.json();
            userGreeting.innerText = `Hello, ${data.username}!`;
        } catch (error) {
            localStorage.removeItem('token');
            window.location.href = '/index.html';
        }
    }

    // 4. Fetch Tasks
    async function fetchTasks() {
        try {
            const search = searchInput.value.trim();
            const status = filterSelect.value;
            let url = `/api/todos?`;
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
            currentTasks = await res.json();
            renderTasks(currentTasks);
        } catch (error) {
            console.error('Error fetching tasks:', error);
        }
    }

    // 5. Status Calculation
    function getTaskStatus(task, now) {
        if (task.completed) return { text: 'Completed', class: 'completed', icon: '🟢' };
        if (!task.dueDate) return null;
        
        const due = new Date(task.dueDate).getTime();
        const startOfToday = new Date(now).setHours(0,0,0,0);
        const endOfToday = new Date(now).setHours(23,59,59,999);
        const reminderStart = due - (task.reminderMinutes * 60000);

        if (now > due) return { text: 'Overdue', class: 'overdue', icon: '🔴' };
        
        // Due today but not yet in reminder window
        if (due >= startOfToday && due <= endOfToday && now < reminderStart) {
            return { text: 'Due Today', class: 'due-today', icon: '🔵' };
        }
        if (now >= reminderStart && now <= due && task.reminderMinutes > 0) {
            return { text: 'Due Soon', class: 'due-soon', icon: '🟡' };
        }
        return { text: 'Upcoming', class: 'upcoming', icon: '⚪' };
    }

    function escapeHTML(str) {
        const div = document.createElement('div');
        div.innerText = str;
        return div.innerHTML;
    }

    // 6. Render Tasks
    function renderTasks(tasks) {
        taskList.innerHTML = '';
        let pending = 0;
        const now = Date.now();

        if (tasks.length === 0) {
            emptyState.style.display = 'block';
        } else {
            emptyState.style.display = 'none';
            tasks.forEach(task => {
                if (!task.completed) pending++;
                
                const status = getTaskStatus(task, now);
                let metaHTML = '';
                
                if (task.dueDate) {
                    const dateObj = new Date(task.dueDate);
                    const dateFormatted = new Intl.DateTimeFormat(navigator.language, {
                        dateStyle: 'medium', timeStyle: 'short'
                    }).format(dateObj);
                    
                    const badge = status ? `<span class="badge ${status.class}">${status.icon} ${status.text}</span>` : '';
                    const countdown = !task.completed ? `<span class="task-countdown" data-due="${task.dueDate}"></span>` : '';
                    
                    metaHTML = `
                        <div class="task-meta">
                            ${badge}
                            <span class="task-date-display">📅 ${dateFormatted}</span>
                            ${countdown}
                        </div>
                    `;
                }

                const li = document.createElement('li');
                li.className = task.completed ? 'task-item completed' : 'task-item';
                li.innerHTML = `
                    <div class="task-content">
                        <input type="checkbox" class="task-checkbox" data-id="${task._id}" ${task.completed ? 'checked' : ''}>
                        <div>
                            <span class="task-title">${escapeHTML(task.title)}</span>
                            ${metaHTML}
                        </div>
                    </div>
                    <div class="task-actions" style="display: flex; gap: 0.25rem;">
                        <button class="edit-btn" data-id="${task._id}" aria-label="Edit task" title="Edit task">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="pointer-events: none;"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                        </button>
                        <button class="delete-btn" data-id="${task._id}" aria-label="Delete task" title="Delete task">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="pointer-events: none;"><path d="M3 6h18"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                        </button>
                    </div>
                `;
                taskList.appendChild(li);
            });
        }
        pendingCount.innerText = `${pending} task${pending !== 1 ? 's' : ''} pending`;
        updateCountdowns(); // Initial update
    }

    // 7. Add Task
    addTaskForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        addTaskError.innerText = '';
        const title = taskTitleInput.value.trim();
        const dueDate = taskDueDateInput.value;
        const reminderMinutes = parseInt(taskReminderSelect.value);

        if (!title) return;

        try {
            addTaskBtn.disabled = true;
            addTaskBtn.innerText = 'Saving...';
            const res = await fetch('/api/todos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ title, dueDate: localToUTC(dueDate), reminderMinutes })
            });
            if (!res.ok) throw new Error('Failed to add task');
            
            taskTitleInput.value = '';
            taskDueDateInput.value = '';
            taskReminderSelect.value = 0;
            fetchTasks();
        } catch (error) {
            addTaskError.innerText = error.message;
        } finally {
            addTaskBtn.disabled = false;
            addTaskBtn.innerText = 'Add Task';
        }
    });

    // 8. Event Delegation (Checkbox, Edit, Delete)
    taskList.addEventListener('click', async (e) => {
        // Completion
        const checkbox = e.target.closest('.task-checkbox');
        if (checkbox) {
            const id = checkbox.getAttribute('data-id');
            const completed = checkbox.checked;
            try {
                await fetch(`/api/todos/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ completed })
                });
                fetchTasks();
            } catch (error) {
                e.target.checked = !completed;
            }
        }

        // Delete
        const deleteBtn = e.target.closest('.delete-btn');
        if (deleteBtn) {
            const id = deleteBtn.getAttribute('data-id');
            try {
                e.target.disabled = true;
                await fetch(`/api/todos/${id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                fetchTasks();
            } catch (error) {
                e.target.disabled = false;
            }
        }

        // Open Edit Modal
        const editBtn = e.target.closest('.edit-btn');
        if (editBtn) {
            const id = editBtn.getAttribute('data-id');
            const task = currentTasks.find(t => t._id === id);
            if (task) {
                editTaskId.value = task._id;
                editTaskTitle.value = task.title;
                if (task.dueDate) {
                    editTaskDue.value = utcToLocalInput(task.dueDate);
                } else {
                    editTaskDue.value = '';
                }
                editTaskReminder.value = task.reminderMinutes || 0;
                editTaskError.innerText = '';
                editModal.style.display = 'flex';
            }
        }
    });

    // 9. Edit Modal Submission & Closing
    function closeModal() {
        editModal.style.display = 'none';
    }
    closeEditBtn.addEventListener('click', closeModal);
    cancelEditBtn.addEventListener('click', closeModal);

    editTaskForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        editTaskError.innerText = '';
        const id = editTaskId.value;
        const title = editTaskTitle.value.trim();
        const dueDate = editTaskDue.value;
        const reminderMinutes = parseInt(editTaskReminder.value);

        if (!title) return;

        try {
            saveEditBtn.disabled = true;
            saveEditBtn.innerText = 'Saving...';
            const res = await fetch(`/api/todos/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ title, dueDate: localToUTC(dueDate), reminderMinutes })
            });
            if (!res.ok) throw new Error('Failed to update task');
            closeModal();
            fetchTasks();
        } catch (error) {
            editTaskError.innerText = error.message;
        } finally {
            saveEditBtn.disabled = false;
            saveEditBtn.innerText = 'Save Changes';
        }
    });

    // 10. Countdown Timer Logic
    function updateCountdowns() {
        const now = Date.now();
        document.querySelectorAll('.task-countdown').forEach(el => {
            const dueStr = el.getAttribute('data-due');
            if (!dueStr) return;
            
            const dueTime = new Date(dueStr).getTime();
            const diff = dueTime - now;
            const absDiff = Math.abs(diff);
            
            const days = Math.floor(absDiff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((absDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const mins = Math.floor((absDiff % (1000 * 60 * 60)) / (1000 * 60));
            const secs = Math.floor((absDiff % (1000 * 60)) / 1000);
            
            let str = '';
            if (days > 0) str += `${days}d `;
            if (hours > 0) str += `${hours}h `;
            if (mins > 0 || (days === 0 && hours === 0)) str += `${mins}m `;
            if (days === 0 && hours === 0) str += `${secs}s`;
            
            str = str.trim();
            
            if (diff < 0) {
                el.innerText = `Overdue by ${str}`;
                el.classList.add('overdue');
            } else {
                el.innerText = `${str} left`;
                el.classList.remove('overdue');
            }
        });
    }
    setInterval(updateCountdowns, 1000);

    // 11. Notification Scheduler & Sleep/Resume Handling
    async function checkNotifications() {
        const permission = ('Notification' in window) ? Notification.permission : 'unsupported';
        if (permission !== 'granted') return;
        
        const now = Date.now();
        
        for (const task of currentTasks) {
            if (task.completed || !task.dueDate) continue;

            const due = new Date(task.dueDate).getTime();
            const reminderStart = due - ((task.reminderMinutes || 0) * 60000);
            let toUpdate = {};
            let notificationType = 'None';
            
            console.log('--- Notification Debug ---');
            console.log('Current Time:', new Date(now).toLocaleString());
            console.log('Due Date:', new Date(due).toLocaleString());
            console.log('Reminder Time:', new Date(reminderStart).toLocaleString());
            console.log('Task ID:', task._id);
            console.log('Task Title:', task.title);
            console.log('reminderSent:', task.reminderSent);
            console.log('dueNotificationSent:', task.dueNotificationSent);
            console.log('overdueNotificationSent:', task.overdueNotificationSent);
            console.log('Notification.permission:', permission);

            // Priority logic: Overdue -> Due -> Reminder
            if (now > due + 60000) {
                // OVERDUE (>1 min past due)
                if (!task.overdueNotificationSent) {
                    notificationType = 'Overdue';
                    sendNotification('⚠️ Task Overdue', `You haven't completed "${task.title}".`);
                    toUpdate = { overdueNotificationSent: true, dueNotificationSent: true, reminderSent: true };
                }
            } else if (now >= due) {
                // DUE (0 to 1 min past due)
                if (!task.dueNotificationSent) {
                    notificationType = 'Due';
                    sendNotification('⏰ Task Due', `Your task "${task.title}" is now due.`);
                    toUpdate = { dueNotificationSent: true, reminderSent: true };
                }
            } else if (task.reminderMinutes > 0 && now >= reminderStart) {
                // REMINDER
                if (!task.reminderSent) {
                    notificationType = 'Reminder';
                    sendNotification('🔔 Reminder', `Your task "${task.title}" is due in ${task.reminderMinutes} minutes.`);
                    toUpdate = { reminderSent: true };
                }
            }
            
            console.log('Notification Type Chosen:', notificationType);
            console.log('--------------------------');

            if (Object.keys(toUpdate).length > 0) {
                try {
                    await fetch(`/api/todos/${task._id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                        body: JSON.stringify(toUpdate)
                    });
                    Object.assign(task, toUpdate);
                    renderTasks(currentTasks);
                } catch (e) {
                    console.error('Error updating notification flags', e);
                }
            }
        }
    }

    checkNotifications();
    setInterval(checkNotifications, 10000);

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

    // Init
    fetchUser();
    fetchTasks();
});
