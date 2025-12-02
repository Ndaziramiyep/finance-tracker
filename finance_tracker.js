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

// User data
let currentUser = null;
let userTransactions = [];
let unsubscribeTransactions = null;

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
    // Set current date in transaction form
    document.getElementById('transaction-date').valueAsDate = new Date();
    
    // Check if user is already logged in
    auth.onAuthStateChanged((user) => {
        if (user) {
            // User is signed in
            currentUser = user;
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
            if (window.innerWidth <= 1024) {
                sidebar.classList.remove('active');
            }
        });
    });

    // Mobile menu toggle
    menuToggle.addEventListener('click', () => {
        sidebar.classList.toggle('active');
    });

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

    // Delete account button
    deleteAccountBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to delete your account? This action cannot be undone. All your data will be permanently deleted.')) {
            deleteUserAccount();
        }
    });

    // Search and filter functionality
    document.getElementById('search-transactions')?.addEventListener('input', filterTransactions);
    document.getElementById('filter-category')?.addEventListener('change', filterTransactions);
    document.getElementById('filter-type')?.addEventListener('change', filterTransactions);

    // Analytics period change
    document.getElementById('analytics-period')?.addEventListener('change', updateAnalytics);

    // Settings functionality
    document.getElementById('currency-select')?.addEventListener('change', updateCurrency);
    document.getElementById('export-data-btn')?.addEventListener('click', exportData);

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
                emailNotifications: true
            }
        });
        
        currentUser = userCredential.user;
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
                    emailNotifications: true
                }
            });
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
                // Index might not exist, try without ordering
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

function showEmptyState() {
    // Dashboard empty state
    recentTransactionsList.innerHTML = `
        <div class="empty-state">
            <i class="fas fa-wallet"></i>
            <h3>No Transactions Yet</h3>
            <p>Start by adding your first transaction</p>
        </div>
    `;
    
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
        document.getElementById('total-balance').textContent = formatCurrency(0);
        document.getElementById('month-income').textContent = formatCurrency(0);
        document.getElementById('month-expense').textContent = formatCurrency(0);
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
        document.getElementById('total-balance').textContent = formatCurrency(totalBalance);
        document.getElementById('month-income').textContent = formatCurrency(currentMonthIncome);
        document.getElementById('month-expense').textContent = formatCurrency(currentMonthExpense);
        
        // Update chart visualization
        updateChartVisualization();
        
    } catch (error) {
        console.error('Update stats error:', error);
    }
}

