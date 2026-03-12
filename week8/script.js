// ===========================
// Storage Helper - Handles localStorage with JSON parsing
// ===========================
class StorageHelper {
    constructor(storageKey = 'listflow_tasks') {
        this.storageKey = storageKey;
    }

    /**
     * Get all data from localStorage
     * @returns {Array} Parsed data or empty array if not found
     */
    getAll() {
        try {
            const data = localStorage.getItem(this.storageKey);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error('Error reading from localStorage:', error);
            return [];
        }
    }

    /**
     * Save all data to localStorage
     * @param {Array} data - Data to save
     * @returns {boolean} Success status
     */
    setAll(data) {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(data));
            return true;
        } catch (error) {
            console.error('Error writing to localStorage:', error);
            return false;
        }
    }

    /**
     * Get a single item by ID
     * @param {number} id - Item ID
     * @returns {Object|null} Item or null if not found
     */
    getById(id) {
        const items = this.getAll();
        return items.find(item => item.id === id) || null;
    }

    /**
     * Create a new item
     * @param {Object} item - Item to create
     * @returns {Object} Created item with ID
     */
    create(item) {
        const items = this.getAll();
        const newItem = {
            ...item,
            id: item.id || Date.now(),
            createdAt: item.createdAt || new Date().toISOString()
        };
        items.push(newItem);
        this.setAll(items);
        return newItem;
    }

    /**
     * Update an existing item
     * @param {number} id - Item ID
     * @param {Object} updates - Fields to update
     * @returns {Object|null} Updated item or null if not found
     */
    update(id, updates) {
        const items = this.getAll();
        const index = items.findIndex(item => item.id === id);
        if (index === -1) return null;

        items[index] = { ...items[index], ...updates };
        this.setAll(items);
        return items[index];
    }

    /**
     * Delete an item by ID
     * @param {number} id - Item ID
     * @returns {boolean} Success status
     */
    delete(id) {
        const items = this.getAll();
        const filtered = items.filter(item => item.id !== id);
        if (filtered.length === items.length) return false; // Item not found
        this.setAll(filtered);
        return true;
    }

    /**
     * Clear all data
     * @returns {boolean} Success status
     */
    clear() {
        try {
            localStorage.removeItem(this.storageKey);
            return true;
        } catch (error) {
            console.error('Error clearing localStorage:', error);
            return false;
        }
    }

    /**
     * Export data as JSON string
     * @returns {string} JSON string of all data
     */
    export() {
        return JSON.stringify(this.getAll(), null, 2);
    }

    /**
     * Import data from JSON string
     * @param {string} jsonString - JSON string to import
     * @returns {boolean} Success status
     */
    import(jsonString) {
        try {
            const data = JSON.parse(jsonString);
            if (!Array.isArray(data)) throw new Error('Data must be an array');
            this.setAll(data);
            return true;
        } catch (error) {
            console.error('Error importing data:', error);
            return false;
        }
    }
}

// ===========================
// Enhanced Task Tracker App
// ===========================
class TaskTracker {
    constructor() {
        // Initialize storage helper
        this.storage = new StorageHelper('listflow_tasks');

        // Load tasks from storage
        this.tasks = this.storage.getAll();

        // Migrate old tasks - add createdAt if missing
        this.tasks = this.tasks.map(task => {
            if (!task.createdAt) {
                task.createdAt = new Date().toISOString();
            }
            return task;
        });
        this.storage.setAll(this.tasks);

        // App state
        this.currentFilter = 'all';
        this.currentSort = 'created';
        this.currentView = 'list';
        this.currentEditingTaskId = null;
        this.timerInterval = null;
        this.timerRemaining = 0;
        this.isQuickTimer = false;

        // Timer sessions storage
        this.timerSessions = this.loadTimerSessions();
        this.currentTimerSessionStart = null;

        // Initialize DOM elements and listeners
        this.initializeElements();
        this.attachEventListeners();

        // Render initial UI
        this.render();
    }

