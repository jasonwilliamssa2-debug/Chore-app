// Family Chore Pay - Main Application JavaScript

var STORAGE_KEYS = {
    FAMILY_MEMBERS: 'fcp_familyMembers',
    CHORES: 'fcp_chores',
    CHORE_HISTORY: 'fcp_choreHistory',
    EARNINGS: 'fcp_earnings',
    BONUSES: 'fcp_bonuses',
    PENDING_APPROVALS: 'fcp_pendingApprovals',
    SETTINGS: 'fcp_settings',
    PARENT_PIN: 'fcp_parentPin'
};

var DEFAULT_CHORES = [
    { id: 1, name: 'Make Bed', pay: 10, category: 'daily', description: 'Make your bed neatly every morning', photoRequired: false, limitType: 'daily', limitCount: 1, icon: '🛏️' },
    { id: 2, name: 'Wash Dishes', pay: 20, category: 'daily', description: 'Wash, dry, and put away all dishes', photoRequired: true, limitType: 'daily', limitCount: 2, icon: '🍽️' },
    { id: 3, name: 'Sweep Floor', pay: 15, category: 'weekly', description: 'Sweep all floors in the house', photoRequired: true, limitType: 'weekly', limitCount: 3, icon: '🧹' },
    { id: 4, name: 'Mop Floor', pay: 20, category: 'weekly', description: 'Mop all hard floors', photoRequired: true, limitType: 'weekly', limitCount: 3, icon: '🪣' },
    { id: 5, name: 'Clean Bathroom', pay: 35, category: 'weekly', description: 'Full bathroom clean', photoRequired: true, limitType: 'weekly', limitCount: 2, icon: '🚿' },
    { id: 6, name: 'Do Laundry', pay: 25, category: 'weekly', description: 'Wash, dry, fold and put away clothes', photoRequired: true, limitType: 'weekly', limitCount: 2, icon: '👕' },
    { id: 7, name: 'Vacuum', pay: 15, category: 'weekly', description: 'Vacuum all carpets and rugs', photoRequired: true, limitType: 'weekly', limitCount: 2, icon: '🔌' },
    { id: 8, name: 'Clean Windows', pay: 30, category: 'weekly', description: 'Clean interior windows', photoRequired: true, limitType: 'weekly', limitCount: 1, icon: '🪟' },
    { id: 9, name: 'Take Out Trash', pay: 10, category: 'daily', description: 'Take trash to outside bin', photoRequired: false, limitType: 'daily', limitCount: 1, icon: '🗑️' },
    { id: 10, name: 'Feed Pets', pay: 15, category: 'daily', description: 'Feed and water pets', photoRequired: false, limitType: 'daily', limitCount: 2, icon: '🐕' },
    { id: 11, name: 'Homework', pay: 20, category: 'daily', description: 'Complete all homework assignments', photoRequired: false, limitType: 'daily', limitCount: 1, icon: '📚' },
    { id: 12, name: 'Organize Room', pay: 20, category: 'weekly', description: 'Organize and tidy bedroom', photoRequired: false, limitType: 'weekly', limitCount: 2, icon: '🧹' },
    { id: 13, name: 'Car Tidy', pay: 15, category: 'weekly', description: 'Tidy up the car interior', photoRequired: true, limitType: 'weekly', limitCount: 1, icon: '🚗' }
];

var currentUser = null;
var currentChore = null;
var beforePhotoData = null;
var afterPhotoData = null;
var parentPinVerified = false;
var selectedMonth = null;

document.addEventListener('DOMContentLoaded', function() {
    checkTimeResets();
    initializeData();
    setupPhotoListeners();
    // Update countdowns every minute
    setInterval(updateCountdowns, 60000);
});

function checkTimeResets() {
    // Also check individual chore resets
    checkChoreResets();
    
    // Monthly reset check (legacy - kept for compatibility)
    var now = new Date();
    var lastReset = localStorage.getItem('fcp_lastReset');
    var currentMonth = now.getMonth() + '-' + now.getFullYear();
    
    if (lastReset && lastReset !== currentMonth) {
        performMonthlyReset(lastReset);
    }
    
    localStorage.setItem('fcp_lastReset', currentMonth);
}

// Helper functions removed - using individual chore reset times instead


function getTimeRemaining(limitType, resetAt) {
    if (!resetAt) return '';
    var now = new Date();
    var resetTime = new Date(resetAt);
    var diff = resetTime - now;
    
    if (diff <= 0) return '';
    
    if (limitType === 'daily') {
        var hours = Math.floor(diff / (1000 * 60 * 60));
        var minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        return hours + 'h ' + minutes + 'm';
    }
    
    if (limitType === 'weekly') {
        var days = Math.floor(diff / (1000 * 60 * 60 * 24));
        var hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        return days + 'd ' + hours + 'h';
    }
    
    return '';
}

function updateCountdowns() {
    var countdownElements = document.querySelectorAll('.countdown-timer');
    countdownElements.forEach(function(el) {
        var limitType = el.dataset.limitType;
        var resetAt = el.dataset.resetAt;
        var now = new Date();
        
        // Check if reset time has passed
        if (resetAt && new Date(resetAt) <= now) {
            checkChoreResets();
            return;
        }
        
        el.textContent = getTimeRemaining(limitType, resetAt);
    });
}

function checkChoreResets() {
    var chores = JSON.parse(localStorage.getItem(STORAGE_KEYS.CHORES));
    var changed = false;
    var now = new Date();
    
    chores.forEach(function(chore) {
        if (chore.resetAt && new Date(chore.resetAt) <= now) {
            // Reset time reached - decrement counter and clear resetAt
            if (chore.limitType === 'daily') {
                if (chore.currentDaily > 0) {
                    chore.currentDaily--;
                    changed = true;
                    
                    // If still have more done, set next reset time
                    if (chore.currentDaily > 0) {
                        var nextReset = new Date(chore.resetAt);
                        nextReset.setDate(nextReset.getDate() + 1);
                        chore.resetAt = nextReset.toISOString();
                    } else {
                        chore.resetAt = null;
                    }
                }
            } else if (chore.limitType === 'weekly') {
                if (chore.currentWeekly > 0) {
                    chore.currentWeekly--;
                    changed = true;
                    
                    // If still have more done, set next reset time
                    if (chore.currentWeekly > 0) {
                        var nextReset = new Date(chore.resetAt);
                        nextReset.setDate(nextReset.getDate() + 7);
                        chore.resetAt = nextReset.toISOString();
                    } else {
                        chore.resetAt = null;
                    }
                }
            }
        }
    });
    
    if (changed) {
        localStorage.setItem(STORAGE_KEYS.CHORES, JSON.stringify(chores));
        // Refresh the view
        if (currentUser && currentUser.role === 'child') {
            loadChildChores();
        }
    }
}

