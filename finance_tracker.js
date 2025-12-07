// Firebase Configuration - Using your real credentials
const firebaseConfig = {
    apiKey: "AIzaSyD81TKoyxisbbV3Z1PMz_Z12NFghW4tUkQ",
    authDomain: "finance-tracker-patrick.firebaseapp.com",
    projectId: "finance-tracker-patrick",
    storageBucket: "finance-tracker-patrick.firebasestorage.app",
    messagingSenderId: "750709740386",
    appId: "1:750709740386:web:24edd061629407e6c2d23b"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// DOM Elements
const authContainer = document.getElementById('auth-container');
const appContainer = document.getElementById('app-container');
const signinForm = document.getElementById('signin-form');
const signupForm = document.getElementById('signup-form');
const signinTab = document.getElementById('signin-tab');
const signupTab = document.getElementById('signup-tab');
const googleSigninBtn = document.getElementById('google-signin');
const signoutBtn = document.getElementById('signout-btn');
const menuToggle = document.getElementById('menu-toggle');
const sidebar = document.getElementById('sidebar');
const navLinks = document.querySelectorAll('.nav-link');
const pages = document.querySelectorAll('.page');
const addTransactionBtns = document.querySelectorAll('#add-transaction-btn, #add-transaction-btn2');
const transactionModal = document.getElementById('transaction-modal');
const closeTransactionModal = document.getElementById('close-transaction-modal');
const cancelTransaction = document.getElementById('cancel-transaction');
const saveTransaction = document.getElementById('save-transaction');
const transactionForm = document.getElementById('transaction-form');
const signoutModal = document.getElementById('signout-modal');
const confirmSignout = document.getElementById('confirm-signout');
const cancelSignout = document.getElementById('cancel-signout');
const closeSignoutModal = document.getElementById('close-signout-modal');
const toast = document.getElementById('toast');
const toastMessage = document.getElementById('toast-message');
const toastIcon = document.getElementById('toast-icon');
const recentTransactionsList = document.getElementById('recent-transactions');
const allTransactionsList = document.getElementById('all-transactions');
const deleteAccountBtn = document.getElementById('delete-account-btn');
const viewAllTransactionsBtn = document.getElementById('view-all-transactions');
const analyticsPeriod = document.getElementById('analytics-period');

// User data
let currentUser = null;
let userTransactions = [];
let unsubscribeTransactions = null;
let userPreferences = {
    currency: 'USD',
    emailNotifications: true
};

// Create sidebar overlay for mobile
const sidebarOverlay = document.createElement('div');
sidebarOverlay.className = 'sidebar-overlay';
document.body.appendChild(sidebarOverlay);

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
    // Set current date in transaction form
    document.getElementById('transaction-date').valueAsDate = new Date();
    
    // Check if user is already logged in
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            // User is signed in
            currentUser = user;
            await loadUserPreferences();
            showApp();
            updateUserInfo();
            setupRealtimeListeners();
        } else {
            // User is signed out
            showAuth();
        }
    });

    // Event listeners for auth tabs
    signinTab.addEventListener('click', () => switchAuthTab('signin'));
    signupTab.addEventListener('click', () => switchAuthTab('signup'));

    // Auth form submissions
    signinForm.addEventListener('submit', handleSignIn);
    signupForm.addEventListener('submit', handleSignUp);
    googleSigninBtn.addEventListener('click', handleGoogleSignIn);

    // Navigation
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = e.currentTarget.getAttribute('data-page');
            showPage(page);
            
            // Update active nav link
            navLinks.forEach(l => l.classList.remove('active'));
            e.currentTarget.classList.add('active');
            
            // Close sidebar on mobile
            closeMobileSidebar();
        });
    });

    // Mobile menu toggle
    menuToggle.addEventListener('click', () => {
        sidebar.classList.add('active');
        sidebarOverlay.classList.add('active');
    });

    // Close sidebar when clicking overlay
    sidebarOverlay.addEventListener('click', closeMobileSidebar);

    // Transaction modal
    addTransactionBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            transactionModal.classList.add('active');
        });
    });

    closeTransactionModal.addEventListener('click', () => {
        transactionModal.classList.remove('active');
    });

    cancelTransaction.addEventListener('click', () => {
        transactionModal.classList.remove('active');
        transactionForm.reset();
        document.getElementById('transaction-date').valueAsDate = new Date();
    });

    saveTransaction.addEventListener('click', handleSaveTransaction);

    // Sign out functionality
    signoutBtn.addEventListener('click', () => {
        signoutModal.classList.add('active');
    });

    closeSignoutModal.addEventListener('click', () => {
        signoutModal.classList.remove('active');
    });

    cancelSignout.addEventListener('click', () => {
        signoutModal.classList.remove('active');
    });

    confirmSignout.addEventListener('click', handleSignOut);

    // View all transactions
    if (viewAllTransactionsBtn) {
        viewAllTransactionsBtn.addEventListener('click', () => {
            showPage('transactions');
            navLinks.forEach(l => l.classList.remove('active'));
            document.querySelector('[data-page="transactions"]').classList.add('active');
            closeMobileSidebar();
        });
    }

    // Delete account button
    deleteAccountBtn.addEventListener('click', handleDeleteAccount);

    // Search and filter functionality
    document.getElementById('search-transactions')?.addEventListener('input', filterTransactions);
    document.getElementById('filter-category')?.addEventListener('change', filterTransactions);
    document.getElementById('filter-type')?.addEventListener('change', filterTransactions);

    // Analytics period change
    if (analyticsPeriod) {
        analyticsPeriod.addEventListener('change', updateAnalytics);
    }

    // Settings functionality
    document.getElementById('currency-select')?.addEventListener('change', updateCurrency);
    document.getElementById('export-data-btn')?.addEventListener('click', exportData);
    document.getElementById('edit-name-btn')?.addEventListener('click', () => editProfileField('name'));
    document.getElementById('edit-email-btn')?.addEventListener('click', () => editProfileField('email'));
    document.getElementById('change-password-btn')?.addEventListener('click', changePassword);
    document.getElementById('email-notifications')?.addEventListener('change', updateEmailNotifications);
    document.getElementById('two-factor-auth')?.addEventListener('change', updateTwoFactorAuth);

    // Initial page load
    showPage('dashboard');
});

