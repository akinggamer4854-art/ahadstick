// AHAD'S TICK - Premium E-commerce with Firebase & Local Fallback
const firebaseConfig = {
    apiKey: "AIzaSyDiC9QjB-pqD3_RRg7EB3RxFxbPd78-hVI",
    authDomain: "ahads-tick-store-1.firebaseapp.com",
    projectId: "ahads-tick-store-1",
    storageBucket: "ahads-tick-store-1.appspot.com",
    messagingSenderId: "843262949402",
    appId: "1:843262949402:web:fbe51df9309018f6d1f9a3",
    measurementId: "G-LNHYRL10JT"
};

const isFirebaseConfigured = firebaseConfig.apiKey !== "YOUR_API_KEY";



// Database Legacy (IndexedDB Fallback)
const DB_NAME = 'AhadsTickDB';
const STORE_NAME = 'products';
const openDB = () => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 1);
        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        };
        request.onsuccess = (e) => resolve(e.target.result);
        request.onerror = (e) => reject('IndexedDB failed');
    });
};

const loadLocalProducts = async () => {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    return new Promise((resolve) => {
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result);
    });
};

const saveLocalProduct = async (p) => {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put(p);
    return new Promise((resolve) => tx.oncomplete = resolve);
};

const saveAllToLocal = async (productsArray) => {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.clear();
    productsArray.forEach(p => store.put(p));
    return new Promise((resolve) => tx.oncomplete = resolve);
};

// Cloudinary Config (User should replace these)
const CLOUDINARY_CLOUD_NAME = 'dsdmmfblu'; // Change this to your cloud name
const CLOUDINARY_UPLOAD_PRESET = 'ahadstick'; // Change this to your unsigned preset

// Initialize Firebase only if script is loaded and keys are present
const isFirebaseAvailable = typeof firebase !== 'undefined';
if (isFirebaseAvailable && isFirebaseConfigured) {
    firebase.initializeApp(firebaseConfig);
}
const db = (isFirebaseAvailable && isFirebaseConfigured) ? firebase.firestore() : null;
// Removed storage initialization as we are using Cloudinary



let products = [];
let cart = JSON.parse(localStorage.getItem('cart')) || [];
let currentCategory = 'all';
let isAdminLoggedIn = false;

const syncProducts = async () => {
    if (isFirebaseAvailable && isFirebaseConfigured) {
        console.log("Attempting Firebase Sync...");
        db.collection('products').orderBy('timestamp', 'desc').onSnapshot((snapshot) => {
            console.log("Firebase Data Received:", snapshot.size, "items");
            products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderProducts();

            // Sync to local for offline viewing later
            saveAllToLocal(products);
        }, (err) => {
            console.error("Firestore Sync Error:", err);
            if (err.code === 'permission-denied') {
                showNotification('🔥 FIREBASE ERROR: Rules are blocking access! Please check Firebase Console.');
            } else {
                showNotification('Sync Failed: Check Internet connection.');
            }
            loadLocalProducts().then(local => {
                products = local;
                renderProducts();
            });
        });
    } else {

        // Fallback to local IndexedDB
        products = await loadLocalProducts();
        if (products.length === 0) {
            products = [
                {
                    id: "p1",
                    name: "Rolex Cosmograph Daytona",
                    price: 249000,
                    category: "watches",
                    pinned: true,
                    description: "The ultimate racing tool. A masterpiece of luxury and precision.",
                    video: "https://v1.pinimg.com/videos/mc/720p/73/45/63/734563a5f252615d9796e95ce439a349.mp4",
                    images: ["https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=800"]
                },
                {
                    id: "p2",
                    name: "Nike Air Jordan 1 Retro",
                    price: 18995,
                    category: "shoes",
                    pinned: false,
                    description: "The sneaker that started it all. Iconic design with premium comfort.",
                    video: "https://v1.pinimg.com/videos/mc/720p/22/0c/b2/220cb2626e255397e55955b25f46a81e.mp4",
                    images: ["https://images.unsplash.com/photo-1584735175315-9d5870060931?w=800"]
                },
                {
                    id: "p3",
                    name: "Cartier Santos de Cartier",
                    price: 85000,
                    category: "goggles",
                    pinned: false,
                    description: "Elite eyewear for the modern explorer. Pure elegance and protection.",
                    video: "https://v1.pinimg.com/videos/mc/720p/ed/fa/32/edfa328b9d3e8e24619ba0ecf10d6501.mp4",
                    images: ["https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=800"]
                }
            ];
        }
        renderProducts();
    }
};