function checkMonthlyReset() {
    var now = new Date();
    var lastReset = localStorage.getItem('fcp_lastReset');
    var currentMonth = now.getMonth() + '-' + now.getFullYear();
    
    if (lastReset && lastReset !== currentMonth) {
        performMonthlyReset(lastReset);
    }
    
    localStorage.setItem('fcp_lastReset', currentMonth);
}

function performMonthlyReset(oldMonth) {
    var earnings = JSON.parse(localStorage.getItem(STORAGE_KEYS.EARNINGS) || '{}');
    var history = JSON.parse(localStorage.getItem(STORAGE_KEYS.CHORE_HISTORY) || '[]');
    var bonuses = JSON.parse(localStorage.getItem(STORAGE_KEYS.BONUSES) || '[]');
    
    var monthlyData = {
        month: oldMonth || 'unknown',
        date: new Date().toISOString(),
        earnings: earnings,
        history: history,
        bonuses: bonuses
    };
    
    var archiveKey = 'fcp_archive_' + monthlyData.month;
    localStorage.setItem(archiveKey, JSON.stringify(monthlyData));
    
    for (var childId in earnings) {
        if (earnings.hasOwnProperty(childId)) {
            earnings[childId].monthly = {};
        }
    }
    localStorage.setItem(STORAGE_KEYS.EARNINGS, JSON.stringify(earnings));
    
    localStorage.setItem(STORAGE_KEYS.CHORE_HISTORY, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.BONUSES, JSON.stringify([]));
    
    var chores = JSON.parse(localStorage.getItem(STORAGE_KEYS.CHORES));
    chores.forEach(function(chore) {
        chore.currentDaily = 0;
        chore.currentWeekly = 0;
    });
    localStorage.setItem(STORAGE_KEYS.CHORES, JSON.stringify(chores));
    localStorage.setItem(STORAGE_KEYS.PENDING_APPROVALS, JSON.stringify([]));
    
    showToast('New month started! Earnings reset');
}

function initializeData() {
    if (!localStorage.getItem(STORAGE_KEYS.PARENT_PIN)) {
        localStorage.setItem(STORAGE_KEYS.PARENT_PIN, '1234');
    }
    
    if (!localStorage.getItem(STORAGE_KEYS.FAMILY_MEMBERS)) {
        localStorage.setItem(STORAGE_KEYS.FAMILY_MEMBERS, JSON.stringify([
            { id: 1, name: 'Hayley', role: 'child', pin: '', avatar: '👧' },
            { id: 2, name: 'Jason', role: 'child', pin: '', avatar: '👦' }
        ]));
    }
    
    if (!localStorage.getItem(STORAGE_KEYS.CHORES)) {
        localStorage.setItem(STORAGE_KEYS.CHORES, JSON.stringify(DEFAULT_CHORES));
    }
    
    if (!localStorage.getItem(STORAGE_KEYS.PENDING_APPROVALS)) {
        localStorage.setItem(STORAGE_KEYS.PENDING_APPROVALS, JSON.stringify([]));
    }
    
    if (!localStorage.getItem(STORAGE_KEYS.SETTINGS)) {
        localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify({ apiKey: '' }));
    }
    
    if (!localStorage.getItem('fcp_bonusReasons')) {
        localStorage.setItem('fcp_bonusReasons', JSON.stringify([
            { id: 1, text: 'Great initiative!', amount: 15 },
            { id: 2, text: 'Very helpful attitude', amount: 15 },
            { id: 3, text: 'Super tidy bedroom', amount: 15 },
            { id: 4, text: 'Excellent school work', amount: 15 },
            { id: 5, text: 'Did extra chore', amount: 15 },
            { id: 6, text: 'Act of kindness', amount: 15 }
        ]));
    }
}

function selectRole(role) {
    if (role === 'parent') {
        showParentLogin();
    } else {
        showChildLogin();
    }
}

function showParentLogin() {
    var html = '<h1>👨‍👩‍👧 Parent Access</h1>';
    html += '<p style="color: #666; margin-bottom: 20px;">Enter your PIN</p>';
    html += '<input type="password" id="parent-pin-input" placeholder="Parent PIN" maxlength="4">';
    html += '<button onclick="verifyParentPin()" class="login-btn">🔐 Access Parent Panel</button>';
    html += '<button onclick="showLoginScreen()" class="back-login-btn">← Back</button>';
    document.querySelector('.login-container').innerHTML = html;
}

function verifyParentPin() {
    var enteredPin = document.getElementById('parent-pin-input').value;
    var storedPin = localStorage.getItem(STORAGE_KEYS.PARENT_PIN);
    
    if (enteredPin === storedPin) {
        parentPinVerified = true;
        selectedMonth = null;
        currentUser = { id: 0, name: 'Parent', role: 'parent' };
        showMainScreen();
    } else {
        showToast('Incorrect PIN');
    }
}

function showLoginScreen() {
    parentPinVerified = false;
    selectedMonth = null;
    var html = '<h1>🏠 Family Chore Pay</h1>';
    html += '<div class="role-selection">';
    html += '<button onclick="selectRole(\'parent\')" class="role-btn parent-btn">👨‍👩‍👧 Parent</button>';
    html += '<button onclick="selectRole(\'child\')" class="role-btn child-btn">👧👦 Child</button>';
    html += '</div>';
    document.querySelector('.login-container').innerHTML = html;
}

function showChildLogin() {
    var familyMembers = JSON.parse(localStorage.getItem(STORAGE_KEYS.FAMILY_MEMBERS));
    var children = familyMembers.filter(function(m) { return m.role === 'child'; });
    
    var html = '<h1>Who\'s Logging In?</h1>';
    html += '<div style="display: flex; gap: 15px; justify-content: center; margin-bottom: 15px;">';
    
    children.forEach(function(child) {
        html += '<button onclick="loginChild(' + child.id + ')" style="flex: 1; padding: 25px 15px; font-size: 1.3rem; border: none; border-radius: 12px; cursor: pointer; background: #4CAF50; color: white; display: flex; flex-direction: column; align-items: center; gap: 10px;">';
        html += '<span style="font-size: 2.5rem;">' + (child.avatar || '👧') + '</span>';
        html += '<span>' + child.name + '</span>';
        html += '</button>';
    });
    
    html += '</div>';
    html += '<button onclick="showLoginScreen()" class="back-login-btn">← Back</button>';
    document.querySelector('.login-container').innerHTML = html;
}

