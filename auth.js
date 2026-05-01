// User Authentication Logic
let authState = {
    username: '',
    name: '',
    isNew: false
};

function setupUserAuth() {
    const authModal = document.getElementById('authModal');
    const loginBtn = document.getElementById('loginBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const authNextBtn = document.getElementById('authNextBtn');
    const authLoginBtn = document.getElementById('authLoginBtn');
    const authSignupBtn = document.getElementById('authSignupBtn');
    const closeAuth = document.querySelector('.closeAuth');

    if (currentUser) updateAuthUI(true);

    if (loginBtn) loginBtn.onclick = () => {
        resetAuthModal();
        authModal.style.display = 'block';
    };
    if (closeAuth) closeAuth.onclick = () => {
        authModal.style.display = 'none';
    };
    if (logoutBtn) logoutBtn.onclick = () => logoutUser();

    // Step 1: Check Username
    if (authNextBtn) authNextBtn.onclick = async () => {
        const username = document.getElementById('authUsername').value.trim().toLowerCase();
        if (!username) return showNotification('Please enter a username');
        
        authNextBtn.textContent = 'Checking...';
        authNextBtn.disabled = true;

        try {
            authState.username = username;
            const userRef = db.collection('users').doc(username);
            const doc = await userRef.get();

            if (doc.exists) {
                // User exists, go to Login (Step 2)
                authState.isNew = false;
                authState.name = doc.data().name;
                document.getElementById('welcomeUserText').textContent = `Welcome back, ${authState.name}!`;
                goToStep(2);
            } else {
                // New user, go to Signup (Step 3)
                authState.isNew = true;
                goToStep(3);
            }
        } catch (err) {
            console.error(err);
            showNotification('Error connecting to database.');
        } finally {
            authNextBtn.textContent = 'Next Step';
            authNextBtn.disabled = false;
        }
    };

    // Step 2: Login
    if (authLoginBtn) authLoginBtn.onclick = async () => {
        const password = document.getElementById('loginPassword').value.trim();
        if (!password) return showNotification('Please enter your password');

        authLoginBtn.textContent = 'Authenticating...';
        authLoginBtn.disabled = true;

        try {
            const userRef = db.collection('users').doc(authState.username);
            const doc = await userRef.get();
            
            if (doc.exists && doc.data().password === password) {
                completeLogin();
            } else {
                showNotification('Invalid Password. Please try again.');
            }
        } catch (err) {
            showNotification('Login failed.');
        } finally {
            authLoginBtn.textContent = 'Login Now';
            authLoginBtn.disabled = false;
        }
    };

    // Step 3: Signup
    if (authSignupBtn) authSignupBtn.onclick = async () => {
        const name = document.getElementById('signupName').value.trim();
        const password = document.getElementById('signupPassword').value.trim();

        if (!name || !password) return showNotification('Please fill all fields');
        if (password.length < 4) return showNotification('Password must be at least 4 characters');

        authSignupBtn.textContent = 'Creating Account...';
        authSignupBtn.disabled = true;

        try {
            authState.name = name;
            const userRef = db.collection('users').doc(authState.username);
            await userRef.set({
                name: name,
                username: authState.username,
                password: password,
                createdAt: new Date().toISOString()
            });
            completeLogin();
        } catch (err) {
            showNotification('Signup failed.');
        } finally {
            authSignupBtn.textContent = 'Complete Registration';
            authSignupBtn.disabled = false;
        }
    };
}

function goToStep(step) {
    document.getElementById('authStep1').style.display = 'none';
    document.getElementById('authStep2').style.display = 'none';
    document.getElementById('authStep3').style.display = 'none';
    document.getElementById('authStep' + step).style.display = 'block';
}

function resetAuthModal() {
    document.getElementById('authUsername').value = '';
    const lp = document.getElementById('loginPassword');
    const sn = document.getElementById('signupName');
    const sp = document.getElementById('signupPassword');
    if (lp) lp.value = '';
    if (sn) sn.value = '';
    if (sp) sp.value = '';
    goToStep(1);
}

async function completeLogin() {
    currentUser = {
        name: authState.name,
        username: authState.username
    };
    
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    updateAuthUI(true);
    document.getElementById('authModal').style.display = 'none';
    showNotification(`Successfully logged in as ${authState.name}`);
    
    // Sync Cart/Wishlist
    syncUserData();
    renderProducts();
    renderCart();
}

function logoutUser() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('currentUser');
        currentUser = null;
        updateAuthUI(false);
        showNotification('Logged out successfully.');
        location.reload();
    }
}

function updateAuthUI(isLoggedIn) {
    const userProfile = document.getElementById('userProfile');
    const loginBtn = document.getElementById('loginBtn');
    const userNameDisplay = document.getElementById('userNameDisplay');

    if (isLoggedIn && currentUser) {
        if (userProfile) userProfile.style.display = 'block';
        if (loginBtn) loginBtn.style.display = 'none';
        if (userNameDisplay) userNameDisplay.textContent = `👤 Hello, ${currentUser.name.split(' ')[0]}`;
    } else {
        if (userProfile) userProfile.style.display = 'none';
        if (loginBtn) loginBtn.style.display = 'block';
    }
}

async function syncUserData() {
    if (!currentUser || !isFirebaseAvailable || !isFirebaseConfigured) return;

    try {
        const userRef = db.collection('users').doc(currentUser.username);
        const doc = await userRef.get();
        
        if (doc.exists) {
            const data = doc.data();
            // Pull data if local is empty
            if (cart.length === 0 && data.cart) cart = data.cart;
            if (wishlist.length === 0 && data.wishlist) wishlist = data.wishlist;
            
            // Push current data
            await userRef.update({
                cart: cart,
                wishlist: wishlist,
                lastActive: new Date().toISOString()
            });
            
            saveCart();
            renderCart();
            renderProducts();
        }
    } catch (err) {
        console.warn("Sync failed:", err);
    }
}

init();
