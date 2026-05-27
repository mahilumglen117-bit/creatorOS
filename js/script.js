// --- STATE MANAGEMENT ---
let appData = {
    tasks: [],
    revenue: [],
    streak: 0,
    lastActive: null,
    lastArchiveDate: null
};

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    checkAutoArchive();
    renderTasks();
    renderRevenue();
    renderRevenueList();
    renderDashboard();
    initCharts();
    updateStreak();
});

// --- LOCAL STORAGE ---
function loadData() {
    const saved = localStorage.getItem('creatorOS_data');
    if (saved) {
        appData = JSON.parse(saved);
    }
}

function saveData() {
    localStorage.setItem('creatorOS_data', JSON.stringify(appData));
}

// --- AUTO ARCHIVE LOGIC ---
function checkAutoArchive() {
    const today = new Date().toDateString();
    
    if (appData.lastArchiveDate !== today) {
        // Move yesterday's uncompleted tasks to completed with yesterday's date
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        
        appData.tasks.forEach(t => {
            if (!t.completed && t.dateCreated) {
                const createdDate = new Date(t.dateCreated).toDateString();
                // If task was created yesterday or earlier, mark as completed
                if (createdDate !== today) {
                    t.completed = true;
                    t.completedDate = yesterday.toISOString();
                }
            }
        });
        
        appData.lastArchiveDate = today;
        saveData();
    }
}

// --- SIDEBAR & NAV ---
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('mobile-overlay');
    
    if (sidebar.classList.contains('-translate-x-full')) {
        sidebar.classList.remove('-translate-x-full');
        overlay.classList.remove('hidden');
    } else {
        sidebar.classList.add('-translate-x-full');
        overlay.classList.add('hidden');
    }
}

function switchTab(tabName) {
    document.querySelectorAll('[id^="view-"]').forEach(el => el.classList.add('hidden-tab'));
    document.getElementById(`view-${tabName}`).classList.remove('hidden-tab');
    document.getElementById('page-title').innerText = tabName.charAt(0).toUpperCase() + tabName.slice(1);
    
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active-nav'));
    document.getElementById(`nav-${tabName}`).classList.add('active-nav');

    if (window.innerWidth < 768) {
        toggleSidebar();
    }

    if (tabName === 'revenue') {
        renderRevenueList();
        updateRevenueChart();
    }
    if (tabName === 'tasks') renderTasks();
}

// --- TASKS LOGIC ---
document.getElementById('add-task-form').addEventListener('submit', (e) => {
    e.preventDefault();
    
    const task = {
        id: Date.now(),
        title: document.getElementById('task-title').value,
        priority: document.getElementById('task-priority').value,
        platform: document.getElementById('task-platform').value || 'General',
        completed: false,
        completedDate: null,
        dateCreated: new Date().toISOString()
    };

    appData.tasks.push(task);
    saveData();
    renderTasks();
    renderDashboard();
    e.target.reset();
});