function loginChild(childId) {
    var familyMembers = JSON.parse(localStorage.getItem(STORAGE_KEYS.FAMILY_MEMBERS));
    var child = familyMembers.find(function(m) { return m.id == childId; });
    
    if (child) {
        currentUser = { id: child.id, name: child.name, role: 'child', avatar: child.avatar };
        showMainScreen();
    }
}

function logout() {
    currentUser = null;
    parentPinVerified = false;
    selectedMonth = null;
    showLoginScreen();
    document.getElementById('main-screen').classList.add('hidden');
    document.getElementById('login-screen').classList.remove('hidden');
}

function showMainScreen() {
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('main-screen').classList.remove('hidden');
    document.getElementById('user-name').textContent = currentUser.name;
    
    if (currentUser.role === 'parent') {
        showParentInterface();
    } else {
        showChildInterface();
    }
}

function showParentInterface() {
    var nav = document.getElementById('tab-nav');
    nav.innerHTML = '<button onclick="showTab(\'parent-chores\')" class="tab-btn active" data-tab="parent-chores">📋 Chores</button>' +
        '<button onclick="showTab(\'approvals\')" class="tab-btn" data-tab="approvals">✅ Approvals</button>' +
        '<button onclick="showTab(\'earnings\')" class="tab-btn" data-tab="earnings">💰 Earnings</button>' +
        '<button onclick="showTab(\'bonus\')" class="tab-btn" data-tab="bonus">⭐ Bonus</button>' +
        '<button onclick="showTab(\'settings\')" class="tab-btn" data-tab="settings">⚙️ Settings</button>';
    
    showTab('parent-chores');
    
    if (window.parentRefreshInterval) clearInterval(window.parentRefreshInterval);
    window.parentRefreshInterval = setInterval(function() {
        checkTimeResets();
        var activeTab = document.querySelector('.tab-btn.active');
        if (activeTab && activeTab.dataset && activeTab.dataset.tab) {
            showTab(activeTab.dataset.tab);
        }
    }, 3000);
}

function showChildInterface() {
    var nav = document.getElementById('tab-nav');
    nav.innerHTML = '<button onclick="showTab(\'chores\')" class="tab-btn active" data-tab="chores">📝 Chores</button>' +
        '<button onclick="showTab(\'my-earnings\')" class="tab-btn" data-tab="my-earnings">💰 Earnings</button>' +
        '<button onclick="showTab(\'my-bonuses\')" class="tab-btn" data-tab="my-bonuses">⭐ Bonuses</button>';
    
    showTab('chores');
    
    if (window.childRefreshInterval) clearInterval(window.childRefreshInterval);
    window.childRefreshInterval = setInterval(function() {
        checkTimeResets();
        var activeTab = document.querySelector('.tab-btn.active');
        if (activeTab && activeTab.dataset && activeTab.dataset.tab) {
            showTab(activeTab.dataset.tab);
        }
    }, 3000);
}

function showTab(tabName) {
    var tabs = document.querySelectorAll('.tab-content');
    for (var i = 0; i < tabs.length; i++) {
        tabs[i].style.display = 'none';
    }
    
    var tabId = tabName + '-tab';
    var selectedTab = document.getElementById(tabId);
    if (selectedTab) {
        selectedTab.style.display = 'block';
    }
    
    var buttons = document.querySelectorAll('.tab-btn');
    for (var i = 0; i < buttons.length; i++) {
        buttons[i].classList.remove('active');
    }
    
    switch(tabName) {
        case 'chores':
            loadChildChores();
            break;
        case 'parent-chores':
            loadParentChores();
            break;
        case 'approvals':
            loadApprovals();
            break;
        case 'earnings':
            loadParentEarnings();
            break;
        case 'my-earnings':
            loadMyEarnings();
            break;
        case 'my-bonuses':
            loadMyBonuses();
            break;
        case 'bonus':
            loadBonusSection();
            break;
        case 'settings':
            loadSettings();
            break;
    }
}

function loadChildChores() {
    var chores = JSON.parse(localStorage.getItem(STORAGE_KEYS.CHORES));
    var earnings = JSON.parse(localStorage.getItem(STORAGE_KEYS.EARNINGS) || '{}');
    var todayKey = new Date().toISOString().split('T')[0];
    var todayEarnings = earnings[currentUser.id] ? earnings[currentUser.id].daily[todayKey] || 0 : 0;
    
    var container = document.getElementById('chores-list');
    
    var html = '<div class="daily-earnings-card">';
    html += '<div class="label">Today\'s Earnings</div>';
    html += '<div class="amount">R' + todayEarnings + '</div>';
    html += '</div>';
    
    var categories = {};
    chores.forEach(function(chore) {
        if (!categories[chore.category]) {
            categories[chore.category] = [];
        }
        categories[chore.category].push(chore);
    });
    
    Object.keys(categories).forEach(function(category) {
        html += '<div class="category-section">';
        html += '<div class="category-title">' + category + '</div>';
        html += '<div class="chores-grid">';
        
        categories[category].forEach(function(chore) {
            var countdownText = '';
            var remainingText = '';
            
            if (chore.limitType === 'daily') {
                remainingText = (chore.limitCount - (chore.currentDaily || 0)) + ' left';
                if (chore.resetAt) {
                    countdownText = getTimeRemaining('daily', chore.resetAt);
                }
            } else if (chore.limitType === 'weekly') {
                remainingText = (chore.limitCount - (chore.currentWeekly || 0)) + ' left';
                if (chore.resetAt) {
                    countdownText = getTimeRemaining('weekly', chore.resetAt);
                }
            }
            
            var isAvailable = true;
            if (chore.limitType === 'daily' && (chore.currentDaily || 0) >= chore.limitCount) isAvailable = false;
            if (chore.limitType === 'weekly' && (chore.currentWeekly || 0) >= chore.limitCount) isAvailable = false;
            
            html += '<div onclick="' + (isAvailable ? 'openChoreModal(' + chore.id + ')' : '') + '" class="chore-card' + (isAvailable ? '' : ' unavailable') + '">';
            html += '<div class="chore-icon">' + (chore.icon || '📋') + '</div>';
            html += '<div class="chore-name">' + chore.name + '</div>';
            html += '<div class="chore-pay">R' + chore.pay + '</div>';
            html += '<div class="chore-remaining">' + remainingText + '</div>';
            if (countdownText) {
                html += '<div class="chore-countdown">New slot: ' + countdownText + '</div>';
            }
            html += '</div>';
        });
        
        html += '</div></div>';
    });
    
    container.innerHTML = html;
}