    // ===========================
    // Initialization
    // ===========================
    initializeElements() {
        // Input elements
        this.taskInput = document.getElementById('taskInput');
        this.dueDateInput = document.getElementById('dueDateInput');
        this.addBtn = document.getElementById('addBtn');

        // List view elements
        this.tasksList = document.getElementById('tasksList');
        this.emptyMessage = document.getElementById('emptyMessage');
        this.filterBtns = document.querySelectorAll('.filter-btn');
        this.sortBtns = document.querySelectorAll('.sort-btn');

        // View elements
        this.tabBtns = document.querySelectorAll('.tab-btn');
        this.listView = document.getElementById('listView');
        this.calendarView = document.getElementById('calendarView');
        this.weeklyCalendar = document.getElementById('weeklyCalendar');
        this.timerView = document.getElementById('timerView');
        this.timerHistoryList = document.getElementById('timerHistoryList');
        this.emptyTimerMessage = document.getElementById('emptyTimerMessage');
        this.quickTimerBtns = document.querySelectorAll('.quick-timer-btn');

        // Modal elements
        this.modal = document.getElementById('taskModal');
        this.modalClose = document.querySelector('.modal-close');
        this.modalTaskTitle = document.getElementById('modalTaskTitle');
        this.taskCreatedDate = document.getElementById('taskCreatedDate');
        this.taskNotes = document.getElementById('taskNotes');
        this.taskDueDate = document.getElementById('taskDueDate');
        this.saveTaskBtn = document.getElementById('saveTaskBtn');
        this.closeModalBtn = document.getElementById('closeModalBtn');

        // Timer elements
        this.timerMinutes = document.getElementById('timerMinutes');
        this.startTimerBtn = document.getElementById('startTimerBtn');
        this.stopTimerBtn = document.getElementById('stopTimerBtn');
        this.timerDisplay = document.getElementById('timerDisplay');

        // Quick timer display elements
        this.quickTimerDisplay = document.getElementById('quickTimerDisplay');
        this.timerDisplayLarge = document.querySelector('.timer-display-large');
        this.stopQuickTimerBtn = document.getElementById('stopQuickTimerBtn');
    }