// Firebase Functions
async function handleSignIn(e) {
    e.preventDefault();
    const email = document.getElementById('signin-email').value;
    const password = document.getElementById('signin-password').value;
    
    const btnText = document.getElementById('signin-btn-text');
    const spinner = document.getElementById('signin-spinner');
    
    btnText.textContent = 'Signing In...';
    spinner.style.display = 'inline-block';
    
    try {
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        currentUser = userCredential.user;
        showToast('Signed in successfully!', 'success');
    } catch (error) {
        let errorMessage = 'Error signing in';
        switch(error.code) {
            case 'auth/invalid-email':
                errorMessage = 'Invalid email address';
                break;
            case 'auth/user-disabled':
                errorMessage = 'Account has been disabled';
                break;
            case 'auth/user-not-found':
                errorMessage = 'No account found with this email';
                break;
            case 'auth/wrong-password':
                errorMessage = 'Incorrect password';
                break;
            default:
                errorMessage = 'Error signing in: ' + error.message;
        }
        showToast(errorMessage, 'error');
    } finally {
        btnText.textContent = 'Sign In';
        spinner.style.display = 'none';
    }
}

async function handleSignUp(e) {
    e.preventDefault();
    const name = document.getElementById('signup-name').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    
    if (password.length < 8) {
        showToast('Password must be at least 8 characters long', 'error');
        return;
    }
    
    const btnText = document.getElementById('signup-btn-text');
    const spinner = document.getElementById('signup-spinner');
    
    btnText.textContent = 'Creating Account...';
    spinner.style.display = 'inline-block';
    
    try {
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        
        // Update profile
        await userCredential.user.updateProfile({
            displayName: name
        });
        
        // Create user document in Firestore
        await db.collection('users').doc(userCredential.user.uid).set({
            name: name,
            email: email,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            preferences: {
                currency: 'USD',
                emailNotifications: true,
                twoFactorAuth: false
            }
        });
        
        currentUser = userCredential.user;
        userPreferences = {
            currency: 'USD',
            emailNotifications: true,
            twoFactorAuth: false
        };
        showToast('Account created successfully!', 'success');
    } catch (error) {
        let errorMessage = 'Error creating account';
        switch(error.code) {
            case 'auth/email-already-in-use':
                errorMessage = 'Email already in use';
                break;
            case 'auth/invalid-email':
                errorMessage = 'Invalid email address';
                break;
            case 'auth/operation-not-allowed':
                errorMessage = 'Email/password accounts are not enabled';
                break;
            case 'auth/weak-password':
                errorMessage = 'Password is too weak';
                break;
            default:
                errorMessage = 'Error creating account: ' + error.message;
        }
        showToast(errorMessage, 'error');
    } finally {
        btnText.textContent = 'Create Account';
        spinner.style.display = 'none';
    }
}

async function handleGoogleSignIn() {
    try {
        const provider = new firebase.auth.GoogleAuthProvider();
        const result = await auth.signInWithPopup(provider);
        
        // Check if user document exists, if not create one
        const userDoc = await db.collection('users').doc(result.user.uid).get();
        
        if (!userDoc.exists) {
            await db.collection('users').doc(result.user.uid).set({
                name: result.user.displayName,
                email: result.user.email,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                preferences: {
                    currency: 'USD',
                    emailNotifications: true,
                    twoFactorAuth: false
                }
            });
        } else {
            const userData = userDoc.data();
            if (userData.preferences) {
                userPreferences = userData.preferences;
            }
        }
        
        showToast('Signed in with Google!', 'success');
    } catch (error) {
        let errorMessage = 'Error signing in with Google';
        if (error.code === 'auth/popup-closed-by-user') {
            errorMessage = 'Sign in cancelled';
        } else {
            errorMessage += ': ' + error.message;
        }
        showToast(errorMessage, 'error');
    }
}

async function loadUserPreferences() {
    if (!currentUser) return;
    
    try {
        const userDoc = await db.collection('users').doc(currentUser.uid).get();
        if (userDoc.exists && userDoc.data().preferences) {
            userPreferences = userDoc.data().preferences;
            
            // Update UI
            if (document.getElementById('currency-select')) {
                document.getElementById('currency-select').value = userPreferences.currency || 'USD';
                document.getElementById('currency-display').textContent = getCurrencyDisplay(userPreferences.currency);
            }
            
            if (document.getElementById('email-notifications')) {
                document.getElementById('email-notifications').checked = userPreferences.emailNotifications || true;
            }
            
            if (document.getElementById('two-factor-auth')) {
                document.getElementById('two-factor-auth').checked = userPreferences.twoFactorAuth || false;
            }
        }
    } catch (error) {
        console.error('Error loading preferences:', error);
    }
}

