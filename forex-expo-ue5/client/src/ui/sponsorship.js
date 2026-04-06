/**
 * sponsorship.js — Sponsorship Marketplace Modal
 *
 * Displays booth packages, branding opportunities, and digital products
 * from the Forex Expo Dubai prospectus. Visitors (or broker reps) can
 * browse products and submit inquiries.
 *
 * Fetched from: GET /api/sponsorship/all
 * Inquiries:    POST /api/sponsorship/inquire
 */

import { API_BASE } from '../config.js';
import { sessionId } from '../main.js';

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let modalEl = null;
let data = null;
let activeTab = 'boothPackages';

// ---------------------------------------------------------------------------
// Data fetching
// ---------------------------------------------------------------------------

async function fetchProducts() {
  if (data) return data;
  try {
    const res = await fetch(`${API_BASE}/api/sponsorship/all`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    data = await res.json();
    return data;
  } catch (err) {
    console.error('[sponsorship] Failed to fetch products:', err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

function createModal() {
  if (modalEl) return modalEl;

  modalEl = document.createElement('div');
  modalEl.id = 'sponsorship-modal';
  modalEl.innerHTML = `
    <style>
      #sponsorship-modal {
        position: fixed; inset: 0; z-index: 100000;
        background: rgba(0,0,0,0.88);
        display: flex; align-items: center; justify-content: center;
        font-family: 'Inter', 'Segoe UI', sans-serif;
        color: #e0e0e0; animation: spFadeIn 0.3s ease;
      }
      @keyframes spFadeIn { from { opacity: 0; } to { opacity: 1; } }

      .sp-container {
        background: #0d1117; border: 1px solid #1e2a3a;
        border-radius: 16px; width: 90%; max-width: 960px;
        max-height: 85vh; display: flex; flex-direction: column;
        overflow: hidden; box-shadow: 0 24px 80px rgba(0,0,0,0.6);
      }

      .sp-header {
        padding: 20px 24px; border-bottom: 1px solid #1e2a3a;
        display: flex; align-items: center; gap: 16px;
      }
      .sp-header h2 {
        margin: 0; font-size: 1.3rem; flex: 1;
        background: linear-gradient(135deg, #d4a853, #e8c97a);
        -webkit-background-clip: text; -webkit-text-fill-color: transparent;
      }
      .sp-close {
        background: none; border: none; color: #888; font-size: 1.5rem;
        cursor: pointer; padding: 4px 8px; border-radius: 4px;
      }
      .sp-close:hover { color: #fff; background: rgba(255,255,255,0.1); }

      .sp-tabs {
        display: flex; padding: 0 24px; gap: 4px;
        border-bottom: 1px solid #1e2a3a; overflow-x: auto;
      }
      .sp-tab {
        padding: 12px 16px; background: none; border: none;
        color: #888; font-size: 0.8rem; cursor: pointer;
        border-bottom: 2px solid transparent; white-space: nowrap;
        font-weight: 600; letter-spacing: 0.5px; text-transform: uppercase;
      }
      .sp-tab:hover { color: #ccc; }
      .sp-tab.active { color: #d4a853; border-bottom-color: #d4a853; }

      .sp-body {
        flex: 1; overflow-y: auto; padding: 20px 24px;
      }

      .sp-grid {
        display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: 16px;
      }

      .sp-card {
        background: #161b22; border: 1px solid #21262d;
        border-radius: 12px; padding: 20px; cursor: pointer;
        transition: all 0.2s ease; position: relative; overflow: hidden;
      }
      .sp-card:hover {
        border-color: #d4a853; transform: translateY(-2px);
        box-shadow: 0 8px 32px rgba(212,168,83,0.15);
      }

      .sp-card-tier {
        font-size: 0.65rem; font-weight: 700; letter-spacing: 2px;
        text-transform: uppercase; margin-bottom: 8px; padding: 3px 8px;
        border-radius: 4px; display: inline-block;
      }
      .sp-card-tier.titanium { background: linear-gradient(135deg,#c0c0c0,#ececec); color: #333; }
      .sp-card-tier.diamond { background: linear-gradient(135deg,#b9f2ff,#e0f7ff); color: #1a5276; }
      .sp-card-tier.platinum { background: linear-gradient(135deg,#e5e4e2,#f5f5f5); color: #555; }
      .sp-card-tier.gold { background: linear-gradient(135deg,#b8860b,#ffd700); color: #333; }
      .sp-card-tier.silver { background: linear-gradient(135deg,#c0c0c0,#e8e8e8); color: #555; }
      .sp-card-tier.bronze { background: linear-gradient(135deg,#cd7f32,#e8a850); color: #333; }

      .sp-card h3 {
        margin: 0 0 4px; font-size: 1.05rem; color: #f0f0f0;
      }
      .sp-card .sp-price {
        font-size: 1.2rem; font-weight: 700; margin: 8px 0;
        background: linear-gradient(135deg, #d4a853, #e8c97a);
        -webkit-background-clip: text; -webkit-text-fill-color: transparent;
      }
      .sp-card .sp-desc {
        font-size: 0.8rem; color: #8b949e; line-height: 1.5;
        margin-bottom: 12px;
      }
      .sp-card .sp-features {
        list-style: none; padding: 0; margin: 0;
      }
      .sp-card .sp-features li {
        font-size: 0.75rem; color: #7d8590; padding: 3px 0;
        padding-left: 16px; position: relative;
      }
      .sp-card .sp-features li::before {
        content: '✓'; position: absolute; left: 0;
        color: #3fb950; font-size: 0.7rem;
      }

      .sp-card .sp-cta {
        margin-top: 14px; padding: 8px 16px; width: 100%;
        background: linear-gradient(135deg, #d4a853, #b8860b);
        border: none; border-radius: 6px; color: #fff;
        font-weight: 600; font-size: 0.8rem; cursor: pointer;
        transition: filter 0.2s;
      }
      .sp-card .sp-cta:hover { filter: brightness(1.15); }

      .sp-card .sp-badge-virtual {
        position: absolute; top: 12px; right: 12px;
        background: rgba(0,212,170,0.15); color: #00d4aa;
        font-size: 0.6rem; font-weight: 700; padding: 2px 8px;
        border-radius: 10px; letter-spacing: 1px;
      }

      /* Inquiry form overlay */
      .sp-inquiry-overlay {
        position: absolute; inset: 0; background: rgba(13,17,23,0.97);
        display: flex; flex-direction: column; padding: 20px;
        border-radius: 12px; z-index: 2;
      }
      .sp-inquiry-overlay h4 { margin: 0 0 12px; font-size: 0.95rem; color: #d4a853; }
      .sp-inquiry-overlay input,
      .sp-inquiry-overlay textarea {
        width: 100%; padding: 8px 10px; margin-bottom: 8px;
        background: #0d1117; border: 1px solid #30363d;
        border-radius: 6px; color: #e0e0e0; font-size: 0.8rem;
        font-family: inherit; outline: none; box-sizing: border-box;
      }
      .sp-inquiry-overlay input:focus,
      .sp-inquiry-overlay textarea:focus { border-color: #d4a853; }
      .sp-inquiry-overlay textarea { resize: vertical; min-height: 60px; }
      .sp-inquiry-btns { display: flex; gap: 8px; margin-top: 4px; }
      .sp-inquiry-btns button {
        flex: 1; padding: 8px; border: none; border-radius: 6px;
        font-weight: 600; font-size: 0.8rem; cursor: pointer;
      }
      .sp-inquiry-submit {
        background: linear-gradient(135deg, #d4a853, #b8860b); color: #fff;
      }
      .sp-inquiry-cancel {
        background: rgba(255,255,255,0.08); color: #ccc;
      }

      .sp-inquiry-success {
        text-align: center; padding: 30px;
      }
      .sp-inquiry-success .check {
        font-size: 2.5rem; margin-bottom: 10px;
      }
      .sp-inquiry-success p {
        color: #8b949e; font-size: 0.85rem; line-height: 1.5;
      }

      @media (max-width: 768px) {
        .sp-container { width: 98%; max-height: 95vh; }
        .sp-grid { grid-template-columns: 1fr; }
      }
    </style>

    <div class="sp-container">
      <div class="sp-header">
        <h2>Sponsorship & Packages</h2>
        <button class="sp-close" id="sp-close">×</button>
      </div>
      <div class="sp-tabs" id="sp-tabs"></div>
      <div class="sp-body" id="sp-body">
        <div style="text-align:center;padding:40px;color:#666">Loading products...</div>
      </div>
    </div>
  `;

  document.body.appendChild(modalEl);

  // Close button
  modalEl.querySelector('#sp-close').addEventListener('click', close);
  modalEl.addEventListener('click', (e) => {
    if (e.target === modalEl) close();
  });

  return modalEl;
}

function renderTabs() {
  const tabsEl = modalEl.querySelector('#sp-tabs');
  const tabs = [
    { key: 'boothPackages', label: 'Booth Packages' },
    { key: 'brandingOpportunities', label: 'Branding' },
    { key: 'advertisingOpportunities', label: 'Advertising' },
    { key: 'digitalProducts', label: 'Digital Products' },
  ];

  tabsEl.innerHTML = tabs.map(t =>
    `<button class="sp-tab ${t.key === activeTab ? 'active' : ''}" data-tab="${t.key}">${t.label}</button>`
  ).join('');

  tabsEl.querySelectorAll('.sp-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      activeTab = btn.dataset.tab;
      renderTabs();
      renderCards();
    });
  });
}

function renderCards() {
  const body = modalEl.querySelector('#sp-body');
  if (!data || !data[activeTab]) {
    body.innerHTML = '<p style="text-align:center;color:#666">No products available</p>';
    return;
  }

  const items = data[activeTab];
  body.innerHTML = `<div class="sp-grid">${items.map(renderCard).join('')}</div>`;

  // Wire up inquiry buttons
  body.querySelectorAll('.sp-cta').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const card = btn.closest('.sp-card');
      const productId = card.dataset.productId;
      showInquiryForm(card, productId);
    });
  });
}

