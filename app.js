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

// Initialize Firebase only if script is loaded and keys are pr esent
const isFirebaseAvailable = typeof firebase !== 'undefined';
if (isFirebaseAvailable && isFirebaseConfigured) {
    firebase.initializeApp(firebaseConfig);
}
const db = (isFirebaseAvailable && isFirebaseConfigured) ? firebase.firestore() : null;
// Removed storage initialization as we are using Cloudinary



let cart = JSON.parse(localStorage.getItem('cart')) || [];
let currentCategory = 'all';
let currentPriceFilter = 'all';
let isAdminLoggedIn = false;
let currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;
let wishlist = JSON.parse(localStorage.getItem('wishlist')) || [];
let currentZoomImages = [];
let currentZoomIndex = 0;
let promoCodes = [];
let appliedPromoObj = null;
let customCategories = [];

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


function getProductLink(id) {
    // Get the base URL without query params or hashes
    const url = new URL(window.location.href);
    return `${url.origin}${url.pathname}?p=${id}`;
}

function shareStore() {
    const msg = `Hello! 🤝
Aapka pasandida shopping destination Ahad Stick Store ab aur bhi behtareen collection ke saath taiyaar hai! ✨
Kya aap bhi Master aur First Copy products ke deewane hain? Hamare paas aapke liye sab kuch hai:
👔 For Men: Latest Watches, Stylish Goggles, Trendy Clothes, Shoes, Belts aur Wallets ka collection.
👗 For Ladies: Premium Watches, Stylish Footwear aur Designer Purses jo aapke look ko perfect banaye.
Kam daam mein wahi premium quality aur wahi look! 💯
Abhi checkout karein hamari website:
🌐 https://ahadstickstoree.netlify.app
Aur latest updates ke liye hamein Instagram par follow karein:
📸 @ahads_tick
Apna agla order aaj hi book karein aur apni style ko up-to-date rakhein!
Dhanyawad,
Ahad Stick Store 🛍️`;

    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
}

// 0. Emergency Session Cleaner (Fixes "Reserved ID" loop)
(function() {
    let user = JSON.parse(localStorage.getItem('currentUser'));
    if (user && user.identity) {
        const id = user.identity.replace(/[^a-zA-Z0-9]/g, '');
        if (id.length < 3 || user.identity.includes('___')) {
            console.warn("Invalid Session Detected. Clearing...");
            localStorage.removeItem('currentUser');
            location.reload();
        }
    }
})();

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
const editModal = document.getElementById('editModal');
const closeEdit = document.querySelector('.closeEdit');
const editForm = document.getElementById('editForm');

// Initialize
async function init() {
    // 1. Force Clear Local Products on Init to prevent stale data
    products = [];

    // 2. Start Firebase Sync (Primary Source)
    syncProducts();



    // Sanitize cart
    cart = cart.map(item => typeof item === 'object' ? String(item.id) : String(item));
    
    renderCart();
    setupEventListeners();
    setupScrollReveal();
    checkAdminAccess();
    setupTheme();
    setupSearch();
    setupScrollProgress();
    setupPWA();
    setupUserAuth();

    const sideWishlistBtn = document.getElementById('sideWishlistBtn');
    const wishlistModal = document.getElementById('wishlistModal');
    if (sideWishlistBtn) {
        sideWishlistBtn.onclick = () => {
            renderWishlist();
            wishlistModal.style.display = 'block';
            if (sideMenu) sideMenu.classList.remove('open');
        };
    }

    updateGlobalViewers();
    setInterval(updateGlobalViewers, 60000); // Check every minute
    
    checkWelcomeOffer();
}

function checkWelcomeOffer() {
    if (!localStorage.getItem('welcomeShown')) {
        setTimeout(() => {
            const welcomeModal = document.getElementById('welcomeModal');
            if (welcomeModal) welcomeModal.style.display = 'block';
            localStorage.setItem('welcomeShown', 'true');
        }, 3000); // Show after 3 seconds
    }
}

function setupScrollProgress() {
    window.addEventListener('scroll', () => {
        const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
        const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
        const scrolled = (winScroll / height) * 100;
        const progressLine = document.getElementById('scrollProgress');
        if (progressLine) progressLine.style.width = scrolled + "%";
    });
}

function toggleSearch() {
    const container = document.getElementById('searchContainer');
    const input = document.getElementById('searchInput');
    container.classList.toggle('active');
    if (container.classList.contains('active')) {
        input.focus();
    }
}

function setupSearch() {
    const searchInput = document.getElementById('searchInput');

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim();
            
            // We reset displayedCount when searching/typing to show fresh results
            displayedCount = 20;
            renderProducts();
        });

        // Mobile Enter Key support
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                searchInput.blur(); // Hide keyboard on mobile
            }
        });
    }
}

// Removed redundant renderFilteredProducts as it's now handled by renderProducts

function toggleDescription(btn, id) {
    const desc = document.getElementById(`desc-${id}`);
    if (desc.classList.contains('expanded')) {
        desc.classList.remove('expanded');
        btn.innerText = 'Read More';
    } else {
        desc.classList.add('expanded');
        btn.innerText = 'Read Less';
    }
}

function setCategory(cat) {
    currentCategory = cat;
    const btns = document.querySelectorAll('.cat-btn');
    btns.forEach(btn => {
        if (btn.getAttribute('data-cat') === cat) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    // Clear search input when changing categories
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.value = "";

    displayedCount = 20; 
    productFeed.innerHTML = ""; 
    renderProducts();
    window.scrollTo({ top: document.getElementById('productFeed').offsetTop - 100, behavior: 'smooth' });
}

function setupTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeUI(savedTheme);

    const themeToggle = document.getElementById('themeToggle');
    themeToggle.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        updateThemeUI(newTheme);
    });
}

function updateThemeUI(theme) {
    const icon = document.querySelector('.theme-icon');
    const label = document.getElementById('themeLabel');
    
    if (icon) {
        icon.textContent = theme === 'dark' ? '🌙' : '☀️';
    }
    
    if (label) {
        label.textContent = theme === 'dark' ? 'Dark Mode' : 'Light Mode';
    }
}


function checkAdminAccess() {
    // Hidden by default for all users. 
    // We no longer show it based on localStorage to ensure no customer ever sees it accidentally.
    
    let logoClicks = 0;
    let lastClickTime = 0;

    const handleLogoTrigger = (e) => {
        // Ensure only tapping the image counts, not the text
        if (e.target.tagName.toLowerCase() !== 'img') {
            return;
        }

        const currentTime = new Date().getTime();

        // Reset counter if gap between taps is more than 2 seconds
        if (currentTime - lastClickTime > 2000) {
            logoClicks = 0;
        }

        lastClickTime = currentTime;
        logoClicks++;

        const isVisible = adminBtn.style.display === 'flex';
        const targetClicks = isVisible ? 3 : 20;

        if (logoClicks >= targetClicks) {
            e.preventDefault();
            if (isVisible) {
                adminBtn.style.display = 'none';
                isAdminLoggedIn = false;
                renderProducts();
                showNotification('Admin Mode Disabled.');
            } else {
                adminBtn.style.display = 'flex';
                showNotification('Admin Mode Enabled. Tap the + button.');
            }
            logoClicks = 0;
        }
    };

    const footerLogo = document.getElementById('footerLogo');
    if (footerLogo) {
        footerLogo.addEventListener('touchstart', handleLogoTrigger, { passive: false });
        footerLogo.addEventListener('click', handleLogoTrigger);
    }
}

let displayedCount = 20;
let isRendering = false;

function updateAdminStats() {
    const container = document.getElementById('adminStatsContainer');
    if (!container) return;

    const quickNav = document.getElementById('adminQuickNav');
    const scrollTop = document.getElementById('adminScrollTop');

    if (!isAdminLoggedIn) {
        container.style.display = 'none';
        if (quickNav) quickNav.style.display = 'none';
        if (scrollTop) scrollTop.style.display = 'none';
        return;
    }

    if (quickNav) quickNav.style.display = 'block';
    if (scrollTop) scrollTop.style.display = 'inline-flex';

    const counts = {
        total: products.length,
        watches: 0,
        shoes: 0,
        goggles: 0,
        menclothes: 0,
        ladyfootwear: 0,
        ladywatch: 0,
        formals_loafers: 0,
        crocs: 0,
        ladies_purse: 0,
        belt_wallet: 0
    };

    customCategories.forEach(c => {
        counts[c.id] = 0;
    });

    products.forEach(p => {
        if (counts[p.category] !== undefined) {
            counts[p.category]++;
        } else {
            const cust = customCategories.find(c => c.id === p.category);
            if (cust) {
                counts[p.category] = (counts[p.category] || 0) + 1;
            }
        }
    });

    let customStatsHtml = customCategories.map(c => `
        <div class="admin-stat-item" style="border-color: var(--gold-primary);"><span>${c.name.toUpperCase()}</span> <span>${counts[c.id] || 0}</span></div>
    `).join('');

    container.innerHTML = `
        <h4>Upload Statistics</h4>
        <div class="admin-stats-grid">
            <div class="admin-stat-item"><span>WATCHES</span> <span>${counts.watches}</span></div>
            <div class="admin-stat-item"><span>SHOES</span> <span>${counts.shoes}</span></div>
            <div class="admin-stat-item"><span>GOGGLES</span> <span>${counts.goggles}</span></div>
            <div class="admin-stat-item"><span>MENS WEAR</span> <span>${counts.menclothes}</span></div>
            <div class="admin-stat-item"><span>LADIES FOOTWEAR</span> <span>${counts.ladyfootwear}</span></div>
            <div class="admin-stat-item"><span>LADIES WATCHES</span> <span>${counts.ladywatch}</span></div>
            <div class="admin-stat-item"><span>FORMALS & LOAFERS</span> <span>${counts.formals_loafers}</span></div>
            <div class="admin-stat-item"><span>CROCS (M/F)</span> <span>${counts.crocs}</span></div>
            <div class="admin-stat-item"><span>LADIES PURSE</span> <span>${counts.ladies_purse}</span></div>
            <div class="admin-stat-item"><span>BELT & WALLET</span> <span>${counts.belt_wallet}</span></div>
            ${customStatsHtml}
            <div class="admin-stat-item total"><span>TOTAL PRODUCTS</span> <span>${counts.total}</span></div>
        </div>
    `;
    container.style.display = 'block';
}

function getGlobalLiveViewers() {
    const now = new Date();
    const hours = now.getHours();
    
    let min = 5;
    let max = 15;
    
    // Night: 9 PM (21) to 1 AM (1)
    if (hours >= 21 || hours < 1) {
        min = 10;
        max = 20;
    } 
    // Day: 1 AM (1) to 7 PM (19)
    else if (hours >= 1 && hours < 19) {
        min = 5;
        max = 10;
    }
    // Evening: 7 PM (19) to 9 PM (21)
    else {
        min = 8;
        max = 15;
    }

    // Update every 5 mins
    const timeBlock = Math.floor(now.getTime() / (5 * 60 * 1000));
    
    // Simple pseudo-random based on timeBlock
    const rand = (timeBlock * 9301 + 49297) % 233280 / 233280;
    return Math.floor(min + rand * (max - min + 1));
}