async function handleSaveTransaction() {
    if (!currentUser) {
        showToast('Please sign in to add transactions', 'error');
        return;
    }
    
    const type = document.querySelector('input[name="type"]:checked').value;
    const amount = parseFloat(document.getElementById('transaction-amount').value);
    const category = document.getElementById('transaction-category').value;
    const date = document.getElementById('transaction-date').value;
    const description = document.getElementById('transaction-description').value.trim();
    
    if (!amount || amount <= 0 || !category || !date || !description) {
        showToast('Please fill in all required fields with valid values', 'error');
        return;
    }
    
    const saveBtn = document.getElementById('save-transaction');
    const spinner = document.getElementById('save-transaction-spinner');
    
    saveBtn.disabled = true;
    spinner.style.display = 'inline-block';
    
    try {
        const transactionData = {
            userId: currentUser.uid,
            type: type,
            amount: amount,
            category: category,
            description: description,
            date: date,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        // Save to Firestore
        await db.collection('transactions').add(transactionData);
        
        // Close modal and reset form
        transactionModal.classList.remove('active');
        transactionForm.reset();
        document.getElementById('transaction-date').valueAsDate = new Date();
        
        showToast('Transaction added successfully!', 'success');
    } catch (error) {
        console.error('Save transaction error:', error);
        showToast('Error saving transaction. Please try again.', 'error');
    } finally {
        saveBtn.disabled = false;
        spinner.style.display = 'none';
    }
}

function setupRealtimeListeners() {
    if (!currentUser) return;
    
    // Unsubscribe from previous listener if exists
    if (unsubscribeTransactions) {
        unsubscribeTransactions();
    }
    
    // Set up real-time listener for transactions
    unsubscribeTransactions = db.collection('transactions')
        .where('userId', '==', currentUser.uid)
        .orderBy('date', 'desc')
        .orderBy('createdAt', 'desc')
        .onSnapshot((snapshot) => {
            userTransactions = [];
            snapshot.forEach(doc => {
                const transaction = doc.data();
                transaction.id = doc.id;
                transaction.icon = getCategoryIcon(transaction.category);
                userTransactions.push(transaction);
            });
            
            // Update UI
            loadTransactions();
            updateDashboardStats();
            updateAnalytics();
            
        }, (error) => {
            console.error('Real-time updates error:', error);
            if (error.code === 'failed-precondition') {
                showToast('Loading transactions...', 'info');
                loadTransactionsWithoutOrder();
            } else {
                showToast('Error loading transactions', 'error');
            }
        });
}

async function loadTransactionsWithoutOrder() {
    if (!currentUser) return;
    
    try {
        const transactionsSnapshot = await db.collection('transactions')
            .where('userId', '==', currentUser.uid)
            .get();
        
        userTransactions = [];
        transactionsSnapshot.forEach(doc => {
            const transaction = doc.data();
            transaction.id = doc.id;
            transaction.icon = getCategoryIcon(transaction.category);
            userTransactions.push(transaction);
        });
        
        // Sort by date manually
        userTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        // Update UI
        loadTransactions();
        updateDashboardStats();
        
    } catch (error) {
        console.error('Load transactions error:', error);
        showEmptyState();
    }
}

function loadTransactions() {
    // Clear loading spinners
    const loadingSpinners = document.querySelectorAll('.loading-spinner');
    loadingSpinners.forEach(spinner => spinner.remove());
    
    // Clear lists
    recentTransactionsList.innerHTML = '';
    allTransactionsList.innerHTML = '';
    
    if (userTransactions.length === 0) {
        showEmptyState();
        return;
    }
    
    // Add to recent transactions (first 5)
    userTransactions.slice(0, 5).forEach(transaction => {
        recentTransactionsList.appendChild(createTransactionElement(transaction));
    });
    
    // Add to all transactions
    userTransactions.forEach(transaction => {
        allTransactionsList.appendChild(createTransactionElement(transaction));
    });
}

function createTransactionElement(transaction) {
    const li = document.createElement('li');
    li.className = 'transaction-item';
    li.dataset.id = transaction.id;
    
    const isIncome = transaction.type === 'income';
    const amountClass = isIncome ? 'amount-positive' : 'amount-negative';
    const amountPrefix = isIncome ? '+' : '-';
    const formattedAmount = formatCurrency(transaction.amount, userPreferences.currency);
    
    li.innerHTML = `
        <div class="transaction-info">
            <div class="transaction-icon ${getCategoryClass(transaction.category)}">
                <i class="${transaction.icon}"></i>
            </div>
            <div class="transaction-details">
                <h4>${transaction.description}</h4>
                <p>${transaction.category}</p>
            </div>
        </div>
        <div class="transaction-amount-date">
            <div class="transaction-actions">
                <button class="btn btn-outline btn-sm edit-transaction" data-id="${transaction.id}">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-outline btn-sm delete-transaction" data-id="${transaction.id}">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
            <div>
                <div class="transaction-amount ${amountClass}">${amountPrefix}${formattedAmount}</div>
                <div class="transaction-date">${formatDate(transaction.date)}</div>
            </div>
        </div>
    `;
    
    // Add event listeners for edit/delete buttons
    const editBtn = li.querySelector('.edit-transaction');
    const deleteBtn = li.querySelector('.delete-transaction');
    
    editBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        editTransaction(transaction.id);
    });
    
    deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteTransaction(transaction.id, transaction.description);
    });
    
    return li;
}

async function editTransaction(transactionId) {
    const transaction = userTransactions.find(t => t.id === transactionId);
    if (!transaction) return;
    
    // Populate modal with transaction data
    document.querySelector(`input[name="type"][value="${transaction.type}"]`).checked = true;
    document.getElementById('transaction-amount').value = transaction.amount;
    document.getElementById('transaction-category').value = transaction.category;
    document.getElementById('transaction-date').value = transaction.date;
    document.getElementById('transaction-description').value = transaction.description;
    
    // Change modal title and button
    document.querySelector('#transaction-modal .modal-title').textContent = 'Edit Transaction';
    document.getElementById('save-transaction').innerHTML = `
        <span>Update Transaction</span>
        <span id="save-transaction-spinner" class="spinner" style="display: none;"></span>
    `;
    
    // Store the transaction ID for updating
    transactionModal.dataset.editingId = transactionId;
    
    // Show modal
    transactionModal.classList.add('active');
    
    // Update save button functionality
    const saveBtn = document.getElementById('save-transaction');
    const newSaveBtn = saveBtn.cloneNode(true);
    saveBtn.parentNode.replaceChild(newSaveBtn, saveBtn);
    
    newSaveBtn.addEventListener('click', async () => {
        await updateTransaction(transactionId);
    });
}