// Selectors
const productFeed = document.getElementById('productFeed');
const buyModal = document.getElementById('buyModal');
const cartModal = document.getElementById('cartModal');
const cartItems = document.getElementById('cartItems');
const cartTotalAmount = document.getElementById('cartTotalAmount');
const cartOpen = document.getElementById('cartOpen');
const closeCart = document.querySelector('.closeCart');
const orderForm = document.getElementById('orderForm');
const closeBtn = document.querySelector('.close');
const adminModal = document.getElementById('adminModal');
const productForm = document.getElementById('productForm');
const adminBtn = document.getElementById('adminBtn');
const closeAdmin = document.querySelector('.closeAdmin');
const loginForm = document.getElementById('loginForm');
const loginView = document.getElementById('loginView');
const productView = document.getElementById('productView');
const closeAdminProduct = document.querySelector('.closeAdminProduct');

// Initialize
async function init() {
    // 1. Force Clear Local Products on Init to prevent stale data
    products = [];

    // 2. Start Firebase Sync (Primary Source)
    syncProducts();



    // Sanitize cart
    cart = cart.map(item => typeof item === 'object' ? String(item.id) : String(item));
    saveCart();

    renderCart();
    setupEventListeners();
    setupScrollReveal();
    checkAdminAccess();
    setupTheme();
}

function setupTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);

    const themeToggle = document.getElementById('themeToggle');
    themeToggle.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        updateThemeIcon(newTheme);
    });
}

function updateThemeIcon(theme) {
    const icon = document.querySelector('.theme-icon');
    if (icon) {
        icon.textContent = theme === 'dark' ? '🌙' : '☀️';
    }
}

function checkAdminAccess() {
    if (localStorage.getItem('hide_admin_fab') === 'false') {
        adminBtn.style.display = 'flex';
    }

    let logoClicks = 0;
    let lastClickTime = 0;
    const logoEl = document.getElementById('siteLogo');

    const handleLogoTrigger = (e) => {
        const currentTime = new Date().getTime();

        // Reset counter if gap between taps is more than 2 seconds
        if (currentTime - lastClickTime > 2000) {
            logoClicks = 0;
        }

        lastClickTime = currentTime;
        logoClicks++;

        if (logoClicks >= 5) {
            e.preventDefault();
            const isVisible = adminBtn.style.display === 'flex';
            if (isVisible) {
                adminBtn.style.display = 'none';
                localStorage.setItem('hide_admin_fab', 'true');
                isAdminLoggedIn = false;
                renderProducts();
                showNotification('Admin Mode Disabled.');
            } else {
                adminBtn.style.display = 'flex';
                localStorage.setItem('hide_admin_fab', 'false');
                showNotification('Admin Mode Enabled. Tap the + button.');
            }
            logoClicks = 0;
        }
    };

    logoEl.addEventListener('touchstart', handleLogoTrigger, { passive: false });
    logoEl.addEventListener('click', handleLogoTrigger);
}

let displayedCount = 20;
let isRendering = false;