function renderTasks(filter = 'all') {
    const list = document.getElementById('task-list');
    list.innerHTML = '';

    const today = new Date().toDateString();
    
    // Active: not completed OR completed today
    const activeTasks = appData.tasks.filter(t => !t.completed || (t.completed && new Date(t.completedDate).toDateString() === today));
    
    // Archive: completed before today
    const archivedTasks = appData.tasks.filter(t => t.completed && new Date(t.completedDate).toDateString() !== today);

    // Sort active tasks by priority
    const priorityVal = { 'high': 3, 'medium': 2, 'low': 1 };
    activeTasks.sort((a, b) => {
        // Completed go to bottom
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        const priorityDiff = priorityVal[b.priority] - priorityVal[a.priority];
        if (priorityDiff !== 0) return priorityDiff;
        return new Date(a.dateCreated) - new Date(b.dateCreated);
    });

    // Render Active Tasks
    if (activeTasks.length > 0) {
        list.innerHTML = `<h3 class="text-lg font-semibold mb-4">Active Tasks</h3>`;
        
        activeTasks.forEach(task => {
            const badgeColor = task.priority === 'high' ? 'text-red-400' : (task.priority === 'medium' ? 'text-yellow-400' : 'text-blue-400');
            
            const el = document.createElement('div');
            el.className = 'flex items-center justify-between bg-slate-800/50 p-4 rounded-xl border border-slate-700 animate-fade-in mb-3';
            el.innerHTML = `
                <div class="flex items-start gap-3">
                    <button onclick="toggleComplete(${task.id})" class="mt-1 w-5 h-5 rounded border ${task.completed ? 'bg-indigo-500 border-indigo-500' : 'border-gray-500 hover:border-indigo-400'} flex items-center justify-center transition">
                        ${task.completed ? '<i class="fas fa-check text-xs text-white"></i>' : ''}
                    </button>
                    <div>
                        <h4 class="font-semibold ${task.completed ? 'line-through text-gray-500' : 'text-white'}">${task.title}</h4>
                        <div class="flex gap-3 mt-1 text-xs text-gray-400">
                            <span class="${badgeColor}">${task.priority.toUpperCase()}</span>
                            <span><i class="fas fa-tag"></i> ${task.platform}</span>
                        </div>
                    </div>
                </div>
                <button onclick="deleteTask(${task.id})" class="text-gray-500 hover:text-red-400 transition">
                    <i class="fas fa-trash"></i>
                </button>
            `;
            list.appendChild(el);
        });
    }

    // Render Archive (only if there are old completed tasks)
    if (archivedTasks.length > 0) {
        const archiveHeader = document.createElement('h3');
        archiveHeader.className = 'text-lg font-semibold mt-6 mb-4';
        archiveHeader.innerText = 'Archive';
        list.appendChild(archiveHeader);

        archivedTasks.forEach(task => {
            const completedDate = task.completedDate ? new Date(task.completedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Completed';
            
            const el = document.createElement('div');
            el.className = 'flex items-center justify-between bg-slate-800/30 p-4 rounded-xl border border-slate-700/50 animate-fade-in mb-3 opacity-70';
            el.innerHTML = `
                <div class="flex items-start gap-3">
                    <div class="mt-1 w-5 h-5 rounded bg-green-500 flex items-center justify-center">
                        <i class="fas fa-check text-xs text-white"></i>
                    </div>
                    <div>
                        <h4 class="font-semibold text-gray-400 line-through">${task.title}</h4>
                        <div class="flex gap-3 mt-1 text-xs text-gray-500">
                            <span><i class="fas fa-calendar"></i> ${completedDate}</span>
                            <span><i class="fas fa-tag"></i> ${task.platform}</span>
                        </div>
                    </div>
                </div>
                <button onclick="deleteTask(${task.id})" class="text-gray-500 hover:text-red-400 transition">
                    <i class="fas fa-trash"></i>
                </button>
            `;
            list.appendChild(el);
        });
    }

    if (appData.tasks.length === 0) {
        list.innerHTML = '<p class="text-gray-500 text-center py-4">No active tasks. Great job!</p>';
    }
}

function filterTasks(type) {
    renderTasks(type);
}

function deleteTask(id) {
    appData.tasks = appData.tasks.filter(t => t.id !== id);
    saveData();
    renderTasks();
    renderDashboard();
}

function toggleComplete(id) {
    const task = appData.tasks.find(t => t.id === id);
    if (task) {
        task.completed = !task.completed;
        if (task.completed) {
            task.completedDate = new Date().toISOString();
        } else {
            task.completedDate = null;
        }
        saveData();
        renderTasks();
        renderDashboard();
    }
}

function archiveCompleted() {
    // No longer needed - removed from dashboard
}

// --- REVENUE LOGIC ---
document.getElementById('add-revenue-form').addEventListener('submit', (e) => {
    e.preventDefault();
    
    const entry = {
        id: Date.now(),
        source: document.getElementById('rev-source').value,
        amount: parseFloat(document.getElementById('rev-amount').value),
        date: new Date().toISOString()
    };

    appData.revenue.unshift(entry);
    saveData();
    renderRevenue();
    renderRevenueList();
    updateRevenueChart();
    renderDashboard();
    e.target.reset();
});

function renderRevenue() {
    const total = appData.revenue.reduce((sum, item) => sum + item.amount, 0);
    
    const now = new Date();
    const thisMonth = appData.revenue.filter(r => {
        const d = new Date(r.date);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).reduce((sum, item) => sum + item.amount, 0);

    const sources = {};
    appData.revenue.forEach(r => {
        sources[r.source] = (sources[r.source] || 0) + r.amount;
    });
    
    let topSource = '-';
    let maxVal = 0;
    for (const [key, val] of Object.entries(sources)) {
        if (val > maxVal) {
            maxVal = val;
            topSource = key;
        }
    }

    document.getElementById('rev-total').innerText = `$${total.toFixed(2)}`;
    document.getElementById('rev-month').innerText = `$${thisMonth.toFixed(2)}`;
    document.getElementById('rev-top-source').innerText = topSource;
}

function deleteRevenue(id) {
    appData.revenue = appData.revenue.filter(r => r.id !== id);
    saveData();
    renderRevenue();
    renderRevenueList();
    updateRevenueChart();
    renderDashboard();
}

function renderRevenueList() {
    const list = document.getElementById('revenue-list');
    list.innerHTML = '';

    if (appData.revenue.length === 0) {
        list.innerHTML = '<p class="text-gray-500 text-center py-4">No revenue recorded yet.</p>';
        return;
    }

    appData.revenue.forEach(rev => {
        const date = new Date(rev.date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });

        const el = document.createElement('div');
        el.className = 'flex items-center justify-between bg-slate-800/50 p-4 rounded-xl border border-slate-700 animate-fade-in';
        el.innerHTML = `
            <div class="flex items-start gap-3">
                <div class="w-10 h-10 rounded-lg bg-green-500/20 text-green-400 flex items-center justify-center">
                    <i class="fas fa-dollar-sign"></i>
                </div>
                <div>
                    <h4 class="font-semibold text-white">${rev.source}</h4>
                    <div class="flex gap-3 mt-1 text-xs text-gray-400">
                        <span>${date}</span>
                    </div>
                </div>
            </div>
            <div class="flex items-center gap-3">
                <div class="text-green-400 font-bold">$${rev.amount.toFixed(2)}</div>
                <button onclick="deleteRevenue(${rev.id})" class="text-gray-500 hover:text-red-400 transition">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        list.appendChild(el);
    });
}

// --- DASHBOARD LOGIC ---
function renderDashboard() {
    const activeTasks = appData.tasks.filter(t => !t.completed).length;
    document.getElementById('dash-today-tasks').innerText = activeTasks;

    const totalRev = appData.revenue.reduce((sum, item) => sum + item.amount, 0);
    document.getElementById('dash-revenue').innerText = `$${totalRev.toFixed(2)}`;

    const progress = Math.min(100, activeTasks > 10 ? 100 : (activeTasks / 10) * 100); 
    document.getElementById('dash-progress').innerText = `${Math.round(progress)}%`;
}

function updateStreak() {
    const today = new Date().toDateString();
    if (appData.lastActive !== today) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        
        if (appData.lastActive === yesterday.toDateString()) {
            appData.streak++;
        } else if (appData.lastActive !== today) {
            appData.streak = 1;
        }
        appData.lastActive = today;
        saveData();
    }
    document.getElementById('dash-streak').innerText = `${appData.streak} Days`;
}

// --- CHARTS ---
let miniChartInstance = null;
let revChartInstance = null;

function initCharts() {
    const ctxMini = document.getElementById('miniActivityChart').getContext('2d');
    
    const gradientMini = ctxMini.createLinearGradient(0, 0, 0, 200);
    gradientMini.addColorStop(0, 'rgba(99, 102, 241, 0.5)');
    gradientMini.addColorStop(1, 'rgba(99, 102, 241, 0.0)');

    miniChartInstance = new Chart(ctxMini, {
        type: 'line',
        data: {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            datasets: [{
                label: 'Activity',
                data: [12, 19, 3, 5, 2, 3, 10],
                borderColor: '#6366f1',
                backgroundColor: gradientMini,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { display: false }, ticks: { color: '#94a3b8' } },
                y: { display: false }
            }
        }
    });

    const ctxRev = document.getElementById('revenueChart').getContext('2d');
    revChartInstance = new Chart(ctxRev, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                label: 'Income',
                data: [],
                backgroundColor: '#10b981',
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { display: false }, ticks: { color: '#94a3b8' } },
                y: { 
                    beginAtZero: true,
                    grid: { color: '#334155' }, 
                    ticks: { color: '#94a3b8' } 
                }
            }
        }
    });
}

function updateRevenueChart() {
    const months = {};
    const last6Months = [];
    
    for (let i = 0; i <= 5; i++) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const key = d.toLocaleString('default', { month: 'short' });
        last6Months.push(key);
        months[key] = 0;
    }

    appData.revenue.forEach(r => {
        const d = new Date(r.date);
        const key = d.toLocaleString('default', { month: 'short' });
        if (months[key] !== undefined) {
            months[key] += r.amount;
        }
    });

    revChartInstance.data.labels = last6Months;
    revChartInstance.data.datasets[0].data = last6Months.map(m => months[m]);
    revChartInstance.update();
}