function loadParentChores() {
    var chores = JSON.parse(localStorage.getItem(STORAGE_KEYS.CHORES));
    var container = document.getElementById('parent-chores-list');
    
    var html = '<div class="section-header">';
    html += '<h2>📋 Manage Chores</h2>';
    html += '<button onclick="showAddChoreModal()" class="action-btn">➕ Add Chore</button>';
    html += '</div>';
    
    if (chores.length === 0) {
        html += '<p class="no-items">No chores added yet</p>';
    } else {
        chores.forEach(function(chore) {
            html += '<div class="parent-chore-card">';
            html += '<div class="chore-info">';
            html += '<div class="chore-icon">' + (chore.icon || '📋') + '</div>';
            html += '<div class="chore-details">';
            html += '<h3>' + chore.name + '</h3>';
            html += '<p>' + (chore.description || 'No description') + '</p>';
            html += '<div class="chore-meta">';
            html += '<span class="pay-badge">R' + chore.pay + '</span>';
            html += '<span class="category-badge">' + chore.category + '</span>';
            html += '<span class="limit-badge">' + (chore.limitType === 'none' ? 'No limit' : chore.limitType + ': ' + chore.limitCount) + '</span>';
            html += '</div></div></div>';
            html += '<div class="chore-actions">';
            html += '<button onclick="editChore(' + chore.id + ')" class="edit-btn">✏️ Edit</button>';
            html += '<button onclick="deleteChore(' + chore.id + ')" class="delete-btn">🗑️ Delete</button>';
            html += '</div></div>';
        });
    }
    
    container.innerHTML = html;
}

function showAddChoreModal() {
    document.getElementById('add-chore-modal').classList.remove('hidden');
}

function saveChore() {
    var choreId = document.getElementById('edit-chore-id').value;
    var chores = JSON.parse(localStorage.getItem(STORAGE_KEYS.CHORES));
    
    var choreData = {
        id: choreId ? parseInt(choreId) : Date.now(),
        name: document.getElementById('new-chore-name').value,
        description: document.getElementById('new-chore-description').value,
        pay: parseInt(document.getElementById('new-chore-pay').value),
        category: document.getElementById('new-chore-category').value,
        photoRequired: document.getElementById('new-chore-photo-required').checked,
        limitType: document.getElementById('new-chore-limit-type').value,
        limitCount: parseInt(document.getElementById('new-chore-limit').value) || 0,
        icon: document.getElementById('new-chore-icon').value || '📋',
        currentDaily: 0,
        currentWeekly: 0
    };
    
    if (!choreData.name || !choreData.pay) {
        showToast('Please fill in name and pay amount');
        return;
    }
    
    if (choreId) {
        var index = chores.findIndex(function(c) { return c.id === parseInt(choreId); });
        if (index !== -1) {
            choreData.currentDaily = chores[index].currentDaily || 0;
            choreData.currentWeekly = chores[index].currentWeekly || 0;
            chores[index] = choreData;
        }
    } else {
        chores.push(choreData);
    }
    
    localStorage.setItem(STORAGE_KEYS.CHORES, JSON.stringify(chores));
    closeModal('add-chore-modal');
    showToast(choreId ? 'Chore updated!' : 'Chore added!');
    loadParentChores();
}

function editChore(choreId) {
    var chores = JSON.parse(localStorage.getItem(STORAGE_KEYS.CHORES));
    var chore = chores.find(function(c) { return c.id === choreId; });
    
    if (chore) {
        document.getElementById('edit-chore-id').value = chore.id;
        document.getElementById('new-chore-name').value = chore.name;
        document.getElementById('new-chore-description').value = chore.description || '';
        document.getElementById('new-chore-pay').value = chore.pay;
        document.getElementById('new-chore-category').value = chore.category;
        document.getElementById('new-chore-photo-required').checked = chore.photoRequired;
        document.getElementById('new-chore-limit-type').value = chore.limitType;
        document.getElementById('new-chore-limit').value = chore.limitCount;
        document.getElementById('new-chore-icon').value = chore.icon || '📋';
        
        document.getElementById('add-chore-modal').classList.remove('hidden');
    }
}

function deleteChore(choreId) {
    if (confirm('Delete this chore?')) {
        var chores = JSON.parse(localStorage.getItem(STORAGE_KEYS.CHORES));
        var filtered = chores.filter(function(c) { return c.id !== choreId; });
        localStorage.setItem(STORAGE_KEYS.CHORES, JSON.stringify(filtered));
        showToast('Chore deleted');
        loadParentChores();
    }
}

function loadApprovals() {
    var pendingApprovals = JSON.parse(localStorage.getItem(STORAGE_KEYS.PENDING_APPROVALS));
    var container = document.getElementById('approvals-list');
    
    var html = '<div class="section-header">';
    html += '<h2>✅ Pending Approvals</h2>';
    html += '<span class="badge">' + pendingApprovals.length + '</span>';
    html += '</div>';
    
    if (pendingApprovals.length === 0) {
        html += '<p class="no-items">No pending approvals</p>';
    } else {
        pendingApprovals.forEach(function(approval, index) {
            var photosHtml = '';
            if (approval.beforePhoto || approval.afterPhoto) {
                photosHtml = '<div class="approval-photos">';
                if (approval.beforePhoto) photosHtml += '<img src="' + approval.beforePhoto + '">';
                if (approval.afterPhoto) photosHtml += '<img src="' + approval.afterPhoto + '">';
                photosHtml += '</div>';
            }
            
            html += '<div class="approval-card">';
            html += '<div class="approval-header">';
            html += '<span class="child-name">' + approval.childName + '</span>';
            html += '<span class="chore-name">' + approval.choreName + '</span>';
            html += '</div>';
            html += '<div class="approval-details">';
            html += '<div class="detail-row"><span>Submitted:</span><span>' + new Date(approval.submittedAt).toLocaleString() + '</span></div>';
            html += '<div class="detail-row"><span>Original Pay:</span><span>R' + approval.originalPay + '</span></div>';
            html += '<div class="detail-row"><span>Conditions:</span><span>' + approval.conditions + '</span></div>';
            html += '<div class="pay-row"><span>Adjusted Pay:</span><span class="pay-amount">R' + approval.adjustedPay + '</span></div>';
            html += '</div>';
            html += photosHtml;
            html += '<div class="approval-actions">';
            html += '<button onclick="approveChore(' + index + ')" class="approve-btn">✅ Approve</button>';
            html += '<button onclick="rejectChore(' + index + ')" class="reject-btn">❌ Reject</button>';
            html += '<button onclick="requestResubmit(' + index + ')" class="resubmit-btn">🔄 Request Changes</button>';
            html += '</div></div>';
        });
    }
    
    container.innerHTML = html;
}