function renderProducts(append = false) {
    if (isRendering && !append) return;
    isRendering = true;

    const sortedProducts = [...products].sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;

        // Handle Firebase Timestamps or Numeric IDs
        const timeA = a.timestamp ? (a.timestamp.seconds || a.timestamp) : a.id;
        const timeB = b.timestamp ? (b.timestamp.seconds || b.timestamp) : b.id;
        return timeB - timeA;
    });

    const filtered = currentCategory === 'all'
        ? sortedProducts
        : currentCategory === 'today'
            ? sortedProducts.filter(p => {
                if (!p.timestamp) return false;
                const date = p.timestamp.toDate ? p.timestamp.toDate() : new Date(p.timestamp);
                const today = new Date();
                return date.getDate() === today.getDate() &&
                    date.getMonth() === today.getMonth() &&
                    date.getFullYear() === today.getFullYear();
            })
            : sortedProducts.filter(p => p.category === currentCategory);

    if (filtered.length === 0) {
        productFeed.innerHTML = `<div class="loader">Our vault is currently empty for this category.</div>`;
        isRendering = false;
        return;
    }

    const batch = filtered.slice(append ? displayedCount - 20 : 0, displayedCount);
    const html = batch.map(p => {
        const slides = [p.video, ...p.images];
        return `
        <div class="product-item ${p.pinned ? 'is-pinned' : ''}" id="p-${p.id}" data-aos="fade-up" data-slide="0">
            ${(p.pinned && isAdminLoggedIn) ? '<div class="pin-badge">📌 PINNED</div>' : ''}
            
            <div class="carousel-container">
                <!-- Slide 0: Video -->
                <div class="media-slide active" data-index="0">
                    <video class="product-video" loop muted playsinline>
                        <source src="${p.video}" type="video/mp4">
                    </video>
                </div>
                
                <!-- Other Slides: Images -->
                ${p.images.map((img, idx) => `
                    <div class="media-slide" data-index="${idx + 1}">
                        <img src="${img}" class="product-img" loading="lazy">
                    </div>
                `).join('')}

                <!-- Nav Buttons -->
                <div class="carousel-nav">
                    <div class="nav-arr" onclick="changeSlide('${p.id}', -1)">❮</div>
                    <div class="nav-arr" onclick="changeSlide('${p.id}', 1)">❯</div>
                </div>

                <div class="video-overlay"></div>
            </div>

            ${isAdminLoggedIn ? `
                <div class="admin-controls" style="z-index: 40;">
                    <button class="control-btn pin-btn" onclick="togglePin('${p.id}')" title="${p.pinned ? 'Unpin' : 'Pin'} Product">
                        ${p.pinned ? '📍' : '📌'}
                    </button>
                    <button class="control-btn delete-btn" onclick="deleteProduct('${p.id}')" title="Delete Product">
                        🗑️
                    </button>
                </div>
            ` : ''}

            <div class="product-info">
                <h2 class="product-name">${p.name}</h2>
                <p class="product-price">₹${p.price.toLocaleString()}</p>
                <div class="desc-wrapper">
                    <p class="product-desc" id="desc-${p.id}">${p.description || ''}</p>
                    ${(p.description && p.description.length > 50) ? `<button class="read-more-btn" id="btn-${p.id}" onclick="toggleDesc('${p.id}')">more...</button>` : ''}
                </div>
                <div class="actions">
                    <button class="btn btn-buy" onclick="openOrderModal('${p.id}')">BUY NOW</button>
                    ${cart.includes(String(p.id))
                ? `<button class="btn btn-cart" style="opacity: 0.7; border-color: var(--gold-primary);" disabled>IN BAG</button>`
                : `<button class="btn btn-cart" onclick="addToCart('${p.id}')">ADD TO BAG</button>`
            }
                </div>
            </div>
        </div>
    `}).join('');

    if (append) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        while (tempDiv.firstChild) {
            productFeed.appendChild(tempDiv.firstChild);
        }
    } else {
        productFeed.innerHTML = html;
    }

    setupScrollReveal();
    isRendering = false;
}

function setupScrollReveal() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const video = entry.target.querySelector('video');

            if (entry.isIntersecting) {
                // Reveal animation
                entry.target.style.opacity = "1";
                entry.target.style.transform = "translateY(0)";

                // Smart Play
                if (video) {
                    video.play().catch(() => { }); // Catch play-interruption errors
                }
            } else {
                // Smart Pause to save CPU/Battery with many products
                if (video) {
                    video.pause();
                }
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.product-item').forEach(item => {
        item.style.opacity = "0";
        item.style.transform = "translateY(30px)";
        item.style.transition = "all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)";
        observer.observe(item);
    });
}

