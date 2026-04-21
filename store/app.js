// AHAD'S TICK - Premium E-commerce Logic with IndexedDB
let products = [];
let cart = JSON.parse(localStorage.getItem('cart')) || [];
let currentCategory = 'all';
let isAdminLoggedIn = false;

// Database Logic
const DB_NAME = 'AhadsTickDB';
const STORE_NAME = 'products';

const openDB = () => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 1);
        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
        };
        request.onsuccess = (e) => resolve(e.target.result);
        request.onerror = (e) => reject('IndexedDB failed to open');
    });
};

const saveProductsToDB = async (productList) => {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    
    // Clear existing for a full sync or we could do selective updates
    // For simplicity with this small scale, we'll sync the whole array
    await new Promise((resolve) => {
        const clearReq = store.clear();
        clearReq.onsuccess = resolve;
    });

    for (const p of productList) {
        store.put(p);
    }
    return new Promise((resolve) => tx.oncomplete = resolve);
};

const loadProductsFromDB = async () => {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    return new Promise((resolve) => {
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result);
    });
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
    // Migrate from localStorage if first time
    const localProds = JSON.parse(localStorage.getItem('products'));
    if (localProds && localProds.length > 0) {
        products = localProds;
        await saveProductsToDB(products);
        localStorage.removeItem('products'); // Cleanup
    } else {
        products = await loadProductsFromDB();
    }

    // Default products if empty
    if (products.length === 0) {
        products = [
            {
                id: 1,
                name: "Rolex Cosmograph Daytona",
                price: 249000,
                category: "watches",
                pinned: false,
                video: "https://v1.pinimg.com/videos/mc/720p/73/45/63/734563a5f252615d9796e95ce439a349.mp4",
                images: ["https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=800", "https://images.unsplash.com/photo-1547996160-81dfa63595dd?w=800"]
            },
            {
                id: 2,
                name: "Air Jordan 1 Retro",
                price: 18500,
                category: "shoes",
                pinned: false,
                video: "https://v1.pinimg.com/videos/mc/720p/da/67/03/da67035f8e65842c55b76c968f921444.mp4",
                images: ["https://images.unsplash.com/photo-1552346154-21d32810aba3?w=800"]
            }
        ];
        await saveProductsToDB(products);
    }

    renderProducts();
    renderCart();
    setupEventListeners();
    setupScrollReveal();
    checkAdminAccess();
}

function checkAdminAccess() {
    if (localStorage.getItem('hide_admin_fab') === 'false') {
        adminBtn.style.display = 'flex';
    }

    let logoClicks = 0;
    const logoEl = document.getElementById('siteLogo');
    logoEl.onclick = (e) => {
        logoClicks++;
        if (logoClicks >= 5) {
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
                showNotification('Admin Mode Enabled.');
            }
            logoClicks = 0;
        }
    };
}

function renderProducts() {
    const sortedProducts = [...products].sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        return b.id - a.id;
    });

    const filtered = currentCategory === 'all' ? sortedProducts : sortedProducts.filter(p => p.category === currentCategory);
    
    if (filtered.length === 0) {
        productFeed.innerHTML = `<div class="loader">Our vault is currently empty for this category.</div>`;
        return;
    }

    productFeed.innerHTML = filtered.map(p => `
        <div class="product-item ${p.pinned ? 'is-pinned' : ''}" id="p-${p.id}" data-aos="fade-up">
            ${(p.pinned && isAdminLoggedIn) ? '<div class="pin-badge">📌 PINNED</div>' : ''}
            
            <div class="product-video-container">
                <video class="product-video" autoplay loop muted playsinline>
                    <source src="${p.video}" type="video/mp4">
                </video>
                <div class="video-overlay"></div>
            </div>
            
            <div class="product-images">
                ${p.images.map(img => `<img src="${img}" class="product-img" loading="lazy">`).join('')}
            </div>

            <button class="view-pics-btn" onclick="togglePics(${p.id})">
                <span class="icon">🖼️</span>
            </button>

            ${isAdminLoggedIn ? `
                <div class="admin-controls">
                    <button class="control-btn pin-btn" onclick="togglePin(${p.id})" title="${p.pinned ? 'Unpin' : 'Pin'} Product">
                        ${p.pinned ? '📍' : '📌'}
                    </button>
                    <button class="control-btn delete-btn" onclick="deleteProduct(${p.id})" title="Delete Product">
                        🗑️
                    </button>
                </div>
            ` : ''}

            <div class="product-info">
                <h2 class="product-name">${p.name}</h2>
                <p class="product-price">₹${p.price.toLocaleString()}</p>
                <p class="product-desc">${p.description || ''}</p>
                <div class="actions">
                    <button class="btn btn-buy" onclick="openOrderModal(${p.id})">BUY NOW</button>
                    ${cart.some(item => item.id == p.id) 
                        ? `<button class="btn btn-cart" style="opacity: 0.7; border-color: var(--gold-primary);" disabled>IN BAG</button>`
                        : `<button class="btn btn-cart" onclick="addToCart(${p.id})">ADD TO BAG</button>`
                    }
                </div>
            </div>
        </div>
    `).join('');
    
    setupScrollReveal();
}