function updateGlobalViewers() {
    const el = document.getElementById('viewersCount');
    if (el) {
        el.textContent = getGlobalLiveViewers();
    }
}

async function renderProducts(append = false) {
    console.log("Render Triggered - Append:", append, "Products Count:", products.length);
    updateAdminStats();
    if (isRendering && !append) return;
    isRendering = true;

    // 1. Basic Filtering (Category, Price & Search)
    let filtered = products.filter(p => {
        const matchesCategory = (currentCategory === 'all' || p.category === currentCategory);
        
        // Search Filter
        const searchInput = document.getElementById('searchInput');
        const query = searchInput ? searchInput.value.toLowerCase().trim() : "";
        const matchesSearch = query === "" || 
                             p.name.toLowerCase().includes(query) || 
                             (p.description && p.description.toLowerCase().includes(query));

        let matchesPrice = true;
        if (currentPriceFilter !== 'all') {
            if (currentPriceFilter === 'above_4999') {
                matchesPrice = p.price > 4999;
            } else {
                matchesPrice = p.price <= parseInt(currentPriceFilter);
            }
        }
        return matchesCategory && matchesPrice && matchesSearch;
    });

    // Sort function for reuse
    const sortProducts = (list) => {
        return [...list].sort((a, b) => {
            if (a.pinned && !b.pinned) return -1;
            if (!a.pinned && b.pinned) return 1;
            const timeA = a.timestamp ? (a.timestamp.seconds || a.timestamp || 0) : 0;
            const timeB = b.timestamp ? (b.timestamp.seconds || b.timestamp || 0) : 0;
            return timeB - timeA;
        });
    };

    // 2. Handle Deep Linking (?p=ID)
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('p');
    
    let finalProducts = [];
    
    if (productId && !append) {
        const sharedIdx = products.findIndex(p => String(p.id) === String(productId));
        if (sharedIdx > -1) {
            const sharedProduct = { ...products[sharedIdx], isShared: true };
            
            // Shared product matches if we are on 'all' OR it matches the category
            const matchesCategory = currentCategory === 'all' || sharedProduct.category === currentCategory;
            const matchesPrice = currentPriceFilter === 'all' || 
                (currentPriceFilter === 'above_4999' ? sharedProduct.price > 4999 : sharedProduct.price <= parseInt(currentPriceFilter));

            if (matchesCategory && matchesPrice) {
                // Shared product matches current filter, show it first
                const others = filtered.filter(p => String(p.id) !== String(productId));
                finalProducts = [sharedProduct, ...sortProducts(others)];
            } else {
                // Shared product doesn't match current filter, just show filtered list
                finalProducts = sortProducts(filtered);
            }
        } else {
            finalProducts = sortProducts(filtered);
        }
    } else {
        finalProducts = sortProducts(filtered);
    }

    if (finalProducts.length === 0 && products.length > 0) {
        productFeed.innerHTML = `<div class="loader">Our vault is currently empty for this category.</div>`;
        isRendering = false;
        return;
    }

    if (products.length === 0) {
        isRendering = false;
        return;
    }

    // Show Skeleton Loaders ONLY if feed is completely empty
    if (!append && productFeed.innerHTML.trim() === "" && products.length > 0) {
        productFeed.innerHTML = Array(4).fill(0).map(() => `
            <div class="skeleton-card">
                <div class="skeleton-media"></div>
                <div class="skeleton-info"><div class="skeleton-line"></div><div class="skeleton-line short"></div><div class="skeleton-line price"></div></div>
            </div>
        `).join('');
    }

    const batch = finalProducts.slice(append ? displayedCount - 20 : 0, displayedCount);
    const html = batch.map(p => {
        let seed = 0;
        for (let i = 0; i < String(p.id).length; i++) {
            seed += String(p.id).charCodeAt(i);
        }
        const discountPercent = 20 + (seed % 21);
        const mrp = Math.round(p.price / (1 - (discountPercent / 100)));

        let badgeLabel = '';
        let badgeClass = '';
        if (p.badge && p.badge !== 'none') {
            if (p.badge === 'hot') { badgeLabel = '🔥 HOT SELLING'; badgeClass = 'hot'; }
            else if (p.badge === 'limited') { badgeLabel = '⏳ LIMITED STOCK'; badgeClass = 'limited'; }
            else if (p.badge === 'new') { badgeLabel = '✨ NEW ARRIVAL'; badgeClass = 'new'; }
            else if (p.badge === 'premium') { badgeLabel = '💎 PREMIUM QUALITY'; badgeClass = 'premium'; }
        }


        const slides = [p.video, ...p.images];
        return `
        <div class="product-item ${p.pinned ? 'is-pinned' : ''} ${p.isShared ? 'is-shared' : ''}" id="p-${p.id}" data-aos="fade-up" data-slide="0">
            <div class="product-media-wrapper">
                ${p.inStock === false ? `
                    <div class="sold-out-overlay" style="position: absolute; inset: 0; background: rgba(0,0,0,0.7); backdrop-filter: blur(3px); z-index: 30; display: flex; align-items: center; justify-content: center; pointer-events: none;">
                        <div style="border: 2px solid var(--gold-primary); color: var(--gold-primary); font-weight: 900; letter-spacing: 4px; padding: 10px 20px; font-size: 1.5rem; transform: rotate(-10deg); background: rgba(0,0,0,0.6); box-shadow: 0 0 15px rgba(255,215,0,0.3);">SOLD OUT</div>
                    </div>
                ` : ''}

                <div class="carousel-container">
                    <!-- Slide 0: Video -->
                    <div class="media-slide active" data-index="0">
                        <video class="product-video" loop muted playsinline preload="none">
                            <source src="${p.video}" type="video/mp4">
                        </video>
                    </div>
                    
                    <!-- Other Slides: Images -->
                    ${p.images.map((img, idx) => `
                        <div class="media-slide" data-index="${idx + 1}" onclick="openZoom('${p.id}', ${idx})" style="cursor: zoom-in;">
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

                <!-- Badges placed safely on top of carousel media -->
                ${p.isShared ? '<div class="shared-badge">✨ SHARED MASTERPIECE</div>' : ''}
                ${(p.pinned && isAdminLoggedIn && !p.isShared) ? '<div class="pin-badge">📌 PINNED</div>' : ''}
                ${badgeLabel ? `<div class="product-special-badge ${badgeClass}">${badgeLabel}</div>` : ''}

                <div class="wishlist-btn ${wishlist.includes(String(p.id)) ? 'active' : ''}" onclick="toggleWishlist('${p.id}')">
                    ${wishlist.includes(String(p.id)) ? '❤️' : '🤍'}
                </div>

                <div class="card-share-btn" onclick="shareProduct('${p.id}')" title="Share this masterpiece">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="18" cy="5" r="3"></circle>
                        <circle cx="6" cy="12" r="3"></circle>
                        <circle cx="18" cy="19" r="3"></circle>
                        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
                    </svg>
                </div>

                ${isAdminLoggedIn ? `
                    <div class="admin-controls" style="z-index: 40;">
                        <button class="control-btn pin-btn" onclick="togglePin('${p.id}')" title="${p.pinned ? 'Unpin' : 'Pin'} Product">
                            ${p.pinned ? '📍' : '📌'}
                        </button>
                        <button class="control-btn edit-btn" onclick="openEditModal('${p.id}')" title="Edit Product">
                            ✏️
                        </button>
                        <button class="control-btn delete-btn" onclick="deleteProduct('${p.id}')" title="Delete Product">
                            🗑️
                        </button>
                    </div>
                ` : ''}

                <div class="product-info">
                    <h2 class="product-name">${p.name}</h2>
                    <div class="price-container">
                        <span class="product-price">₹${p.price.toLocaleString()}</span>
                        <span class="mrp-price">₹${mrp.toLocaleString()}</span>
                        <span class="discount-badge">${discountPercent}% OFF</span>
                    </div>
                    
                    <div class="desc-wrapper">
                        <p class="product-desc" id="desc-${p.id}">${p.description || ''}</p>
                        ${(p.description && p.description.length > 50) ? `<button class="read-more-btn" id="btn-${p.id}" onclick="toggleDesc('${p.id}')">more...</button>` : ''}
                    </div>
                    <div class="actions">
                        ${p.inStock === false ? `
                            <button class="btn btn-buy" style="width: 100%; opacity: 0.5; cursor: not-allowed; background: #333; color: #888; border: 1px solid #444;" disabled>SOLD OUT</button>
                        ` : `
                            <button class="btn btn-buy" onclick="openOrderModal('${p.id}')">BUY NOW</button>
                            ${cart.includes(String(p.id))
                                ? `<button class="btn btn-cart" style="opacity: 0.7; border-color: var(--gold-primary);" disabled>IN BAG</button>`
                                : `<button class="btn btn-cart" onclick="addToCart('${p.id}')">ADD TO BAG</button>`
                            }
                        `}
                    </div>
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
    updateLoadMoreButton(finalProducts.length);
    isRendering = false;
}

function updateLoadMoreButton(totalFiltered) {
    const container = document.getElementById('loadMoreContainer');
    if (container) {
        if (displayedCount < totalFiltered) {
            container.style.display = 'block';
        } else {
            container.style.display = 'none';
        }
    }
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

// --- LOAD MORE LOGIC ---
function setupLoadMore() {
    const loadMoreBtn = document.getElementById('loadMoreBtn');
    if (loadMoreBtn) {
        loadMoreBtn.onclick = () => {
            const originalText = loadMoreBtn.textContent;
            loadMoreBtn.textContent = 'REVEALING...';
            loadMoreBtn.disabled = true;

            setTimeout(() => {
                displayedCount += 20;
                renderProducts(true);
                loadMoreBtn.textContent = originalText;
                loadMoreBtn.disabled = false;
                
                // Optional: Smooth scroll a bit further down to show new items
                window.scrollBy({ top: 300, behavior: 'smooth' });
            }, 600);
        };
    }
}
// -----------------------------

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

function openEditModal(id) {
    const product = products.find(p => String(p.id) === String(id));
    if (!product) return;

    document.getElementById('editPid').value = id;
    document.getElementById('editName').value = product.name;
    document.getElementById('editPrice').value = product.price;
    document.getElementById('editDesc').value = product.description;
    
    const editBadge = document.getElementById('editBadge');
    if (editBadge) {
        editBadge.value = product.badge || 'none';
    }

    editModal.style.display = "block";
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
    syncUserData(); // Sync to Firestore
}

function renderWishlist() {
    const wishlistItems = document.getElementById('wishlistItems');
    if (!wishlistItems) return;

    if (wishlist.length === 0) {
        wishlistItems.innerHTML = `<p style="text-align:center; padding: 40px 20px; color: var(--text-gray); font-size: 0.9rem;">Your wishlist is empty. ❤️ some masterpieces to save them!</p>`;
        return;
    }

    wishlistItems.innerHTML = wishlist.map(itemId => {
        const item = products.find(p => String(p.id) === String(itemId));
        if (!item) return '';
        return `
            <div class="cart-item">
                <div class="cart-item-media">
                    <img src="${item.images && item.images.length > 0 ? item.images[0] : ''}" class="cart-img" loading="lazy">
                </div>
                <div class="cart-item-info">
                    <h4>${item.name}</h4>
                    <p>₹${item.price.toLocaleString()}</p>
                    <button class="btn btn-buy" onclick="addToCart('${item.id}'); wishlistModal.style.display='none';" style="padding: 5px 10px; font-size: 0.7rem; margin-top: 5px;">ADD TO BAG</button>
                </div>
                <button class="remove-item" onclick="toggleWishlist('${item.id}'); renderWishlist();" title="Remove">✕</button>
            </div>
        `;
    }).join('');
}

function toggleWishlist(id) {
    const idx = wishlist.indexOf(String(id));
    if (idx === -1) {
        wishlist.push(String(id));
        showNotification('Added to your Wishlist!');
    } else {
        wishlist.splice(idx, 1);
        showNotification('Removed from Wishlist.');
    }
    localStorage.setItem('wishlist', JSON.stringify(wishlist));
    syncUserData(); // Sync to Firestore
    renderProducts();
}

function shareProduct(id) {
    const p = products.find(prod => String(prod.id) === String(id));
    if (!p) return;

    const link = getProductLink(id);
    const msg = `*✨ RICHVIBE - MASTERPIECE ✨*\n\n` +
        `*${p.name}*\n` +
        `💰 Price: ₹${p.price.toLocaleString()}\n\n` +
        `📦 View Details:\n${link}\n\n` +
        `_Elevate your style with Richvibe._`;

    // Separate message for Native Share to avoid double link in some apps
    const shareText = `*✨ RICHVIBE - MASTERPIECE ✨*\n\n*${p.name}*\n💰 Price: ₹${p.price.toLocaleString()}\n\n_Elevate your style with Richvibe._`;

    if (navigator.share) {
        navigator.share({
            title: p.name,
            text: shareText,
            url: link
        }).catch(() => {
            window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
        });
    } else {
        window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
    }
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
        cartItems.innerHTML = `<p style="text-align:center; padding: 40px 20px; color: var(--text-gray); font-size: 0.9rem;">Your bag is empty.<br>Add some masterpieces to get started.</p>`;
        cartTotalAmount.textContent = `₹0`;
        
        // Disable order button if empty
        const orderBtn = document.querySelector('#cartModal .confirm-btn');
        if (orderBtn) {
            orderBtn.style.opacity = '0.5';
            orderBtn.style.cursor = 'not-allowed';
            orderBtn.textContent = 'Bag is Empty';
        }
        return;
    }

    // Reset order button if not empty
    const orderBtn = document.querySelector('#cartModal .confirm-btn');
    if (orderBtn) {
        orderBtn.style.opacity = '1';
        orderBtn.style.cursor = 'pointer';
        orderBtn.textContent = 'ORDER NOW';
    }

    let total = 0;
    cartItems.innerHTML = cart.map(itemId => {
        const item = products.find(p => String(p.id) === String(itemId));
        if (!item) return ''; 
        total += item.price;
        return `
            <div class="cart-item">
                <div class="cart-item-media">
                    <img src="${item.images && item.images.length > 0 ? item.images[0] : ''}" class="cart-img" loading="lazy">
                </div>
                <div class="cart-item-info">
                    <h4>${item.name}</h4>
                    <p>₹${item.price.toLocaleString()}</p>
                </div>
                <button class="remove-item" onclick="removeFromCart('${item.id}')" title="Remove Item">✕</button>
            </div>
        `;
    }).join('');

    cartTotalAmount.textContent = `₹${total.toLocaleString()}`;
}

function checkoutCart() {
    if (cart.length === 0) {
        showNotification('Add items to your bag first!');
        return;
    }
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
        const p = products.find(prod => String(prod.id) === String(id));
        buyModal.setAttribute('data-current-pid', id);
        buyModal.setAttribute('data-order-type', 'single');
    } else {
        buyModal.removeAttribute('data-current-pid');
        buyModal.setAttribute('data-order-type', 'bag');
    }
    
    // Reset Promo State
    appliedPromoObj = null;
    const appliedInput = document.getElementById('appliedPromoInput');
    const promoMsg = document.getElementById('promoMessage');
    const summaryBox = document.getElementById('orderSummaryBox');
    if (appliedInput) appliedInput.value = '';
    if (promoMsg) promoMsg.style.display = 'none';
    if (summaryBox) summaryBox.style.display = 'none';
    
    buyModal.style.display = "block";
}

function setupEventListeners() {
    // Admin Scroll Buttons
    const scrollBottom = document.getElementById('adminScrollBottom');
    const scrollTop = document.getElementById('adminScrollTop');
    
    if (scrollBottom) {
        scrollBottom.onclick = () => {
            window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
        };
    }
    
    if (scrollTop) {
        scrollTop.onclick = () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        };
    }

    // Menu Toggle
    const menuToggle = document.getElementById('menuToggle');
    const sideMenu = document.getElementById('sideMenu');
    const closeMenu = document.getElementById('closeMenu');

    if (menuToggle) {
        menuToggle.addEventListener('click', () => {
            sideMenu.classList.add('open');
            const menuHint = document.getElementById('menuHint');
            if (menuHint) {
                menuHint.style.display = 'none';
            }
        });
    }

    if (closeMenu) {
        closeMenu.addEventListener('click', () => {
            sideMenu.classList.remove('open');
        });
    }

    // Category Buttons
    document.querySelectorAll('.cat-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            // Ignore if this is the theme toggle button
            if (btn.id === 'themeToggle') return;

            const active = document.querySelector('.side-categories .cat-btn.active');
            if (active) active.classList.remove('active');
            btn.classList.add('active');
            currentCategory = btn.getAttribute('data-cat');
            displayedCount = 20; // Reset for infinite scroll
            
            // Clear search input when switching categories
            const searchInput = document.getElementById('searchInput');
            if (searchInput) searchInput.value = "";

            productFeed.innerHTML = ""; // Clear feed immediately
            renderProducts();
            if (sideMenu) sideMenu.classList.remove('open'); // Close menu on select
            window.scrollTo({ top: document.getElementById('productFeed').offsetTop - 100, behavior: 'smooth' });
        });
    });

    // Price Filter Buttons
    document.querySelectorAll('.price-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const active = document.querySelector('.price-btn.active');
            if (active) active.classList.remove('active');
            e.target.classList.add('active');
            currentPriceFilter = e.target.getAttribute('data-price');
            displayedCount = 20; // Reset for infinite scroll
            renderProducts();
        });
    });

    const closeWishlist = document.querySelector('.closeWishlist');
    if (closeWishlist) closeWishlist.onclick = () => wishlistModal.style.display = "none";

    const welcomeModal = document.getElementById('welcomeModal');
    const closeWelcome = document.querySelector('.closeWelcome');
    const claimWelcomeBtn = document.getElementById('claimWelcomeBtn');
    
    if (closeWelcome) closeWelcome.onclick = () => welcomeModal.style.display = 'none';
    if (claimWelcomeBtn) claimWelcomeBtn.onclick = () => {
        welcomeModal.style.display = 'none';
        showNotification('Code WELCOME10 copied! Use it on WhatsApp.');
    };

    closeBtn.onclick = () => buyModal.style.display = "none";
    closeCart.onclick = () => cartModal.style.display = "none";
    closeAdmin.onclick = () => {
        adminModal.style.display = "none";
        loginView.style.display = "block";
        productView.style.display = "none";
    };
    closeAdminProduct.onclick = () => adminModal.style.display = "none";
    closeEdit.onclick = () => editModal.style.display = "none";

    const subscribeBtn = document.querySelector('.subscribe-btn');
    const zoomModal = document.getElementById('zoomModal');
    const zoomedImg = document.getElementById('zoomedImg');
    const closeZoom = zoomModal.querySelector('.close');

    closeZoom.onclick = () => zoomModal.style.display = "none";
    // Unified Modal Closer
    window.onclick = (e) => {
        const modals = [zoomModal, buyModal, cartModal, wishlistModal, adminModal, editModal, document.getElementById('authModal'), document.getElementById('welcomeModal')];
        modals.forEach(modal => {
            if (modal && e.target == modal) modal.style.display = "none";
        });
    };

    if (subscribeBtn) {
        subscribeBtn.onclick = () => {
            const phoneInput = document.getElementById('subscribePhone');
            const phone = phoneInput ? phoneInput.value.trim() : '';
            if (phone.length >= 10) {
                const msg = `*✨ RICHVIBE - JOIN REQUEST ✨*\n\nHello! 🤝\nI want to join the *Elite Circle* of Richvibe Store to get the latest updates on premium collections.\n\nMy WhatsApp: ${phone}\n\nPlease add me to your broadcast list! 🛍️`;
                window.open(`https://wa.me/919724732823?text=${encodeURIComponent(msg)}`, '_blank');
                showNotification('Opening WhatsApp to join...');
                if (phoneInput) phoneInput.value = '';
            } else {
                showNotification('Please enter a valid WhatsApp number.');
            }
        };
    }

    if (cartOpen) {
        cartOpen.onclick = () => {
            cartModal.style.display = "block";
            renderCart();
        };
    }

    setupLoadMore();

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

    editForm.onsubmit = async (e) => {
        e.preventDefault();
        const saveBtn = document.getElementById('saveEditBtn');
        const originalText = saveBtn.textContent;
        saveBtn.textContent = 'Saving...';
        saveBtn.disabled = true;

        try {
            const id = document.getElementById('editPid').value;
            const newName = document.getElementById('editName').value;
            const newPrice = Number(document.getElementById('editPrice').value);
            const newDesc = document.getElementById('editDesc').value;
            const editBadgeEl = document.getElementById('editBadge');
            const newBadge = editBadgeEl ? editBadgeEl.value : 'none';

            if (isFirebaseAvailable && isFirebaseConfigured) {
                await db.collection('products').doc(id).update({
                    name: newName,
                    price: newPrice,
                    description: newDesc,
                    badge: newBadge
                });
            } else {
                const product = products.find(p => String(p.id) === String(id));
                if (product) {
                    product.name = newName;
                    product.price = newPrice;
                    product.description = newDesc;
                    product.badge = newBadge;
                    await saveLocalProduct(product);
                    syncProducts();
                }
            }
            showNotification('Masterpiece updated successfully.');
            editModal.style.display = "none";
        } catch (err) {
            console.error(err);
            showNotification('Error updating product.');
        } finally {
            saveBtn.textContent = originalText;
            saveBtn.disabled = false;
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
                return item ? `${index + 1}. ${item.name} (₹${item.price.toLocaleString()})\n🔗 Link:\n${getProductLink(item.id)}` : '';
            }).join('\n\n');

            const total = cart.reduce((sum, itemId) => {
                const item = products.find(p => String(p.id) === String(itemId));
                return sum + (item ? item.price : 0);
            }, 0);

            productSection = `*ITEMS IN BAG:*\n${itemDetails}\n\n*TOTAL VALUE:* ₹${total.toLocaleString()}`;
        } else {
            orderTitle = 'NEW SINGLE ORDER';
            const p = products.find(prod => String(prod.id) === String(pid));
            productSection = p ? `*PRODUCT DETAILS:*\n📦 Name: ${p.name}\n💰 Price: ₹${p.price.toLocaleString()}\n🔗 Link:\n${getProductLink(p.id)}` : '*Error: Product Not Found*';
        }

        let promoSection = '';
        if (appliedPromoObj) {
            promoSection = `\n\n*🎁 PROMO APPLIED:*\n🏷️ Code: ${appliedPromoObj.codeStr}\n📉 Discount: -₹${appliedPromoObj.discountAmount.toLocaleString()}\n💳 *FINAL PAYABLE:* ₹${appliedPromoObj.finalTotal.toLocaleString()}`;
        }

        const details = {
            name: document.getElementById('custName').value,
            phone: document.getElementById('custPhone').value,
            phone2: document.getElementById('custPhone2').value || 'N/A',
            address: document.getElementById('fullAdd').value,
            nearby: document.getElementById('nearBy').value,
            state: document.getElementById('state').value,
            city: document.getElementById('city').value,
            pin: document.getElementById('pin').value
        };

        const waNumber = "919724732823";
        const message = `*✨ RICHVIBE - ${orderTitle} ✨*\n\n` +
            `${productSection}` +
            `${promoSection}\n\n` +
            `*CUSTOMER DETAILS:*\n` +
            `👤 Name: ${details.name}\n` +
            `📞 Phone 1: ${details.phone}\n` +
            `📞 Phone 2: ${details.phone2}\n` +
            `🗺️ Full Address: ${details.address}\n` +
            `🚩 Nearby: ${details.nearBy}\n` +
            `🏙️ City: ${details.city}\n` +
            `🏳️ State: ${details.state}\n` +
            `🔢 PIN Code: ${details.pin}\n\n` +
            `_Please confirm this order._`;

        const waUrl = `https://api.whatsapp.com/send?phone=${waNumber}&text=${encodeURIComponent(message)}`;
        window.open(waUrl, '_blank');
        buyModal.style.display = "none";

        // --- Auto-Save Inquiry to CRM ---
        const autoInq = {
            id: Date.now().toString(),
            customerName: details.name,
            phone: details.phone,
            product: (orderType === 'bag' ? 'Bulk Cart Order' : (products.find(prod => String(prod.id) === String(pid))?.name || 'Unknown Product')) + (appliedPromoObj ? ` (Promo: ${appliedPromoObj.codeStr})` : ''),
            source: 'Website',
            followUpDate: new Date().toISOString().split('T')[0], // Default follow-up to today
            status: 'Pending',
            timestamp: new Date().toISOString()
        };

        try {
            if (isFirebaseAvailable && isFirebaseConfigured) {
                db.collection('inquiries').doc(autoInq.id).set(autoInq);
            } else {
                let localInq = JSON.parse(localStorage.getItem('inquiries') || '[]');
                localInq.unshift(autoInq);
                localStorage.setItem('inquiries', JSON.stringify(localInq));
            }
            if (typeof loadInquiries === 'function') loadInquiries();
        } catch(err) {
            console.error("Failed to auto-save inquiry:", err);
        }
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
                badge: document.getElementById('pBadge') ? document.getElementById('pBadge').value : 'none',
                video: videoUrl,
                images: imageUrls,
                pinned: false,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            };

            if (isFirebaseAvailable && isFirebaseConfigured) {
                await db.collection('products').add(pData);
                console.log("Masterpiece Live via Cloudinary!");
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

    // Test Email Functionality
    const testEmailBtn = document.getElementById('testEmailBtn');
    if (testEmailBtn) {
        testEmailBtn.onclick = async () => {
            const originalText = testEmailBtn.textContent;
            testEmailBtn.textContent = 'Sending Test...';
            testEmailBtn.disabled = true;
            
            try {
                await emailjs.send("service_1ub0zen", "template_up62yvq", {
                    product_name: "TEST PRODUCT",
                    price: 999,
                    description: "This is a test email to verify the notification system.",
                    category: "TEST",
                    timestamp: new Date().toLocaleString()
                }, "M9_5LIzzv8jTjR3Sz");
                
                alert("Test Email Sent! Please check your inbox (and Spam folder).");
            } catch (err) {
                console.error("Test Email Failed:", err);
                alert("Email Failed: " + (err.text || err.message || "Unknown Error"));
            } finally {
                testEmailBtn.textContent = originalText;
                testEmailBtn.disabled = false;
            }
        };
    }
}