async function updateTransaction(transactionId) {
    const type = document.querySelector('input[name="type"]:checked').value;
    const amount = parseFloat(document.getElementById('transaction-amount').value);
    const category = document.getElementById('transaction-category').value;
    const date = document.getElementById('transaction-date').value;
    const description = document.getElementById('transaction-description').value.trim();
    
    if (!amount || amount <= 0 || !category || !date || !description) {
        showToast('Please fill in all required fields with valid values', 'error');
        return;
    }
    
    const saveBtn = document.getElementById('save-transaction');
    const spinner = document.getElementById('save-transaction-spinner');
    
    saveBtn.disabled = true;
    spinner.style.display = 'inline-block';
    
    try {
        const transactionData = {
            type: type,
            amount: amount,
            category: category,
            description: description,
            date: date,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        // Update in Firestore
        await db.collection('transactions').doc(transactionId).update(transactionData);
        
        // Close modal and reset form
        transactionModal.classList.remove('active');
        transactionForm.reset();
        document.getElementById('transaction-date').valueAsDate = new Date();
        
        // Reset modal
        document.querySelector('#transaction-modal .modal-title').textContent = 'Add Transaction';
        document.getElementById('save-transaction').innerHTML = `
            <span>Add Transaction</span>
            <span id="save-transaction-spinner" class="spinner" style="display: none;"></span>
        `;
        delete transactionModal.dataset.editingId;
        
        showToast('Transaction updated successfully!', 'success');
    } catch (error) {
        console.error('Update transaction error:', error);
        showToast('Error updating transaction. Please try again.', 'error');
    } finally {
        saveBtn.disabled = false;
        spinner.style.display = 'none';
    }
}

async function deleteTransaction(transactionId, description) {
    if (!confirm(`Are you sure you want to delete "${description}"?`)) {
        return;
    }
    
    try {
        await db.collection('transactions').doc(transactionId).delete();
        showToast('Transaction deleted successfully', 'success');
    } catch (error) {
        console.error('Delete transaction error:', error);
        showToast('Error deleting transaction', 'error');
    }
}

function showEmptyState() {
    // Dashboard empty state
    recentTransactionsList.innerHTML = `
        <div class="empty-state">
            <i class="fas fa-wallet"></i>
            <h3>No Transactions Yet</h3>
            <p>Start by adding your first transaction</p>
            <button class="btn btn-primary" style="margin-top: 1rem;" id="add-first-transaction">
                <i class="fas fa-plus"></i> Add Transaction
            </button>
        </div>
    `;
    
    // Add event listener to the button
    document.getElementById('add-first-transaction')?.addEventListener('click', () => {
        transactionModal.classList.add('active');
    });
    
    // All transactions empty state
    allTransactionsList.innerHTML = `
        <div class="empty-state">
            <i class="fas fa-exchange-alt"></i>
            <h3>No Transactions Found</h3>
            <p>Add transactions to see them here</p>
        </div>
    `;
}

function filterTransactions() {
    if (userTransactions.length === 0) return;
    
    const searchTerm = document.getElementById('search-transactions')?.value.toLowerCase() || '';
    const categoryFilter = document.getElementById('filter-category')?.value || '';
    const typeFilter = document.getElementById('filter-type')?.value || '';
    
    const filteredTransactions = userTransactions.filter(transaction => {
        const matchesSearch = transaction.description.toLowerCase().includes(searchTerm) ||
                            transaction.category.toLowerCase().includes(searchTerm);
        const matchesCategory = !categoryFilter || transaction.category === categoryFilter;
        const matchesType = !typeFilter || transaction.type === typeFilter;
        
        return matchesSearch && matchesCategory && matchesType;
    });
    
    // Update all transactions list
    allTransactionsList.innerHTML = '';
    
    if (filteredTransactions.length === 0) {
        allTransactionsList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-search"></i>
                <h3>No Matching Transactions</h3>
                <p>Try adjusting your search or filters</p>
            </div>
        `;
    } else {
        filteredTransactions.forEach(transaction => {
            allTransactionsList.appendChild(createTransactionElement(transaction));
        });
    }
}

async function updateDashboardStats() {
    if (!currentUser || userTransactions.length === 0) {
        document.getElementById('total-balance').textContent = formatCurrency(0, userPreferences.currency);
        document.getElementById('month-income').textContent = formatCurrency(0, userPreferences.currency);
        document.getElementById('month-expense').textContent = formatCurrency(0, userPreferences.currency);
        return;
    }
    
    try {
        let totalIncome = 0;
        let totalExpense = 0;
        let currentMonthIncome = 0;
        let currentMonthExpense = 0;
        
        // Get current month
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        
        userTransactions.forEach(transaction => {
            const transactionDate = new Date(transaction.date);
            
            // Total calculations
            if (transaction.type === 'income') {
                totalIncome += transaction.amount;
            } else {
                totalExpense += transaction.amount;
            }
            
            // Current month calculations
            if (transactionDate.getMonth() === currentMonth && 
                transactionDate.getFullYear() === currentYear) {
                if (transaction.type === 'income') {
                    currentMonthIncome += transaction.amount;
                } else {
                    currentMonthExpense += transaction.amount;
                }
            }
        });
        
        const totalBalance = totalIncome - totalExpense;
        
        // Update UI
        document.getElementById('total-balance').textContent = formatCurrency(totalBalance, userPreferences.currency);
        document.getElementById('month-income').textContent = formatCurrency(currentMonthIncome, userPreferences.currency);
        document.getElementById('month-expense').textContent = formatCurrency(currentMonthExpense, userPreferences.currency);
        
        // Update chart visualization
        updateChartVisualization();
        
    } catch (error) {
        console.error('Update stats error:', error);
    }
}

function updateChartVisualization() {
    const chartContainer = document.getElementById('chart-visualization');
    if (!chartContainer) return;
    
    // Get last 7 days of transactions
    const now = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(now.getDate() - 7);
    
    // Group transactions by day
    const dailyData = {};
    for (let i = 0; i < 7; i++) {
        const date = new Date();
        date.setDate(now.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        dailyData[dateStr] = { income: 0, expense: 0 };
    }
    
    // Calculate daily totals
    userTransactions.forEach(transaction => {
        const transactionDate = new Date(transaction.date).toISOString().split('T')[0];
        if (dailyData[transactionDate]) {
            if (transaction.type === 'income') {
                dailyData[transactionDate].income += transaction.amount;
            } else {
                dailyData[transactionDate].expense += transaction.amount;
            }
        }
    });
    
    // Convert to array and reverse for chronological order
    const chartData = Object.entries(dailyData)
        .sort((a, b) => new Date(a[0]) - new Date(b[0]))
        .map(([date, data]) => ({
            date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            income: data.income,
            expense: data.expense,
            net: data.income - data.expense
        }));
    
    // Find max amount for scaling
    const maxNet = Math.max(...chartData.map(d => Math.abs(d.net)), 100);
    
    let chartHTML = '';
    chartData.forEach((data, index) => {
        const heightPercentage = Math.abs(data.net) / maxNet * 80;
        const barColor = data.net >= 0 ? 'var(--success-color)' : 'var(--danger-color)';
        
        chartHTML += `
            <div class="chart-bar-container">
                <div class="chart-bar" style="height: ${heightPercentage}%; background-color: ${barColor};"></div>
                <span class="chart-label">${data.date}</span>
            </div>
        `;
    });
    
    chartContainer.innerHTML = chartHTML;
    
    // Update legend
    const legend = document.createElement('div');
    legend.className = 'chart-legend';
    legend.innerHTML = `
        <div class="chart-legend-item">
            <div class="chart-legend-color" style="background-color: var(--success-color);"></div>
            <span>Income</span>
        </div>
        <div class="chart-legend-item">
            <div class="chart-legend-color" style="background-color: var(--danger-color);"></div>
            <span>Expense</span>
        </div>
    `;
    
    // Remove existing legend and add new one
    const existingLegend = chartContainer.querySelector('.chart-legend');
    if (existingLegend) {
        existingLegend.remove();
    }
    chartContainer.appendChild(legend);
}

async function updateAnalytics() {
    if (userTransactions.length === 0) {
        document.getElementById('top-category').textContent = 'None';
        document.getElementById('top-category-details').textContent = 'No data available';
        document.getElementById('savings-rate').textContent = '0%';
        document.getElementById('savings-trend').textContent = 'Start tracking expenses';
        document.getElementById('transactions-count').textContent = '0';
        document.getElementById('transactions-breakdown').textContent = '0 expenses, 0 incomes';
        
        document.getElementById('pie-chart').innerHTML = `
            <div class="empty-state">
                <p>No data for analytics</p>
            </div>
        `;
        document.getElementById('category-legend').innerHTML = '';
        return;
    }
    
    try {
        const period = document.getElementById('analytics-period')?.value || 'current';
        const now = new Date();
        let startDate = new Date();
        
        switch(period) {
            case 'last':
                startDate.setMonth(startDate.getMonth() - 1);
                startDate.setDate(1);
                break;
            case 'quarter':
                startDate.setMonth(startDate.getMonth() - 3);
                break;
            case 'year':
                startDate.setFullYear(startDate.getFullYear() - 1);
                break;
            default: // current month
                startDate.setDate(1);
        }
        
        // Filter transactions by period
        const filteredTransactions = userTransactions.filter(transaction => {
            const transactionDate = new Date(transaction.date);
            return transactionDate >= startDate;
        });
        
        // Calculate analytics
        const categoryTotals = {};
        let totalExpenses = 0;
        let totalIncome = 0;
        
        filteredTransactions.forEach(transaction => {
            if (transaction.type === 'expense') {
                totalExpenses += transaction.amount;
                if (!categoryTotals[transaction.category]) {
                    categoryTotals[transaction.category] = 0;
                }
                categoryTotals[transaction.category] += transaction.amount;
            } else {
                totalIncome += transaction.amount;
            }
        });
        
        // Find top spending category
        let topCategory = 'None';
        let topAmount = 0;
        
        for (const [category, amount] of Object.entries(categoryTotals)) {
            if (amount > topAmount) {
                topAmount = amount;
                topCategory = category;
            }
        }
        
        // Calculate savings rate
        const savingsRate = totalIncome > 0 ? 
            Math.round(((totalIncome - totalExpenses) / totalIncome * 100)) : 0;
        
        const expenseCount = filteredTransactions.filter(t => t.type === 'expense').length;
        const incomeCount = filteredTransactions.filter(t => t.type === 'income').length;
        
        // Update UI
        document.getElementById('top-category').textContent = topCategory;
        document.getElementById('top-category-details').textContent = 
            `${formatCurrency(topAmount, userPreferences.currency)} (${totalExpenses > 0 ? 
                Math.round((topAmount / totalExpenses * 100)) : 0}% of expenses)`;
        
        document.getElementById('savings-rate').textContent = `${savingsRate}%`;
        document.getElementById('savings-trend').textContent = 
            savingsRate > 0 ? 'Positive savings' : 'Negative savings';
        
        document.getElementById('transactions-count').textContent = filteredTransactions.length;
        document.getElementById('transactions-breakdown').textContent = 
            `${expenseCount} expenses, ${incomeCount} incomes`;
        
        // Update pie chart
        updatePieChart(categoryTotals);
        
    } catch (error) {
        console.error('Update analytics error:', error);
    }
}

function updatePieChart(categoryTotals) {
    const pieChart = document.getElementById('pie-chart');
    const legend = document.getElementById('category-legend');
    
    if (Object.keys(categoryTotals).length === 0) {
        pieChart.innerHTML = `
            <div class="empty-state">
                <p>No expense data for chart</p>
            </div>
        `;
        legend.innerHTML = '';
        return;
    }
    
    // Calculate percentages
    const total = Object.values(categoryTotals).reduce((a, b) => a + b, 0);
    const colors = [
        'var(--primary-color)',
        'var(--success-color)',
        'var(--warning-color)',
        'var(--danger-color)',
        '#8b5cf6',
        '#db2777',
        '#0ea5e9',
        '#10b981',
        '#f59e0b'
    ];
    
    // Create pie chart segments
    let accumulatedAngle = 0;
    const segments = [];
    const categoriesArray = Object.entries(categoryTotals);
    
    categoriesArray.forEach(([category, amount], index) => {
        const percentage = (amount / total) * 100;
        const angle = (percentage / 100) * 360;
        
        segments.push({
            category,
            amount,
            percentage,
            color: colors[index % colors.length],
            startAngle: accumulatedAngle,
            endAngle: accumulatedAngle + angle
        });
        
        accumulatedAngle += angle;
    });
    
    // Create pie chart visualization
    const pieChartHTML = `
        <div class="pie-chart-visual">
            ${segments.map(segment => `
                <div class="pie-segment" style="
                    background-color: ${segment.color};
                    transform: rotate(${segment.startAngle}deg);
                    clip-path: polygon(50% 50%, 50% 0%, ${50 + 50 * Math.cos(segment.startAngle * Math.PI / 180)}% ${50 + 50 * Math.sin(segment.startAngle * Math.PI / 180)}%);
                "></div>
            `).join('')}
        </div>
    `;
    
    pieChart.innerHTML = pieChartHTML;
    
    // Update legend
    let legendHTML = '';
    segments.forEach(segment => {
        const roundedPercentage = Math.round(segment.percentage);
        legendHTML += `
            <div class="category-legend-item">
                <div class="category-color" style="background-color: ${segment.color};"></div>
                <span>${segment.category} (${roundedPercentage}%)</span>
            </div>
        `;
    });
    
    legend.innerHTML = legendHTML;
}

async function handleDeleteAccount() {
    if (!confirm('Are you sure you want to delete your account? This action cannot be undone. All your data will be permanently deleted.')) {
        return;
    }
    
    const deleteBtn = document.getElementById('delete-account-btn');
    const originalText = deleteBtn.innerHTML;
    
    deleteBtn.innerHTML = '<div class="spinner" style="width: 16px; height: 16px;"></div>';
    deleteBtn.disabled = true;
    
    try {
        // Get all user transactions
        const transactionsSnapshot = await db.collection('transactions')
            .where('userId', '==', currentUser.uid)
            .get();
        
        // Delete all transactions in batches
        const batchSize = 500;
        let batch = db.batch();
        let count = 0;
        
        transactionsSnapshot.forEach(doc => {
            batch.delete(doc.ref);
            count++;
            
            if (count % batchSize === 0) {
                batch.commit();
                batch = db.batch();
            }
        });
        
        if (count % batchSize !== 0) {
            await batch.commit();
        }
        
        // Delete user document
        await db.collection('users').doc(currentUser.uid).delete();
        
        // Delete the user account from Firebase Auth
        await currentUser.delete();
        
        showToast('Account deleted successfully', 'success');
        
    } catch (error) {
        console.error('Delete account error:', error);
        let errorMessage = 'Error deleting account';
        
        if (error.code === 'auth/requires-recent-login') {
            errorMessage = 'Please sign in again to delete your account';
            auth.signOut();
        }
        
        showToast(errorMessage, 'error');
    } finally {
        deleteBtn.innerHTML = originalText;
        deleteBtn.disabled = false;
    }
}

async function handleSignOut() {
    try {
        // Unsubscribe from listeners
        if (unsubscribeTransactions) {
            unsubscribeTransactions();
            unsubscribeTransactions = null;
        }
        
        await auth.signOut();
        signoutModal.classList.remove('active');
        showToast('Signed out successfully', 'success');
        userTransactions = [];
        closeMobileSidebar();
    } catch (error) {
        console.error('Sign out error:', error);
        showToast('Error signing out: ' + error.message, 'error');
    }
}

// Settings Functions
async function editProfileField(field) {
    let title, currentValue, inputType, placeholder;
    
    if (field === 'name') {
        title = 'Edit Full Name';
        currentValue = currentUser.displayName || '';
        inputType = 'text';
        placeholder = 'Enter your full name';
    } else if (field === 'email') {
        title = 'Edit Email Address';
        currentValue = currentUser.email || '';
        inputType = 'email';
        placeholder = 'Enter your email address';
    } else {
        return;
    }
    
    // Create modal for editing
    const modalHTML = `
        <div class="modal active" id="edit-profile-modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h2 class="modal-title">${title}</h2>
                    <button class="close-modal" id="close-edit-modal">&times;</button>
                </div>
                <div class="modal-body">
                    <form class="edit-form">
                        <div class="form-group">
                            <label class="form-label" for="edit-value">New ${field === 'name' ? 'Name' : 'Email'}</label>
                            <input type="${inputType}" id="edit-value" class="form-input" value="${currentValue}" placeholder="${placeholder}" required>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-outline" id="cancel-edit">Cancel</button>
                    <button class="btn btn-primary" id="save-edit">Save Changes</button>
                </div>
            </div>
        </div>
    `;
    
    // Add modal to DOM
    const modalContainer = document.createElement('div');
    modalContainer.innerHTML = modalHTML;
    document.body.appendChild(modalContainer);
    
    // Get modal elements
    const editModal = document.getElementById('edit-profile-modal');
    const closeEditModal = document.getElementById('close-edit-modal');
    const cancelEdit = document.getElementById('cancel-edit');
    const saveEdit = document.getElementById('save-edit');
    const editValue = document.getElementById('edit-value');
    
    // Event listeners
    const closeModal = () => {
        editModal.remove();
    };
    
    closeEditModal.addEventListener('click', closeModal);
    cancelEdit.addEventListener('click', closeModal);
    
    saveEdit.addEventListener('click', async () => {
        const newValue = editValue.value.trim();
        
        if (!newValue) {
            showToast('Please enter a value', 'error');
            return;
        }
        
        if (field === 'email' && !isValidEmail(newValue)) {
            showToast('Please enter a valid email address', 'error');
            return;
        }
        
        const saveBtn = saveEdit;
        const originalText = saveBtn.innerHTML;
        saveBtn.innerHTML = '<div class="spinner" style="width: 16px; height: 16px;"></div>';
        saveBtn.disabled = true;
        
        try {
            if (field === 'name') {
                await currentUser.updateProfile({
                    displayName: newValue
                });
                
                // Update user document in Firestore
                await db.collection('users').doc(currentUser.uid).update({
                    name: newValue
                });
                
                updateUserInfo();
                showToast('Name updated successfully', 'success');
            } else if (field === 'email') {
                await currentUser.updateEmail(newValue);
                
                // Update user document in Firestore
                await db.collection('users').doc(currentUser.uid).update({
                    email: newValue
                });
                
                updateUserInfo();
                showToast('Email updated successfully', 'success');
            }
            
            closeModal();
        } catch (error) {
            console.error(`Update ${field} error:`, error);
            let errorMessage = `Error updating ${field}`;
            
            if (error.code === 'auth/requires-recent-login') {
                errorMessage = 'Please sign in again to update your email';
            } else if (error.code === 'auth/email-already-in-use') {
                errorMessage = 'Email already in use';
            }
            
            showToast(errorMessage, 'error');
        } finally {
            saveBtn.innerHTML = originalText;
            saveBtn.disabled = false;
        }
    });
    
    // Close modal when clicking outside
    editModal.addEventListener('click', (e) => {
        if (e.target === editModal) {
            closeModal();
        }
    });
}

async function changePassword() {
    // Create modal for changing password
    const modalHTML = `
        <div class="modal active" id="change-password-modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h2 class="modal-title">Change Password</h2>
                    <button class="close-modal" id="close-password-modal">&times;</button>
                </div>
                <div class="modal-body">
                    <form class="edit-form">
                        <div class="form-group">
                            <label class="form-label" for="current-password">Current Password</label>
                            <input type="password" id="current-password" class="form-input" placeholder="Enter current password" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label" for="new-password">New Password</label>
                            <input type="password" id="new-password" class="form-input" placeholder="Enter new password" required>
                            <div class="password-requirement">Password must be at least 8 characters long</div>
                        </div>
                        <div class="form-group">
                            <label class="form-label" for="confirm-password">Confirm New Password</label>
                            <input type="password" id="confirm-password" class="form-input" placeholder="Confirm new password" required>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-outline" id="cancel-password">Cancel</button>
                    <button class="btn btn-primary" id="save-password">Change Password</button>
                </div>
            </div>
        </div>
    `;
    
    // Add modal to DOM
    const modalContainer = document.createElement('div');
    modalContainer.innerHTML = modalHTML;
    document.body.appendChild(modalContainer);
    
    // Get modal elements
    const passwordModal = document.getElementById('change-password-modal');
    const closePasswordModal = document.getElementById('close-password-modal');
    const cancelPassword = document.getElementById('cancel-password');
    const savePassword = document.getElementById('save-password');
    const currentPassword = document.getElementById('current-password');
    const newPassword = document.getElementById('new-password');
    const confirmPassword = document.getElementById('confirm-password');
    
    // Event listeners
    const closeModal = () => {
        passwordModal.remove();
    };
    
    closePasswordModal.addEventListener('click', closeModal);
    cancelPassword.addEventListener('click', closeModal);
    
    savePassword.addEventListener('click', async () => {
        const currentPass = currentPassword.value;
        const newPass = newPassword.value;
        const confirmPass = confirmPassword.value;
        
        if (!currentPass || !newPass || !confirmPass) {
            showToast('Please fill in all fields', 'error');
            return;
        }
        
        if (newPass.length < 8) {
            showToast('New password must be at least 8 characters long', 'error');
            return;
        }
        
        if (newPass !== confirmPass) {
            showToast('New passwords do not match', 'error');
            return;
        }
        
        const saveBtn = savePassword;
        const originalText = saveBtn.innerHTML;
        saveBtn.innerHTML = '<div class="spinner" style="width: 16px; height: 16px;"></div>';
        saveBtn.disabled = true;
        
        try {
            // Re-authenticate user
            const credential = firebase.auth.EmailAuthProvider.credential(
                currentUser.email,
                currentPass
            );
            
            await currentUser.reauthenticateWithCredential(credential);
            
            // Update password
            await currentUser.updatePassword(newPass);
            
            showToast('Password changed successfully', 'success');
            closeModal();
        } catch (error) {
            console.error('Change password error:', error);
            let errorMessage = 'Error changing password';
            
            if (error.code === 'auth/wrong-password') {
                errorMessage = 'Current password is incorrect';
            } else if (error.code === 'auth/weak-password') {
                errorMessage = 'New password is too weak';
            }
            
            showToast(errorMessage, 'error');
        } finally {
            saveBtn.innerHTML = originalText;
            saveBtn.disabled = false;
        }
    });
    
    // Close modal when clicking outside
    passwordModal.addEventListener('click', (e) => {
        if (e.target === passwordModal) {
            closeModal();
        }
    });
}

async function updateCurrency() {
    const currency = document.getElementById('currency-select').value;
    
    try {
        // Update in Firestore
        await db.collection('users').doc(currentUser.uid).update({
            'preferences.currency': currency
        });
        
        userPreferences.currency = currency;
        document.getElementById('currency-display').textContent = getCurrencyDisplay(currency);
        
        // Update UI with new currency
        updateDashboardStats();
        loadTransactions();
        
        showToast('Currency preference updated', 'success');
    } catch (error) {
        console.error('Update currency error:', error);
        showToast('Error updating currency preference', 'error');
    }
}

async function updateEmailNotifications() {
    const enabled = document.getElementById('email-notifications').checked;
    
    try {
        // Update in Firestore
        await db.collection('users').doc(currentUser.uid).update({
            'preferences.emailNotifications': enabled
        });
        
        userPreferences.emailNotifications = enabled;
        showToast(`Email notifications ${enabled ? 'enabled' : 'disabled'}`, 'success');
    } catch (error) {
        console.error('Update email notifications error:', error);
        showToast('Error updating email notifications', 'error');
    }
}

async function updateTwoFactorAuth() {
    const enabled = document.getElementById('two-factor-auth').checked;
    
    try {
        // Update in Firestore
        await db.collection('users').doc(currentUser.uid).update({
            'preferences.twoFactorAuth': enabled
        });
        
        userPreferences.twoFactorAuth = enabled;
        showToast(`Two-factor authentication ${enabled ? 'enabled' : 'disabled'}`, 'success');
    } catch (error) {
        console.error('Update two-factor auth error:', error);
        showToast('Error updating two-factor authentication', 'error');
    }
}

function exportData() {
    if (userTransactions.length === 0) {
        showToast('No transactions to export', 'info');
        return;
    }
    
    // Convert transactions to CSV
    const headers = ['Date', 'Type', 'Category', 'Description', 'Amount'];
    const csvData = [
        headers.join(','),
        ...userTransactions.map(t => [
            t.date,
            t.type,
            t.category,
            `"${t.description.replace(/"/g, '""')}"`,
            t.amount
        ].join(','))
    ].join('\n');
    
    // Create download link
    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    showToast('Data exported successfully', 'success');
}