function updateChartVisualization() {
    const chartContainer = document.getElementById('chart-visualization');
    if (!chartContainer) return;
    
    // Simple chart based on last 7 transactions
    const recentForChart = userTransactions.slice(0, 7).reverse();
    
    if (recentForChart.length === 0) {
        chartContainer.innerHTML = `
            <div class="empty-state" style="width: 100%;">
                <p>No data for chart</p>
            </div>
        `;
        return;
    }
    
    // Find max amount for scaling
    const maxAmount = Math.max(...recentForChart.map(t => t.amount), 100);
    
    let chartHTML = '';
    recentForChart.forEach((transaction, index) => {
        const heightPercentage = (transaction.amount / maxAmount) * 80;
        const barColor = transaction.type === 'income' ? 'var(--success-color)' : 'var(--danger-color)';
        
        chartHTML += `
            <div style="flex: 1; display: flex; flex-direction: column; align-items: center;">
                <div style="
                    width: 80%; 
                    background: linear-gradient(to top, ${barColor}20 ${heightPercentage}%, ${barColor} ${heightPercentage}%);
                    height: ${heightPercentage}%;
                    border-radius: 4px 4px 0 0;
                "></div>
                <span style="font-size: 0.8rem; margin-top: 5px; color: var(--gray-color);">
                    ${formatDateShort(transaction.date)}
                </span>
            </div>
        `;
    });
    
    chartContainer.innerHTML = chartHTML;
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
            `${formatCurrency(topAmount)} (${totalExpenses > 0 ? 
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
    
    // Calculate percentages and colors
    const total = Object.values(categoryTotals).reduce((a, b) => a + b, 0);
    const colors = [
        'var(--primary-color)',
        'var(--success-color)',
        'var(--warning-color)',
        'var(--danger-color)',
        '#8b5cf6',
        '#db2777',
        '#0ea5e9'
    ];
    
    // Build conic gradient
    let gradientString = '';
    let accumulatedPercentage = 0;
    const categoriesArray = Object.entries(categoryTotals);
    
    categoriesArray.forEach(([category, amount], index) => {
        const percentage = (amount / total) * 100;
        const startPercent = accumulatedPercentage;
        const endPercent = startPercent + percentage;
        
        gradientString += `${colors[index % colors.length]} ${startPercent}% ${endPercent}%`;
        if (index < categoriesArray.length - 1) {
            gradientString += ', ';
        }
        
        accumulatedPercentage = endPercent;
    });
    
    // Update pie chart
    pieChart.innerHTML = `
        <div style="width: 200px; height: 200px; border-radius: 50%; 
                    background: conic-gradient(${gradientString});"></div>
    `;
    
    // Update legend
    let legendHTML = '';
    categoriesArray.forEach(([category, amount], index) => {
        const percentage = Math.round((amount / total) * 100);
        legendHTML += `
            <div style="display: flex; align-items: center; gap: 0.5rem;">
                <div style="width: 12px; height: 12px; background-color: ${colors[index % colors.length]}; border-radius: 2px;"></div>
                <span>${category} (${percentage}%)</span>
            </div>
        `;
    });
    
    legend.innerHTML = legendHTML;
}

async function deleteUserAccount() {
    if (!currentUser) return;
    
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
    } catch (error) {
        console.error('Sign out error:', error);
        showToast('Error signing out: ' + error.message, 'error');
    }
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
    
    // Unsubscribe from listeners
    if (unsubscribeTransactions) {
        unsubscribeTransactions();
        unsubscribeTransactions = null;
    }
}

function showApp() {
    authContainer.style.display = 'none';
    appContainer.style.display = 'flex';
    
    // Close sidebar on mobile
    if (window.innerWidth <= 1024) {
        sidebar.classList.remove('active');
    }
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

function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2
    }).format(amount);
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

function formatDateShort(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function createTransactionElement(transaction) {
    const li = document.createElement('li');
    li.className = 'transaction-item';
    li.dataset.id = transaction.id;
    
    const isIncome = transaction.type === 'income';
    const amountClass = isIncome ? 'amount-positive' : 'amount-negative';
    const amountPrefix = isIncome ? '+' : '-';
    
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
        <div>
            <div class="transaction-amount ${amountClass}">${amountPrefix}${formatCurrency(transaction.amount)}</div>
            <div class="transaction-date">${formatDate(transaction.date)}</div>
        </div>
    `;
    
    return li;
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

function updateCurrency() {
    const currency = document.getElementById('currency-select').value;
    document.getElementById('currency-display').textContent = 
        currency === 'USD' ? 'US Dollar (USD)' :
        currency === 'EUR' ? 'Euro (EUR)' :
        currency === 'GBP' ? 'British Pound (GBP)' :
        'Japanese Yen (JPY)';
    
    showToast('Currency preference updated', 'success');
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

// Close sidebar when clicking outside on mobile
document.addEventListener('click', (e) => {
    if (window.innerWidth <= 1024 && 
        !sidebar.contains(e.target) && 
        !menuToggle.contains(e.target) && 
        sidebar.classList.contains('active')) {
        sidebar.classList.remove('active');
    }
});

// Handle window resize
window.addEventListener('resize', () => {
    if (window.innerWidth > 1024) {
        sidebar.classList.remove('active');
    }
});