async function togglePin(id) {
    try {
        const product = products.find(p => p.id === id);
        if (product) {
            if (isFirebaseAvailable && isFirebaseConfigured) {
                await db.collection('products').doc(id).update({ pinned: !product.pinned });
            } else {
                product.pinned = !product.pinned;
                await saveLocalProduct(product);
                syncProducts(); // Refresh local
            }
            showNotification(product.pinned ? 'Product unpinned.' : 'Product pinned to top.');
        }
    } catch (err) {
        showNotification('Error updating pin status.');
    }
}


async function deleteProduct(id) {
    if (confirm('Are you sure you want to remove this masterpiece?')) {
        try {
            if (isFirebaseAvailable && isFirebaseConfigured) {
                const product = products.find(p => p.id === id);
                if (product) {
                    // Cleanup Video from Storage
                    if (product.video && (product.video.includes('firebasestorage.googleapis.com') || product.video.includes('firebasestorage.app'))) {
                        try { await storage.refFromURL(product.video).delete(); } catch (e) { console.warn("Video cleanup failed or already deleted:", e); }
                    }
                    // Cleanup Images from Storage
                    if (product.images && Array.isArray(product.images)) {
                        for (const imgUrl of product.images) {
                            if (imgUrl.includes('firebasestorage.googleapis.com') || imgUrl.includes('firebasestorage.app')) {
                                try { await storage.refFromURL(imgUrl).delete(); } catch (e) { console.warn("Image cleanup failed or already deleted:", e); }
                            }
                        }
                    }
                }
                await db.collection('products').doc(id).delete();
            } else {
                const dbLocal = await openDB();
                const tx = dbLocal.transaction(STORE_NAME, 'readwrite');
                tx.objectStore(STORE_NAME).delete(id);
                await new Promise(r => tx.oncomplete = r);
                syncProducts(); // Refresh local
            }
            showNotification('Product removed and storage cleaned.');
        } catch (err) {
            console.error(err);
            showNotification('Error deleting product.');
        }
    }
}


function toggleDesc(id) {
    const desc = document.getElementById(`desc-${id}`);
    const btn = document.getElementById(`btn-${id}`);
    desc.classList.toggle('expanded');
    btn.textContent = desc.classList.contains('expanded') ? 'less' : 'more...';
}

function changeSlide(id, dir) {
    const el = document.getElementById(`p-${id}`);
    const slides = el.querySelectorAll('.media-slide');
    let currentIndex = parseInt(el.getAttribute('data-slide'));

    // Deactivate current
    slides[currentIndex].classList.remove('active');
    const oldVideo = slides[currentIndex].querySelector('video');
    if (oldVideo) oldVideo.pause();

    // Calculate next
    currentIndex = (currentIndex + dir + slides.length) % slides.length;
    el.setAttribute('data-slide', currentIndex);

    // Activate next
    slides[currentIndex].classList.add('active');
    const newVideo = slides[currentIndex].querySelector('video');
    if (newVideo) {
        newVideo.play().catch(() => { });
    }
}

function addToCart(id) {
    const p = products.find(prod => String(prod.id) === String(id));
    if (!p) return;

    // Check if ALREADY in cart FIRST
    if (cart.includes(String(id))) {
        showNotification(`${p.name} is already in your bag.`);
        renderProducts();
        return;
    }

    // 1. Visual feedback on the button immediately
    const btn = event?.target;
    if (btn && (btn.classList.contains('btn-cart') || btn.closest('.btn-cart'))) {
        const targetBtn = btn.classList.contains('btn-cart') ? btn : btn.closest('.btn-cart');
        targetBtn.textContent = 'ADDING...';
        targetBtn.style.background = 'var(--gold-dark)';
        targetBtn.disabled = true;
    }

    // 2. Add ID to cart & Update TOP icon immediately
    cart.push(String(id));
    saveCart();
    renderCart(); // Updates top number instantly

    // 3. Show notification
    showNotification(`${p.name} added to your bag.`);

    // 4. Wait 2 seconds, then show "IN BAG" on the button
    setTimeout(() => {
        renderProducts();
    }, 2000);
}