// Helper Functions
function switchAuthTab(tab) {
    if (tab === 'signin') {
        signinTab.classList.add('active');
        signupTab.classList.remove('active');
        signinForm.style.display = 'block';
        signupForm.style.display = 'none';
    } else {
        signinTab.classList.remove('active');
        signupTab.classList.add('active');
        signinForm.style.display = 'none';
        signupForm.style.display = 'block';
    }
}

function showAuth() {
    authContainer.style.display = 'flex';
    appContainer.style.display = 'none';
    signinForm.reset();
    signupForm.reset();
    
    // Reset user data
    currentUser = null;
    userTransactions = [];
    userPreferences = {
        currency: 'USD',
        emailNotifications: true,
        twoFactorAuth: false
    };
    
    // Unsubscribe from listeners
    if (unsubscribeTransactions) {
        unsubscribeTransactions();
        unsubscribeTransactions = null;
    }
}

function showApp() {
    authContainer.style.display = 'none';
    appContainer.style.display = 'flex';
    closeMobileSidebar();
}

function updateUserInfo() {
    if (!currentUser) return;
    
    const userName = currentUser.displayName || 'User';
    const userEmail = currentUser.email || 'user@example.com';
    const userInitial = userName.charAt(0).toUpperCase();
    
    // Update user info in sidebar
    document.getElementById('user-name').textContent = userName;
    document.getElementById('user-email').textContent = userEmail;
    document.getElementById('user-avatar').textContent = userInitial;
    
    // Update user info in dashboard
    document.getElementById('dashboard-username').textContent = userName;
    
    // Update user info in settings
    document.getElementById('settings-user-name').textContent = userName;
    document.getElementById('settings-user-email').textContent = userEmail;
}