function openZoom(pid, index) {
    const p = products.find(prod => String(prod.id) === String(pid));
    if (!p) return;

    currentZoomImages = p.images;
    currentZoomIndex = index;

    updateZoomUI();
    document.getElementById('zoomModal').style.display = "block";
}

function changeZoomSlide(dir) {
    if (currentZoomImages.length <= 1) return;
    currentZoomIndex = (currentZoomIndex + dir + currentZoomImages.length) % currentZoomImages.length;
    updateZoomUI();
}

function updateZoomUI() {
    const zoomedImg = document.getElementById('zoomedImg');
    const zoomCounter = document.getElementById('zoomCounter');
    
    zoomedImg.src = currentZoomImages[currentZoomIndex];
    zoomCounter.textContent = `${currentZoomIndex + 1} / ${currentZoomImages.length}`;
}

// PWA Logic
let deferredPrompt;
function setupPWA() {
    // 1. Register Service Worker
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./sw.js')
                .then(reg => console.log('SW Registered'))
                .catch(err => console.log('SW Registration Failed', err));
        });
    }

    // 2. Handle Install Prompt
    const installContainer = document.getElementById('installAppContainer');
    const installBtn = document.getElementById('installAppBtn');

    window.addEventListener('beforeinstallprompt', (e) => {
        // Prevent Chrome 67 and earlier from automatically showing the prompt
        e.preventDefault();
        // Stash the event so it can be triggered later.
        deferredPrompt = e;
        // Show the install button container
        if (installContainer) installContainer.style.display = 'block';
    });

    if (installBtn) {
        installBtn.addEventListener('click', async () => {
            if (!deferredPrompt) return;
            // Show the install prompt
            deferredPrompt.prompt();
            // Wait for the user to respond to the prompt
            const { outcome } = await deferredPrompt.userChoice;
            console.log(`User response to the install prompt: ${outcome}`);
            // We've used the prompt, and can't use it again, throw it away
            deferredPrompt = null;
            // Hide the install button
            if (installContainer) installContainer.style.display = 'none';
        });
    }

    // 3. Hide button if already installed
    window.addEventListener('appinstalled', (evt) => {
        console.log('App Installed Successfully');
        if (installContainer) installContainer.style.display = 'none';
    });
}