function approveChore(index) {
    var pendingApprovals = JSON.parse(localStorage.getItem(STORAGE_KEYS.PENDING_APPROVALS));
    var approval = pendingApprovals[index];
    
    if (!approval) return;
    
    var earnings = JSON.parse(localStorage.getItem(STORAGE_KEYS.EARNINGS) || '{}');
    var todayKey = new Date().toISOString().split('T')[0];
    
    if (!earnings[approval.childId]) {
        earnings[approval.childId] = { daily: {}, monthly: {}, total: 0 };
    }
    
    earnings[approval.childId].daily[todayKey] = (earnings[approval.childId].daily[todayKey] || 0) + approval.adjustedPay;
    var monthKey = new Date().toISOString().slice(0, 7);
    earnings[approval.childId].monthly[monthKey] = (earnings[approval.childId].monthly[monthKey] || 0) + approval.adjustedPay;
    earnings[approval.childId].total += approval.adjustedPay;
    
    localStorage.setItem(STORAGE_KEYS.EARNINGS, JSON.stringify(earnings));
    
    var history = JSON.parse(localStorage.getItem(STORAGE_KEYS.CHORE_HISTORY) || '[]');
    history.unshift({
        type: 'chore',
        childId: approval.childId,
        childName: approval.childName,
        choreName: approval.choreName,
        amount: approval.adjustedPay,
        date: new Date().toISOString(),
        status: 'approved',
        conditions: approval.conditions
    });
    localStorage.setItem(STORAGE_KEYS.CHORE_HISTORY, JSON.stringify(history));
    
    pendingApprovals.splice(index, 1);
    localStorage.setItem(STORAGE_KEYS.PENDING_APPROVALS, JSON.stringify(pendingApprovals));
    
    showToast('Approved! R' + approval.adjustedPay + ' added to ' + approval.childName + '\'s earnings');
    loadApprovals();
}

function rejectChore(index) {
    var pendingApprovals = JSON.parse(localStorage.getItem(STORAGE_KEYS.PENDING_APPROVALS));
    var approval = pendingApprovals[index];
    
    if (!approval) return;
    
    var history = JSON.parse(localStorage.getItem(STORAGE_KEYS.CHORE_HISTORY) || '[]');
    history.unshift({
        type: 'chore',
        childId: approval.childId,
        childName: approval.childName,
        choreName: approval.choreName,
        amount: 0,
        date: new Date().toISOString(),
        status: 'rejected'
    });
    localStorage.setItem(STORAGE_KEYS.CHORE_HISTORY, JSON.stringify(history));
    
    pendingApprovals.splice(index, 1);
    localStorage.setItem(STORAGE_KEYS.PENDING_APPROVALS, JSON.stringify(pendingApprovals));
    
    showToast('Chore rejected');
    loadApprovals();
}

function requestResubmit(index) {
    var pendingApprovals = JSON.parse(localStorage.getItem(STORAGE_KEYS.PENDING_APPROVALS));
    pendingApprovals.splice(index, 1);
    localStorage.setItem(STORAGE_KEYS.PENDING_APPROVALS, JSON.stringify(pendingApprovals));
    showToast('Changes requested');
    loadApprovals();
}

function loadParentEarnings() {
    var familyMembers = JSON.parse(localStorage.getItem(STORAGE_KEYS.FAMILY_MEMBERS));
    var currentMonthKey = new Date().toISOString().slice(0, 7);
    
    var container = document.getElementById('parent-earnings-list');
    
    var archivedMonths = [];
    for (var i = 0; i < localStorage.length; i++) {
        var key = localStorage.key(i);
        if (key && key.indexOf('fcp_archive_') === 0) {
            archivedMonths.push(key.replace('fcp_archive_', ''));
        }
    }
    
    var monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    
    var monthOptions = '<option value="">This Month</option>';
    archivedMonths.forEach(function(monthKey) {
        var parts = monthKey.split('-');
        var name = monthNames[parseInt(parts[1])] + ' ' + parts[0];
        monthOptions += '<option value="' + monthKey + '">' + name + '</option>';
    });
    
    var html = '<div class="section-header">';
    html += '<h2>💰 Earnings</h2>';
    html += '</div>';
    html += '<div style="margin-bottom: 20px;">';
    html += '<select onchange="changeMonth(this.value)" style="width: 100%; padding: 12px; border-radius: 8px; border: 2px solid #4CAF50;">' + monthOptions + '</select>';
    html += '</div>';
    
    var earnings = JSON.parse(localStorage.getItem(STORAGE_KEYS.EARNINGS) || '{}');
    
    if (selectedMonth && selectedMonth !== currentMonthKey) {
        var archiveKey = 'fcp_archive_' + selectedMonth;
        var archivedData = JSON.parse(localStorage.getItem(archiveKey));
        if (archivedData && archivedData.earnings) {
            earnings = archivedData.earnings;
        }
        
        var parts = selectedMonth.split('-');
        var monthName = monthNames[parseInt(parts[1])] + ' ' + parts[0];
        html += '<div style="background: #667eea; color: white; padding: 15px; border-radius: 12px; margin-bottom: 20px; text-align: center;">';
        html += '<div style="font-size: 1rem;">' + monthName + '</div>';
        html += '</div>';
    } else {
        selectedMonth = null;
        var now = new Date();
        html += '<div style="background: #4CAF50; color: white; padding: 15px; border-radius: 12px; margin-bottom: 20px; text-align: center;">';
        html += '<div style="font-size: 1rem;">This Month - ' + now.toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' }) + '</div>';
        html += '</div>';
    }
    
    var children = familyMembers.filter(function(m) { return m.role === 'child'; });
    var totalMonth = 0;
    
    children.forEach(function(child) {
        var childEarnings = earnings[child.id] || { monthly: {}, total: 0 };
        var monthlyTotal = selectedMonth ? (childEarnings.monthly[selectedMonth] || 0) : (childEarnings.monthly[currentMonthKey] || 0);
        totalMonth += monthlyTotal;
        
        html += '<div class="earnings-card">';
        html += '<div class="child-info"><span class="child-avatar">' + (child.avatar || '👧') + '</span><span class="child-name">' + child.name + '</span></div>';
        html += '<div class="earnings-breakdown">';
        html += '<div class="breakdown-row"><span>This Month:</span><span class="amount">R' + monthlyTotal + '</span></div>';
        html += '<div class="breakdown-row"><span>All Time:</span><span class="amount">R' + (childEarnings.total || 0) + '</span></div>';
        html += '</div></div>';
    });
    
    html += '<div class="total-card"><span>Total Family This Month:</span><span class="total-amount">R' + totalMonth + '</span></div>';
    
    container.innerHTML = html;
}