function renderCard(item) {
  const priceStr = item.price
    ? `$${item.price.toLocaleString()}`
    : (item.priceNote || 'Contact Us');

  const tierClass = (item.tier || item.category || '').toLowerCase().replace(/[^a-z]/g, '');
  const tierBadge = item.tier
    ? `<span class="sp-card-tier ${tierClass}">${item.tier}</span>`
    : '';

  const virtualBadge = item.virtualOnly
    ? '<span class="sp-badge-virtual">VIRTUAL</span>'
    : '';

  const features = (item.features || item.includes || []).slice(0, 6);
  const featureList = features.length > 0
    ? `<ul class="sp-features">${features.map(f => `<li>${f}</li>`).join('')}</ul>`
    : '';

  const description = item.description || item.tagline || '';
  const boothSpec = item.boothSpace
    ? `<div style="font-size:0.72rem;color:#58a6ff;margin-bottom:6px">${item.boothSpace}</div>`
    : '';

  return `
    <div class="sp-card" data-product-id="${item.id}">
      ${virtualBadge}
      ${tierBadge}
      <h3>${item.name}</h3>
      ${boothSpec}
      <div class="sp-price">${priceStr}</div>
      <p class="sp-desc">${description}</p>
      ${featureList}
      <button class="sp-cta">Inquire Now</button>
    </div>
  `;
}