function showPage(pageName) {
    // Hide all pages
    pages.forEach(page => {
        page.style.display = 'none';
    });
    
    // Show selected page
    document.getElementById(`${pageName}-page`).style.display = 'block';
    
    // Load data for specific pages
    if (pageName === 'dashboard' || pageName === 'transactions') {
        loadTransactions();
        updateDashboardStats();
    } else if (pageName === 'analytics') {
        updateAnalytics();
    }
}

function getCategoryIcon(category) {
    switch(category) {
        case 'Salary': return 'fas fa-money-check-alt';
        case 'Food': return 'fas fa-utensils';
        case 'Entertainment': return 'fas fa-film';
        case 'Transportation': return 'fas fa-car';
        case 'Freelance': return 'fas fa-laptop-code';
        case 'Shopping': return 'fas fa-shopping-bag';
        case 'Utilities': return 'fas fa-bolt';
        case 'Healthcare': return 'fas fa-heartbeat';
        default: return 'fas fa-wallet';
    }
}

function getCategoryClass(category) {
    switch(category) {
        case 'Salary': return 'icon-salary';
        case 'Food': return 'icon-food';
        case 'Entertainment': return 'icon-entertainment';
        case 'Transportation': return 'icon-transportation';
        case 'Freelance': return 'icon-freelance';
        case 'Shopping': return 'icon-shopping';
        case 'Utilities': return 'icon-utilities';
        case 'Healthcare': return 'icon-healthcare';
        default: return 'icon-default';
    }
}