    attachEventListeners() {
        // Add task
        this.addBtn.addEventListener('click', () => this.addTask());
        this.taskInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addTask();
        });

        // Filter tasks
        this.filterBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.filterBtns.forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.currentFilter = e.target.dataset.filter;
                this.render();
            });
        });

        // Sort tasks
        this.sortBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.sortBtns.forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.currentSort = e.target.dataset.sort;
                this.render();
            });
        });

        // View tabs
        this.tabBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.tabBtns.forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.currentView = e.target.dataset.view;
                this.switchView();
            });
        });

        // Modal
        this.modalClose.addEventListener('click', () => this.closeModal());
        this.closeModalBtn.addEventListener('click', () => this.closeModal());
        this.saveTaskBtn.addEventListener('click', () => this.saveTaskDetails());
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) this.closeModal();
        });

        // Timer
        this.startTimerBtn.addEventListener('click', () => this.startTimer());
        this.stopTimerBtn.addEventListener('click', () => this.stopTimer(true));

        // Quick timer buttons
        this.quickTimerBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const minutes = parseInt(e.target.dataset.minutes);
                this.startQuickTimer(minutes);
            });
        });

        // Stop quick timer button
        this.stopQuickTimerBtn.addEventListener('click', () => this.stopTimer(true));
    }

    // ===========================
    // CRUD Operations
    // ===========================

    /**
     * CREATE - Add a new task
     */
    addTask() {
        const text = this.taskInput.value.trim();
        if (!text) return;

        const task = {
            text: text,
            dueDate: this.dueDateInput.value || null,
            completed: false,
            notes: '',
            timerMinutes: 25
        };

        this.storage.create(task);
        this.tasks = this.storage.getAll();

        // Clear inputs
        this.taskInput.value = '';
        this.dueDateInput.value = '';

        // Re-render
        this.render();
    }

    /**
     * READ - Get a single task
     */
    getTask(id) {
        return this.tasks.find(t => t.id === id) || null;
    }

    /**
     * UPDATE - Update task details
     */
    updateTask(id, updates) {
        const updated = this.storage.update(id, updates);
        if (updated) {
            this.tasks = this.storage.getAll();
            this.render();
        }
        return updated;
    }

    /**
     * DELETE - Remove a task
     */
    deleteTask(id) {
        const success = this.storage.delete(id);
        if (success) {
            this.tasks = this.storage.getAll();
            this.render();
        }
        return success;
    }

    /**
     * Toggle task completion status
     */
    toggleTask(id) {
        const task = this.getTask(id);
        if (task) {
            this.updateTask(id, { completed: !task.completed });
        }
    }

    // ===========================
    // Modal Operations
    // ===========================

    openTaskDetails(id) {
        const task = this.getTask(id);
        if (!task) return;

        this.currentEditingTaskId = id;
        this.modalTaskTitle.textContent = task.text;
        this.taskCreatedDate.textContent = this.formatDateTime(task.createdAt);
        this.taskNotes.value = task.notes || '';
        this.taskDueDate.value = task.dueDate || '';
        this.timerMinutes.value = task.timerMinutes || 25;

        this.modal.classList.add('show');
    }

    closeModal() {
        this.modal.classList.remove('show');
        this.stopTimer();
        this.currentEditingTaskId = null;
    }

    saveTaskDetails() {
        if (!this.currentEditingTaskId) return;

        const updates = {
            notes: this.taskNotes.value,
            dueDate: this.taskDueDate.value || null,
            timerMinutes: parseInt(this.timerMinutes.value) || 25
        };

        this.updateTask(this.currentEditingTaskId, updates);
        this.closeModal();
    }

    // ===========================
    // Timer Operations
    // ===========================

    startTimer() {
        let minutes = parseInt(this.timerMinutes.value);

        // Validate timer input
        if (isNaN(minutes) || minutes < 1 || minutes > 120) {
            alert('Please enter a timer value between 1 and 120 minutes');
            this.timerMinutes.value = 25;
            return;
        }

        this.timerRemaining = minutes * 60;
        if (!this.currentTimerSessionStart) {
            this.currentTimerSessionStart = Date.now();
        }

        // Show appropriate timer display
        if (this.isQuickTimer) {
            this.quickTimerDisplay.style.display = 'block';
        } else {
            this.timerDisplay.style.display = 'block';
            this.startTimerBtn.style.display = 'none';
            this.stopTimerBtn.style.display = 'inline-block';
            this.timerMinutes.disabled = true;
        }

        this.updateTimerDisplay();
        this.timerInterval = setInterval(() => {
            this.timerRemaining--;
            this.updateTimerDisplay();

            if (this.timerRemaining <= 0) {
                this.stopTimer(false);
                this.playTimerAlert();
            }
        }, 1000);
    }

    stopTimer(recordSession = false) {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }

        // Record the session if user manually stopped it
        if (recordSession && this.currentTimerSessionStart) {
            const duration = Math.round((Date.now() - this.currentTimerSessionStart) / 1000 / 60);
            const task = this.currentEditingTaskId ? this.getTask(this.currentEditingTaskId) : null;

            this.recordTimerSession({
                taskName: task ? task.text : 'Quick Timer',
                duration: duration,
                completedAt: new Date().toISOString()
            });

            this.currentTimerSessionStart = null;
        }

        // Hide timer displays
        this.timerDisplay.style.display = 'none';
        this.quickTimerDisplay.style.display = 'none';

        // Reset modal timer UI
        this.startTimerBtn.style.display = 'inline-block';
        this.stopTimerBtn.style.display = 'none';
        this.timerMinutes.disabled = false;
        this.timerRemaining = 0;
        this.isQuickTimer = false;
    }

    updateTimerDisplay() {
        const mins = Math.floor(this.timerRemaining / 60);
        const secs = this.timerRemaining % 60;
        const displayText = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

        // Update both displays (whichever is visible will be shown)
        this.timerDisplay.textContent = displayText;
        this.timerDisplayLarge.textContent = displayText;
    }

    playTimerAlert() {
        // Record timer session
        if (this.currentTimerSessionStart) {
            const duration = Math.round((Date.now() - this.currentTimerSessionStart) / 1000 / 60);
            const task = this.currentEditingTaskId ? this.getTask(this.currentEditingTaskId) : null;

            this.recordTimerSession({
                taskName: task ? task.text : 'Quick Timer',
                duration: duration,
                completedAt: new Date().toISOString()
            });
        }
        alert('⏱️ Timer finished!');
    }

    // ===========================
    // Filtering & Sorting
    // ===========================

    getFilteredTasks() {
        let filtered = this.tasks;

        switch (this.currentFilter) {
            case 'active':
                filtered = filtered.filter(t => !t.completed);
                break;
            case 'completed':
                filtered = filtered.filter(t => t.completed);
                break;
        }

        return filtered;
    }

    getSortedTasks(tasks) {
        const sorted = [...tasks];

        if (this.currentSort === 'duedate') {
            sorted.sort((a, b) => {
                if (!a.dueDate && !b.dueDate) return 0;
                if (!a.dueDate) return 1;
                if (!b.dueDate) return -1;
                return new Date(a.dueDate) - new Date(b.dueDate);
            });
        } else if (this.currentSort === 'alphabetical') {
            sorted.sort((a, b) => a.text.localeCompare(b.text));
        } else {
            sorted.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        }

        return sorted;
    }

    // ===========================
    // View Operations
    // ===========================

    switchView() {
        // Remove active from all views
        this.listView.classList.remove('active');
        this.calendarView.classList.remove('active');
        this.timerView.classList.remove('active');

        if (this.currentView === 'list') {
            this.listView.classList.add('active');
            this.render();
        } else if (this.currentView === 'calendar') {
            this.calendarView.classList.add('active');
            this.renderCalendar();
        } else if (this.currentView === 'timers') {
            this.timerView.classList.add('active');
            this.renderTimerHistory();
        }
    }

    // ===========================
    // Rendering
    // ===========================

    render() {
        const filteredTasks = this.getFilteredTasks();
        const sortedTasks = this.getSortedTasks(filteredTasks);

        if (sortedTasks.length === 0) {
            this.tasksList.innerHTML = '';
            this.emptyMessage.style.display = 'block';
        } else {
            this.emptyMessage.style.display = 'none';
            this.tasksList.innerHTML = sortedTasks.map(task => this.createTaskElement(task)).join('');
            this.attachTaskEventListeners();
        }
    }

    createTaskElement(task) {
        const dueDate = task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date';
        const hasNotes = task.notes ? '📝' : '';

        return `
            <div class="task-item ${task.completed ? 'completed' : ''}">
                <div class="task-content">
                    <input
                        type="checkbox"
                        class="task-checkbox"
                        data-id="${task.id}"
                        ${task.completed ? 'checked' : ''}
                    >
                    <div class="task-info">
                        <span class="task-text">${this.escapeHtml(task.text)} ${hasNotes}</span>
                        <div class="task-details">
                            <div class="task-detail-row">
                                <strong>📅</strong> ${dueDate}
                            </div>
                            <div class="task-detail-row">
                                <strong>⏰</strong> ${this.formatDateTime(task.createdAt)}
                            </div>
                            ${task.notes ? `<div class="task-detail-row"><strong>📝</strong> ${this.escapeHtml(this.truncateText(task.notes, 50))}</div>` : ''}
                        </div>
                    </div>
                </div>
                <div class="task-actions">
                    <button class="btn btn-sm btn-details" data-id="${task.id}" data-action="details">Details</button>
                    <button class="btn btn-sm btn-danger delete-btn" data-id="${task.id}">Delete</button>
                </div>
            </div>
        `;
    }

    attachTaskEventListeners() {
        document.querySelectorAll('.task-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                this.toggleTask(parseInt(e.target.dataset.id));
            });
        });

        document.querySelectorAll('[data-action="details"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.openTaskDetails(parseInt(e.target.dataset.id));
            });
        });

        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                if (confirm('Delete this task?')) {
                    this.deleteTask(parseInt(e.target.dataset.id));
                }
            });
        });
    }

    renderCalendar() {
        const today = new Date();
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());

        this.weeklyCalendar.innerHTML = '';

        for (let i = 0; i < 7; i++) {
            const date = new Date(startOfWeek);
            date.setDate(startOfWeek.getDate() + i);
            const dateStr = date.toISOString().split('T')[0];

            const dayEl = document.createElement('div');
            dayEl.className = 'calendar-day';
            if (dateStr === today.toISOString().split('T')[0]) {
                dayEl.classList.add('today');
            }

            const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            const headerEl = document.createElement('div');
            headerEl.className = 'calendar-day-header';
            headerEl.textContent = `${dayNames[date.getDay()]} ${date.getDate()}`;
            dayEl.appendChild(headerEl);

            const tasksEl = document.createElement('div');
            tasksEl.className = 'calendar-day-tasks';

            const tasksForDay = this.tasks.filter(t => t.dueDate === dateStr);
            if (tasksForDay.length === 0) {
                const emptyEl = document.createElement('div');
                emptyEl.className = 'calendar-empty';
                emptyEl.textContent = 'No tasks';
                tasksEl.appendChild(emptyEl);
            } else {
                tasksForDay.forEach(task => {
                    const taskEl = document.createElement('div');
                    taskEl.className = `calendar-task ${task.completed ? 'completed' : ''}`;
                    taskEl.textContent = task.text;
                    taskEl.style.cursor = 'pointer';
                    taskEl.addEventListener('click', () => this.openTaskDetails(task.id));
                    tasksEl.appendChild(taskEl);
                });
            }

            dayEl.appendChild(tasksEl);
            this.weeklyCalendar.appendChild(dayEl);
        }
    }

    // ===========================
    // Utilities
    // ===========================

    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }

    /**
     * Truncate text at word boundary
     * @param {string} text - Text to truncate
     * @param {number} maxLength - Maximum length
     * @returns {string} Truncated text
     */
    truncateText(text, maxLength = 50) {
        if (text.length <= maxLength) return text;
        const truncated = text.substring(0, maxLength);
        const lastSpace = truncated.lastIndexOf(' ');
        return lastSpace > 0 ? truncated.substring(0, lastSpace) + '...' : truncated + '...';
    }

    /**
     * Format ISO date string to readable format
     * @param {string} isoString - ISO date string
     * @returns {string} Formatted date and time
     */
    formatDateTime(isoString) {
        if (!isoString) return 'Unknown';
        const date = new Date(isoString);
        const today = new Date();

        // Compare using date components (year, month, day) to avoid timezone issues
        const dateYear = date.getFullYear();
        const dateMonth = date.getMonth();
        const dateDay = date.getDate();

        const todayYear = today.getFullYear();
        const todayMonth = today.getMonth();
        const todayDay = today.getDate();

        const timeOnly = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        const dateOnly = date.toLocaleDateString();

        // Check if today using date components
        if (dateYear === todayYear && dateMonth === todayMonth && dateDay === todayDay) {
            return `Today at ${timeOnly}`;
        }

        // Check if yesterday using date components
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        const yesterdayYear = yesterday.getFullYear();
        const yesterdayMonth = yesterday.getMonth();
        const yesterdayDay = yesterday.getDate();

        if (dateYear === yesterdayYear && dateMonth === yesterdayMonth && dateDay === yesterdayDay) {
            return `Yesterday at ${timeOnly}`;
        }

        // Otherwise show full date and time
        return `${dateOnly} at ${timeOnly}`;
    }

    // ===========================
    // Timer Sessions
    // ===========================

    recordTimerSession(session) {
        const sessionData = {
            id: Date.now(),
            taskName: session.taskName,
            duration: session.duration,
            completedAt: session.completedAt
        };
        this.timerSessions.unshift(sessionData);
        this.saveTimerSessions();

        // Update timer history display if currently viewing it
        if (this.currentView === 'timers') {
            this.renderTimerHistory();
        }
    }

    loadTimerSessions() {
        try {
            const saved = localStorage.getItem('listflow_timer_sessions');
            return saved ? JSON.parse(saved) : [];
        } catch (error) {
            console.error('Error loading timer sessions:', error);
            return [];
        }
    }

    saveTimerSessions() {
        try {
            localStorage.setItem('listflow_timer_sessions', JSON.stringify(this.timerSessions));
        } catch (error) {
            console.error('Error saving timer sessions:', error);
        }
    }

    startQuickTimer(minutes) {
        this.timerMinutes.value = minutes;
        this.currentTimerSessionStart = Date.now();
        this.isQuickTimer = true;
        this.startTimer();
    }

    renderTimerHistory() {
        const stats = this.calculateTimerStats();

        // Update statistics
        document.getElementById('totalSessions').textContent = stats.totalSessions;
        document.getElementById('totalTime').textContent = this.formatDuration(stats.totalMinutes);
        document.getElementById('avgDuration').textContent = stats.avgDuration ? `${Math.round(stats.avgDuration)}m` : '0m';
        document.getElementById('todayTime').textContent = `${stats.todayMinutes}m`;

        // Render history list
        if (this.timerSessions.length === 0) {
            this.timerHistoryList.innerHTML = '';
            this.emptyTimerMessage.style.display = 'block';
        } else {
            this.emptyTimerMessage.style.display = 'none';
            this.timerHistoryList.innerHTML = this.timerSessions.map(session => `
                <div class="timer-session">
                    <div class="timer-session-info">
                        <div class="timer-session-task">${this.escapeHtml(session.taskName)}</div>
                        <div class="timer-session-details">${this.formatDateTime(session.completedAt)}</div>
                    </div>
                    <div class="timer-session-duration">${session.duration}m</div>
                </div>
            `).join('');
        }
    }

    calculateTimerStats() {
        const today = new Date();
        const todayYear = today.getFullYear();
        const todayMonth = today.getMonth();
        const todayDay = today.getDate();

        let totalMinutes = 0;
        let todayMinutes = 0;

        this.timerSessions.forEach(session => {
            totalMinutes += session.duration;

            // Use date components to avoid timezone issues
            const sessionDate = new Date(session.completedAt);
            const sessionYear = sessionDate.getFullYear();
            const sessionMonth = sessionDate.getMonth();
            const sessionDay = sessionDate.getDate();

            if (sessionYear === todayYear && sessionMonth === todayMonth && sessionDay === todayDay) {
                todayMinutes += session.duration;
            }
        });

        return {
            totalSessions: this.timerSessions.length,
            totalMinutes: totalMinutes,
            avgDuration: this.timerSessions.length > 0 ? totalMinutes / this.timerSessions.length : 0,
            todayMinutes: todayMinutes
        };
    }

    formatDuration(totalMinutes) {
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        if (hours === 0) return `${minutes}m`;
        return `${hours}h ${minutes}m`;
    }
}

// ===========================
// Initialize App
// ===========================
document.addEventListener('DOMContentLoaded', () => {
    window.taskApp = new TaskTracker();
});