// User Authentication Logic
let authState = {
    identity: '',
    name: '',
    isNew: false,
    otp: null
};
let recaptchaVerifier = null;

function getUserDocId(identity) {
    if (!identity) return 'guest';
    // Remove ALL symbols and leave only alphanumeric
    let id = identity.replace(/[^a-zA-Z0-9]/g, '');
    // If it's too short or only underscores/symbols, use a prefix
    if (id.length < 5) id = "rv_user_" + (id || "new");
    return id;
}

function setupUserAuth() {
    try {
        const authModal = document.getElementById('authModal');
        const loginBtn = document.getElementById('loginBtn');
        const logoutBtn = document.getElementById('logoutBtn');
        const authNextBtn = document.getElementById('authNextBtn');
        const verifyOtpBtn = document.getElementById('verifyOtpBtn');
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

        // Step 1: Send OTP via EmailJS
        if (authNextBtn) authNextBtn.onclick = async () => {
            const identity = document.getElementById('authIdentity').value.trim().toLowerCase();
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            
            if (!identity || !emailRegex.test(identity)) {
                return showNotification('Please enter a valid Gmail/Email address');
            }
            
            authNextBtn.textContent = 'Generating OTP...';
            authNextBtn.disabled = true;

            try {
                authState.identity = identity;
                
                // 1. Generate 6-digit OTP
                const generatedOtp = Math.floor(100000 + Math.random() * 900000);
                authState.otp = generatedOtp;

                // 2. Send OTP via EmailJS
                // Template: template_otp (User needs to create this in EmailJS)
                const emailParams = {
                    to_email: identity,
                    otp_code: generatedOtp,
                    store_name: "Richvibe",
                    reply_to: "richvibe30@gmail.com"
                };

                console.log("Sending OTP to:", identity);
                
                await emailjs.send("service_wortnsa", "template_irpjg8d", {
                    to_email: identity,
                    subject: "Richvibe - Your Verification Code",
                    message_body: `Hello! Your 6-digit verification code for Richvibe is: ${generatedOtp}. Please do not share this code with anyone.`
                });

                showNotification('✨ OTP sent to your Gmail!');
                goToStep(2);
            } catch (err) {
                console.error("EmailJS Auth Error:", err);
                showNotification('Failed to send OTP. Please check your internet.');
            } finally {
                authNextBtn.textContent = 'Get OTP';
                authNextBtn.disabled = false;
            }
        };

        // Step 2: Verify OTP
        if (verifyOtpBtn) verifyOtpBtn.onclick = async () => {
            const inputs = document.querySelectorAll('.otp-input');
            const code = Array.from(inputs).map(i => i.value).join('');
            
            if (code.length < 6) return showNotification('Please enter 6-digit code');

            verifyOtpBtn.textContent = 'Verifying...';
            verifyOtpBtn.disabled = true;

            try {
                // Check if OTP matches
                if (String(code) === String(authState.otp)) {
                    const userRef = db.collection('users').doc(getUserDocId(authState.identity));
                    const doc = await userRef.get();

                    if (doc.exists) {
                        authState.isNew = false;
                        authState.name = doc.data().name;
                        completeLogin();
                    } else {
                        authState.isNew = true;
                        goToStep(3);
                    }
                } else {
                    throw new Error("Invalid OTP Code");
                }
            } catch (err) {
                showNotification(err.message || "Verification Failed.");
            } finally {
                verifyOtpBtn.textContent = 'Verify OTP';
                verifyOtpBtn.disabled = false;
            }
        };

        // Step 3: Name Signup
        if (authSignupBtn) authSignupBtn.onclick = async () => {
            const name = document.getElementById('authName').value.trim();
            if (!name) return showNotification('Please enter your name');

            authSignupBtn.textContent = 'Saving...';
            authSignupBtn.disabled = true;

            try {
                authState.name = name;
                const userRef = db.collection('users').doc(getUserDocId(authState.identity));
                await userRef.set({
                    name: name,
                    identity: authState.identity,
                    createdAt: new Date().toISOString()
                });
                completeLogin();
            } catch (err) {
                showNotification('Signup failed.');
            } finally {
                authSignupBtn.textContent = 'Complete Joining';
                authSignupBtn.disabled = false;
            }
        };

        // OTP Focus Jump Logic
        const otpInputs = document.querySelectorAll('.otp-input');
        otpInputs.forEach((input, idx) => {
            input.onkeyup = (e) => {
                if (e.key >= 0 && e.key <= 9) {
                    if (idx < 5) otpInputs[idx + 1].focus();
                } else if (e.key === 'Backspace') {
                    if (idx > 0) otpInputs[idx - 1].focus();
                }
            };
        });
    } catch (err) {
        console.error("Auth Setup Failed:", err);
    }
}