function changeMonth(monthKey) {
    selectedMonth = monthKey || null;
    loadParentEarnings();
}

function loadMyEarnings() {
    var earnings = JSON.parse(localStorage.getItem(STORAGE_KEYS.EARNINGS) || '{}');
    var history = JSON.parse(localStorage.getItem(STORAGE_KEYS.CHORE_HISTORY) || '[]');
    var monthKey = new Date().toISOString().slice(0, 7);
    
    var userEarnings = earnings[currentUser.id] || { monthly: {}, total: 0 };
    var monthlyTotal = userEarnings.monthly[monthKey] || 0;
    var total = userEarnings.total || 0;
    
    var container = document.getElementById('my-earnings-list');
    
    var html = '<div class="earnings-summary-card">';
    html += '<div class="current-balance"><span class="label">This Month</span><span class="amount">R' + monthlyTotal + '</span></div>';
    html += '<div class="total-balance"><span class="label">Total Earned</span><span class="amount">R' + total + '</span></div>';
    html += '</div>';
    
    html += '<h3>Recent Activity</h3>';
    
    var myHistory = history.filter(function(h) { return h.childId === currentUser.id; });
    
    if (myHistory.length === 0) {
        html += '<p class="no-items">No activity yet</p>';
    } else {
        myHistory.slice(0, 10).forEach(function(item) {
            var statusClass = item.status === 'rejected' ? 'rejected' : '';
            html += '<div class="history-item ' + statusClass + '">';
            html += '<div class="history-info"><span class="history-name">' + item.choreName + '</span>';
            html += '<span class="history-date">' + new Date(item.date).toLocaleDateString() + '</span></div>';
            html += '<span class="history-amount">' + (item.status === 'rejected' ? 'Rejected' : '+R' + item.amount) + '</span>';
            html += '</div>';
        });
    }
    
    container.innerHTML = html;
}

var bonusAmount = 15;

function loadBonusSection() {
    var familyMembers = JSON.parse(localStorage.getItem(STORAGE_KEYS.FAMILY_MEMBERS));
    var bonusReasons = JSON.parse(localStorage.getItem('fcp_bonusReasons') || '[]');
    var bonuses = JSON.parse(localStorage.getItem(STORAGE_KEYS.BONUSES) || '[]');
    var monthKey = new Date().toISOString().slice(0, 7);
    
    var container = document.getElementById('bonus-section');
    
    var childrenOptions = '';
    familyMembers.filter(function(m) { return m.role === 'child'; }).forEach(function(child) {
        childrenOptions += '<option value="' + child.id + '">' + (child.avatar || '👧') + ' ' + child.name + '</option>';
    });
    
    var reasonsOptions = '';
    bonusReasons.forEach(function(reason) {
        reasonsOptions += '<option value="' + reason.id + '">' + reason.text + '</option>';
    });
    
    var html = '<div class="section-header"><h2>⭐ Give Bonus</h2></div>';
    html += '<div class="bonus-form">';
    html += '<label>Select Child</label><select id="bonus-child">' + childrenOptions + '</select>';
    html += '<label>Bonus Reason</label><select id="bonus-reason">' + reasonsOptions + '</select>';
    html += '<label>Amount (R)</label>';
    html += '<input type="number" id="bonus-amount" value="15" min="1" max="500" style="width: 100%; padding: 12px; margin-bottom: 15px; border: 2px solid #e0e0e0; border-radius: 8px;">';
    html += '<label>Custom Reason (Optional)</label><input type="text" id="bonus-custom-reason" placeholder="Or type a custom reason...">';
    html += '<button onclick="giveBonus()" class="submit-btn">🎁 Give Bonus</button>';
    html += '</div>';
    html += '<h3>Recent Bonuses</h3><div class="bonus-list">';
    
    var recentBonuses = bonuses.filter(function(b) { return b.date.startsWith(monthKey); });
    
    if (recentBonuses.length === 0) {
        html += '<p class="no-items">No bonuses this month</p>';
    } else {
        recentBonuses.slice(0, 10).forEach(function(bonus) {
            html += '<div class="bonus-item">';
            html += '<div class="bonus-info">';
            html += '<span class="bonus-child">' + bonus.childName + '</span>';
            html += '<span class="bonus-reason">' + bonus.reason + '</span>';
            html += '<span class="bonus-date">' + new Date(bonus.date).toLocaleDateString() + '</span>';
            html += '</div>';
            html += '<span class="bonus-amount">+R' + bonus.amount + '</span>';
            html += '</div>';
        });
    }
    
    html += '</div>';
    
    container.innerHTML = html;
}