function removeFromCart(id) {
    cart = cart.filter(itemId => String(itemId) !== String(id));
    saveCart();
    renderCart();
    renderProducts();
}

function saveCart() {
    localStorage.setItem('cart', JSON.stringify(cart));
}

function renderCart() {
    const counts = document.querySelectorAll('.cart-count');
    counts.forEach(el => el.textContent = cart.length);

    // Add bump effect
    const icon = document.getElementById('cartOpen');
    if (icon) {
        icon.classList.remove('bump');
        void icon.offsetWidth; // Force reflow
        icon.classList.add('bump');
    }

    if (cart.length === 0) {
        cartItems.innerHTML = `<p style="text-align:center; padding: 20px; color: var(--text-gray);">Your bag is empty.</p>`;
        cartTotalAmount.textContent = `₹0`;
        return;
    }

    let total = 0;
    cartItems.innerHTML = cart.map(itemId => {
        const item = products.find(p => String(p.id) === String(itemId));
        if (!item) return ''; // Should not happen
        total += item.price;
        return `
            <div class="cart-item">
                <img src="${item.images[0]}" alt="${item.name}">
                <div class="cart-item-info">
                    <h4>${item.name}</h4>
                    <p>₹${item.price.toLocaleString()}</p>
                </div>
                <button class="remove-item" onclick="removeFromCart(${item.id})">✕</button>
            </div>
        `;
    }).join('');

    cartTotalAmount.textContent = `₹${total.toLocaleString()}`;
}

function checkoutCart() {
    if (cart.length === 0) return;
    cartModal.style.display = "none";
    openOrderModal(null);
}