function goToStep(step) {
    const s1 = document.getElementById('authStep1');
    const s2 = document.getElementById('authStep2');
    const s3 = document.getElementById('authStep3');
    if (s1) s1.style.display = 'none';
    if (s2) s2.style.display = 'none';
    if (s3) s3.style.display = 'none';
    
    const target = document.getElementById('authStep' + step);
    if (target) target.style.display = 'block';
}

function resetAuthModal() {
    const u = document.getElementById('authUsername');
    const lp = document.getElementById('loginPassword');
    const sn = document.getElementById('signupName');
    const sp = document.getElementById('signupPassword');
    if (u) u.value = '';
    if (lp) lp.value = '';
    if (sn) sn.value = '';
    if (sp) sp.value = '';
    goToStep(1);
}

async function completeLogin() {
    currentUser = {
        name: authState.name,
        identity: authState.identity
    };
    
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    localStorage.setItem('initialSyncDone', 'true'); 
    updateAuthUI(true);
    const modal = document.getElementById('authModal');
    if (modal) modal.style.display = 'none';
    showNotification(`Welcome back, ${authState.name}!`);
    
    // Notify Admin about Successful Login (Sent to richvibe30@gmail.com)
    try {
        await emailjs.send("service_wortnsa", "template_irpjg8d", {
            to_email: "richvibe30@gmail.com",
            subject: "New Customer Login: " + authState.name,
            message_body: `A customer has just logged into Richvibe.\n\nName: ${authState.name}\nEmail: ${authState.identity}\nStatus: ${authState.isNew ? 'New Registration' : 'Returning Customer'}\nTime: ${new Date().toLocaleString()}`
        });
    } catch (e) { console.warn("Admin notification failed", e); }

    syncUserData();
    renderProducts();
    renderCart();
}

function logoutUser() {
    if (confirm('Are you sure you want to logout?')) {
        // Clear all session data
        localStorage.removeItem('currentUser');
        localStorage.removeItem('initialSyncDone');
        currentUser = null;
        
        // Immediate UI reset
        updateAuthUI(false);
        
        showNotification('Logged out successfully.');
        
        // Force refresh to clear any firebase listeners/state
        setTimeout(() => location.reload(), 500);
    }
}

function updateAuthUI(isLoggedIn) {
    const userProfile = document.getElementById('userProfile');
    const loginBtn = document.getElementById('loginBtn');
    const userNameDisplay = document.getElementById('userNameDisplay');

    if (isLoggedIn && currentUser) {
        if (userProfile) userProfile.style.display = 'block';
        if (loginBtn) loginBtn.style.display = 'none';
        const firstName = (currentUser.name && typeof currentUser.name === 'string') ? currentUser.name.split(' ')[0] : 'User';
        if (userNameDisplay) userNameDisplay.textContent = `👤 Hello, ${firstName}`;
    } else {
        if (userProfile) userProfile.style.display = 'none';
        if (loginBtn) loginBtn.style.display = 'block';
    }
}

async function syncUserData() {
    if (!currentUser || !isFirebaseAvailable || !isFirebaseConfigured) return;

    try {
        const userRef = db.collection('users').doc(getUserDocId(currentUser.identity));
        const doc = await userRef.get();
        
        if (doc.exists) {
            const data = doc.data();
            // ONLY pull data if the local cart is empty AND it's a fresh login (not every sync)
            // To be safer, we only pull if it's the very first sync after login
            if (cart.length === 0 && data.cart && !localStorage.getItem('initialSyncDone')) {
                cart = data.cart;
                localStorage.setItem('initialSyncDone', 'true');
            }
            if (wishlist.length === 0 && data.wishlist && !localStorage.getItem('initialSyncDone')) {
                wishlist = data.wishlist;
            }
            
            await userRef.update({
                cart: cart,
                wishlist: wishlist,
                lastActive: new Date().toISOString()
            });
            
            // Update local storage without calling saveCart() to avoid loop
            localStorage.setItem('cart', JSON.stringify(cart));
            localStorage.setItem('wishlist', JSON.stringify(wishlist));
            
            renderCart();
        }
    } catch (err) {
        console.warn("Sync failed:", err);
    }
}

function resetAuthModal() {
    const iden = document.getElementById('authIdentity');
    const name = document.getElementById('authName');
    if (iden) iden.value = '';
    if (name) name.value = '';
    document.querySelectorAll('.otp-input').forEach(i => i.value = '');
    goToStep(1);
}



// --- Inquiries CRM System ---
let inquiries = [];

async function loadInquiries() {
    if (!isAdminLoggedIn) return;
    try {
        if (isFirebaseAvailable && isFirebaseConfigured) {
            const snapshot = await db.collection('inquiries').orderBy('timestamp', 'desc').get();
            inquiries = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } else {
            inquiries = JSON.parse(localStorage.getItem('inquiries') || '[]');
        }
        renderInquiries();
        checkFollowUps();
    } catch(err) {
        console.error("Error loading inquiries:", err);
        // Fallback to local if firebase fails
        inquiries = JSON.parse(localStorage.getItem('inquiries') || '[]');
        renderInquiries();
        checkFollowUps();
    }
}

function renderInquiries() {
    const dueTodayList = document.getElementById('dueTodayList');
    const allList = document.getElementById('allInquiriesList');
    const dueSection = document.getElementById('dueTodaySection');
    
    if (!dueTodayList || !allList) return;

    let dueHtml = '';
    let allHtml = '';
    
    const today = new Date().toISOString().split('T')[0];
    let dueCount = 0;

    inquiries.forEach(inq => {
        const isDue = inq.followUpDate && inq.followUpDate <= today && inq.status !== 'Completed';
        const cardHtml = `
            <div style="background: rgba(255,255,255,0.05); padding: 12px; border-radius: 8px; border: 1px solid ${isDue ? '#ff4d4d' : 'var(--glass-border)'}; display: flex; flex-direction: column; gap: 8px;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <div>
                        <strong style="color: var(--gold-primary); font-size: 1.1rem;">${inq.customerName}</strong>
                        <div style="font-size: 0.8rem; color: var(--text-gray);">${inq.phone} • Source: ${inq.source}</div>
                    </div>
                    <span style="font-size: 0.75rem; background: ${inq.status === 'Completed' ? '#25D366' : 'rgba(255,255,255,0.1)'}; color: white; padding: 2px 6px; border-radius: 4px;">${inq.status || 'Pending'}</span>
                </div>
                <div style="font-size: 0.9rem; color: white;">Product: ${inq.product}</div>
                <div style="font-size: 0.8rem; color: ${isDue ? '#ff4d4d' : '#ffca28'}; font-weight: ${isDue ? 'bold' : 'normal'};">Follow-up: ${inq.followUpDate || 'None'}</div>
                
                <div style="display: flex; gap: 10px; margin-top: 5px;">
                    <button onclick="sendFollowUp('${inq.phone}', '${inq.customerName}', '${inq.product.replace(/'/g, "\\'")}')" style="flex: 1; background: #25D366; color: white; border: none; padding: 8px; border-radius: 5px; cursor: pointer; font-weight: bold; font-size: 0.8rem;">WhatsApp</button>
                    <button onclick="markInquiryCompleted('${inq.id}')" style="background: var(--glass-border); color: white; border: none; padding: 8px; border-radius: 5px; cursor: pointer; font-size: 0.8rem;">${inq.status === 'Completed' ? 'Undo' : 'Done ✅'}</button>
                    <button onclick="deleteInquiry('${inq.id}')" style="background: transparent; color: #ff4d4d; border: 1px solid #ff4d4d; padding: 8px; border-radius: 5px; cursor: pointer; font-size: 0.8rem;">🗑️</button>
                </div>
            </div>
        `;
        
        if (isDue) {
            dueHtml += cardHtml;
            dueCount++;
        } else {
            allHtml += cardHtml;
        }
    });

    if (dueCount > 0) {
        if(dueSection) dueSection.style.display = 'block';
        dueTodayList.innerHTML = dueHtml;
    } else {
        if(dueSection) dueSection.style.display = 'none';
        dueTodayList.innerHTML = '';
    }
    
    allList.innerHTML = allHtml || '<p style="color: var(--text-gray);">No pending inquiries.</p>';
}

function checkFollowUps() {
    if (!isAdminLoggedIn) return;
    const today = new Date().toISOString().split('T')[0];
    let dueCount = inquiries.filter(inq => inq.followUpDate && inq.followUpDate <= today && inq.status !== 'Completed').length;
    
    const badge = document.getElementById('inquiryBadge');
    const adminBtnEl = document.getElementById('adminBtn');
    
    if (dueCount > 0) {
        if(badge) {
            badge.style.display = 'inline-block';
            badge.textContent = dueCount;
        }
        if(adminBtnEl) {
            adminBtnEl.innerHTML = `+ <span style="position: absolute; top: 0; right: 0; width: 12px; height: 12px; background: #ff4d4d; border-radius: 50%; border: 2px solid #000;"></span>`;
        }
        // Show Toast once per session
        if (!sessionStorage.getItem('notifiedDue')) {
            showNotification(`🔔 Reminder: ${dueCount} follow-ups are due today!`);
            sessionStorage.setItem('notifiedDue', 'true');
        }
    } else {
        if(badge) badge.style.display = 'none';
        if(adminBtnEl) adminBtnEl.innerHTML = `+`;
    }
}