function giveBonus() {
    var childId = document.getElementById('bonus-child').value;
    var reasonSelect = document.getElementById('bonus-reason');
    var customReason = document.getElementById('bonus-custom-reason').value;
    var customAmount = document.getElementById('bonus-amount').value;
    
    if (!childId) {
        showToast('Please select a child');
        return;
    }
    
    var familyMembers = JSON.parse(localStorage.getItem(STORAGE_KEYS.FAMILY_MEMBERS));
    var child = familyMembers.find(function(m) { return m.id == childId; });
    
    var reasonText = customReason || reasonSelect.options[reasonSelect.selectedIndex].text;
    var amount = parseInt(customAmount) || 15;
    
    var bonus = {
        id: Date.now(),
        childId: parseInt(childId),
        childName: child.name,
        amount: amount,
        reason: reasonText,
        date: new Date().toISOString()
    };
    
    var bonuses = JSON.parse(localStorage.getItem(STORAGE_KEYS.BONUSES) || '[]');
    bonuses.unshift(bonus);
    localStorage.setItem(STORAGE_KEYS.BONUSES, JSON.stringify(bonuses));
    
    var earnings = JSON.parse(localStorage.getItem(STORAGE_KEYS.EARNINGS) || '{}');
    var monthKey = new Date().toISOString().slice(0, 7);
    
    if (!earnings[bonus.childId]) {
        earnings[bonus.childId] = { monthly: {}, total: 0 };
    }
    
    earnings[bonus.childId].monthly[monthKey] = (earnings[bonus.childId].monthly[monthKey] || 0) + bonus.amount;
    earnings[bonus.childId].total += bonus.amount;
    
    localStorage.setItem(STORAGE_KEYS.EARNINGS, JSON.stringify(earnings));
    
    showToast('R' + amount + ' bonus given to ' + child.name + '!');
    loadBonusSection();
}

function loadMyBonuses() {
    var bonuses = JSON.parse(localStorage.getItem(STORAGE_KEYS.BONUSES) || '[]');
    var monthKey = new Date().toISOString().slice(0, 7);
    
    var container = document.getElementById('my-bonuses-list');
    
    var myBonuses = bonuses.filter(function(b) { return b.childId === currentUser.id; });
    var monthlyTotal = myBonuses.filter(function(b) { return b.date.startsWith(monthKey); }).reduce(function(sum, b) { return sum + b.amount; }, 0);
    var totalBonus = myBonuses.reduce(function(sum, b) { return sum + b.amount; }, 0);
    
    var html = '<div class="earnings-summary-card">';
    html += '<div class="current-balance"><span class="label">Bonuses This Month</span><span class="amount">R' + monthlyTotal + '</span></div>';
    html += '<div class="total-balance"><span class="label">Total Bonuses</span><span class="amount">R' + totalBonus + '</span></div>';
    html += '</div>';
    
    if (myBonuses.length === 0) {
        html += '<p class="no-items">No bonuses yet</p>';
    } else {
        myBonuses.slice(0, 10).forEach(function(bonus) {
            html += '<div class="bonus-item">';
            html += '<div class="bonus-info">';
            html += '<span class="bonus-reason">' + bonus.reason + '</span>';
            html += '<span class="bonus-date">' + new Date(bonus.date).toLocaleDateString() + '</span>';
            html += '</div>';
            html += '<span class="bonus-amount">+R' + bonus.amount + '</span>';
            html += '</div>';
        });
    }
    
    container.innerHTML = html;
}

function loadSettings() {
    if (!parentPinVerified) {
        document.getElementById('settings-content').innerHTML = '<div class="pin-verification">' +
            '<h2>🔐 Parent Settings</h2><p>Enter your PIN</p>' +
            '<input type="password" id="settings-pin" placeholder="Parent PIN" maxlength="4">' +
            '<button onclick="verifySettingsPin()" class="submit-btn">🔐 Access Settings</button></div>';
        return;
    }
    
    var familyMembers = JSON.parse(localStorage.getItem(STORAGE_KEYS.FAMILY_MEMBERS));
    
    var html = '<h2>⚙️ Settings</h2>';
    html += '<div class="settings-section"><h3>🔒 Security</h3>';
    html += '<label>Parent PIN</label><input type="text" id="change-parent-pin" value="' + localStorage.getItem(STORAGE_KEYS.PARENT_PIN) + '" maxlength="4">';
    html += '<button onclick="changeParentPin()" class="action-btn">Update PIN</button></div>';
    html += '<div class="settings-section"><h3>👨‍👩‍👧 Family Members</h3><div id="family-members-list"></div>';
    html += '<button onclick="showAddMemberModal()" class="action-btn">➕ Add Family Member</button></div>';
    html += '<button onclick="parentPinVerified = false; loadSettings()" class="back-btn">← Lock Settings</button>';
    
    document.getElementById('settings-content').innerHTML = html;
    
    var membersContainer = document.getElementById('family-members-list');
    var membersHtml = '';
    familyMembers.filter(function(m) { return m.role === 'child'; }).forEach(function(member) {
        membersHtml += '<div class="member-item">';
        membersHtml += '<div class="member-info">';
        membersHtml += '<span class="member-avatar">' + (member.avatar || '👧') + '</span>';
        membersHtml += '<span class="member-name">' + member.name + '</span>';
        membersHtml += '</div>';
        membersHtml += '<div class="member-actions">';
        membersHtml += '<button onclick="deleteMember(' + member.id + ')" class="delete-btn">🗑️</button>';
        membersHtml += '</div></div>';
    });
    membersContainer.innerHTML = membersHtml;
}

function verifySettingsPin() {
    var pin = document.getElementById('settings-pin').value;
    if (pin === localStorage.getItem(STORAGE_KEYS.PARENT_PIN)) {
        parentPinVerified = true;
        loadSettings();
    } else {
        showToast('Incorrect PIN');
    }
}

function changeParentPin() {
    var newPin = document.getElementById('change-parent-pin').value;
    if (newPin.length !== 4) {
        showToast('PIN must be 4 digits');
        return;
    }
    localStorage.setItem(STORAGE_KEYS.PARENT_PIN, newPin);
    showToast('PIN updated!');
}

function showAddMemberModal() {
    document.getElementById('add-member-modal').classList.remove('hidden');
}

function saveFamilyMember() {
    var name = document.getElementById('new-member-name').value;
    var avatar = document.getElementById('new-member-avatar').value;
    
    if (!name) {
        showToast('Please enter a name');
        return;
    }
    
    var familyMembers = JSON.parse(localStorage.getItem(STORAGE_KEYS.FAMILY_MEMBERS));
    familyMembers.push({
        id: Date.now(),
        name: name,
        role: 'child',
        pin: '',
        avatar: avatar || '👧'
    });
    localStorage.setItem(STORAGE_KEYS.FAMILY_MEMBERS, JSON.stringify(familyMembers));
    
    closeModal('add-member-modal');
    showToast('Family member added!');
    loadSettings();
}