function showNotification(msg) {
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed; bottom: 100px; left: 50%; transform: translateX(-50%);
        background: var(--gold-gradient); color: #000; padding: 12px 24px;
        border-radius: 30px; font-weight: 700; z-index: 9999;
        box-shadow: 0 10px 30px rgba(0,0,0,0.5); animation: toastIn 0.4s forwards;
    `;
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.animation = "toastOut 0.4s forwards";
        setTimeout(() => toast.remove(), 400);
    }, 2500);
}

const style = document.createElement('style');
style.textContent = `
    @keyframes toastIn { from { bottom: 50px; opacity: 0; } to { bottom: 100px; opacity: 1; } }
    @keyframes toastOut { from { bottom: 100px; opacity: 1; } to { bottom: 150px; opacity: 0; } }
`;
document.head.appendChild(style);

function openOrderModal(id) {
    if (id) {
        const p = products.find(prod => prod.id === id);
        buyModal.setAttribute('data-current-pid', id);
        buyModal.setAttribute('data-order-type', 'single');
    } else {
        buyModal.removeAttribute('data-current-pid');
        buyModal.setAttribute('data-order-type', 'bag');
    }
    buyModal.style.display = "block";
}

function setupEventListeners() {
    document.querySelectorAll('.cat-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const active = document.querySelector('.cat-btn.active');
            if (active) active.classList.remove('active');
            e.target.classList.add('active');
            currentCategory = e.target.getAttribute('data-cat');
            displayedCount = 20; // Reset for infinite scroll
            renderProducts();
        });
    });

    closeBtn.onclick = () => buyModal.style.display = "none";
    closeCart.onclick = () => cartModal.style.display = "none";
    closeAdmin.onclick = () => {
        adminModal.style.display = "none";
        loginView.style.display = "block";
        productView.style.display = "none";
    };
    closeAdminProduct.onclick = () => adminModal.style.display = "none";

    window.onclick = (e) => {
        if (e.target == buyModal) buyModal.style.display = "none";
        if (e.target == cartModal) cartModal.style.display = "none";
        if (e.target == adminModal) adminModal.style.display = "none";
    };

    cartOpen.onclick = () => {
        cartModal.style.display = "block";
        renderCart();
    };

    adminBtn.onclick = () => {
        adminModal.style.display = "block";
        if (isAdminLoggedIn) {
            loginView.style.display = "none";
            productView.style.display = "block";
        } else {
            loginView.style.display = "block";
            productView.style.display = "none";
        }
    };

    loginForm.onsubmit = async (e) => {
        e.preventDefault();
        const email = document.getElementById('adminEmail').value;
        const pass = document.getElementById('adminPass').value;
        const loginBtn = loginForm.querySelector('button');
        const originalText = loginBtn.textContent;

        loginBtn.textContent = 'Authenticating...';
        loginBtn.disabled = true;

        try {
            // 1. Firebase Auth Attempt (Real Authentication)
            if (isFirebaseAvailable && isFirebaseConfigured) {
                try {
                    await firebase.auth().signInWithEmailAndPassword(email, pass);
                } catch (authErr) {
                    console.warn("Firebase Auth blocked/not-configured, checking local credentials:", authErr.message);
                    // If it's a config error, we still allow local check
                    if (authErr.code !== 'auth/configuration-not-found' && authErr.code !== 'auth/operation-not-allowed') {
                        // For real credential errors (wrong password), we still throw
                        if (authErr.code === 'auth/wrong-password' || authErr.code === 'auth/user-not-found') {
                            throw authErr;
                        }
                    }
                }
            }

            // 2. Client-side state update (matches hardcoded check for safety)

            if (email === 'akinggamer4854@gmail.com' && pass === 'ahad@3012') {
                isAdminLoggedIn = true;
                loginView.style.display = "none";
                productView.style.display = "block";
                renderProducts();
                showNotification('Welcome back, Admin.');
            } else {
                throw new Error('Invalid Credentials.');
            }
        } catch (err) {
            console.error("Login error:", err);
            showNotification(err.message || 'Invalid Credentials.');
            loginForm.reset();
        } finally {
            loginBtn.textContent = originalText;
            loginBtn.disabled = false;
        }
    };

    orderForm.onsubmit = (e) => {
        e.preventDefault();
        const orderType = buyModal.getAttribute('data-order-type');
        const pid = buyModal.getAttribute('data-current-pid');

        let productSection = '';
        let orderTitle = '';

        if (orderType === 'bag') {
            orderTitle = 'NEW BULK ORDER';
            const itemDetails = cart.map((itemId, index) => {
                const item = products.find(p => String(p.id) === String(itemId));
                return item ? `${index + 1}. ${item.name} (₹${item.price.toLocaleString()})` : '';
            }).join('\n');

            const total = cart.reduce((sum, itemId) => {
                const item = products.find(p => String(p.id) === String(itemId));
                return sum + (item ? item.price : 0);
            }, 0);

            productSection = `*ITEMS IN BAG:*\n${itemDetails}\n\n*TOTAL VALUE:* ₹${total.toLocaleString()}`;
        } else {
            orderTitle = 'NEW SINGLE ORDER';
            const p = products.find(prod => String(prod.id) === String(pid));
            productSection = p ? `*PRODUCT DETAILS:*\n📦 Name: ${p.name}\n💰 Price: ₹${p.price.toLocaleString()}` : '*Error: Product Not Found*';
        }

        const details = {
            name: document.getElementById('fullName').value,
            house: document.getElementById('houseNo').value,
            address: document.getElementById('fullAdd').value,
            landmark: document.getElementById('landmark').value,
            nearby: document.getElementById('nearBy').value,
            state: document.getElementById('state').value,
            city: document.getElementById('city').value,
            dist: document.getElementById('dist').value,
            pin: document.getElementById('pin').value,
            mob1: document.getElementById('mob1').value,
            mob2: document.getElementById('mob2').value,
            alt: document.getElementById('altMob2').value || 'N/A'
        };

        const waNumber = "919724732823";
        const message = `*✨ AHAD'S TICK - ${orderTitle} ✨*\n\n` +
            `${productSection}\n\n` +
            `*CUSTOMER DETAILS:*\n` +
            `👤 Name: ${details.name}\n` +
            `📞 Phone 1: ${details.mob1}\n` +
            `📞 Phone 2: ${details.mob2}\n` +
            `📞 Alt Phone: ${details.alt}\n` +
            `🏠 House/Building: ${details.house}\n` +
            `🗺️ Full Address: ${details.address}\n` +
            `📍 Landmark: ${details.landmark}\n` +
            `🚩 Nearby: ${details.nearby}\n` +
            `🏙️ City: ${details.city}\n` +
            `🏘️ District: ${details.dist}\n` +
            `🏳️ State: ${details.state}\n` +
            `🔢 PIN Code: ${details.pin}\n\n` +
            `_Please confirm this order._`;

        const waUrl = `https://api.whatsapp.com/send?phone=${waNumber}&text=${encodeURIComponent(message)}`;
        window.open(waUrl, '_blank');
        buyModal.style.display = "none";
    };

    const readFile = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(new Error('File reading failed. File might be too large.'));
            reader.readAsDataURL(file);
        });
    };

    const uploadToCloudinary = async (file, onProgress) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

        // Detect resource type (image or video)
        const resourceType = file.type.startsWith('video') ? 'video' : 'image';

        try {
            const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error.message || 'Upload failed');
            }

            const data = await response.json();
            return data.secure_url;
        } catch (err) {
            console.error("Cloudinary Error:", err);
            throw new Error(`Upload failed: ${err.message}`);
        }
    };

    productForm.onsubmit = async (e) => {
        e.preventDefault();

        const uploadBtn = document.getElementById('uploadBtn');
        const originalText = uploadBtn.textContent;
        uploadBtn.textContent = 'Preparing...';
        uploadBtn.disabled = true;

        try {
            const videoFile = document.getElementById('pVideoFile').files[0];
            const imageSlots = Array.from(document.querySelectorAll('.p-img-slot'));
            const imageFiles = imageSlots.map(slot => slot.files[0]).filter(f => f !== undefined);

            if (!videoFile) throw new Error('Please select a cinematic video.');
            if (imageFiles.length === 0) throw new Error('Please select at least one gallery image.');

            let videoUrl = "";
            let imageUrls = [];

            // 1. Upload to Cloudinary
            uploadBtn.textContent = 'Uploading Video...';
            videoUrl = await uploadToCloudinary(videoFile, (p) => {
                uploadBtn.textContent = `Video: ${Math.round(p)}%`;
            });

            for (let i = 0; i < imageFiles.length; i++) {
                uploadBtn.textContent = `Image ${i + 1}/${imageFiles.length}...`;
                const url = await uploadToCloudinary(imageFiles[i], (p) => {
                    uploadBtn.textContent = `Image ${i + 1}: ${Math.round(p)}%`;
                });
                imageUrls.push(url);
            }

            uploadBtn.textContent = 'Finalizing...';
            const pData = {
                name: document.getElementById('pName').value,
                price: Number(document.getElementById('pPrice').value),
                description: document.getElementById('pDesc').value,
                category: document.getElementById('pCat').value,
                video: videoUrl,
                images: imageUrls,
                pinned: false,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            };

            if (isFirebaseAvailable && isFirebaseConfigured) {
                await db.collection('products').add(pData);
            } else {
                throw new Error("Database not connected.");
            }

            adminModal.style.display = "none";
            productForm.reset();
            showNotification('Masterpiece Live via Cloudinary!');
        } catch (err) {
            console.error(err);
            alert(err.message || 'Error saving product. Please try again.');
        } finally {
            uploadBtn.textContent = originalText;
            uploadBtn.disabled = false;
        }
    };


}
init();