window.sendFollowUp = function(phone, name, product) {
    const msg = `Hello ${name}! 👋\nAapne recently hamari website par *${product}* ke baare mein inquiry ki thi.\nKya main aapki koi aur madad kar sakta hu ya order confirm karun? 😊`;
    window.open(`https://wa.me/${phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
};

window.markInquiryCompleted = async function(id) {
    const inq = inquiries.find(i => i.id === id);
    if (!inq) return;
    
    inq.status = inq.status === 'Completed' ? 'Pending' : 'Completed';
    
    try {
        if (isFirebaseAvailable && isFirebaseConfigured) {
            await db.collection('inquiries').doc(id).update({ status: inq.status });
        }
    } catch(err) {
        console.warn(err);
    }
    // Always update local storage fallback
    localStorage.setItem('inquiries', JSON.stringify(inquiries));
    renderInquiries();
    checkFollowUps();
};

window.deleteInquiry = async function(id) {
    if(!confirm("Delete this inquiry?")) return;
    try {
        if (isFirebaseAvailable && isFirebaseConfigured) {
            await db.collection('inquiries').doc(id).delete();
        }
    } catch(err) {
        console.warn(err);
    }
    inquiries = inquiries.filter(i => i.id !== id);
    localStorage.setItem('inquiries', JSON.stringify(inquiries));
    renderInquiries();
    checkFollowUps();
};

// --- Promo Codes Engine Logic ---
async function loadPromoCodes() {
    try {
        if (isFirebaseAvailable && isFirebaseConfigured) {
            const snapshot = await db.collection('promocodes').orderBy('timestamp', 'desc').get();
            promoCodes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } else {
            promoCodes = JSON.parse(localStorage.getItem('promoCodes') || '[]');
        }
    } catch(err) {
        console.warn("Error loading promo codes from Firebase, using local:", err);
        promoCodes = JSON.parse(localStorage.getItem('promoCodes') || '[]');
    }
    if (isAdminLoggedIn) renderPromoCodes();
}

function renderPromoCodes() {
    const listEl = document.getElementById('promoCodesList');
    if (!listEl) return;

    if (promoCodes.length === 0) {
        listEl.innerHTML = '<p style="color: var(--text-gray);">No promo codes created yet.</p>';
        return;
    }

    listEl.innerHTML = promoCodes.map(promo => `
        <div style="background: rgba(255,255,255,0.05); padding: 12px; border-radius: 8px; border: 1px solid var(--glass-border); display: flex; justify-content: space-between; align-items: center;">
            <div>
                <strong style="color: var(--gold-primary); font-size: 1.2rem; letter-spacing: 2px;">${promo.codeStr}</strong>
                <span style="background: rgba(255,255,255,0.1); color: white; font-size: 0.75rem; padding: 2px 6px; border-radius: 4px; margin-left: 8px;">${promo.category.toUpperCase()}</span>
                <div style="font-size: 0.85rem; color: white; margin-top: 4px;">
                    Discount: <span style="color: #25D366; font-weight: bold;">${promo.type === 'percent' ? `${promo.value}% OFF` : `₹${promo.value} OFF`}</span>
                </div>
                <div style="font-size: 0.75rem; color: var(--text-gray); margin-top: 2px;">Expires: ${promo.expiryDate}</div>
            </div>
            <button onclick="deletePromoCode('${promo.id}')" style="background: transparent; color: #ff4d4d; border: 1px solid #ff4d4d; padding: 6px 12px; border-radius: 5px; cursor: pointer; font-size: 0.8rem;">Delete</button>
        </div>
    `).join('');
}

window.deletePromoCode = async function(id) {
    if (!confirm("Remove this promo code?")) return;
    try {
        if (isFirebaseAvailable && isFirebaseConfigured) {
            await db.collection('promocodes').doc(id).delete();
        }
    } catch(err) { console.warn(err); }
    promoCodes = promoCodes.filter(p => p.id !== id);
    localStorage.setItem('promoCodes', JSON.stringify(promoCodes));
    renderPromoCodes();
    showNotification('Promo code deleted.');
};

// Setup Admin Tabs Logic inside a function so we can ensure elements exist
function setupAdminTabs() {
    const tabUploadBtn = document.getElementById('tabUploadBtn');
    const tabStockBtn = document.getElementById('tabStockBtn');
    const tabInquiriesBtn = document.getElementById('tabInquiriesBtn');
    const tabPromoBtn = document.getElementById('tabPromoBtn');
    const tabAnalyticsBtn = document.getElementById('tabAnalyticsBtn');
    const tabCategoriesBtn = document.getElementById('tabCategoriesBtn');

    const tabUpload = document.getElementById('tabUpload');
    const tabStock = document.getElementById('tabStock');
    const tabInquiries = document.getElementById('tabInquiries');
    const tabPromo = document.getElementById('tabPromo');
    const tabAnalytics = document.getElementById('tabAnalytics');
    const tabCategories = document.getElementById('tabCategories');

    const resetAdminTabs = () => {
        if(tabUploadBtn) { tabUploadBtn.style.background = 'rgba(255,255,255,0.05)'; tabUploadBtn.style.color = 'var(--text-white)'; }
        if(tabStockBtn) { tabStockBtn.style.background = 'rgba(255,255,255,0.05)'; tabStockBtn.style.color = 'var(--text-white)'; }
        if(tabInquiriesBtn) { tabInquiriesBtn.style.background = 'rgba(255,255,255,0.05)'; tabInquiriesBtn.style.color = 'var(--text-white)'; }
        if(tabPromoBtn) { tabPromoBtn.style.background = 'rgba(255,255,255,0.05)'; tabPromoBtn.style.color = 'var(--text-white)'; }
        if(tabAnalyticsBtn) { tabAnalyticsBtn.style.background = 'rgba(255,255,255,0.05)'; tabAnalyticsBtn.style.color = 'var(--text-white)'; }
        if(tabCategoriesBtn) { tabCategoriesBtn.style.background = 'rgba(255,255,255,0.05)'; tabCategoriesBtn.style.color = 'var(--text-white)'; }

        if(tabUpload) tabUpload.style.display = 'none';
        if(tabStock) tabStock.style.display = 'none';
        if(tabInquiries) tabInquiries.style.display = 'none';
        if(tabPromo) tabPromo.style.display = 'none';
        if(tabAnalytics) tabAnalytics.style.display = 'none';
        if(tabCategories) tabCategories.style.display = 'none';
    };

    if (tabUploadBtn) {
        tabUploadBtn.onclick = (e) => {
            e.preventDefault();
            resetAdminTabs();
            tabUploadBtn.style.background = 'var(--gold-gradient)'; tabUploadBtn.style.color = '#000';
            if(tabUpload) tabUpload.style.display = 'block';
        };
    }
    if (tabStockBtn) {
        tabStockBtn.onclick = (e) => {
            e.preventDefault();
            resetAdminTabs();
            tabStockBtn.style.background = 'var(--gold-gradient)'; tabStockBtn.style.color = '#000';
            if(tabStock) tabStock.style.display = 'block';
            renderStockList();
        };
    }
    if (tabInquiriesBtn) {
        tabInquiriesBtn.onclick = (e) => {
            e.preventDefault();
            resetAdminTabs();
            tabInquiriesBtn.style.background = 'var(--gold-gradient)'; tabInquiriesBtn.style.color = '#000';
            if(tabInquiries) tabInquiries.style.display = 'block';
            loadInquiries();
        };
    }
    if (tabPromoBtn) {
        tabPromoBtn.onclick = (e) => {
            e.preventDefault();
            resetAdminTabs();
            tabPromoBtn.style.background = 'var(--gold-gradient)'; tabPromoBtn.style.color = '#000';
            if(tabPromo) tabPromo.style.display = 'block';
            loadPromoCodes();
        };
    }
    if (tabAnalyticsBtn) {
        tabAnalyticsBtn.onclick = (e) => {
            e.preventDefault();
            resetAdminTabs();
            tabAnalyticsBtn.style.background = 'var(--gold-gradient)'; tabAnalyticsBtn.style.color = '#000';
            if(tabAnalytics) tabAnalytics.style.display = 'block';
            loadRollingAnalytics();
        };
    }
    if (tabCategoriesBtn) {
        tabCategoriesBtn.onclick = (e) => {
            e.preventDefault();
            resetAdminTabs();
            tabCategoriesBtn.style.background = 'var(--gold-gradient)'; tabCategoriesBtn.style.color = '#000';
            if(tabCategories) tabCategories.style.display = 'block';
            loadCustomCategories();
        };
    }

    const addManualInquiryBtn = document.getElementById('addManualInquiryBtn');
    const manualInquiryForm = document.getElementById('manualInquiryForm');
    if (addManualInquiryBtn && manualInquiryForm) {
        addManualInquiryBtn.onclick = (e) => {
            e.preventDefault();
            manualInquiryForm.style.display = manualInquiryForm.style.display === 'none' ? 'block' : 'none';
        };
    }

    if (manualInquiryForm) {
        manualInquiryForm.onsubmit = async (e) => {
            e.preventDefault();
            const btn = manualInquiryForm.querySelector('button[type="submit"]');
            const origTxt = btn.textContent;
            btn.textContent = 'Saving...';
            btn.disabled = true;

            const newInq = {
                id: Date.now().toString(),
                customerName: document.getElementById('inqName').value,
                phone: document.getElementById('inqPhone').value,
                product: document.getElementById('inqProduct').value,
                source: document.getElementById('inqSource').value,
                followUpDate: document.getElementById('inqDate').value,
                status: 'Pending',
                timestamp: new Date().toISOString()
            };

            try {
                if (isFirebaseAvailable && isFirebaseConfigured) {
                    await db.collection('inquiries').doc(newInq.id).set(newInq);
                }
            } catch(err) {
                console.warn(err);
            }
            
            inquiries.unshift(newInq);
            localStorage.setItem('inquiries', JSON.stringify(inquiries));
            
            manualInquiryForm.reset();
            manualInquiryForm.style.display = 'none';
            renderInquiries();
            checkFollowUps();
            showNotification('Inquiry saved successfully!');
            
            btn.textContent = origTxt;
            btn.disabled = false;
        };
    }

    // Promo Code Creation logic
    const showAddPromoBtn = document.getElementById('showAddPromoBtn');
    const createPromoForm = document.getElementById('createPromoForm');
    if (showAddPromoBtn && createPromoForm) {
        showAddPromoBtn.onclick = (e) => {
            e.preventDefault();
            createPromoForm.style.display = createPromoForm.style.display === 'none' ? 'block' : 'none';
        };

        createPromoForm.onsubmit = async (e) => {
            e.preventDefault();
            const btn = createPromoForm.querySelector('button[type="submit"]');
            const origTxt = btn.textContent;
            btn.textContent = 'Saving...';
            btn.disabled = true;

            const codeStr = document.getElementById('promoCodeStr').value.trim().toUpperCase();
            if (promoCodes.some(p => p.codeStr === codeStr)) {
                showNotification('Code already exists!');
                btn.textContent = origTxt; btn.disabled = false;
                return;
            }

            const newPromo = {
                id: Date.now().toString(),
                codeStr: codeStr,
                type: document.getElementById('promoType').value,
                value: Number(document.getElementById('promoValue').value),
                category: document.getElementById('promoCat').value,
                expiryDate: document.getElementById('promoExpiry').value,
                timestamp: new Date().toISOString()
            };

            try {
                if (isFirebaseAvailable && isFirebaseConfigured) {
                    await db.collection('promocodes').doc(newPromo.id).set(newPromo);
                }
            } catch(err) { console.warn(err); }

            promoCodes.unshift(newPromo);
            localStorage.setItem('promoCodes', JSON.stringify(promoCodes));

            createPromoForm.reset();
            createPromoForm.style.display = 'none';
            renderPromoCodes();
            showNotification('Promo code created successfully!');

            btn.textContent = origTxt;
            btn.disabled = false;
        };
    }

    // Customer Apply Promo Button Logic
    const applyPromoBtn = document.getElementById('applyPromoBtn');
    if (applyPromoBtn) {
        applyPromoBtn.onclick = () => {
            const inputEl = document.getElementById('appliedPromoInput');
            const msgEl = document.getElementById('promoMessage');
            if (!inputEl || !msgEl) return;

            const codeEntered = inputEl.value.trim().toUpperCase();
            if (!codeEntered) {
                msgEl.style.display = 'block';
                msgEl.style.color = '#ff4d4d';
                msgEl.textContent = 'Please enter a promo code.';
                return;
            }

            const promo = promoCodes.find(p => p.codeStr === codeEntered);
            if (!promo) {
                msgEl.style.display = 'block';
                msgEl.style.color = '#ff4d4d';
                msgEl.textContent = 'Invalid promo code.';
                return;
            }

            const today = new Date().toISOString().split('T')[0];
            if (promo.expiryDate && promo.expiryDate < today) {
                msgEl.style.display = 'block';
                msgEl.style.color = '#ff4d4d';
                msgEl.textContent = 'This promo code has expired.';
                return;
            }

            const orderType = buyModal.getAttribute('data-order-type');
            const pid = buyModal.getAttribute('data-current-pid');
            let applicableSubtotal = 0;
            let fullSubtotal = 0;

            if (orderType === 'bag') {
                cart.forEach(itemId => {
                    const item = products.find(p => String(p.id) === String(itemId));
                    if (item) {
                        fullSubtotal += item.price;
                        if (promo.category === 'all' || item.category === promo.category) {
                            applicableSubtotal += item.price;
                        }
                    }
                });
            } else {
                const item = products.find(p => String(p.id) === String(pid));
                if (item) {
                    fullSubtotal = item.price;
                    if (promo.category === 'all' || item.category === promo.category) {
                        applicableSubtotal = item.price;
                    }
                }
            }

            if (applicableSubtotal === 0) {
                msgEl.style.display = 'block';
                msgEl.style.color = '#ff4d4d';
                msgEl.textContent = `Code valid only for ${promo.category.toUpperCase()} items.`;
                return;
            }

            let discountAmount = 0;
            if (promo.type === 'percent') {
                discountAmount = Math.round((applicableSubtotal * promo.value) / 100);
            } else {
                discountAmount = promo.value;
            }

            if (discountAmount > fullSubtotal) {
                discountAmount = fullSubtotal;
            }

            const finalTotal = fullSubtotal - discountAmount;

            appliedPromoObj = {
                ...promo,
                discountAmount,
                finalTotal
            };

            msgEl.style.display = 'block';
            msgEl.style.color = '#25D366';
            msgEl.textContent = 'Promo Code applied successfully!';

            const summaryBox = document.getElementById('orderSummaryBox');
            const summarySubtotal = document.getElementById('summarySubtotal');
            const summaryDiscountAmount = document.getElementById('summaryDiscountAmount');
            const summaryFinalTotal = document.getElementById('summaryFinalTotal');

            if (summaryBox) summaryBox.style.display = 'block';
            if (summarySubtotal) summarySubtotal.textContent = `₹${fullSubtotal.toLocaleString()}`;
            if (summaryDiscountAmount) summaryDiscountAmount.textContent = `-₹${discountAmount.toLocaleString()}`;
            if (summaryFinalTotal) summaryFinalTotal.textContent = `₹${finalTotal.toLocaleString()}`;

            showNotification('Discount Applied!');
        };
    }

    // Setup Search for Stock
    const searchStockInput = document.getElementById('searchStockInput');
    if (searchStockInput) {
        searchStockInput.oninput = () => renderStockList();
    }

    // Setup Banner Controls
    const saveBannerBtn = document.getElementById('saveBannerBtn');
    if (saveBannerBtn) {
        saveBannerBtn.onclick = async () => {
            const active = document.getElementById('bannerActiveToggle').checked;
            const text = document.getElementById('marqueeTextInput').value.trim();
            const config = { active, text: text || "🔥 Welcome to Richvibe Collection! Enjoy Premium Craftsmanship." };
            localStorage.setItem('storeBannerConfig', JSON.stringify(config));
            
            // Push real-time cloud update
            try {
                if (isFirebaseAvailable && isFirebaseConfigured) {
                    await db.collection('settings').doc('banner').set(config);
                }
            } catch(e) { }

            applyBannerConfig();
            showNotification('Banner broadcasted live to all customers!');
        };
    }

    // Setup Daily Sales Log form
    const salesLogDate = document.getElementById('salesLogDate');
    const saveSalesLogBtn = document.getElementById('saveSalesLogBtn');
    if (salesLogDate) {
        salesLogDate.onchange = () => populateSalesLogForDate(salesLogDate.value);
    }
    if (saveSalesLogBtn) {
        saveSalesLogBtn.onclick = () => saveSalesLogEntry();
    }
}

// --- Feature 1: Stock Manager Functions ---
function renderStockList() {
    const container = document.getElementById('stockListContainer');
    if (!container) return;

    const query = (document.getElementById('searchStockInput')?.value || '').toLowerCase().trim();
    const filtered = products.filter(p => p.name.toLowerCase().includes(query));

    if (filtered.length === 0) {
        container.innerHTML = '<p style="color: var(--text-gray); font-size: 0.85rem;">No matching masterpieces found.</p>';
        return;
    }

    container.innerHTML = filtered.map(p => {
        const inStockStatus = p.inStock !== false; // defaults to true
        return `
            <div style="background: rgba(255,255,255,0.03); padding: 8px 12px; border-radius: 6px; border: 1px solid var(--glass-border); display: flex; justify-content: space-between; align-items: center;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <img src="${p.images?.[0] || ''}" style="width: 40px; height: 40px; object-fit: cover; border-radius: 4px;" loading="lazy">
                    <div>
                        <div style="color: white; font-size: 0.85rem; font-weight: bold;">${p.name}</div>
                        <div style="color: var(--gold-primary); font-size: 0.75rem;">₹${p.price.toLocaleString()}</div>
                    </div>
                </div>
                <button onclick="toggleProductStock('${p.id}', ${!inStockStatus})" style="background: ${inStockStatus ? '#25D366' : '#ff4d4d'}; color: white; border: none; padding: 4px 10px; border-radius: 4px; font-size: 0.75rem; font-weight: bold; cursor: pointer;">
                    ${inStockStatus ? '🟢 In Stock' : '🔴 Sold Out'}
                </button>
            </div>
        `;
    }).join('');
}

window.toggleProductStock = async function(id, newStatus) {
    try {
        const p = products.find(prod => prod.id === id);
        if (p) {
            p.inStock = newStatus;
            if (isFirebaseAvailable && isFirebaseConfigured) {
                await db.collection('products').doc(id).update({ inStock: newStatus });
            } else {
                await saveLocalProduct(p);
            }
            renderStockList();
            renderProducts();
            showNotification(newStatus ? 'Marked In Stock' : 'Marked Sold Out');
        }
    } catch(err) {
        console.warn(err);
        showNotification('Error updating stock status.');
    }
};

// --- Feature 2: Store Announcement Banner Logic ---
function applyBannerConfig(cloudConfig = null) {
    const bar = document.getElementById('storeAnnouncementBar');
    const txtEl = document.getElementById('storeAnnouncementText');
    if (!bar || !txtEl) return;

    try {
        let config = cloudConfig;
        if (!config) {
            const saved = localStorage.getItem('storeBannerConfig');
            config = saved ? JSON.parse(saved) : { active: true, text: "🔥 Welcome to Richvibe Collection! Enjoy Premium Craftsmanship." };
        } else {
            localStorage.setItem('storeBannerConfig', JSON.stringify(config));
        }
        
        if (config.active && config.text) {
            bar.style.display = 'block';
            txtEl.textContent = config.text;
        } else {
            bar.style.display = 'none';
        }

        // populate inputs if open
        const activeToggle = document.getElementById('bannerActiveToggle');
        const txtInput = document.getElementById('marqueeTextInput');
        if (activeToggle) activeToggle.checked = config.active;
        if (txtInput) txtInput.value = config.text;
    } catch(e) { }
}

// --- Feature 3: Rolling 7-Day Analytics Logic ---
let dailySalesLogs = {};

async function loadRollingAnalytics() {
    // initialize date to today
    const dateInput = document.getElementById('salesLogDate');
    const todayStr = new Date().toISOString().split('T')[0];
    if (dateInput && !dateInput.value) {
        dateInput.value = todayStr;
    }

    // Always load local storage first to preserve admin's immediate edits perfectly
    let localLogs = {};
    try {
        localLogs = JSON.parse(localStorage.getItem('dailySalesLogs') || '{}');
    } catch(e) { }

    dailySalesLogs = { ...localLogs };

    try {
        if (isFirebaseAvailable && isFirebaseConfigured) {
            const snapshot = await db.collection('sales_logs').get();
            snapshot.docs.forEach(doc => {
                const cloudData = doc.data();
                const localData = dailySalesLogs[doc.id];
                // Use cloud data if local doesn't exist or cloud timestamp is newer
                if (!localData || (cloudData.timestamp && localData.timestamp && cloudData.timestamp > localData.timestamp)) {
                    dailySalesLogs[doc.id] = cloudData;
                }
            });
            // backup synced state to local storage
            localStorage.setItem('dailySalesLogs', JSON.stringify(dailySalesLogs));
        }
    } catch(err) {
        console.warn("Error syncing sales logs with cloud, using local state:", err);
    }

    if (dateInput) {
        populateSalesLogForDate(dateInput.value);
    }
    renderRollingAnalytics();
}

function populateSalesLogForDate(dateStr) {
    if (!dateStr) return;
    const entry = dailySalesLogs[dateStr] || { watches: 0, goggles: 0, crocs: 0, purses: 0 };
    
    document.getElementById('logWatches').value = entry.watches || 0;
    document.getElementById('logGoggles').value = entry.goggles || 0;
    document.getElementById('logCrocs').value = entry.crocs || 0;
    document.getElementById('logPurses').value = entry.purses || 0;
}

async function saveSalesLogEntry() {
    const dateStr = document.getElementById('salesLogDate')?.value;
    if (!dateStr) {
        showNotification('Please select a valid date.');
        return;
    }

    const watches = Number(document.getElementById('logWatches').value) || 0;
    const goggles = Number(document.getElementById('logGoggles').value) || 0;
    const crocs = Number(document.getElementById('logCrocs').value) || 0;
    const purses = Number(document.getElementById('logPurses').value) || 0;

    const entry = { watches, goggles, crocs, purses, timestamp: new Date().toISOString() };
    dailySalesLogs[dateStr] = entry;

    try {
        if (isFirebaseAvailable && isFirebaseConfigured) {
            await db.collection('sales_logs').doc(dateStr).set(entry);
        }
    } catch(err) { console.warn(err); }

    localStorage.setItem('dailySalesLogs', JSON.stringify(dailySalesLogs));
    showNotification(`Sales saved for ${dateStr}!`);
    renderRollingAnalytics();
}

function renderRollingAnalytics() {
    // Generate rolling 7 dates ending today/yesterday
    const dates = [];
    let totalUnitsSold = 0;
    
    for (let i = 0; i < 7; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const iso = d.toISOString().split('T')[0];
        dates.push(iso);
    }

    const adminHtmlRows = [];
    const publicHtmlRows = [];

    dates.forEach(isoDate => {
        const entry = dailySalesLogs[isoDate] || { watches: 0, goggles: 0, crocs: 0, purses: 0 };
        const dayTotal = (entry.watches || 0) + (entry.goggles || 0) + (entry.crocs || 0) + (entry.purses || 0);
        totalUnitsSold += dayTotal;

        // format beautiful user-readable string like "Wed, May 13"
        const dObj = new Date(isoDate);
        const displayDate = isNaN(dObj.getTime()) ? isoDate : dObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

        // Admin row with emojis
        adminHtmlRows.push(`
            <div style="background: rgba(255,255,255,0.02); padding: 6px 10px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.05); display: flex; justify-content: space-between; align-items: center;">
                <div style="color: white; font-weight: bold; width: 100px;">${displayDate}</div>
                <div style="display: flex; gap: 4px; flex: 1; justify-content: center; flex-wrap: wrap;">
                    ${entry.watches ? `<span style="background: rgba(255,215,0,0.1); color: var(--gold-primary); font-size: 0.7rem; padding: 1px 5px; border-radius: 3px;">⌚ ${entry.watches}</span>` : ''}
                    ${entry.goggles ? `<span style="background: rgba(37,211,102,0.1); color: #25D366; font-size: 0.7rem; padding: 1px 5px; border-radius: 3px;">🕶️ ${entry.goggles}</span>` : ''}
                    ${entry.crocs ? `<span style="background: rgba(51,153,255,0.1); color: #3399ff; font-size: 0.7rem; padding: 1px 5px; border-radius: 3px;">👞 ${entry.crocs}</span>` : ''}
                    ${entry.purses ? `<span style="background: rgba(255,102,178,0.1); color: #ff66b2; font-size: 0.7rem; padding: 1px 5px; border-radius: 3px;">👜 ${entry.purses}</span>` : ''}
                </div>
                <div style="font-weight: bold; color: ${dayTotal > 0 ? '#25D366' : 'var(--text-gray)'}; width: 60px; text-align: right;">
                    ${dayTotal} Sold
                </div>
            </div>
        `);

        // Public row clean minimalist layout without emojis
        publicHtmlRows.push(`
            <div style="background: rgba(255,255,255,0.02); padding: 6px 12px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.05); display: flex; justify-content: space-between; align-items: center;">
                <div style="color: white; font-weight: bold;">${displayDate}</div>
                <div style="font-weight: 800; color: ${dayTotal > 0 ? '#25D366' : 'var(--text-gray)'};">
                    ${dayTotal} ${dayTotal === 1 ? 'Product' : 'Products'} Sold
                </div>
            </div>
        `);
    });

    const listContainer = document.getElementById('analyticsWeeklyList');
    const totalUnitsEl = document.getElementById('rollingTotalUnits');
    if (listContainer) listContainer.innerHTML = adminHtmlRows.join('');
    if (totalUnitsEl) totalUnitsEl.textContent = `${totalUnitsSold} Units Sold`;

    // Update Public Footer Trust Proof Counter
    const footerCounter = document.getElementById('footerPublicSalesCounter');
    const footerCountText = document.getElementById('footerSalesCountText');
    const publicWeeklyList = document.getElementById('publicWeeklyList');

    if (footerCounter && footerCountText) {
        if (totalUnitsSold > 0) {
            footerCounter.style.display = 'block';
            footerCountText.textContent = totalUnitsSold;
            if (publicWeeklyList) {
                publicWeeklyList.innerHTML = publicHtmlRows.join('');
            }
        } else {
            footerCounter.style.display = 'none';
        }
    }
}

// --- Feature 4: Automatic Midnight Shift Engine ---
function scheduleMidnightRoll() {
    const now = new Date();
    // Calculate exact milliseconds remaining until 00:00:00 of the next day
    const msUntilMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0).getTime() - now.getTime();
    
    setTimeout(() => {
        try {
            renderRollingAnalytics();
            // Automatically update admin logging input date to new Today if empty
            const dateInput = document.getElementById('salesLogDate');
            if (dateInput) {
                dateInput.value = new Date().toISOString().split('T')[0];
                populateSalesLogForDate(dateInput.value);
            }
        } catch(e) { }
        // Set up continuous loop for subsequent midnights
        scheduleMidnightRoll();
    }, msUntilMidnight + 100); // 100ms safety padding to perfectly cross midnight boundary
}

// --- Feature 5: Dynamic Category Engine Functions ---
let initialFooterHtml = null;
function renderCategoriesUI() {
    const sideContainer = document.getElementById('customSideCategoriesContainer');
    if (sideContainer) {
        sideContainer.innerHTML = customCategories.map(c => {
            const act = currentCategory === c.id ? 'active' : '';
            return `<button class="cat-btn ${act}" data-cat="${c.id}" onclick="setCategory('${c.id}')" style="text-align: left; width: 100%; border-radius: 10px; padding: 12px 20px;">${c.name.toUpperCase()}</button>`;
        }).join('');
    }

    const footerList = document.getElementById('footerCollectionsList');
    if (footerList) {
        if (!initialFooterHtml) initialFooterHtml = footerList.innerHTML;
        footerList.innerHTML = initialFooterHtml + customCategories.map(c => `
            <li><a href="#" onclick="setCategory('${c.id}'); return false;">${c.name}</a></li>
        `).join('');
    }

    // Update Form Dropdowns
    const pCat = document.getElementById('pCat');
    const promoCat = document.getElementById('promoCat');

    if (pCat) {
        pCat.querySelectorAll('.custom-opt').forEach(opt => opt.remove());
        customCategories.forEach(c => {
            const opt = document.createElement('option');
            opt.className = 'custom-opt';
            opt.value = c.id;
            opt.textContent = c.name.toUpperCase();
            pCat.appendChild(opt);
        });
    }

    if (promoCat) {
        promoCat.querySelectorAll('.custom-opt').forEach(opt => opt.remove());
        customCategories.forEach(c => {
            const opt = document.createElement('option');
            opt.className = 'custom-opt';
            opt.value = c.id;
            opt.textContent = c.name.toUpperCase();
            opt.style.color = 'black';
            promoCat.appendChild(opt);
        });
    }

    // Update Admin Custom Categories List
    const adminList = document.getElementById('customCategoriesList');
    if (adminList) {
        if (customCategories.length === 0) {
            adminList.innerHTML = '<p style="color: var(--text-gray); font-size: 0.85rem;">No custom categories active.</p>';
        } else {
            adminList.innerHTML = customCategories.map(c => `
                <div style="background: rgba(255,255,255,0.03); padding: 10px 12px; border-radius: 6px; border: 1px solid var(--glass-border); display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <strong style="color: white; font-size: 0.95rem;">${c.name.toUpperCase()}</strong>
                        <div style="color: var(--gold-primary); font-size: 0.75rem;">ID: ${c.id}</div>
                    </div>
                    <button type="button" onclick="deleteCustomCategory('${c.id}')" style="background: transparent; color: #ff4d4d; border: 1px solid #ff4d4d; padding: 4px 10px; border-radius: 4px; font-size: 0.75rem; cursor: pointer; font-weight: bold;">Remove</button>
                </div>
            `).join('');
        }
    }

    updateAdminStats();
}

let isCategoriesListening = false;
async function loadCustomCategories() {
    try {
        if (isFirebaseAvailable && isFirebaseConfigured) {
            if (!isCategoriesListening) {
                isCategoriesListening = true;
                db.collection('categories').orderBy('timestamp', 'asc').onSnapshot(snapshot => {
                    customCategories = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    localStorage.setItem('customCategories', JSON.stringify(customCategories));
                    renderCategoriesUI();
                }, err => {
                    console.warn("Categories snapshot error:", err);
                });
            }
        } else {
            customCategories = JSON.parse(localStorage.getItem('customCategories') || '[]');
            renderCategoriesUI();
        }
    } catch(err) {
        console.warn("Error setting up custom categories listener:", err);
        customCategories = JSON.parse(localStorage.getItem('customCategories') || '[]');
        renderCategoriesUI();
    }
}

function setupCategoryManager() {
    const form = document.getElementById('createCategoryForm');
    if (!form) return;

    form.onsubmit = async (e) => {
        e.preventDefault();
        const btn = form.querySelector('button[type="submit"]');
        const origTxt = btn.textContent;
        btn.textContent = 'Creating Live...';
        btn.disabled = true;

        const name = document.getElementById('newCatName').value.trim();
        let idStr = document.getElementById('newCatId').value.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');

        if (!idStr || !name) {
            showNotification('Please provide valid category details.');
            btn.textContent = origTxt; btn.disabled = false;
            return;
        }

        const existingIds = ['all', 'watches', 'shoes', 'goggles', 'menclothes', 'ladyfootwear', 'ladywatch', 'formals_loafers', 'crocs', 'ladies_purse', 'belt_wallet'];
        if (existingIds.includes(idStr) || customCategories.some(c => c.id === idStr)) {
            showNotification('Category ID already exists! Please use a unique ID.');
            btn.textContent = origTxt; btn.disabled = false;
            return;
        }

        const newCat = {
            name: name,
            timestamp: new Date().toISOString()
        };

        try {
            if (isFirebaseAvailable && isFirebaseConfigured) {
                await db.collection('categories').doc(idStr).set(newCat);
            }
        } catch(err) { console.warn(err); }

        if (!customCategories.some(c => c.id === idStr)) {
            customCategories.push({ id: idStr, ...newCat });
            localStorage.setItem('customCategories', JSON.stringify(customCategories));
        }

        form.reset();
        renderCategoriesUI();
        showNotification('✨ Live Category broadcasted successfully!');

        btn.textContent = origTxt;
        btn.disabled = false;
    };
}

window.deleteCustomCategory = async function(id) {
    if (!confirm("Are you sure you want to remove this live category? Products uploaded under it will remain in database but won't be filtered directly.")) return;
    
    try {
        if (isFirebaseAvailable && isFirebaseConfigured) {
            await db.collection('categories').doc(id).delete();
        }
    } catch(err) { console.warn(err); }

    customCategories = customCategories.filter(c => c.id !== id);
    localStorage.setItem('customCategories', JSON.stringify(customCategories));
    
    if (currentCategory === id) {
        setCategory('all');
    } else {
        renderCategoriesUI();
    }
    showNotification('Category removed.');
};

// Intercept Admin Login success to initialize CRM tabs and load data
setTimeout(() => {
    applyBannerConfig();
    loadRollingAnalytics(); // load unconditionally for footer counter
    scheduleMidnightRoll(); // initiate automatic midnight counter layout adjustments
    setupAdminTabs();
    loadPromoCodes();
    loadCustomCategories();
    setupCategoryManager();
    if (isAdminLoggedIn) {
        loadInquiries();
    }
}, 500);

// Hook into existing adminBtn onclick to also setup/load inquiries if logged in
if (document.getElementById('adminBtn')) {
    document.getElementById('adminBtn').addEventListener('click', () => {
        setTimeout(() => {
            setupAdminTabs();
            loadPromoCodes();
            loadCustomCategories();
            setupCategoryManager();
            if (isAdminLoggedIn) {
                loadInquiries();
                loadRollingAnalytics();
            }
        }, 100);
    });
}

// Setup continuous real-time listeners for live updates to all connected customers
setTimeout(() => {
    try {
        if (isFirebaseAvailable && isFirebaseConfigured) {
            db.collection('settings').doc('banner').onSnapshot(doc => {
                if (doc.exists) {
                    applyBannerConfig(doc.data());
                }
            });
        }
    } catch(e) { }
}, 1000);

init();