function deleteMember(memberId) {
    if (confirm('Delete this family member?')) {
        var familyMembers = JSON.parse(localStorage.getItem(STORAGE_KEYS.FAMILY_MEMBERS));
        var filtered = familyMembers.filter(function(m) { return m.id !== memberId; });
        localStorage.setItem(STORAGE_KEYS.FAMILY_MEMBERS, JSON.stringify(filtered));
        showToast('Family member removed');
        loadSettings();
    }
}

function openChoreModal(choreId) {
    var chores = JSON.parse(localStorage.getItem(STORAGE_KEYS.CHORES));
    var chore = chores.find(function(c) { return c.id === choreId; });
    
    if (!chore) return;
    currentChore = chore;
    
    // Check if chore still available
    if (chore.limitType === 'daily' && (chore.currentDaily || 0) >= chore.limitCount) {
        showToast('Daily limit reached for this chore!');
        return;
    }
    if (chore.limitType === 'weekly' && (chore.currentWeekly || 0) >= chore.limitCount) {
        showToast('Weekly limit reached for this chore!');
        return;
    }
    
    document.getElementById('modal-chore-name').textContent = chore.name;
    document.getElementById('modal-chore-description').textContent = chore.description || 'No description';
    
    var photoSection = document.getElementById('photo-verification-section');
    if (chore.photoRequired) {
        photoSection.style.display = 'block';
    } else {
        photoSection.style.display = 'none';
    }
    
    beforePhotoData = null;
    afterPhotoData = null;
    document.getElementById('before-preview').innerHTML = '';
    document.getElementById('after-preview').innerHTML = '';
    
    var checkboxes = document.querySelectorAll('#completion-conditions input');
    for (var i = 0; i < checkboxes.length; i++) {
        checkboxes[i].checked = false;
    }
    
    document.getElementById('car-condition').style.display = 'none';
    
    document.getElementById('chore-modal').classList.remove('hidden');
}

function submitChore() {
    var chores = JSON.parse(localStorage.getItem(STORAGE_KEYS.CHORES));
    var chore = chores.find(function(c) { return c.id === currentChore.id });
    
    if (chore) {
        if (chore.limitType === 'daily' && (chore.currentDaily || 0) >= chore.limitCount) {
            closeModal('chore-modal');
            showToast('Daily limit reached for this chore!');
            return;
        }
        if (chore.limitType === 'weekly' && (chore.currentWeekly || 0) >= chore.limitCount) {
            closeModal('chore-modal');
            showToast('Weekly limit reached for this chore!');
            return;
        }
    }
    
    if (currentChore.photoRequired) {
        if (!beforePhotoData && !afterPhotoData) {
            showToast('Photo verification required');
            return;
        }
    }
    
    var adjustedPay = currentChore.pay;
    var conditions = [];
    
    if (document.getElementById('half-complete').checked) {
        adjustedPay = Math.floor(currentChore.pay / 2);
        conditions.push('Half done');
    }
    
    if (document.getElementById('needs-reminder').checked) {
        adjustedPay -= 10;
        conditions.push('Needed reminder');
    }
    
    if (document.getElementById('multiple-reminders').checked) {
        adjustedPay -= 25;
        conditions.push('Multiple reminders');
    }
    
    var approval = {
        id: Date.now(),
        choreId: currentChore.id,
        choreName: currentChore.name,
        childId: currentUser.id,
        childName: currentUser.name,
        originalPay: currentChore.pay,
        adjustedPay: adjustedPay,
        conditions: conditions.length > 0 ? conditions.join(', ') : 'Fully completed',
        beforePhoto: beforePhotoData,
        afterPhoto: afterPhotoData,
        submittedAt: new Date().toISOString()
    };
    
    var pendingApprovals = JSON.parse(localStorage.getItem(STORAGE_KEYS.PENDING_APPROVALS));
    pendingApprovals.push(approval);
    localStorage.setItem(STORAGE_KEYS.PENDING_APPROVALS, JSON.stringify(pendingApprovals));
    
    var choreIndex = chores.findIndex(function(c) { return c.id === currentChore.id; });
    if (choreIndex !== -1) {
        var now = new Date();
        var resetTime = new Date();
        
        if (currentChore.limitType === 'daily') {
            chores[choreIndex].currentDaily = (chores[choreIndex].currentDaily || 0) + 1;
            // Set 24 hour reset time starting from when chore was done
            resetTime.setHours(resetTime.getHours() + 24);
            chores[choreIndex].resetAt = resetTime.toISOString();
        } else if (currentChore.limitType === 'weekly') {
            chores[choreIndex].currentWeekly = (chores[choreIndex].currentWeekly || 0) + 1;
            // Set 7 day reset time starting from when chore was done
            resetTime.setDate(resetTime.getDate() + 7);
            chores[choreIndex].resetAt = resetTime.toISOString();
        }
        localStorage.setItem(STORAGE_KEYS.CHORES, JSON.stringify(chores));
    }
    
    closeModal('chore-modal');
    showToast('Chore submitted for approval!');
    loadChildChores();
}

function setupPhotoListeners() {
    var beforeInput = document.getElementById('before-photo');
    var afterInput = document.getElementById('after-photo');
    
    if (beforeInput) {
        beforeInput.addEventListener('change', function(e) {
            var file = e.target.files[0];
            if (file) {
                var reader = new FileReader();
                reader.onload = function(e) {
                    document.getElementById('before-preview').innerHTML = '<img src="' + e.target.result + '">';
                    beforePhotoData = e.target.result;
                };
                reader.readAsDataURL(file);
            }
        });
    }
    
    if (afterInput) {
        afterInput.addEventListener('change', function(e) {
            var file = e.target.files[0];
            if (file) {
                var reader = new FileReader();
                reader.onload = function(e) {
                    document.getElementById('after-preview').innerHTML = '<img src="' + e.target.result + '">';
                    afterPhotoData = e.target.result;
                };
                reader.readAsDataURL(file);
            }
        });
    }
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.add('hidden');
    
    if (modalId === 'add-member-modal') {
        document.getElementById('new-member-name').value = '';
        document.getElementById('new-member-avatar').value = '👧';
    }
    
    if (modalId === 'add-chore-modal') {
        document.getElementById('new-chore-name').value = '';
        document.getElementById('new-chore-description').value = '';
        document.getElementById('new-chore-pay').value = '';
        document.getElementById('new-chore-icon').value = '📋';
        document.getElementById('edit-chore-id').value = '';
    }
}

function showToast(message) {
    var toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.remove('hidden');
    setTimeout(function() {
        toast.classList.add('hidden');
    }, 3000);
}

window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.classList.add('hidden');
    }
}
