/**
 * TuneTagZ Unified Cart System
 * Persistent multi-product shopping cart for all keychains & figures.
 */
(function() {
  'use strict';

  const STORAGE_KEY = 'tunetagz_cart_v1';

  // Product metadata helper
  const PRODUCT_META = {
    'spt001': { name: 'Spotify Code Tag (Pooled Selling)', price: 249, poster: 'POSTER 1.png', defaultFinish: 'Matte Black + Silk Gold PLA' },
    'mtl001': { name: 'Spotify Metal Tag (Available Now)', price: 169, poster: 'POSTER 3.jpg', defaultFinish: '316L Chrome Steel + Obsidian' },
    'nfc001': { name: 'Vinyl Record NFC Tag', price: 199, poster: 'POSTER 4.jpg', defaultFinish: 'Grooved Vinyl PLA (Pure NFC)' },
    'duo001': { name: 'Spotify Duo Set', price: 349, poster: 'POSTER 5.jpg', defaultFinish: 'Dual Matte Black + Silk Gold PLA' },
    'rky001': { name: 'Rocky Keychain', price: 300, poster: 'POSTER 2.png', defaultFinish: 'Matte Black Maze' },
    'bundle': { name: 'Duet Bundle', price: 899, poster: 'POSTER 1.png', defaultFinish: 'Matte Black + Silk Gold PLA' }
  };

  const CartStore = {
    getCart() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
      } catch (e) {
        console.error('Error reading cart from localStorage', e);
        return [];
      }
    },

    saveCart(items) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
        this.dispatchUpdate();
      } catch (e) {
        console.error('Error saving cart to localStorage', e);
      }
    },

    dispatchUpdate() {
      const items = this.getCart();
      const totals = this.getTotals(items);
      const event = new CustomEvent('tunetagz:cart-updated', { detail: { items, totals } });
      window.dispatchEvent(event);
      updateAllBadges(totals.totalQty);
      renderCartDrawer(items, totals);
    },

    getTotals(items = this.getCart()) {
      let totalQty = 0;
      let grandTotal = 0;
      let giftBoxCount = 0;
      let nfcCount = 0;
      let duoSeparateCount = 0;
      let backCustomTotal = 0;

      items.forEach(item => {
        const qty = parseInt(item.quantity, 10) || 1;
        totalQty += qty;
        const itemPrice = parseInt(item.unitPrice, 10) || 0;
        const itemGift = item.hasGiftBox ? (99 * qty) : 0;
        const itemNfc = item.hasNfc ? (80 * qty) : 0;
        const itemSeparate = item.isDuoSeparate ? (99 * qty) : 0;
        let itemBackPrice = 0;
        if (item.productKey === 'mtl001') {
          if (item.backCustomization === 'image') {
            itemBackPrice = 99 * qty;
          } else if (item.backCustomization === 'text') {
            itemBackPrice = 50 * qty;
          } else if (item.backPrice) {
            itemBackPrice = (parseInt(item.backPrice, 10) || 0) * qty;
          }
        }

        if (item.hasGiftBox) giftBoxCount += qty;
        if (item.hasNfc) nfcCount += qty;
        if (item.isDuoSeparate) duoSeparateCount += qty;
        backCustomTotal += itemBackPrice;
        grandTotal += (itemPrice * qty) + itemGift + itemNfc + itemSeparate + itemBackPrice;
      });

      return {
        itemCount: items.length,
        totalQty,
        grandTotal,
        giftBoxCount,
        nfcCount,
        duoSeparateCount,
        backCustomTotal
      };
    },

    addItem(itemData) {
      // Guard against Out of Stock & Coming Soon models
      if (itemData.productKey === 'nfc001' || itemData.productKey === 'duo001' || itemData.productKey === 'rky001') {
        const msg = itemData.productKey === 'rky001' ? 'Rocky Keychain is currently Out of Stock.' : 'This model is Coming Soon.';
        if (typeof showToast === 'function') {
          showToast(`${msg} Only Spotify Metal Tag is in stock, and Spotify Code Tag is open for Pooled Selling.`);
        }
        return false;
      }

      const items = this.getCart();
      // Match existing item if product key, duo separate mode, songs, engravings, text sizes, finish, back customization, nfc and gift box are identical
      const existingIdx = items.findIndex(i =>
        i.productKey === itemData.productKey &&
        Boolean(i.isDuoSeparate) === Boolean(itemData.isDuoSeparate) &&
        (i.song || '') === (itemData.song || '') &&
        (i.engrave || '') === (itemData.engrave || '') &&
        (i.textSize || '18px') === (itemData.textSize || '18px') &&
        (i.song2 || '') === (itemData.song2 || '') &&
        (i.engrave2 || '') === (itemData.engrave2 || '') &&
        (i.textSize2 || '18px') === (itemData.textSize2 || '18px') &&
        (i.finish || '') === (itemData.finish || '') &&
        (i.backCustomization || 'none') === (itemData.backCustomization || 'none') &&
        (i.uploadedBackImgName || '') === (itemData.uploadedBackImgName || '') &&
        Boolean(i.hasNfc) === Boolean(itemData.hasNfc) &&
        Boolean(i.hasGiftBox) === Boolean(itemData.hasGiftBox)
      );

      if (existingIdx > -1) {
        items[existingIdx].quantity += (itemData.quantity || 1);
      } else {
        const meta = PRODUCT_META[itemData.productKey] || { name: itemData.name || 'Custom Keychain', price: itemData.unitPrice || 249, poster: 'POSTER 1.png' };
        const newItem = {
          id: 'item_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
          productKey: itemData.productKey,
          name: itemData.name || meta.name,
          poster: itemData.poster || meta.poster,
          unitPrice: itemData.unitPrice || meta.price,
          quantity: itemData.quantity || 1,
          isDuoSeparate: Boolean(itemData.isDuoSeparate),
          song: itemData.song || '',
          artist: itemData.artist || '',
          spotifyUrl: itemData.spotifyUrl || '',
          engrave: itemData.engrave || '',
          textSize: itemData.textSize || '18px',
          song2: itemData.song2 || '',
          artist2: itemData.artist2 || '',
          spotifyUrl2: itemData.spotifyUrl2 || '',
          engrave2: itemData.engrave2 || '',
          textSize2: itemData.textSize2 || '18px',
          finish: itemData.finish || meta.defaultFinish,
          backCustomization: itemData.backCustomization || 'none',
          backPrice: itemData.backPrice !== undefined ? itemData.backPrice : (itemData.backCustomization === 'image' ? 99 : (itemData.backCustomization === 'text' ? 50 : 0)),
          uploadedBackImg: itemData.uploadedBackImg || null,
          uploadedBackImgName: itemData.uploadedBackImgName || '',
          hasNfc: Boolean(itemData.hasNfc),
          hasGiftBox: Boolean(itemData.hasGiftBox)
        };
        items.push(newItem);
      }

      this.saveCart(items);
      showCartToast(`Added ${itemData.name || 'Keychain'} to Cart!`);
      return items;
    },

    updateQty(itemId, delta) {
      const items = this.getCart();
      const idx = items.findIndex(i => i.id === itemId);
      if (idx > -1) {
        items[idx].quantity += delta;
        if (items[idx].quantity <= 0) {
          items.splice(idx, 1);
        }
        this.saveCart(items);
      }
    },

    removeItem(itemId) {
      const items = this.getCart().filter(i => i.id !== itemId);
      this.saveCart(items);
    },

    clearCart() {
      this.saveCart([]);
    }
  };

  // Expose CartStore globally
  window.TuneTagzCart = CartStore;
  window.TuneTagZCart = CartStore;

  /* ── UI INJECTION: Cart Drawer, Styles, and Trigger Badges ── */
  function injectCartStyles() {
    if (document.getElementById('tunetagz-cart-styles')) return;
    const style = document.createElement('style');
    style.id = 'tunetagz-cart-styles';
    style.textContent = `
      /* Cart Drawer Styles */
      .tz-cart-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.75);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        z-index: 99999;
        opacity: 0;
        visibility: hidden;
        transition: opacity 0.3s cubic-bezier(0.16,1,0.3,1), visibility 0.3s;
      }
      .tz-cart-overlay.open {
        opacity: 1;
        visibility: visible;
      }
      .tz-cart-drawer {
        position: fixed;
        top: 0;
        right: 0;
        bottom: 0;
        width: 100%;
        max-width: 440px;
        background: #0f1015;
        border-left: 1px solid rgba(255, 255, 255, 0.08);
        box-shadow: -15px 0 50px rgba(0, 0, 0, 0.85), 0 0 40px rgba(30, 215, 96, 0.1);
        z-index: 100000;
        display: flex;
        flex-direction: column;
        transform: translateX(100%);
        transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1);
        color: #f4f4f7;
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        -webkit-font-smoothing: antialiased;
      }
      .tz-cart-overlay.open .tz-cart-drawer {
        transform: translateX(0);
      }
      .tz-cart-header {
        padding: 22px 24px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        display: flex;
        align-items: center;
        justify-content: space-between;
        background: #12131a;
      }
      .tz-cart-title {
        font-family: 'Inter', sans-serif;
        font-size: 1.25rem;
        font-weight: 700;
        letter-spacing: -0.02em;
        color: #f4f4f7;
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .tz-cart-title .tz-badge {
        font-family: 'Roboto Mono', 'SF Mono', monospace;
        font-size: 0.72rem;
        background: rgba(30, 215, 96, 0.12);
        color: #1ed760;
        border: 1px solid rgba(30, 215, 96, 0.3);
        padding: 2px 8px;
        border-radius: 999px;
      }
      .tz-cart-close {
        background: transparent;
        border: 1px solid rgba(255, 255, 255, 0.12);
        color: #f4f4f7;
        width: 34px;
        height: 34px;
        border-radius: 50%;
        display: grid;
        place-items: center;
        cursor: pointer;
        font-size: 1.1rem;
        transition: all 0.2s;
      }
      .tz-cart-close:hover {
        background: rgba(255, 255, 255, 0.08);
        border-color: #1ed760;
        color: #1ed760;
      }
      .tz-cart-body {
        flex: 1;
        overflow-y: auto;
        padding: 20px 24px;
      }
      .tz-cart-empty {
        text-align: center;
        padding: 60px 10px;
        color: #8b8f9e;
      }
      .tz-cart-empty-icon {
        font-size: 3rem;
        margin-bottom: 16px;
        opacity: 0.6;
      }
      .tz-cart-empty h4 {
        font-family: 'Inter', sans-serif;
        font-size: 1.25rem;
        font-weight: 700;
        letter-spacing: -0.02em;
        color: #f4f4f7;
        margin-bottom: 8px;
      }
      .tz-cart-empty p {
        font-size: 0.85rem;
        line-height: 1.5;
        margin-bottom: 24px;
      }
      .tz-cart-empty .tz-btn-shop {
        display: inline-block;
        background: #1ed760;
        color: #090a0f;
        font-family: 'Inter', sans-serif;
        font-weight: 700;
        font-size: 0.82rem;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        padding: 12px 24px;
        border-radius: 8px;
        text-decoration: none;
        transition: transform 0.2s, background 0.2s;
      }
      .tz-cart-empty .tz-btn-shop:hover {
        background: #22e066;
        transform: translateY(-2px);
      }
      .tz-cart-item {
        background: #15161e;
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 8px;
        padding: 16px;
        margin-bottom: 14px;
        display: flex;
        gap: 14px;
        position: relative;
        transition: border-color 0.2s;
      }
      .tz-cart-item:hover {
        border-color: rgba(30, 215, 96, 0.3);
      }
      .tz-item-thumb {
        width: 68px;
        height: 68px;
        border-radius: 6px;
        background: #090a0f;
        border: 1px solid rgba(255, 255, 255, 0.08);
        object-fit: cover;
        flex-shrink: 0;
      }
      .tz-item-details {
        flex: 1;
        min-width: 0;
      }
      .tz-item-name {
        font-family: 'Inter', sans-serif;
        font-size: 0.96rem;
        font-weight: 700;
        color: #f4f4f7;
        letter-spacing: -0.01em;
        line-height: 1.25;
        margin-bottom: 4px;
      }
      .tz-item-meta {
        font-size: 0.74rem;
        color: #8b8f9e;
        line-height: 1.45;
        margin-bottom: 8px;
        word-break: break-word;
      }
      .tz-item-meta strong {
        color: #1ed760;
        font-weight: 600;
      }
      .tz-item-price-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-top: 6px;
      }
      .tz-item-price {
        font-family: 'Roboto Mono', 'SF Mono', monospace;
        font-size: 0.95rem;
        font-weight: 600;
        color: #1ed760;
      }
      .tz-item-qty {
        display: flex;
        align-items: center;
        gap: 8px;
        background: #0b0c10;
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 6px;
        padding: 3px 8px;
      }
      .tz-qty-btn {
        background: none;
        border: none;
        color: #f4f4f7;
        cursor: pointer;
        font-size: 0.85rem;
        padding: 2px 6px;
        line-height: 1;
        transition: color 0.15s;
      }
      .tz-qty-btn:hover {
        color: #1ed760;
      }
      .tz-qty-num {
        font-family: 'Roboto Mono', 'SF Mono', monospace;
        font-size: 0.78rem;
        min-width: 16px;
        text-align: center;
      }
      .tz-item-remove {
        background: none;
        border: none;
        color: rgba(255, 255, 255, 0.35);
        cursor: pointer;
        padding: 4px;
        font-size: 0.9rem;
        transition: color 0.2s;
        line-height: 1;
      }
      .tz-item-remove:hover {
        color: #f43f5e;
      }
      .tz-cart-footer {
        padding: 20px 24px 26px;
        border-top: 1px solid rgba(255, 255, 255, 0.08);
        background: #12131a;
      }
      .tz-footer-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 0.82rem;
        color: #8b8f9e;
        margin-bottom: 8px;
      }
      .tz-footer-row.total {
        font-size: 1.15rem;
        font-weight: 700;
        color: #f4f4f7;
        margin-top: 12px;
        padding-top: 10px;
        border-top: 1px solid rgba(255, 255, 255, 0.08);
      }
      .tz-footer-row.total .tz-grand-total {
        font-family: 'Roboto Mono', 'SF Mono', monospace;
        color: #1ed760;
        font-size: 1.35rem;
        font-weight: 700;
      }
      .tz-cart-actions {
        display: flex;
        flex-direction: column;
        gap: 10px;
        margin-top: 18px;
      }
      .tz-btn-checkout {
        background: #1ed760;
        color: #090a0f;
        font-family: 'Inter', sans-serif;
        font-weight: 700;
        font-size: 0.88rem;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        border: none;
        padding: 15px;
        border-radius: 8px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        transition: transform 0.2s, box-shadow 0.2s, background 0.2s;
        box-shadow: 0 4px 18px rgba(30, 215, 96, 0.25);
        text-decoration: none;
      }
      .tz-btn-checkout:hover {
        background: #22e066;
        transform: translateY(-2px);
        box-shadow: 0 8px 24px rgba(30, 215, 96, 0.38);
      }
      .tz-btn-continue {
        background: transparent;
        color: #8b8f9e;
        font-family: 'Inter', sans-serif;
        font-size: 0.78rem;
        font-weight: 500;
        letter-spacing: 0.04em;
        border: 1px solid rgba(255, 255, 255, 0.12);
        padding: 11px;
        border-radius: 8px;
        cursor: pointer;
        text-align: center;
        transition: all 0.2s;
      }
      .tz-btn-continue:hover {
        border-color: rgba(30, 215, 96, 0.4);
        color: #f4f4f7;
      }
      /* Floating Cart Button */
      .tz-floating-cart-btn {
        position: fixed;
        bottom: 28px;
        right: 28px;
        background: #12131a;
        border: 1px solid rgba(30, 215, 96, 0.35);
        color: #f4f4f7;
        padding: 12px 18px;
        border-radius: 50px;
        display: flex;
        align-items: center;
        gap: 10px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.8), 0 0 20px rgba(30, 215, 96, 0.2);
        cursor: pointer;
        z-index: 999;
        font-family: 'Inter', sans-serif;
        font-size: 0.82rem;
        font-weight: 600;
        letter-spacing: 0.02em;
        transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.25s, border-color 0.2s;
      }
      .tz-floating-cart-btn:hover {
        transform: translateY(-3px) scale(1.02);
        border-color: #1ed760;
        box-shadow: 0 16px 40px rgba(0, 0, 0, 0.9), 0 0 30px rgba(30, 215, 96, 0.35);
      }
      .tz-floating-badge {
        background: #1ed760;
        color: #090a0f;
        font-family: 'Roboto Mono', 'SF Mono', monospace;
        font-weight: 700;
        font-size: 0.72rem;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        display: grid;
        place-items: center;
      }
      /* Nav Cart Button */
      .nav-cart-btn, .header-cart-btn {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        background: rgba(30, 215, 96, 0.1);
        border: 1px solid rgba(30, 215, 96, 0.3);
        color: #f4f4f7;
        padding: 8px 16px;
        border-radius: 8px;
        font-family: 'Inter', sans-serif;
        font-size: 0.78rem;
        font-weight: 600;
        letter-spacing: 0.02em;
        cursor: pointer;
        transition: all 0.2s;
        text-decoration: none;
      }
      .nav-cart-btn:hover, .header-cart-btn:hover {
        background: rgba(30, 215, 96, 0.2);
        border-color: #1ed760;
        color: #1ed760;
      }
      .cart-count-badge {
        background: #1ed760;
        color: #090a0f;
        font-family: 'Roboto Mono', 'SF Mono', monospace;
        font-weight: 700;
        font-size: 0.68rem;
        padding: 1px 6px;
        border-radius: 10px;
      }
      /* Toast */
      .tz-toast {
        position: fixed;
        bottom: 30px;
        left: 50%;
        transform: translateX(-50%) translateY(100px);
        background: #15161e;
        border: 1px solid #1ed760;
        box-shadow: 0 10px 30px rgba(0,0,0,0.8), 0 0 25px rgba(30, 215, 96, 0.25);
        color: #f4f4f7;
        padding: 12px 22px;
        border-radius: 8px;
        font-family: 'Inter', sans-serif;
        font-size: 0.82rem;
        font-weight: 500;
        z-index: 100001;
        transition: transform 0.3s cubic-bezier(0.16,1,0.3,1);
        pointer-events: none;
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .tz-toast.show {
        transform: translateX(-50%) translateY(0);
      }
      @media (max-width: 600px) {
        .tz-floating-cart-btn {
          bottom: 74px;
          right: 16px;
          padding: 10px 14px;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function injectCartDrawerDOM() {
    if (document.getElementById('tzCartOverlay')) return;

    const overlay = document.createElement('div');
    overlay.className = 'tz-cart-overlay';
    overlay.id = 'tzCartOverlay';
    overlay.innerHTML = `
      <div class="tz-cart-drawer" role="dialog" aria-modal="true" aria-label="Shopping Cart">
        <div class="tz-cart-header">
          <div class="tz-cart-title">
            <span>Your Cart</span>
            <span class="tz-badge" id="tzCartHeaderBadge">0</span>
          </div>
          <button type="button" class="tz-cart-close" id="tzCartCloseBtn" aria-label="Close cart">✕</button>
        </div>
        <div class="tz-cart-body" id="tzCartBody">
          <!-- Items dynamically rendered here -->
        </div>
        <div class="tz-cart-footer" id="tzCartFooter" style="display: none;">
          <div class="tz-footer-row">
            <span>Subtotal</span>
            <span id="tzFooterSubtotal">₹0</span>
          </div>
          <div class="tz-footer-row" id="tzFooterSeparateRow" style="display:none;">
            <span>Separate Duo Customization</span>
            <span id="tzFooterSeparate">₹0</span>
          </div>
          <div class="tz-footer-row" id="tzFooterNfcRow" style="display:none;">
            <span>Smart NFC Feature</span>
            <span id="tzFooterNfc">₹0</span>
          </div>
          <div class="tz-footer-row" id="tzFooterBackEngraveRow" style="display:none;">
            <span>Back Engraving Customization</span>
            <span id="tzFooterBackEngrave">₹0</span>
          </div>
          <div class="tz-footer-row" id="tzFooterGiftBoxRow" style="display:none;">
            <span>Luxury Gift Packaging</span>
            <span id="tzFooterGiftBox">₹0</span>
          </div>
          <div class="tz-footer-row">
            <span>Shipping Across India</span>
            <span style="color:#22c55e; font-weight:600;">FREE</span>
          </div>
          <div class="tz-footer-row total">
            <span>Total:</span>
            <span class="tz-grand-total" id="tzFooterTotal">₹0</span>
          </div>
          <div class="tz-cart-actions">
            <button type="button" class="tz-btn-checkout" id="tzBtnProceedCheckout">
              Proceed to Checkout
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </button>
            <button type="button" class="tz-btn-continue" id="tzBtnContinueShopping">
              + Add Another Keychain
            </button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    // Toast
    const toast = document.createElement('div');
    toast.className = 'tz-toast';
    toast.id = 'tzCartToast';
    document.body.appendChild(toast);

    // Floating Cart Trigger
    const floatingBtn = document.createElement('button');
    floatingBtn.type = 'button';
    floatingBtn.className = 'tz-floating-cart-btn';
    floatingBtn.id = 'tzFloatingCartBtn';
    floatingBtn.setAttribute('aria-label', 'Open shopping cart');
    floatingBtn.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18M16 10a4 4 0 01-8 0"/></svg>
      <span>Cart</span>
      <span class="tz-floating-badge" id="tzFloatingBadge">0</span>
    `;
    document.body.appendChild(floatingBtn);

    // Event listeners for open / close
    document.getElementById('tzCartCloseBtn').addEventListener('click', closeCartDrawer);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeCartDrawer();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && overlay.classList.contains('open')) closeCartDrawer();
    });
    floatingBtn.addEventListener('click', openCartDrawer);

    // Proceed to checkout button
    document.getElementById('tzBtnProceedCheckout').addEventListener('click', () => {
      closeCartDrawer();
      if (window.location.pathname.endsWith('order.html')) {
        const shippingForm = document.getElementById('shippingForm') || document.querySelector('.summary-card');
        if (shippingForm) {
          shippingForm.scrollIntoView({ behavior: 'smooth' });
          const firstInput = shippingForm.querySelector('input');
          if (firstInput) firstInput.focus();
        }
      } else {
        window.location.href = 'order.html#shippingForm';
      }
    });

    // Continue shopping button
    document.getElementById('tzBtnContinueShopping').addEventListener('click', () => {
      closeCartDrawer();
      if (window.location.pathname.endsWith('order.html')) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        const prodSection = document.getElementById('products');
        if (prodSection) prodSection.scrollIntoView({ behavior: 'smooth' });
      }
    });
  }

  function openCartDrawer() {
    const overlay = document.getElementById('tzCartOverlay');
    if (overlay) {
      renderCartDrawer();
      overlay.classList.add('open');
      document.body.style.overflow = 'hidden';
    }
  }

  function closeCartDrawer() {
    const overlay = document.getElementById('tzCartOverlay');
    if (overlay) {
      overlay.classList.remove('open');
      document.body.style.overflow = '';
    }
  }

  function showCartToast(msg) {
    const toast = document.getElementById('tzCartToast');
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
  }

  function updateAllBadges(qty) {
    const badges = document.querySelectorAll('.cart-count-badge, #tzCartHeaderBadge, #tzFloatingBadge');
    badges.forEach(b => {
      b.textContent = qty;
    });

    const floatingBtn = document.getElementById('tzFloatingCartBtn');
    if (floatingBtn) {
      floatingBtn.style.display = qty > 0 ? 'flex' : 'none';
    }
  }

  function renderCartDrawer(items = CartStore.getCart(), totals = CartStore.getTotals(items)) {
    const body = document.getElementById('tzCartBody');
    const footer = document.getElementById('tzCartFooter');
    const badge = document.getElementById('tzCartHeaderBadge');
    if (!body || !footer) return;

    if (badge) badge.textContent = `${totals.totalQty} ${totals.totalQty === 1 ? 'item' : 'items'}`;

    if (items.length === 0) {
      body.innerHTML = `
        <div class="tz-cart-empty">
          <div class="tz-cart-empty-icon">🛍️</div>
          <h4>Your Cart is Empty</h4>
          <p>You haven't customized any keychains yet. Explore our collection and add your favorite song!</p>
          <a href="${window.location.pathname.endsWith('order.html') ? '#tagMockup' : 'order.html'}" class="tz-btn-shop" id="tzEmptyShopBtn">
            Customize a Keychain
          </a>
        </div>
      `;
      footer.style.display = 'none';

      const emptyBtn = document.getElementById('tzEmptyShopBtn');
      if (emptyBtn && window.location.pathname.endsWith('order.html')) {
        emptyBtn.addEventListener('click', (e) => {
          e.preventDefault();
          closeCartDrawer();
          window.scrollTo({ top: 0, behavior: 'smooth' });
        });
      }
      return;
    }

    footer.style.display = 'block';

    let html = '';
    items.forEach(item => {
      const isMetal = (item.productKey === 'mtl001');
      const itemBackPrice = isMetal ? (item.backCustomization === 'image' ? 99 : (item.backCustomization === 'text' ? 50 : (parseInt(item.backPrice, 10) || 0))) : 0;
      const lineItemSubtotal = (parseInt(item.unitPrice, 10) + (item.isDuoSeparate ? 99 : 0) + (item.hasGiftBox ? 99 : 0) + (item.hasNfc ? 80 : 0) + itemBackPrice) * item.quantity;
      html += `
        <div class="tz-cart-item" data-item-id="${item.id}">
          <img src="${item.poster || 'POSTER 1.png'}" alt="${item.name}" class="tz-item-thumb" />
          <div class="tz-item-details">
            <div style="display:flex; justify-content:space-between; align-items:flex-start;">
              <div class="tz-item-name">
                ${item.name}
                ${item.productKey === 'mtl001' ? '<span style="display:inline-flex; align-items:center; gap:4px; font-size:0.58rem; font-family:\'Roboto Mono\', \'SF Mono\', monospace; background:rgba(30,215,96,0.12); color:#1ed760; border:1px solid rgba(30,215,96,0.3); font-weight:700; padding:1px 6px; border-radius:999px; margin-left:6px;"><span style="width:4px; height:4px; border-radius:50%; background:#1ed760;"></span>IN STOCK</span>' : ''}
                ${item.productKey === 'spt001' ? '<span style="display:inline-flex; align-items:center; gap:4px; font-size:0.58rem; font-family:\'Roboto Mono\', \'SF Mono\', monospace; background:rgba(245,158,11,0.12); color:#fbbf24; border:1px solid rgba(245,158,11,0.3); font-weight:700; padding:1px 6px; border-radius:999px; margin-left:6px;"><span style="width:4px; height:4px; border-radius:50%; background:#f59e0b;"></span>OPT-IN BATCH</span>' : ''}
              </div>
              <button type="button" class="tz-item-remove" data-action="remove" data-id="${item.id}" title="Remove item" aria-label="Remove ${item.name}">✕</button>
            </div>
            
            <div class="tz-item-meta">
              ${item.isDuoSeparate ? `
                <div style="margin-bottom:6px; padding:6px 8px; background:rgba(244,63,94,0.08); border-left:2px solid #f43f5e; border-radius:2px;">
                  <span style="color:#f43f5e; font-weight:700; font-size:0.75rem;">❤️ Tag 1:</span> ${item.song || 'Spotify Code'}<br/>
                  ${item.spotifyUrl ? `🔗 <a href="${item.spotifyUrl}" target="_blank" rel="noopener noreferrer" style="color:#22c55e; text-decoration:none;">Tag 1 Link ↗</a><br/>` : ''}
                  ${item.engrave ? `✍️ Engraving: <em>"${item.engrave}"</em> (${item.textSize})<br/>` : ''}
                </div>
                <div style="margin-bottom:6px; padding:6px 8px; background:rgba(244,63,94,0.08); border-left:2px solid #f43f5e; border-radius:2px;">
                  <span style="color:#f43f5e; font-weight:700; font-size:0.75rem;">🖤 Tag 2:</span> ${item.song2 || 'Spotify Code'}<br/>
                  ${item.spotifyUrl2 ? `🔗 <a href="${item.spotifyUrl2}" target="_blank" rel="noopener noreferrer" style="color:#22c55e; text-decoration:none;">Tag 2 Link ↗</a><br/>` : ''}
                  ${item.engrave2 ? `✍️ Engraving: <em>"${item.engrave2}"</em> (${item.textSize2 || item.textSize})<br/>` : ''}
                </div>
                <div style="color:#f43f5e; font-weight:600; font-size:0.73rem; margin-bottom:4px;">✨ Separate Customization (+₹99)</div>
              ` : `
                ${item.song ? `🎵 <strong>${item.song}</strong> ${item.artist ? '— ' + item.artist : ''}<br/>` : ''}
                ${item.spotifyUrl ? `🔗 <a href="${item.spotifyUrl}" target="_blank" rel="noopener noreferrer" style="color:#22c55e; text-decoration:none;">Spotify Code Link ↗</a><br/>` : ''}
                ${isMetal ? (item.backCustomization === 'image' ? `🖼️ Back: Custom Image Uploaded (+₹99)${item.uploadedBackImgName ? ` [${item.uploadedBackImgName}]` : ''}<br/>` : (item.backCustomization === 'text' ? `✍️ Back: <em>"${item.engrave}"</em> (+₹50)${item.textSize ? ` (${item.textSize})` : ''}<br/>` : `✨ Back: Standard Art (Free)<br/>`)) : (item.engrave ? `✍️ Engraving: <em>"${item.engrave}"</em><br/>` : '')}
              `}
              ${item.finish ? `✨ Finish: ${item.finish}<br/>` : ''}
              ${item.hasNfc ? `📶 Smart NFC Feature (+₹80)<br/>` : ''}
              ${item.hasGiftBox ? `🎁 Luxury Gift Box (+₹99)<br/>` : ''}
            </div>

            <div class="tz-item-price-row">
              <div class="tz-item-qty">
                <button type="button" class="tz-qty-btn" data-action="decrease" data-id="${item.id}">-</button>
                <span class="tz-qty-num">${item.quantity}</span>
                <button type="button" class="tz-qty-btn" data-action="increase" data-id="${item.id}">+</button>
              </div>
              <div class="tz-item-price">₹${lineItemSubtotal}</div>
            </div>
          </div>
        </div>
      `;
    });

    body.innerHTML = html;

    // Attach item action events
    body.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const action = btn.dataset.action;
        const id = btn.dataset.id;
        if (action === 'remove') {
          CartStore.removeItem(id);
        } else if (action === 'increase') {
          CartStore.updateQty(id, 1);
        } else if (action === 'decrease') {
          CartStore.updateQty(id, -1);
        }
      });
    });

    // Update footer totals
    document.getElementById('tzFooterSubtotal').textContent = `₹${totals.grandTotal - (totals.giftBoxCount * 99) - (totals.nfcCount * 80) - ((totals.duoSeparateCount || 0) * 99) - ((totals.backCustomTotal || 0))}`;
    const separateRow = document.getElementById('tzFooterSeparateRow');
    if (separateRow) {
      if ((totals.duoSeparateCount || 0) > 0) {
        separateRow.style.display = 'flex';
        document.getElementById('tzFooterSeparate').textContent = `₹${totals.duoSeparateCount * 99}`;
      } else {
        separateRow.style.display = 'none';
      }
    }
    const backRow = document.getElementById('tzFooterBackEngraveRow');
    if (backRow) {
      if ((totals.backCustomTotal || 0) > 0) {
        backRow.style.display = 'flex';
        document.getElementById('tzFooterBackEngrave').textContent = `₹${totals.backCustomTotal}`;
      } else {
        backRow.style.display = 'none';
      }
    }
    const nfcRow = document.getElementById('tzFooterNfcRow');
    if (nfcRow) {
      if (totals.nfcCount > 0) {
        nfcRow.style.display = 'flex';
        document.getElementById('tzFooterNfc').textContent = `₹${totals.nfcCount * 80}`;
      } else {
        nfcRow.style.display = 'none';
      }
    }
    const giftRow = document.getElementById('tzFooterGiftBoxRow');
    if (totals.giftBoxCount > 0) {
      giftRow.style.display = 'flex';
      document.getElementById('tzFooterGiftBox').textContent = `₹${totals.giftBoxCount * 99}`;
    } else {
      giftRow.style.display = 'none';
    }
    document.getElementById('tzFooterTotal').textContent = `₹${totals.grandTotal}`;
  }

  // Initialize on DOMContentLoaded
  function initCart() {
    injectCartStyles();
    injectCartDrawerDOM();

    // Attach any static cart buttons
    document.querySelectorAll('.nav-cart-btn, .header-cart-btn, [data-open-cart]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        openCartDrawer();
      });
    });

    const currentTotals = CartStore.getTotals();
    updateAllBadges(currentTotals.totalQty);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCart);
  } else {
    initCart();
  }

  // Global trigger helper
  window.openTuneCart = openCartDrawer;
  window.closeTuneCart = closeCartDrawer;
})();