function formatCurrency(amount, currency = 'USD') {
    const currencySymbols = {
        'USD': '$',
        'EUR': '€',
        'GBP': '£',
        'JPY': '¥'
    };
    
    const symbol = currencySymbols[currency] || '$';
    
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount);
}

function getCurrencyDisplay(currency) {
    const currencyNames = {
        'USD': 'US Dollar (USD)',
        'EUR': 'Euro (EUR)',
        'GBP': 'British Pound (GBP)',
        'JPY': 'Japanese Yen (JPY)'
    };
    
    return currencyNames[currency] || 'US Dollar (USD)';
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays} days ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function isValidEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function showToast(message, type = 'success') {
    toastMessage.textContent = message;
    toast.className = 'toast';
    
    if (type === 'success') {
        toast.classList.add('success');
        toastIcon.className = 'fas fa-check-circle';
    } else if (type === 'error') {
        toast.classList.add('error');
        toastIcon.className = 'fas fa-exclamation-circle';
    } else if (type === 'info') {
        toastIcon.className = 'fas fa-info-circle';
    }
    
    toast.classList.add('show');
    
    // Clear any existing timeout
    if (window.toastTimeout) {
        clearTimeout(window.toastTimeout);
    }
    
    window.toastTimeout = setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

function closeMobileSidebar() {
    sidebar.classList.remove('active');
    sidebarOverlay.classList.remove('active');
}

// Handle window resize
window.addEventListener('resize', () => {
    if (window.innerWidth > 1024) {
        closeMobileSidebar();
    }
});

// Prevent body scroll when sidebar is open on mobile
sidebar.addEventListener('transitionstart', () => {
    if (sidebar.classList.contains('active')) {
        document.body.style.overflow = 'hidden';
    } else {
        document.body.style.overflow = '';
    }
});

sidebar.addEventListener('transitionend', () => {
    if (!sidebar.classList.contains('active')) {
        document.body.style.overflow = '';
    }
});