async function togglePin(id) {
    const product = products.find(p => p.id === id);
    if (product) {
        product.pinned = !product.pinned;
        await saveProductsToDB(products);
        renderProducts();
        showNotification(product.pinned ? 'Product pinned to top.' : 'Product unpinned.');
    }
}

async function deleteProduct(id) {
    if (confirm('Are you sure you want to remove this masterpiece from the gallery?')) {
        products = products.filter(p => p.id !== id);
        await saveProductsToDB(products);
        renderProducts();
        showNotification('Product removed from gallery.');
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
                    video.play().catch(() => {}); // Catch play-interruption errors
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
        item.style.transition = "all 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)";
        observer.observe(item);
    });
}

function togglePics(id) {
    const el = document.getElementById(`p-${id}`);
    const btn = el.querySelector('.view-pics-btn .icon');
    el.classList.toggle('show-pics');
    btn.textContent = el.classList.contains('show-pics') ? '📹' : '🖼️';
}

function addToCart(id) {
    const p = products.find(prod => prod.id == id); // Use == for robust matching
    if (!p) return;

    // Visual feedback on the button itself
    const btn = event?.target;
    if (btn && btn.classList.contains('btn-cart')) {
        btn.textContent = 'ADDING...';
        btn.style.background = 'var(--gold-dark)';
    }

    const existing = cart.find(item => item.id == id);
    
    if (existing) {
        renderProducts(); // Refresh buttons
        showNotification(`${p.name} is already in your bag.`);
        return;
    }

    cart.push(p);
    saveCart();
    renderCart();
    renderProducts(); // Update button labels to 'IN BAG'
    showNotification(`${p.name} added to your bag.`);
}

function removeFromCart(id) {
    cart = cart.filter(item => item.id !== id);
    saveCart();
    renderCart();
    renderProducts(); // Update button states
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
    cartItems.innerHTML = cart.map(item => {
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

    loginForm.onsubmit = (e) => {
        e.preventDefault();
        const email = document.getElementById('adminEmail').value;
        const pass = document.getElementById('adminPass').value;

        if (email === 'akinggamer4854@gmail.com' && pass === 'ahad@3012') {
            isAdminLoggedIn = true;
            loginView.style.display = "none";
            productView.style.display = "block";
            renderProducts();
            showNotification('Welcome back, Admin.');
        } else {
            showNotification('Invalid Credentials.');
            loginForm.reset();
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
            const itemDetails = cart.map((item, index) => `${index + 1}. ${item.name} (₹${item.price.toLocaleString()})`).join('\n');
            const total = cart.reduce((sum, item) => sum + item.price, 0);
            productSection = `*ITEMS IN BAG:*\n${itemDetails}\n\n*TOTAL VALUE:* ₹${total.toLocaleString()}`;
        } else {
            orderTitle = 'NEW SINGLE ORDER';
            const p = products.find(prod => prod.id == pid);
            productSection = `*PRODUCT DETAILS:*\n📦 Name: ${p.name}\n💰 Price: ₹${p.price.toLocaleString()}`;
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
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    };

    productForm.onsubmit = async (e) => {
        e.preventDefault();
        
        const uploadBtn = document.getElementById('uploadBtn');
        const originalText = uploadBtn.textContent;
        uploadBtn.textContent = 'Storing Masterpiece (Large File)...';
        uploadBtn.disabled = true;

        try {
            const videoFile = document.getElementById('pVideoFile').files[0];
            const imageFiles = Array.from(document.getElementById('pImagesFile').files);

            // Calculate total size in MB
            let totalBytes = videoFile.size;
            imageFiles.forEach(f => totalBytes += f.size);
            const totalMB = totalBytes / (1024 * 1024);

            if (totalMB > 20) {
                showNotification(`Files too large (${totalMB.toFixed(1)}MB)! Max limit is 20MB.`);
                uploadBtn.textContent = originalText;
                uploadBtn.disabled = false;
                return;
            }

            // Read video and images as DataURLs
            const videoDataUrl = await readFile(videoFile);
            const imagesDataUrls = await Promise.all(imageFiles.map(file => readFile(file)));

            const newProd = {
                id: Date.now(),
                name: document.getElementById('pName').value,
                price: Number(document.getElementById('pPrice').value),
                description: document.getElementById('pDesc').value,
                category: document.getElementById('pCat').value,
                video: videoDataUrl,
                images: imagesDataUrls,
                pinned: false
            };

            products.unshift(newProd);
            await saveProductsToDB(products);
            renderProducts();
            
            adminModal.style.display = "none";
            productForm.reset();
            showNotification('Masterpiece saved to your browser database.');
        } catch (err) {
            console.error(err);
            showNotification('Critical Error: Browser storage full or failed.');
        } finally {
            uploadBtn.textContent = originalText;
            uploadBtn.disabled = false;
        }
    };
}
init();
