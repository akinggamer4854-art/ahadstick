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
👔 For Men: Latest Watches, Stylish Goggles, Trendy Clothes aur Shoes ka dhamakedaar collection.
👗 For Ladies: Premium Watches aur har tarah ke stylish Footwear/Shoes jo aapke har look ko perfect banaye.
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
            const query = e.target.value.toLowerCase();
            const filtered = products.filter(p =>
                p.name.toLowerCase().includes(query) ||
                (p.description && p.description.toLowerCase().includes(query)) ||
                p.category.toLowerCase().includes(query)
            );
            renderFilteredProducts(filtered);
        });
    }
}

function renderFilteredProducts(filtered) {
    const productFeed = document.getElementById('productFeed');
    if (filtered.length === 0) {
        productFeed.innerHTML = `<div class="loader">No masterpieces found matching your search.</div>`;
        return;
    }

    const html = filtered.map(p => {
        let seed = 0;
        for (let i = 0; i < String(p.id).length; i++) {
            seed += String(p.id).charCodeAt(i);
        }
        const discountPercent = 20 + (seed % 21);
        const mrp = Math.round(p.price / (1 - (discountPercent / 100)));

        return `
        <div class="product-item ${p.pinned ? 'is-pinned' : ''}" id="p-${p.id}" data-aos="fade-up" data-slide="0">
            ${(p.pinned && isAdminLoggedIn) ? '<div class="pin-badge">📌 PINNED</div>' : ''}
            
            <div class="carousel-container">
                <!-- Slide 0: Video -->
                <div class="media-slide active" data-index="0">
                    <video class="product-video" loop muted playsinline preload="none">
                        <source src="${p.video}" type="video/mp4">
                    </video>
                </div>
                
                <!-- Other Slides: Images -->
                ${(p.images || []).map((img, idx) => `
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
                    <button class="btn btn-buy" onclick="openOrderModal('${p.id}')">BUY NOW</button>
                    ${cart.includes(String(p.id))
                ? `<button class="btn btn-cart" style="opacity: 0.7; border-color: var(--gold-primary);" disabled>IN BAG</button>`
                : `<button class="btn btn-cart" onclick="addToCart('${p.id}')">ADD TO BAG</button>`
            }
                </div>
            </div>
        </div>`;
    }).join('');

    productFeed.innerHTML = html;
    setupScrollReveal();
}

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
    displayedCount = 20; 
    // Force a fresh render because user explicitly clicked a category
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
        crocs: 0
    };

    products.forEach(p => {
        if (counts[p.category] !== undefined) {
            counts[p.category]++;
        }
    });

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
            <div class="admin-stat-item total"><span>TOTAL PRODUCTS</span> <span>${counts.total}</span></div>
        </div>
    `;
    container.style.display = 'block';
}

async function renderProducts(append = false) {
    console.log("Render Triggered - Append:", append, "Products Count:", products.length);
    updateAdminStats();
    if (isRendering && !append) return;
    isRendering = true;

    // 1. Basic Filtering (Category & Price)
    let filtered = products.filter(p => {
        const matchesCategory = (currentCategory === 'all' || p.category === currentCategory);
        let matchesPrice = true;
        if (currentPriceFilter !== 'all') {
            if (currentPriceFilter === 'above_4999') {
                matchesPrice = p.price > 4999;
            } else {
                matchesPrice = p.price <= parseInt(currentPriceFilter);
            }
        }
        return matchesCategory && matchesPrice;
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

        const slides = [p.video, ...p.images];
        return `
        <div class="product-item ${p.pinned ? 'is-pinned' : ''} ${p.isShared ? 'is-shared' : ''}" id="p-${p.id}" data-aos="fade-up" data-slide="0">
            ${p.isShared ? '<div class="shared-badge">✨ SHARED MASTERPIECE</div>' : ''}
            ${(p.pinned && isAdminLoggedIn && !p.isShared) ? '<div class="pin-badge">📌 PINNED</div>' : ''}
            
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
        const modals = [zoomModal, buyModal, cartModal, wishlistModal, adminModal, editModal, document.getElementById('authModal')];
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

            if (isFirebaseAvailable && isFirebaseConfigured) {
                await db.collection('products').doc(id).update({
                    name: newName,
                    price: newPrice,
                    description: newDesc
                });
            } else {
                const product = products.find(p => String(p.id) === String(id));
                if (product) {
                    product.name = newName;
                    product.price = newPrice;
                    product.description = newDesc;
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
            `${productSection}\n\n` +
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

init();