// ---------------------------------------------------------------------------
// Inquiry form
// ---------------------------------------------------------------------------

function showInquiryForm(cardEl, productId) {
  const product = findProduct(productId);
  const productName = product ? product.name : productId;

  const overlay = document.createElement('div');
  overlay.className = 'sp-inquiry-overlay';
  overlay.innerHTML = `
    <h4>Inquire: ${productName}</h4>
    <input type="text" placeholder="Your Name" id="sp-inq-name" required>
    <input type="email" placeholder="Email Address" id="sp-inq-email" required>
    <input type="text" placeholder="Company" id="sp-inq-company">
    <textarea placeholder="Message (optional)" id="sp-inq-msg"></textarea>
    <div class="sp-inquiry-btns">
      <button class="sp-inquiry-cancel" id="sp-inq-cancel">Cancel</button>
      <button class="sp-inquiry-submit" id="sp-inq-submit">Send Inquiry</button>
    </div>
  `;

  cardEl.style.position = 'relative';
  cardEl.appendChild(overlay);

  overlay.querySelector('#sp-inq-cancel').addEventListener('click', () => {
    overlay.remove();
  });

  overlay.querySelector('#sp-inq-submit').addEventListener('click', async () => {
    const name = overlay.querySelector('#sp-inq-name').value.trim();
    const email = overlay.querySelector('#sp-inq-email').value.trim();
    const company = overlay.querySelector('#sp-inq-company').value.trim();
    const message = overlay.querySelector('#sp-inq-msg').value.trim();

    if (!name || !email) {
      overlay.querySelector('#sp-inq-name').style.borderColor = name ? '#30363d' : '#f85149';
      overlay.querySelector('#sp-inq-email').style.borderColor = email ? '#30363d' : '#f85149';
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/sponsorship/inquire`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, brokerId: null, name, email, company, message, sessionId }),
      });
      const result = await res.json();

      overlay.innerHTML = `
        <div class="sp-inquiry-success">
          <div class="check">✅</div>
          <h4>Inquiry Sent!</h4>
          <p>Thank you, ${name}. Our team will contact you at ${email} within 24 hours regarding <strong>${productName}</strong>.</p>
          <p style="margin-top:8px;font-size:0.75rem;color:#555">Ref: ${result.inquiryId || 'N/A'}</p>
        </div>
      `;

      setTimeout(() => overlay.remove(), 4000);
    } catch (err) {
      console.error('[sponsorship] Inquiry failed:', err);
      overlay.innerHTML = `<div class="sp-inquiry-success"><p>Failed to send. Please try again.</p></div>`;
      setTimeout(() => overlay.remove(), 2000);
    }
  });
}

function findProduct(id) {
  if (!data) return null;
  for (const category of Object.values(data)) {
    if (!Array.isArray(category)) continue;
    const found = category.find(p => p.id === id);
    if (found) return found;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function open() {
  createModal();
  modalEl.style.display = 'flex';

  const products = await fetchProducts();
  if (products) {
    renderTabs();
    renderCards();
  } else {
    modalEl.querySelector('#sp-body').innerHTML =
      '<p style="text-align:center;color:#f85149;padding:40px">Failed to load products. Is the server running?</p>';
  }
}

export function close() {
  if (modalEl) {
    modalEl.style.display = 'none';
  }
}
