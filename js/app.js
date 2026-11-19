// ==========================================================================
// Smart Product Expiry Tracker & Inventory Management
// Desktop SaaS Web Application Logic
// Built based on Product Ideation Practicals 1-7 (Green Basket / SHE Innovates)
// ==========================================================================

const AppState = {
  inventory: [],
  storeStats: {},
  activeView: "viewDashboard",
  selectedProductId: null,
  activeCategory: "all",
  activeExpiryFilter: "all",
  alertWindowDays: 4,
  undoStack: null,
  undoTimeout: null,
  notifications: [],
  webcamStream: null,
  isLoggedIn: true,
  referenceDate: new Date("2026-11-15T12:00:00") // Project baseline date
};

// Web Audio API Synthesizer (Instant auditory feedback without audio assets)
const SoundFX = {
  ctx: null,
  init() {
    if (!this.ctx && (window.AudioContext || window.webkitAudioContext)) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
  },
  beep(freq = 880, duration = 0.1, type = "sine") {
    try {
      this.init();
      if (!this.ctx) return;
      if (this.ctx.state === "suspended") this.ctx.resume();
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) { }
  },
  scanSuccess() {
    this.beep(1200, 0.08, "sine");
    setTimeout(() => this.beep(1600, 0.1, "sine"), 90);
  },
  actionSuccess() {
    this.beep(523.25, 0.08, "triangle");
    setTimeout(() => this.beep(659.25, 0.1, "triangle"), 80);
  }
};

// ==========================================================================
// App Initialization
// ==========================================================================
document.addEventListener("DOMContentLoaded", () => {
  loadData();
  setupAuthControls();
  setupSidebarNavigation();
  setupGlobalControls();
  setupIntakeForm();
  setupSettingsView();
  renderAllViews();
});

function getCustomBarcodeCatalog() {
  try {
    return JSON.parse(localStorage.getItem("pi_custom_barcodes") || "{}");
  } catch (e) {
    return {};
  }
}

function saveCustomBarcode(code, data) {
  if (!code || !data) return;
  const custom = getCustomBarcodeCatalog();
  custom[code] = data;
  localStorage.setItem("pi_custom_barcodes", JSON.stringify(custom));
  if (typeof BARCODE_CATALOG !== "undefined") {
    BARCODE_CATALOG[code] = data;
  }
}

function lookupBarcode(barcode) {
  if (!barcode) return null;
  // 1. Check in-memory/pre-defined catalog
  if (typeof BARCODE_CATALOG !== "undefined" && BARCODE_CATALOG[barcode]) {
    return BARCODE_CATALOG[barcode];
  }
  // 2. Check dynamically learned barcodes from localStorage
  const custom = getCustomBarcodeCatalog();
  if (custom[barcode]) {
    return custom[barcode];
  }
  // 3. Check existing store inventory
  if (AppState && AppState.inventory) {
    const found = AppState.inventory.find(i => i.barcode === barcode);
    if (found) {
      return {
        name: found.name,
        category: found.category,
        price: found.price,
        supplier: found.supplier,
        shelfLifeDays: 30,
        storageTips: found.storageTips || "Store under standard conditions."
      };
    }
  }
  return null;
}

function loadData() {
  // Load any previously saved custom barcodes into the catalog
  const customBarcodes = getCustomBarcodeCatalog();
  if (typeof BARCODE_CATALOG !== "undefined") {
    Object.assign(BARCODE_CATALOG, customBarcodes);
  }

  const savedInv = localStorage.getItem("pi_desk_inventory");
  if (savedInv) {
    try { AppState.inventory = JSON.parse(savedInv); }
    catch (e) { AppState.inventory = [...INITIAL_INVENTORY]; }
  } else {
    AppState.inventory = [...INITIAL_INVENTORY];
  }

  const savedStats = localStorage.getItem("pi_desk_stats");
  if (savedStats) {
    try { AppState.storeStats = JSON.parse(savedStats); }
    catch (e) { AppState.storeStats = { ...DEFAULT_STORE_STATS }; }
  } else {
    AppState.storeStats = { ...DEFAULT_STORE_STATS };
  }

  updateInventoryStatuses();
}

function saveData() {
  localStorage.setItem("pi_desk_inventory", JSON.stringify(AppState.inventory));
  localStorage.setItem("pi_desk_stats", JSON.stringify(AppState.storeStats));
}

// Calculate Shelf Life & Status
function calculateDaysRemaining(expiryDateStr) {
  if (!expiryDateStr) return { days: 0, status: "fresh" };
  const exp = new Date(expiryDateStr + "T23:59:59");
  const diffDays = Math.ceil((exp - AppState.referenceDate) / (1000 * 60 * 60 * 24));
  let status = "fresh";
  if (diffDays < 0) status = "expired";
  else if (diffDays <= AppState.alertWindowDays) status = "expiring";
  return { days: diffDays, status };
}

function updateInventoryStatuses() {
  AppState.inventory.forEach(item => {
    const calc = calculateDaysRemaining(item.expiryDate);
    item.daysRemaining = calc.days;
    item.status = calc.status;
  });
}

// ==========================================================================
// Authentication & Session Management
// ==========================================================================
function setupAuthControls() {
  const authPortal = document.getElementById("authPortal");
  const mainAppLayout = document.getElementById("mainAppLayout");
  const authForm = document.getElementById("authPortalForm");
  const btnDemo = document.getElementById("btnAuthPortalDemo");
  const tabEmail = document.getElementById("authTabEmail");
  const tabPhone = document.getElementById("authTabPhone");
  const emailGroup = document.getElementById("portalEmailGroup");
  const phoneGroup = document.getElementById("portalPhoneGroup");

  // Read saved session state (persists across reloads)
  const savedSession = localStorage.getItem("pi_desk_logged_in");
  AppState.isLoggedIn = (savedSession !== "false");

  const syncAuthDisplay = () => {
    if (AppState.isLoggedIn) {
      if (authPortal) authPortal.style.display = "none";
      if (mainAppLayout) mainAppLayout.style.display = "flex";
    } else {
      if (authPortal) authPortal.style.display = "flex";
      if (mainAppLayout) mainAppLayout.style.display = "none";
      // Halt any active camera stream
      if (AppState.webcamStream) {
        stopWebcamStream();
      }
    }
  };

  syncAuthDisplay();

  // Tab Switching (Email vs Phone)
  tabEmail?.addEventListener("click", () => {
    tabEmail.classList.add("active");
    tabPhone?.classList.remove("active");
    if (emailGroup) emailGroup.style.display = "flex";
    if (phoneGroup) phoneGroup.style.display = "none";
  });

  tabPhone?.addEventListener("click", () => {
    tabPhone.classList.add("active");
    tabEmail?.classList.remove("active");
    if (phoneGroup) phoneGroup.style.display = "flex";
    if (emailGroup) emailGroup.style.display = "none";
  });

  // Login handler
  const handleLogin = (e) => {
    if (e) e.preventDefault();
    AppState.isLoggedIn = true;
    localStorage.setItem("pi_desk_logged_in", "true");
    syncAuthDisplay();
    SoundFX.actionSuccess();
    switchView("viewDashboard");
    showToast("Signed in as Green Basket Supermarket Manager.");
  };

  authForm?.addEventListener("submit", handleLogin);
  btnDemo?.addEventListener("click", handleLogin);

  // Open Logout Confirmation Popup (replaces default browser confirm/alert box)
  const promptLogout = () => {
    // Close mobile drawer if currently open
    const sidebar = document.getElementById("appSidebar");
    const backdrop = document.getElementById("sidebarBackdrop");
    sidebar?.classList.remove("sidebar-open");
    backdrop?.classList.remove("active");

    openDesktopModal("desktopLogoutModal");
    SoundFX.beep(480, 0.08);
  };

  // Perform actual sign out upon modal confirmation
  const executeLogout = () => {
    closeDesktopModal("desktopLogoutModal");
    AppState.isLoggedIn = false;
    localStorage.setItem("pi_desk_logged_in", "false");

    syncAuthDisplay();
    SoundFX.beep(440, 0.12, "triangle");
  };

  // Wire all logout triggers (sidebar footer, top navbar, settings page)
  document.getElementById("btnSidebarLogout")?.addEventListener("click", promptLogout);
  document.getElementById("btnHeaderLogout")?.addEventListener("click", promptLogout);
  document.getElementById("btnSettingsLogout")?.addEventListener("click", promptLogout);
  document.getElementById("btnSettingsProfileLogout")?.addEventListener("click", promptLogout);

  // Wire confirm button inside the logout modal
  document.getElementById("btnConfirmLogoutModal")?.addEventListener("click", executeLogout);
}

// ==========================================================================
// Sidebar Navigation & View Switcher
// ==========================================================================
function setupSidebarNavigation() {
  const sidebar = document.getElementById("appSidebar");
  const backdrop = document.getElementById("sidebarBackdrop");
  const btnHamburger = document.getElementById("btnSidebarHamburger");
  const btnClose = document.getElementById("btnCloseSidebarMobile");

  const openMobileSidebar = () => {
    sidebar?.classList.add("sidebar-open");
    backdrop?.classList.add("active");
    SoundFX.beep(700, 0.05);
  };

  const closeMobileSidebar = () => {
    sidebar?.classList.remove("sidebar-open");
    backdrop?.classList.remove("active");
  };

  btnHamburger?.addEventListener("click", openMobileSidebar);
  btnClose?.addEventListener("click", closeMobileSidebar);
  backdrop?.addEventListener("click", closeMobileSidebar);

  const navButtons = document.querySelectorAll(".sidebar-nav-btn");
  navButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const targetView = btn.dataset.view;
      if (targetView) {
        switchView(targetView);
        closeMobileSidebar();
        SoundFX.beep(600, 0.05);
      }
    });
  });

  // Profile triggers (sidebar footer profile card & header profile pill)
  const handleProfileClick = (e) => {
    e?.preventDefault();
    switchView("viewSettings");
    closeMobileSidebar();
    SoundFX.beep(600, 0.05);
  };
  document.getElementById("btnSidebarProfileCard")?.addEventListener("click", handleProfileClick);
  document.getElementById("btnHeaderProfile")?.addEventListener("click", handleProfileClick);
}

function switchView(viewId, filterParam = null) {
  // Update sidebar active states
  const navButtons = document.querySelectorAll(".sidebar-nav-btn");
  navButtons.forEach(btn => {
    if (btn.dataset.view === viewId) btn.classList.add("active");
    else btn.classList.remove("active");
  });

  // Switch sections
  const sections = document.querySelectorAll(".page-view-section");
  sections.forEach(sec => sec.classList.remove("active"));

  const target = document.getElementById(viewId);
  if (target) {
    target.classList.add("active");
    AppState.activeView = viewId;
  }

  // Update top page title
  const titleEl = document.getElementById("topPageTitle");
  if (titleEl) {
    const titles = {
      viewDashboard: "Store Overview & Expiry Dashboard",
      viewPantry: "Pantry & Inventory Management",
      viewIntake: "Barcode Intake & Stock Registration",
      viewExpiry: "Inventory Health & Expiry Alerts",
      viewDonation: "Community Surplus Food Donation Network",
      viewStorage: "Smart Storage Guides & Food Preservation",
      viewAnalytics: "Reports & Financial Wastage Analytics",
      viewSettings: "Store Profile & Configuration"
    };
    titleEl.textContent = titles[viewId] || "Inventory Dashboard";
  }

  // Stop camera if leaving intake
  if (viewId !== "viewIntake" && AppState.webcamStream) {
    stopWebcamStream();
  }

  // Handle specific filter jumps
  if (viewId === "viewExpiry" && filterParam) {
    setHealthExpiryFilter(filterParam);
  }

  renderAllViews();
}

// ==========================================================================
// Global Controls & Header
// ==========================================================================
function setupGlobalControls() {
  // Global Header Search
  const globalSearch = document.getElementById("globalHeaderSearch");
  if (globalSearch) {
    globalSearch.addEventListener("input", () => {
      const query = globalSearch.value.trim();
      if (query.length > 0 && AppState.activeView !== "viewPantry") {
        switchView("viewPantry");
      }
      renderPantryTable();
    });
  }

  // Dark/Light Theme Switch
  document.getElementById("btnToggleTheme")?.addEventListener("click", () => {
    document.body.classList.toggle("dark-theme");
    SoundFX.actionSuccess();
  });

  // Quick Add / Intake CTA
  document.getElementById("btnQuickIntake")?.addEventListener("click", () => {
    switchView("viewIntake");
  });

  // Notifications Bell
  document.getElementById("btnHeaderNotifs")?.addEventListener("click", () => {
    switchView("viewExpiry", "expired");
  });

  // Sales time tabs
  const timeTabs = document.querySelectorAll(".time-tab-btn");
  timeTabs.forEach(tab => {
    tab.addEventListener("click", () => {
      timeTabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      updateSalesNumbers(tab.dataset.period);
      SoundFX.beep(750, 0.05);
    });
  });

  // Pantry Category Filters
  const catPills = document.querySelectorAll("#desktopCategoryFilters .filter-btn-pill");
  catPills.forEach(pill => {
    pill.addEventListener("click", () => {
      catPills.forEach(p => p.classList.remove("active"));
      pill.classList.add("active");
      AppState.activeCategory = pill.dataset.category;
      renderPantryTable();
      SoundFX.beep(650, 0.05);
    });
  });

  // Pantry Sort
  document.getElementById("desktopSortSelect")?.addEventListener("change", renderPantryTable);

  // Health Expiry Tabs
  const healthTabs = document.querySelectorAll(".health-tab-btn");
  healthTabs.forEach(tab => {
    tab.addEventListener("click", () => {
      healthTabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      AppState.activeExpiryFilter = tab.dataset.expiryFilter;
      renderHealthCards();
      SoundFX.beep(700, 0.05);
    });
  });

  // Undo button
  document.getElementById("btnDesktopUndo")?.addEventListener("click", performUndo);

  // Modal actions
  document.getElementById("btnModalMarkSold")?.addEventListener("click", () => {
    if (AppState.selectedProductId) markProductSold(AppState.selectedProductId);
  });

  document.getElementById("btnModalDiscount")?.addEventListener("click", () => {
    closeDesktopModal("desktopProductDetailModal");
    if (AppState.selectedProductId) openDiscountModal(AppState.selectedProductId);
  });

  document.getElementById("btnModalDelete")?.addEventListener("click", () => {
    if (AppState.selectedProductId) deleteProduct(AppState.selectedProductId);
  });

  document.getElementById("btnConfirmDeskDiscount")?.addEventListener("click", confirmDiscount);
  document.getElementById("btnConfirmDeskDonation")?.addEventListener("click", confirmDonation);

  // Phone Rear Camera / Webcam button
  document.getElementById("btnToggleDesktopCamera")?.addEventListener("click", toggleRearCamera);
}

// ==========================================================================
// Master View Renderers
// ==========================================================================
function renderAllViews() {
  updateInventoryStatuses();
  updateKPIs();
  renderShoppingChecklist();
  renderDashboardCategoryBars();
  renderPantryTable();
  renderHealthCards();
  renderDonationHub();
  renderStorageGuides();
  renderAnalyticsDonut();
}

function updateKPIs() {
  const totalStock = AppState.inventory.reduce((sum, item) => sum + Number(item.stock || 1), 0);
  const expiringCount = AppState.inventory.filter(i => i.status === "expiring").length;
  const expiredCount = AppState.inventory.filter(i => i.status === "expired").length;

  document.getElementById("kpiDashTotalStock").textContent = totalStock.toLocaleString();
  document.getElementById("kpiDashExpiring").textContent = expiringCount;
  document.getElementById("kpiDashExpired").textContent = expiredCount;
  document.getElementById("kpiDashSaved").textContent = `₹${AppState.storeStats.monthlySavedAmount.toLocaleString()}`;
  document.getElementById("kpiDashDonated").textContent = AppState.storeStats.donatedCount;

  // Sidebar badges
  document.getElementById("navBadgeTotalCount").textContent = AppState.inventory.length;
  document.getElementById("navBadgeExpiredCount").textContent = expiredCount;

  // Header alert dot
  const headerBadge = document.getElementById("headerNotifBadge");
  if (headerBadge) {
    headerBadge.style.display = (expiredCount > 0 || expiringCount > 0) ? "block" : "none";
  }

  // Health badges
  document.getElementById("healthBadgeAll").textContent = AppState.inventory.length;
  document.getElementById("healthBadgeExpired").textContent = expiredCount;
  document.getElementById("healthBadgeExpiring").textContent = expiringCount;
  const freshCount = AppState.inventory.filter(i => i.status === "fresh").length;
  document.getElementById("healthBadgeFresh").textContent = freshCount;

  // Efficiency & Spoilage Metrics in Analytics
  const elReminders = document.getElementById("analyticsRemindersCount");
  if (elReminders) elReminders.textContent = AppState.storeStats.remindersSent || (expiringCount * 2 + 4);

  const elMovers = document.getElementById("analyticsTopMoversCount");
  if (elMovers) elMovers.textContent = freshCount;

  const elSlow = document.getElementById("analyticsSlowSellersCount");
  if (elSlow) elSlow.textContent = expiringCount;

  const elWastage = document.getElementById("analyticsWastageRiskCount");
  if (elWastage) elWastage.textContent = expiredCount;
}

// Interactive redirection for Efficiency & Spoilage Metrics tiles
function filterByEfficiencyMetric(type) {
  SoundFX.beep(600, 0.08);

  if (type === "wastage") {
    // Jump directly to Expiry Health showing all Expired / At-Risk products
    switchView("viewExpiry", "expired");
    showToast("Wastage Risks: Showing expired products requiring immediate clearance markdown or disposal.");
  } else if (type === "slow") {
    // Jump to Expiry Health showing near-expiry items (< 4 days) needing promotional clearance
    switchView("viewExpiry", "expiring");
    showToast("Slow Sellers: Showing items nearing expiry that require promotional placement or discounts.");
  } else if (type === "movers") {
    // Jump to Expiry Health showing fresh, fast-moving items under FIFO
    switchView("viewExpiry", "fresh");
    showToast("Top Movers: Showing fresh items rotating smoothly through FIFO inventory.");
  } else if (type === "reminders") {
    // Jump to Expiry Health showing all active automated reminders
    switchView("viewExpiry", "expiring");
    showToast("Reminders Sent: Showing items with automated alerts within the 4-day window.");
  }
}

function updateSalesNumbers(period) {
  const amtEl = document.getElementById("dashSalesAmount");
  const growthEl = document.getElementById("dashSalesGrowth");
  const pathEl = document.getElementById("deskSparkLine");
  const areaEl = document.getElementById("deskSparkArea");

  if (period === "today") {
    amtEl.textContent = "₹48,250";
    growthEl.textContent = "+18.5% vs yesterday";
    pathEl.setAttribute("d", "M0,60 Q80,65 140,40 T280,32 T400,16 L500,10");
    areaEl.setAttribute("d", "M0,60 Q80,65 140,40 T280,32 T400,16 L500,10 L500,80 L0,80 Z");
  } else if (period === "week") {
    amtEl.textContent = "₹2,84,300";
    growthEl.textContent = "+24.2% vs last week";
    pathEl.setAttribute("d", "M0,70 Q100,50 200,55 T350,25 T440,12 L500,8");
    areaEl.setAttribute("d", "M0,70 Q100,50 200,55 T350,25 T440,12 L500,8 L500,80 L0,80 Z");
  } else if (period === "month") {
    amtEl.textContent = "₹11,45,800";
    growthEl.textContent = "+31.8% vs last month";
    pathEl.setAttribute("d", "M0,50 Q120,30 220,38 T360,18 T450,10 L500,5");
    areaEl.setAttribute("d", "M0,50 Q120,30 220,38 T360,18 T450,10 L500,5 L500,80 L0,80 Z");
  }
}

// Shopping Checklist
function renderShoppingChecklist() {
  const container = document.getElementById("desktopShoppingListContainer");
  if (!container) return;

  const lowStock = AppState.inventory.filter(i => (i.stock || 0) <= 6).slice(0, 4);
  const itemsToShow = lowStock.length > 0 ? lowStock : [
    { name: "Amul Toned Milk", stock: 12, unit: "packets", status: "expiring" },
    { name: "Brown Bread", stock: 6, unit: "loaves", status: "expiring" },
    { name: "Fresh Eggs", stock: 4, unit: "trays", status: "expired" }
  ];

  container.innerHTML = itemsToShow.map(item => `
    <div style="display:flex; justify-content:space-between; align-items:center; padding:12px 6px; border-bottom:1px solid var(--border-subtle);">
      <div style="display:flex; align-items:center; gap:12px;">
        <input type="checkbox" style="width:16px; height:16px; accent-color:var(--primary); cursor:pointer;" onchange="SoundFX.beep(800, 0.05)">
        <div>
          <h4 style="font-size:13.5px; font-weight:700; color:var(--text-main);">${item.name}</h4>
          <span style="font-size:11.5px; color:var(--text-muted);">${item.stock} ${item.unit || 'units'} remaining</span>
        </div>
      </div>
      <span class="status-badge-table ${item.stock <= 4 ? 'expired' : 'expiring'}">
        ${item.stock <= 4 ? 'Urgent Reorder' : 'Low Stock'}
      </span>
    </div>
  `).join("");
}

function promptAddShoppingItem() {
  const name = prompt("Enter grocery item name to add to restock list:");
  if (name) {
    showToast(`Added "${name}" to shopping checklist.`);
    SoundFX.actionSuccess();
  }
}

// Dashboard Category Health Progress Bars
function renderDashboardCategoryBars() {
  const container = document.getElementById("dashCategoryBars");
  if (!container) return;

  const categories = ["Dairy", "Bakery", "Beverages", "Pantry", "Frozen"];
  const total = AppState.inventory.length || 1;

  container.innerHTML = categories.map(cat => {
    const count = AppState.inventory.filter(i => i.category === cat).length;
    const pct = Math.round((count / total) * 100);
    return `
      <div>
        <div style="display:flex; justify-content:space-between; font-size:12.5px; font-weight:600; margin-bottom:4px;">
          <span>${cat}</span>
          <span>${count} items (${pct}%)</span>
        </div>
        <div style="width:100%; height:7px; background:var(--bg-muted); border-radius:var(--radius-full); overflow:hidden;">
          <div style="width:${pct}%; height:100%; background:var(--primary); border-radius:var(--radius-full);"></div>
        </div>
      </div>
    `;
  }).join("");
}

// ==========================================================================
// Desktop Data Table: Pantry & Inventory
// ==========================================================================
function renderPantryTable() {
  const tbody = document.getElementById("desktopInventoryTbody");
  if (!tbody) return;

  const search = document.getElementById("globalHeaderSearch")?.value.toLowerCase().trim() || "";
  const sortMode = document.getElementById("desktopSortSelect")?.value || "fifo";

  let items = AppState.inventory.filter(item => {
    const matchCat = (AppState.activeCategory === "all") || (item.category === AppState.activeCategory);
    const matchSearch = !search ||
      item.name.toLowerCase().includes(search) ||
      (item.barcode && item.barcode.includes(search)) ||
      (item.supplier && item.supplier.toLowerCase().includes(search));
    return matchCat && matchSearch;
  });

  // Sort logic
  items.sort((a, b) => {
    if (sortMode === "fifo") return (a.daysRemaining || 0) - (b.daysRemaining || 0);
    if (sortMode === "name") return a.name.localeCompare(b.name);
    if (sortMode === "stock-low") return a.stock - b.stock;
    if (sortMode === "price-high") return b.price - a.price;
    return 0;
  });

  if (items.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="10" style="text-align:center; padding:40px; color:var(--text-muted);">
          No products found matching the criteria.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = items.map(item => {
    let statusBadge = "";
    if (item.status === "expired") {
      statusBadge = `<span class="status-badge-table expired">Expired (${Math.abs(item.daysRemaining)}d ago)</span>`;
    } else if (item.status === "expiring") {
      statusBadge = `<span class="status-badge-table expiring">Expiring in ${item.daysRemaining}d</span>`;
    } else {
      statusBadge = `<span class="status-badge-table fresh">Fresh (${item.daysRemaining}d left)</span>`;
    }

    const priceDisplay = item.discount > 0
      ? `<span style="text-decoration:line-through; font-size:11px; opacity:0.6;">₹${item.price.toFixed(2)}</span> <strong style="color:#059669;">₹${(item.price * (1 - item.discount / 100)).toFixed(2)}</strong>`
      : `<strong>₹${item.price.toFixed(2)}</strong>`;

    return `
      <tr onclick="openProductDetailModal('${item.id}')">
        <td>
          <div class="product-table-cell">
            <div class="table-thumb-box">
              <img src="${item.image || 'assets/amul-milk.svg'}" alt="${item.name}">
            </div>
            <div class="product-table-meta">
              <h4>${item.name}</h4>
              <p>${item.supplier || 'Sunrise Wholesale'}</p>
            </div>
          </div>
        </td>
        <td><span class="status-badge-table count">${item.category}</span></td>
        <td><code style="font-size:12px; font-weight:600; color:var(--text-muted);">${item.barcode || 'N/A'}</code></td>
        <td>${priceDisplay}</td>
        <td><strong>${item.stock}</strong> <span style="font-size:11.5px; color:var(--text-muted);">${item.unit || 'units'}</span></td>
        <td style="font-size:12.5px; color:var(--text-muted);">${formatDate(item.mfgDate)}</td>
        <td style="font-size:12.5px; font-weight:600;">${formatDate(item.expiryDate)}</td>
        <td><span style="font-weight:700;">${item.daysRemaining > 0 ? item.daysRemaining + ' days' : Math.abs(item.daysRemaining) + 'd ago'}</span></td>
        <td>${statusBadge}</td>
        <td style="text-align:right;">
          <div class="table-action-group" style="justify-content:flex-end;" onclick="event.stopPropagation()">
            <button type="button" class="btn-table-action" title="Clearance Discount" onclick="openDiscountModal('${item.id}')">
              %
            </button>
            <button type="button" class="btn-table-action" title="Mark as Sold" onclick="markProductSold('${item.id}')">
              ✓
            </button>
            <button type="button" class="btn-table-action danger" title="Delete Product" onclick="deleteProduct('${item.id}')">
              🗑️
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

// ==========================================================================
// Stock Intake & Barcode Simulation
// ==========================================================================
let quickScanIndex = 0;
let barcodeDetectorActive = false;

function setupIntakeForm() {
  const form = document.getElementById("desktopIntakeForm");
  const expInp = document.getElementById("intakeExpiryDate");
  const catInp = document.getElementById("intakeCategory");
  const barcodeInp = document.getElementById("intakeBarcode");

  expInp?.addEventListener("change", updateIntakeShelfLife);

  const processBarcodeField = (code) => {
    code = (code || "").trim();
    if (!code) return;

    const match = lookupBarcode(code);
    const statusEl = document.getElementById("barcodeLookupStatus");

    if (match) {
      handleScannedBarcode(code);
      if (statusEl) {
        const existingInStore = AppState.inventory.find(i => (i.barcode && i.barcode === code) || (match.name && i.name.toLowerCase() === match.name.toLowerCase()));
        if (existingInStore) {
          statusEl.innerHTML = `✓ In Stock: <strong>${match.name}</strong> (${existingInStore.stock} ${existingInStore.unit || 'units'} currently). Submitting will restock!`;
          statusEl.style.color = "#059669";
        } else {
          statusEl.innerHTML = `✓ Recognized: <strong>${match.name}</strong> (₹${match.price})`;
          statusEl.style.color = "#059669";
        }
      }
    } else {
      // New unprogrammed barcode!
      SoundFX.beep(600, 0.1, "triangle");
      const vf = document.getElementById("desktopViewfinder");
      const badge = document.getElementById("scannerStatusBadge");
      if (vf) {
        vf.classList.add("scan-success-flash");
        setTimeout(() => vf.classList.remove("scan-success-flash"), 600);
      }
      if (badge) {
        badge.innerHTML = `⚠️ New Barcode: <strong>${code}</strong>`;
        badge.style.color = "#F59E0B";
        badge.style.borderColor = "#F59E0B";
        setTimeout(() => {
          badge.innerHTML = "🎯 Align barcode inside reticle";
          badge.style.color = "#38BDF8";
          badge.style.borderColor = "rgba(56, 189, 248, 0.4)";
        }, 4000);
      }
      if (statusEl) {
        statusEl.innerHTML = `⚠️ New barcode! Fill in Product Name & Price to register.`;
        statusEl.style.color = "#D97706";
      }
      showToast(`New barcode ${code} detected! Fill in the name & price to register.`);
      const nameInp = document.getElementById("intakeName");
      if (nameInp && !nameInp.value.trim()) {
        nameInp.focus();
      }
    }
  };

  // 1. Auto-lookup when typing/pasting barcode
  barcodeInp?.addEventListener("input", () => {
    const code = barcodeInp.value.trim();
    if (code.length >= 6 && lookupBarcode(code)) {
      processBarcodeField(code);
    }
  });

  // 2. When pressing Enter or tabbing out of barcode box
  barcodeInp?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      processBarcodeField(barcodeInp.value);
    }
  });

  barcodeInp?.addEventListener("change", () => {
    processBarcodeField(barcodeInp.value);
  });

  // 3. When clicking "🔍 Check" button
  document.getElementById("btnLookupBarcode")?.addEventListener("click", () => {
    processBarcodeField(barcodeInp.value);
  });

  catInp?.addEventListener("change", () => {
    const notes = document.getElementById("intakeStorageNotes");
    const cat = catInp.value;
    if (notes && !notes.value.trim()) {
      if (cat === "Dairy") notes.value = "Keep refrigerated at 2°C to 4°C.";
      else if (cat === "Bakery") notes.value = "Store in dry breadbox at ambient room temperature.";
      else if (cat === "Beverages") notes.value = "Refrigerate after opening, consume within 3 days.";
      else if (cat === "Frozen") notes.value = "Maintain at -18°C deep freeze.";
      else if (cat === "Pantry") notes.value = "Airtight moisture-free container.";
    }
  });

  // Mobile Back Camera Direct Snap trigger
  document.getElementById("btnTriggerCameraCapture")?.addEventListener("click", () => {
    document.getElementById("barcodeCameraCapture")?.click();
  });
  document.getElementById("barcodeCameraCapture")?.addEventListener("change", handleBarcodeImageUpload);

  // Photo upload trigger
  document.getElementById("btnTriggerUpload")?.addEventListener("click", () => {
    document.getElementById("barcodeImageUpload")?.click();
  });
  document.getElementById("barcodeImageUpload")?.addEventListener("change", handleBarcodeImageUpload);

  // Quick Viewfinder Scan button
  document.getElementById("btnQuickViewfinderScan")?.addEventListener("click", triggerQuickSampleScan);

  // Click on viewfinder to simulate scan
  document.getElementById("desktopViewfinder")?.addEventListener("click", (e) => {
    if (e.target.tagName !== "BUTTON" && e.target.tagName !== "INPUT") {
      triggerQuickSampleScan();
    }
  });

  form?.addEventListener("submit", (e) => {
    e.preventDefault();

    const name = document.getElementById("intakeName").value.trim();
    const category = document.getElementById("intakeCategory").value;
    const price = parseFloat(document.getElementById("intakePrice").value) || 0;
    const stock = parseInt(document.getElementById("intakeStock").value) || 1;
    const mfgDate = document.getElementById("intakeMfgDate").value;
    const expiryDate = document.getElementById("intakeExpiryDate").value;
    const barcode = document.getElementById("intakeBarcode").value.trim();
    const supplier = document.getElementById("intakeSupplier").value.trim() || "Sunrise Wholesale";
    const location = document.getElementById("intakeLocation").value.trim() || "Aisle 1";
    const notes = document.getElementById("intakeStorageNotes").value.trim();

    let image = "assets/amul-milk.svg";
    if (category === "Beverages") image = "assets/mango-drink.svg";
    else if (category === "Bakery") image = "assets/bread.svg";
    else if (category === "Pantry") image = "assets/rice.svg";
    else if (category === "Frozen") image = "assets/peas.svg";

    // Check if product already exists in inventory (match by barcode or name)
    const existingIndex = AppState.inventory.findIndex(item => {
      if (barcode && item.barcode && item.barcode === barcode) return true;
      if (name && item.name && item.name.toLowerCase() === name.toLowerCase()) return true;
      return false;
    });

    if (existingIndex !== -1) {
      // PRODUCT ALREADY EXISTS -> RESTOCK / UPDATE IN PLACE (NO DUPLICATE ROWS)
      const existing = AppState.inventory[existingIndex];
      const previousStock = Number(existing.stock) || 0;
      existing.stock = previousStock + stock;
      if (price > 0) existing.price = price;
      if (expiryDate) existing.expiryDate = expiryDate;
      if (mfgDate) existing.mfgDate = mfgDate;
      if (location) existing.storageLocation = location;
      if (notes) existing.storageTips = notes;
      if (supplier) existing.supplier = supplier;

      // Recalculate shelf life status with new expiry date
      const calc = calculateDaysRemaining(existing.expiryDate);
      existing.daysRemaining = calc.days;
      existing.status = calc.status;

      saveData();
      SoundFX.actionSuccess();
      showToast(`Restocked "${existing.name}": +${stock} units added. Total stock: ${existing.stock} ${existing.unit || 'units'}.`);
    } else {
      // BRAND NEW PRODUCT -> INSERT NEW INVENTORY ITEM
      const newItem = {
        id: "prod-" + Date.now(),
        name,
        category,
        barcode: barcode || "890" + Math.floor(1000000000 + Math.random() * 9000000000),
        price,
        stock,
        unit: "units",
        mfgDate: mfgDate || new Date().toISOString().split("T")[0],
        expiryDate,
        supplier,
        storageLocation: location,
        storageTips: notes || "Store under standard conditions.",
        notes,
        image,
        discount: 0
      };

      const calc = calculateDaysRemaining(newItem.expiryDate);
      newItem.daysRemaining = calc.days;
      newItem.status = calc.status;

      AppState.inventory.unshift(newItem);
      saveData();
      SoundFX.actionSuccess();
      showToast(`Registered new product "${name}" (${stock} units) into inventory.`);
    }

    // Dynamically learn and remember this barcode permanently!
    if (barcode) {
      saveCustomBarcode(barcode, {
        name,
        category,
        price,
        supplier,
        shelfLifeDays: 30,
        storageTips: notes || "Store under standard conditions."
      });
    }

    resetIntakeForm();
    switchView("viewPantry");
  });
}

function updateIntakeShelfLife() {
  const expVal = document.getElementById("intakeExpiryDate")?.value;
  const feedback = document.getElementById("intakeShelfLifeFeedback");
  if (!expVal) return;

  const expDate = new Date(expVal + "T00:00:00");
  const diffDays = Math.ceil((expDate - AppState.referenceDate) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    feedback.textContent = `⚠️ Warning: Date is ${Math.abs(diffDays)} days in the past (Item Expired)`;
    feedback.style.color = "var(--status-expired)";
  } else if (diffDays <= AppState.alertWindowDays) {
    feedback.textContent = `⚠️ High Priority: Only ${diffDays} days shelf life remaining`;
    feedback.style.color = "var(--status-expiring)";
  } else {
    feedback.textContent = `✓ Safe & Fresh: ${diffDays} days of shelf life remaining`;
    feedback.style.color = "var(--status-fresh)";
  }
}

// Master Barcode Handler with Visual & Auditory Feedback
function handleScannedBarcode(barcode) {
  SoundFX.scanSuccess();

  // Visual scan flash on viewfinder
  const vf = document.getElementById("desktopViewfinder");
  const badge = document.getElementById("scannerStatusBadge");
  if (vf) {
    vf.classList.add("scan-success-flash");
    setTimeout(() => vf.classList.remove("scan-success-flash"), 600);
  }

  // Look up across both pre-defined catalog and newly registered items!
  const match = lookupBarcode(barcode);
  if (badge) {
    badge.innerHTML = `✓ Scanned: <strong>${match ? match.name : barcode}</strong>`;
    badge.style.color = "var(--primary)";
    badge.style.borderColor = "var(--primary)";
    setTimeout(() => {
      badge.innerHTML = "🎯 Align barcode inside reticle";
      badge.style.color = "#38BDF8";
      badge.style.borderColor = "rgba(56, 189, 248, 0.4)";
    }, 3500);
  }

  if (AppState.activeView !== "viewIntake") {
    switchView("viewIntake");
  }

  const barcodeField = document.getElementById("intakeBarcode");
  if (barcodeField) barcodeField.value = barcode;

  if (match) {
    document.getElementById("intakeName").value = match.name;
    document.getElementById("intakeCategory").value = match.category;
    document.getElementById("intakePrice").value = match.price;
    document.getElementById("intakeStock").value = 12;
    document.getElementById("intakeSupplier").value = match.supplier;
    document.getElementById("intakeStorageNotes").value = match.storageTips;

    const today = new Date();
    document.getElementById("intakeMfgDate").value = today.toISOString().split("T")[0];

    const exp = new Date();
    exp.setDate(today.getDate() + (match.shelfLifeDays || 7));
    document.getElementById("intakeExpiryDate").value = exp.toISOString().split("T")[0];

    updateIntakeShelfLife();
    showToast(`Barcode ${barcode} scanned: ${match.name}`);
  } else {
    // Uncataloged item: Keep actual scanned barcode, prompt user for name
    const nameInput = document.getElementById("intakeName");
    if (nameInput) {
      nameInput.value = "";
      nameInput.placeholder = "Enter product name (e.g. Tomato Ketchup)";
      nameInput.focus();
    }
    document.getElementById("intakeCategory").value = "Pantry";
    document.getElementById("intakePrice").value = "";
    document.getElementById("intakeStock").value = "10";
    const today = new Date();
    document.getElementById("intakeMfgDate").value = today.toISOString().split("T")[0];
    const exp = new Date();
    exp.setDate(today.getDate() + 30);
    document.getElementById("intakeExpiryDate").value = exp.toISOString().split("T")[0];
    updateIntakeShelfLife();
    showToast(`Barcode ${barcode} read successfully! Please enter product name & price.`);
  }
}

// 1-Click test presets call this
function simulateBarcodeScan(barcode) {
  handleScannedBarcode(barcode);
}

// Quick Sample Scan (Cycles through catalog)
function triggerQuickSampleScan() {
  const keys = Object.keys(BARCODE_CATALOG);
  if (keys.length === 0) return;
  const key = keys[quickScanIndex % keys.length];
  quickScanIndex++;
  handleScannedBarcode(key);
}

// ==========================================================================
// Enhanced Barcode Decoding Pipeline (Native BarcodeDetector + ZXing Engine)
// Supports multi-angle orientation, phone camera resolution scaling & binarization
// ==========================================================================
async function decodeBarcodeFromImageFile(file) {
  // Step 1: Read file as data URL and load into an HTMLImageElement
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const img = new Image();
  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = reject;
    img.src = dataUrl;
  });

  // Step 2: Try native browser BarcodeDetector directly
  if ('BarcodeDetector' in window) {
    try {
      const formats = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'qr_code'];
      const detector = new BarcodeDetector({ formats });
      const barcodes = await detector.detect(img);
      if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
        return barcodes[0].rawValue.trim();
      }
    } catch (e) {
      console.log("Direct native BarcodeDetector pass completed without match, trying ZXing...", e);
    }
  }

  // Step 3: Try ZXing BrowserMultiFormatReader directly on the image element
  if (window.ZXing) {
    try {
      const hints = new Map();
      hints.set(ZXing.DecodeHintType.TRY_HARDER, true);
      hints.set(ZXing.DecodeHintType.POSSIBLE_FORMATS, [
        ZXing.BarcodeFormat.EAN_13,
        ZXing.BarcodeFormat.EAN_8,
        ZXing.BarcodeFormat.UPC_A,
        ZXing.BarcodeFormat.UPC_E,
        ZXing.BarcodeFormat.CODE_128,
        ZXing.BarcodeFormat.CODE_39,
        ZXing.BarcodeFormat.ITF,
        ZXing.BarcodeFormat.QR_CODE
      ]);
      const reader = new ZXing.BrowserMultiFormatReader(hints);
      const result = await reader.decodeFromImageElement(img);
      if (result && result.getText()) {
        return result.getText().trim();
      }
    } catch (zxErr) {
      console.log("Direct ZXing image pass completed without match, trying canvas rotations...", zxErr);
    }
  }

  // Step 4: Multi-Scale & Multi-Angle Canvas Rotation (0°, 90°, 180°, 270°)
  // Downscale large smartphone photos (e.g. 4000x3000px down to max 1400px)
  const maxDim = 1400;
  let targetWidth = img.naturalWidth || img.width;
  let targetHeight = img.naturalHeight || img.height;
  if (targetWidth > maxDim || targetHeight > maxDim) {
    if (targetWidth > targetHeight) {
      targetHeight = Math.round((targetHeight * maxDim) / targetWidth);
      targetWidth = maxDim;
    } else {
      targetWidth = Math.round((targetWidth * maxDim) / targetHeight);
      targetHeight = maxDim;
    }
  }

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });

  const angles = [0, 90, 180, 270];
  for (const angle of angles) {
    if (angle === 90 || angle === 270) {
      canvas.width = targetHeight;
      canvas.height = targetWidth;
    } else {
      canvas.width = targetWidth;
      canvas.height = targetHeight;
    }

    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((angle * Math.PI) / 180);
    ctx.drawImage(img, -targetWidth / 2, -targetHeight / 2, targetWidth, targetHeight);
    ctx.restore();

    // Check with native BarcodeDetector on rotated canvas
    if ('BarcodeDetector' in window) {
      try {
        const detector = new BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'qr_code'] });
        const barcodes = await detector.detect(canvas);
        if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
          return barcodes[0].rawValue.trim();
        }
      } catch (e) { }
    }

    // Check with ZXing on rotated canvas
    if (window.ZXing) {
      try {
        const hints = new Map();
        hints.set(ZXing.DecodeHintType.TRY_HARDER, true);
        const reader = new ZXing.BrowserMultiFormatReader(hints);
        const rotatedDataUrl = canvas.toDataURL("image/jpeg", 0.9);
        const result = await reader.decodeFromImageUrl(rotatedDataUrl);
        if (result && result.getText()) {
          return result.getText().trim();
        }
      } catch (e) { }
    }
  }

  // Step 5: High-contrast binarization pass (for low light / glare photos)
  try {
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
    const imgData = ctx.getImageData(0, 0, targetWidth, targetHeight);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const avg = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
      const v = avg > 128 ? 255 : 0;
      data[i] = v;
      data[i + 1] = v;
      data[i + 2] = v;
    }
    ctx.putImageData(imgData, 0, 0);

    if (window.ZXing) {
      const hints = new Map();
      hints.set(ZXing.DecodeHintType.TRY_HARDER, true);
      const reader = new ZXing.BrowserMultiFormatReader(hints);
      const binarizedDataUrl = canvas.toDataURL("image/jpeg", 0.9);
      const result = await reader.decodeFromImageUrl(binarizedDataUrl);
      if (result && result.getText()) {
        return result.getText().trim();
      }
    }
  } catch (e) { }

  return null;
}

// Handle Barcode Image File Upload (From Photo Gallery or Camera Snap)
async function handleBarcodeImageUpload(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  const badge = document.getElementById("scannerStatusBadge");
  if (badge) {
    badge.innerHTML = "⏳ Decoding barcode from photo...";
    badge.style.color = "#F59E0B";
  }

  showToast("Analyzing photo with multi-angle barcode reader...");

  try {
    const rawBarcode = await decodeBarcodeFromImageFile(file);

    if (rawBarcode) {
      event.target.value = "";
      handleScannedBarcode(rawBarcode);

      // Visual highlight on barcode input field so user clearly sees the captured digits!
      const barcodeField = document.getElementById("intakeBarcode");
      if (barcodeField) {
        barcodeField.classList.add("barcode-highlight-pulse");
        setTimeout(() => barcodeField.classList.remove("barcode-highlight-pulse"), 2000);
      }

      if (badge) {
        badge.innerHTML = `✅ Barcode Captured: <strong>${rawBarcode}</strong>`;
        badge.style.color = "var(--primary)";
        badge.style.borderColor = "var(--primary)";
      }
      return;
    }
  } catch (err) {
    console.error("Barcode photo decode error:", err);
  }

  // If no barcode was detected
  event.target.value = "";
  SoundFX.beep(250, 0.25, "sawtooth");

  if (badge) {
    badge.innerHTML = "❌ Could not decode barcode from photo";
    badge.style.color = "var(--status-expired)";
    setTimeout(() => {
      badge.innerHTML = "🎯 Align barcode inside reticle";
      badge.style.color = "#38BDF8";
    }, 4500);
  }

  showToast("Could not read a clear barcode from this photo. Please hold the camera steady, ensure good lighting, or enter the numbers manually.");
}

// Continuous Video Frame Barcode Detection Loop (Native BarcodeDetector + ZXing Fallback)
let zxingLiveReader = null;

async function startBarcodeDetection(video) {
  barcodeDetectorActive = true;

  // Initialize native BarcodeDetector if available
  let nativeDetector = null;
  if ('BarcodeDetector' in window) {
    try {
      const supported = await BarcodeDetector.getSupportedFormats();
      const formats = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'qr_code'].filter(f => supported.includes(f));
      if (formats.length > 0) {
        nativeDetector = new BarcodeDetector({ formats });
      }
    } catch (err) {
      console.warn("BarcodeDetector setup failed:", err);
    }
  }

  // Initialize ZXing live reader
  if (window.ZXing) {
    try {
      const hints = new Map();
      hints.set(ZXing.DecodeHintType.TRY_HARDER, true);
      hints.set(ZXing.DecodeHintType.POSSIBLE_FORMATS, [
        ZXing.BarcodeFormat.EAN_13,
        ZXing.BarcodeFormat.EAN_8,
        ZXing.BarcodeFormat.UPC_A,
        ZXing.BarcodeFormat.UPC_E,
        ZXing.BarcodeFormat.CODE_128,
        ZXing.BarcodeFormat.CODE_39,
        ZXing.BarcodeFormat.ITF,
        ZXing.BarcodeFormat.QR_CODE
      ]);
      zxingLiveReader = new ZXing.BrowserMultiFormatReader(hints);
    } catch (e) {
      console.warn("ZXing live reader error:", e);
    }
  }

  const captureCanvas = document.createElement("canvas");
  const captureCtx = captureCanvas.getContext("2d", { willReadFrequently: true });
  let isProcessingFrame = false;

  const scanFrame = async () => {
    if (!AppState.webcamStream || !barcodeDetectorActive) return;

    if (!isProcessingFrame && video.readyState >= 2) {
      isProcessingFrame = true;
      try {
        let detectedCode = null;

        // Try native detector first
        if (nativeDetector) {
          const results = await nativeDetector.detect(video);
          if (results && results.length > 0 && results[0].rawValue) {
            detectedCode = results[0].rawValue.trim();
          }
        }

        // Try ZXing frame extraction if native detector gave no result
        if (!detectedCode && window.ZXing && zxingLiveReader) {
          captureCanvas.width = video.videoWidth || 640;
          captureCanvas.height = video.videoHeight || 480;
          captureCtx.drawImage(video, 0, 0, captureCanvas.width, captureCanvas.height);
          try {
            const zxResult = await zxingLiveReader.decodeFromImageUrl(captureCanvas.toDataURL("image/jpeg", 0.8));
            if (zxResult && zxResult.getText()) {
              detectedCode = zxResult.getText().trim();
            }
          } catch (zxErr) {
            // No barcode in this frame, expected behavior
          }
        }

        if (detectedCode) {
          handleScannedBarcode(detectedCode);
          setTimeout(() => {
            isProcessingFrame = false;
            if (AppState.webcamStream && barcodeDetectorActive) {
              requestAnimationFrame(scanFrame);
            }
          }, 2000);
          return;
        }
      } catch (err) { }
      isProcessingFrame = false;
    }

    if (AppState.webcamStream && barcodeDetectorActive) {
      requestAnimationFrame(scanFrame);
    }
  };

  requestAnimationFrame(scanFrame);
}

function resetIntakeForm() {
  document.getElementById("desktopIntakeForm")?.reset();
  const fb = document.getElementById("intakeShelfLifeFeedback");
  if (fb) {
    fb.textContent = "Estimated Shelf Life: Please specify an expiry date.";
    fb.style.color = "var(--primary-dark)";
  }
  const statusEl = document.getElementById("barcodeLookupStatus");
  if (statusEl) statusEl.textContent = "";
}

// Request Phone Rear / Backside Camera with Multi-Tier Fallback
async function getRearCameraStream() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error("getUserMedia not supported in this browser");
  }

  // Tier 1: Exact environment facingMode (forces phone back camera)
  try {
    return await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { exact: "environment" },
        width: { ideal: 1280 },
        height: { ideal: 720 }
      }
    });
  } catch (err1) {
    console.log("Exact environment constraint unavailable, trying device search...", err1);
  }

  // Tier 2: Search enumerated device list for rear/back camera
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoInputs = devices.filter(d => d.kind === "videoinput");
    const rearDevice = videoInputs.find(d => {
      const label = (d.label || "").toLowerCase();
      return label.includes("back") || label.includes("rear") || label.includes("environment") || label.includes("facing back");
    });
    if (rearDevice && rearDevice.deviceId) {
      return await navigator.mediaDevices.getUserMedia({
        video: {
          deviceId: { exact: rearDevice.deviceId },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
    }
  } catch (err2) {
    console.log("enumerateDevices rear search unavailable...", err2);
  }

  // Tier 3: Ideal environment facingMode (works on standard mobile browsers)
  try {
    return await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: "environment" },
        width: { ideal: 1280 },
        height: { ideal: 720 }
      }
    });
  } catch (err3) {
    console.log("Ideal environment constraint unavailable, falling back...", err3);
  }

  // Tier 4: Generic video (works on laptops & desktop webcams)
  return await navigator.mediaDevices.getUserMedia({
    video: { width: { ideal: 1280 }, height: { ideal: 720 } }
  });
}

// Toggle Phone Rear Camera Video Streaming
async function toggleRearCamera() {
  const video = document.getElementById("desktopWebcamVideo");
  const simBg = document.getElementById("desktopSimBg");
  const btn = document.getElementById("btnToggleDesktopCamera");
  const note = document.getElementById("cameraProtocolNote");
  const badge = document.getElementById("scannerStatusBadge");

  if (AppState.webcamStream) {
    stopWebcamStream();
    if (video) video.style.display = "none";
    if (simBg) simBg.style.display = "block";
    if (btn) btn.textContent = "📷 Live Rear Camera";
    if (note) note.style.display = "none";
    if (badge) {
      badge.innerHTML = "🎯 Align barcode inside reticle";
      badge.style.color = "#38BDF8";
    }
  } else {
    try {
      const stream = await getRearCameraStream();
      AppState.webcamStream = stream;
      if (video) {
        video.srcObject = stream;
        video.style.display = "block";
        await video.play();
      }
      if (simBg) simBg.style.display = "none";
      if (btn) btn.textContent = "⏹ Stop Camera";
      if (note) note.style.display = "none";
      if (badge) {
        badge.innerHTML = "🟢 Back Camera Active: Hold barcode in focus";
        badge.style.color = "#10B981";
      }
      SoundFX.beep(1000, 0.1);

      // Start continuous barcode scanning
      startBarcodeDetection(video);
    } catch (e) {
      console.warn("Camera start error:", e);
      if (note) note.style.display = "block";
      showToast("Camera access restricted. On phones, use 📸 Snap Photo to capture with back camera!");
    }
  }
}

function stopWebcamStream() {
  barcodeDetectorActive = false;
  if (AppState.webcamStream) {
    AppState.webcamStream.getTracks().forEach(t => t.stop());
    AppState.webcamStream = null;
  }
}

// ==========================================================================
// Expiry Health & Alert Monitor
// ==========================================================================
function renderHealthCards() {
  const container = document.getElementById("desktopHealthCardsContainer");
  if (!container) return;

  const filter = AppState.activeExpiryFilter;
  let items = AppState.inventory.filter(i => {
    if (filter === "expired") return i.status === "expired";
    if (filter === "expiring") return i.status === "expiring";
    if (filter === "fresh") return i.status === "fresh";
    return true;
  });

  if (items.length === 0) {
    container.innerHTML = `
      <div style="grid-column:1/-1; padding:40px; text-align:center; color:var(--text-muted); background:var(--bg-subtle); border-radius:var(--radius-md);">
        No products match the selected health filter.
      </div>
    `;
    return;
  }

  container.innerHTML = items.map(item => {
    let actionBtn = "";
    if (item.status === "expired") {
      actionBtn = `
        <button type="button" class="btn-secondary-action" style="padding:6px 12px; font-size:12px; color:var(--status-expired); border-color:var(--status-expired-border);" onclick="deleteProduct('${item.id}')">
          Remove & Log Loss
        </button>
      `;
    } else if (item.status === "expiring") {
      actionBtn = `
        <button type="button" class="btn-secondary-action" style="padding:6px 12px; font-size:12px; color:#B45309; border-color:#FCD34D;" onclick="openDiscountModal('${item.id}')">
          Apply Discount
        </button>
        <button type="button" class="btn-primary-action" style="padding:6px 12px; font-size:12px;" onclick="openDonationModal('${item.id}')">
          Donate
        </button>
      `;
    } else {
      actionBtn = `
        <button type="button" class="btn-secondary-action" style="padding:6px 12px; font-size:12px;" onclick="openProductDetailModal('${item.id}')">
          View Shelf Info
        </button>
      `;
    }

    return `
      <div class="health-item-card is-${item.status}" onclick="openProductDetailModal('${item.id}')">
        <div class="health-card-top">
          <div style="display:flex; align-items:center; gap:12px;">
            <div class="table-thumb-box" style="width:48px; height:48px;">
              <img src="${item.image || 'assets/amul-milk.svg'}" alt="${item.name}">
            </div>
            <div>
              <h4 style="font-size:14.5px; font-weight:800; color:var(--text-main);">${item.name}</h4>
              <span style="font-size:12px; color:var(--text-muted);">${item.category} &bull; ${item.stock} ${item.unit || 'units'}</span>
            </div>
          </div>
          <span class="status-badge-table ${item.status}">
            ${item.status === 'expired' ? 'Expired ' + Math.abs(item.daysRemaining) + 'd ago' : (item.status === 'expiring' ? item.daysRemaining + 'd left' : 'Safe')}
          </span>
        </div>

        <div style="background:var(--bg-subtle); padding:10px 12px; border-radius:var(--radius-xs); border:1px solid var(--border-light); font-size:12px;">
          <div style="display:flex; justify-content:space-between; margin-bottom:2px;">
            <span style="color:var(--text-muted);">Expiry Date:</span>
            <strong>${formatDate(item.expiryDate)}</strong>
          </div>
          <div style="display:flex; justify-content:space-between;">
            <span style="color:var(--text-muted);">Storage:</span>
            <span>${item.storageLocation || 'Aisle 1'}</span>
          </div>
        </div>

        <div style="display:flex; justify-content:flex-end; gap:8px;" onclick="event.stopPropagation()">
          ${actionBtn}
        </div>
      </div>
    `;
  }).join("");
}

function setHealthExpiryFilter(filter) {
  AppState.activeExpiryFilter = filter;
  const tabs = document.querySelectorAll(".health-tab-btn");
  tabs.forEach(t => {
    if (t.dataset.expiryFilter === filter) t.classList.add("active");
    else t.classList.remove("active");
  });
  renderHealthCards();
}

// ==========================================================================
// Community Food Donation Hub
// ==========================================================================
function renderDonationHub() {
  const grid = document.getElementById("donationNetworkGrid");
  if (!grid) return;

  grid.innerHTML = DONATION_CENTERS.map(dc => `
    <div class="panel-card" style="display:flex; flex-direction:column; justify-content:space-between; gap:14px;">
      <div>
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
          <h4 style="font-size:15px; font-weight:800; color:var(--text-main);">${dc.name}</h4>
          <span class="status-badge-table fresh">${dc.distance}</span>
        </div>
        <p style="font-size:12.5px; color:var(--text-muted); margin-bottom:8px;">${dc.address}</p>
        <div style="font-size:12px; color:#059669; font-weight:600; background:#ECFDF5; padding:6px 10px; border-radius:var(--radius-xs); margin-bottom:6px;">
          Accepts: ${dc.acceptedItems}
        </div>
        <span style="font-size:11.5px; color:var(--text-muted);">Hours: ${dc.operatingHours} &bull; ${dc.contact}</span>
      </div>

      <button type="button" class="btn-primary-action" style="width:100%; font-size:13px; padding:9px;" onclick="openDonationModal()">
        Schedule Surplus Donation
      </button>
    </div>
  `).join("");
}

// ==========================================================================
// Smart Storage Guides
// ==========================================================================
function renderStorageGuides() {
  const grid = document.getElementById("desktopStorageGuideGrid");
  if (!grid) return;

  grid.innerHTML = STORAGE_GUIDES.map(guide => `
    <div class="panel-card" style="display:flex; flex-direction:column; justify-content:space-between; gap:12px;">
      <div>
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
          <h4 style="font-size:15px; font-weight:800; color:var(--text-main);">${guide.category}</h4>
          <span class="status-badge-table count">${guide.temp}</span>
        </div>
        <p style="font-size:13px; color:var(--text-muted); line-height:1.4; margin-bottom:12px;">
          ${guide.shelfLifeTips}
        </p>
      </div>

      <div style="background:#F0FDF4; border:1px solid #BBF7D0; padding:10px 12px; border-radius:var(--radius-xs); font-size:12px; color:#14532D;">
        <strong>💡 Waste Prevention Hack:</strong> ${guide.wasteReduction}
      </div>
    </div>
  `).join("");
}

// ==========================================================================
// Analytics & Donut Chart
// ==========================================================================
function renderAnalyticsDonut() {
  const container = document.getElementById("analyticsLegendContainer");
  if (!container) return;

  const categoryCounts = {};
  AppState.inventory.forEach(i => {
    categoryCounts[i.category] = (categoryCounts[i.category] || 0) + (i.stock || 1);
  });

  const total = Object.values(categoryCounts).reduce((a, b) => a + b, 0) || 1;
  const cats = [
    { name: "Dairy", color: "#10B981" },
    { name: "Bakery", color: "#3B82F6" },
    { name: "Beverages", color: "#F59E0B" },
    { name: "Pantry", color: "#8B5CF6" },
    { name: "Frozen", color: "#06B6D4" }
  ];

  let offset = 0;
  cats.forEach(c => {
    const count = categoryCounts[c.name] || 0;
    const pct = Math.round((count / total) * 100);
    const circle = document.getElementById("deskDonut" + c.name);
    if (circle) {
      circle.setAttribute("stroke-dasharray", `${pct} ${100 - pct}`);
      circle.setAttribute("stroke-dashoffset", `-${offset}`);
    }
    offset += pct;
  });

  container.innerHTML = cats.map(c => {
    const count = categoryCounts[c.name] || 0;
    const pct = Math.round((count / total) * 100);
    return `
      <div style="display:flex; justify-content:space-between; align-items:center; font-size:13px;">
        <span style="display:flex; align-items:center; gap:8px;">
          <span style="width:10px; height:10px; border-radius:50%; background:${c.color};"></span>
          <span>${c.name}</span>
        </span>
        <strong>${count} items (${pct}%)</strong>
      </div>
    `;
  }).join("");
}

// ==========================================================================
// Modals & Action Workflows
// ==========================================================================
function openProductDetailModal(productId) {
  const product = AppState.inventory.find(i => i.id === productId);
  if (!product) return;

  AppState.selectedProductId = productId;
  document.getElementById("deskModalProductName").textContent = product.name;
  document.getElementById("deskModalCategory").textContent = product.category.toUpperCase();
  document.getElementById("deskModalPrice").textContent = `₹${product.price.toFixed(2)}`;
  document.getElementById("deskModalStock").textContent = `${product.stock} ${product.unit || 'units'}`;
  document.getElementById("deskModalDays").textContent = product.daysRemaining > 0 ? `${product.daysRemaining} days left` : `Expired ${Math.abs(product.daysRemaining)}d ago`;
  document.getElementById("deskModalMfg").textContent = formatDate(product.mfgDate);
  document.getElementById("deskModalExp").textContent = formatDate(product.expiryDate);
  document.getElementById("deskModalBarcode").textContent = product.barcode || "N/A";
  document.getElementById("deskModalSupplier").textContent = product.supplier || "Sunrise Wholesale";
  document.getElementById("deskModalStorage").textContent = product.storageTips || "Store under standard conditions.";
  document.getElementById("deskModalProductImg").src = product.image || "assets/amul-milk.svg";

  const badge = document.getElementById("deskModalStatusBadge");
  badge.className = `status-badge-table ${product.status}`;
  badge.textContent = product.status.toUpperCase();

  openDesktopModal("desktopProductDetailModal");
}

function markProductSold(productId) {
  const index = AppState.inventory.findIndex(i => i.id === productId);
  if (index === -1) return;

  const item = AppState.inventory[index];
  if (item.stock > 1) {
    item.stock -= 1;
    showToast(`Sold 1 unit of ${item.name}. Remaining: ${item.stock}`);
  } else {
    AppState.undoStack = { item: { ...item }, index };
    AppState.inventory.splice(index, 1);
    showToast(`Sold all units of ${item.name}.`);
  }

  AppState.storeStats.todaySales += item.price;
  saveData();
  SoundFX.actionSuccess();
  closeDesktopModal("desktopProductDetailModal");
  renderAllViews();
}

function deleteProduct(productId) {
  const index = AppState.inventory.findIndex(i => i.id === productId);
  if (index === -1) return;

  const removed = AppState.inventory.splice(index, 1)[0];
  AppState.undoStack = { item: removed, index };
  saveData();
  SoundFX.beep(400, 0.15, "triangle");
  showToast(`Removed "${removed.name}" from inventory.`);
  closeDesktopModal("desktopProductDetailModal");
  renderAllViews();
}

// Clearance Discount Modal
function openDiscountModal(productId) {
  const product = AppState.inventory.find(i => i.id === productId);
  if (!product) return;

  AppState.selectedProductId = productId;
  document.getElementById("deskDiscountItemName").textContent = product.name;
  document.getElementById("deskDiscountOriginalPrice").textContent = `Original Price: ₹${product.price.toFixed(2)}`;
  setDeskDiscountRate(25);
  openDesktopModal("desktopDiscountModal");
}

function setDeskDiscountRate(rate) {
  document.getElementById("deskCustomDiscountInput").value = rate;
  const product = AppState.inventory.find(i => i.id === AppState.selectedProductId);
  if (product) {
    const discounted = product.price * (1 - rate / 100);
    document.getElementById("deskDiscountPreviewPrice").textContent = `₹${discounted.toFixed(2)}`;
  }
}

document.getElementById("deskCustomDiscountInput")?.addEventListener("input", (e) => {
  const rate = parseFloat(e.target.value) || 0;
  const product = AppState.inventory.find(i => i.id === AppState.selectedProductId);
  if (product) {
    const discounted = product.price * (1 - rate / 100);
    document.getElementById("deskDiscountPreviewPrice").textContent = `₹${Math.max(0, discounted).toFixed(2)}`;
  }
});

function confirmDiscount() {
  const product = AppState.inventory.find(i => i.id === AppState.selectedProductId);
  if (!product) return;

  const rate = parseFloat(document.getElementById("deskCustomDiscountInput").value) || 20;
  product.discount = rate;
  const saved = (product.price * (rate / 100)) * product.stock;
  AppState.storeStats.monthlySavedAmount += Math.round(saved);

  saveData();
  SoundFX.actionSuccess();
  closeDesktopModal("desktopDiscountModal");
  showToast(`Applied ${rate}% clearance discount to ${product.name}!`);
  renderAllViews();
}

// Food Donation Modal
function openDonationModal(productId = null) {
  if (productId) AppState.selectedProductId = productId;

  const list = document.getElementById("deskModalDonationList");
  if (list) {
    list.innerHTML = DONATION_CENTERS.map((dc, i) => `
      <div style="background:var(--bg-subtle); border:1.5px solid ${i === 0 ? 'var(--primary)' : 'var(--border-light)'}; border-radius:var(--radius-sm); padding:12px; cursor:pointer;" onclick="selectDonationCenter(this)">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <h4 style="font-size:14px; font-weight:700;">${dc.name}</h4>
          <span class="status-badge-table fresh">${dc.distance}</span>
        </div>
        <p style="font-size:12px; color:var(--text-muted); margin:4px 0;">${dc.address}</p>
        <span style="font-size:11.5px; color:#059669; font-weight:600;">Accepts: ${dc.acceptedItems}</span>
      </div>
    `).join("");
  }

  openDesktopModal("desktopDonationModal");
}

function selectDonationCenter(el) {
  for (let card of el.parentElement.children) {
    card.style.borderColor = "var(--border-light)";
  }
  el.style.borderColor = "var(--primary)";
}

function confirmDonation() {
  if (AppState.selectedProductId) {
    const item = AppState.inventory.find(i => i.id === AppState.selectedProductId);
    if (item) {
      deleteProduct(AppState.selectedProductId);
      AppState.storeStats.donatedCount += item.stock || 1;
      saveData();
    }
  } else {
    AppState.storeStats.donatedCount += 5;
    saveData();
  }

  SoundFX.actionSuccess();
  closeDesktopModal("desktopDonationModal");
  showToast("Surplus food pickup scheduled! Local volunteers notified.");
  renderAllViews();
}

// Settings
function setSettingThreshold(days) {
  AppState.alertWindowDays = days;
  showToast(`Expiry alert window set to ${days} days.`);
  SoundFX.actionSuccess();
  renderAllViews();
}

function exportInventoryData() {
  const rows = [
    ["ID", "Product Name", "Category", "Barcode", "Price", "Stock", "Mfg Date", "Expiry Date", "Days Remaining", "Status"]
  ];

  AppState.inventory.forEach(item => {
    rows.push([
      item.id,
      `"${item.name}"`,
      item.category,
      item.barcode || "",
      item.price,
      item.stock,
      item.mfgDate,
      item.expiryDate,
      item.daysRemaining,
      item.status
    ]);
  });

  const csv = "data:text/csv;charset=utf-8," + rows.map(r => r.join(",")).join("\n");
  const link = document.createElement("a");
  link.setAttribute("href", encodeURI(csv));
  link.setAttribute("download", `GreenBasket_Inventory_${new Date().toISOString().split("T")[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  SoundFX.actionSuccess();
  showToast("Inventory exported to CSV successfully.");
}

function resetSampleData() {
  if (confirm("Reset all stock items and statistics to default Product Ideation sample data?")) {
    AppState.inventory = [...INITIAL_INVENTORY];
    AppState.storeStats = { ...DEFAULT_STORE_STATS };
    saveData();
    SoundFX.actionSuccess();
    renderAllViews();
    showToast("Restored initial sample data.");
  }
}

// Undo System (Ergonomic H3)
function showToast(msg) {
  const toast = document.getElementById("desktopUndoToast");
  const textEl = document.getElementById("desktopToastMsg");
  const btnUndo = document.getElementById("btnDesktopUndo");
  if (!toast || !textEl) return;

  textEl.textContent = msg;
  toast.classList.add("active");

  let count = 5;
  btnUndo.textContent = `Undo (${count}s)`;

  if (AppState.undoTimeout) clearInterval(AppState.undoTimeout);
  AppState.undoTimeout = setInterval(() => {
    count--;
    if (count <= 0) {
      clearInterval(AppState.undoTimeout);
      toast.classList.remove("active");
      AppState.undoStack = null;
    } else {
      btnUndo.textContent = `Undo (${count}s)`;
    }
  }, 1000);
}

function performUndo() {
  if (AppState.undoStack && AppState.undoStack.item) {
    const { item, index } = AppState.undoStack;
    AppState.inventory.splice(index, 0, item);
    AppState.undoStack = null;
    saveData();
    SoundFX.actionSuccess();

    const toast = document.getElementById("desktopUndoToast");
    if (toast) toast.classList.remove("active");
    if (AppState.undoTimeout) clearInterval(AppState.undoTimeout);

    renderAllViews();
  }
}

// Modal Helpers
function openDesktopModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.add("open");
}

function closeDesktopModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.remove("open");
}

// Close modals when clicking backdrop or pressing Escape
document.addEventListener("click", (e) => {
  if (e.target && e.target.classList.contains("desktop-modal-backdrop")) {
    e.target.classList.remove("open");
  }
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    document.querySelectorAll(".desktop-modal-backdrop.open").forEach(m => {
      m.classList.remove("open");
    });
  }
});

function formatDate(dateStr) {
  if (!dateStr) return "N/A";
  try {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  } catch (e) {
    return dateStr;
  }
}

// ==========================================================================
// Store Profile & Settings Persistence
// ==========================================================================
function setupSettingsView() {
  loadStoreProfile();

  document.getElementById("btnSaveStoreProfile")?.addEventListener("click", () => {
    saveStoreProfile();
  });
}

function loadStoreProfile() {
  try {
    const saved = JSON.parse(localStorage.getItem("pi_store_profile") || "null");
    if (saved) {
      if (saved.storeName) {
        const input = document.getElementById("settingStoreName");
        const heading = document.getElementById("profileDisplayStoreName");
        if (input) input.value = saved.storeName;
        if (heading) heading.textContent = saved.storeName;
      }
      if (saved.storeLocation) {
        const input = document.getElementById("settingStoreLocation");
        if (input) input.value = saved.storeLocation;
      }
      if (saved.storeTeam) {
        const input = document.getElementById("settingStoreTeam");
        const display = document.getElementById("profileDisplayTeam");
        if (input) input.value = saved.storeTeam;
        if (display) display.textContent = saved.storeTeam;
      }
      if (saved.storeEmail) {
        const input = document.getElementById("settingStoreEmail");
        if (input) input.value = saved.storeEmail;
      }
    }
  } catch (e) {
    console.error("Error loading store profile:", e);
  }
}

function saveStoreProfile() {
  const storeName = document.getElementById("settingStoreName")?.value.trim() || "Green Basket Supermarket";
  const storeLocation = document.getElementById("settingStoreLocation")?.value.trim() || "CP2 - Anand Campus, Gujarat";
  const storeTeam = document.getElementById("settingStoreTeam")?.value.trim() || "Team SHE Innovates";
  const storeEmail = document.getElementById("settingStoreEmail")?.value.trim() || "manager@greenbasket.com";

  const profile = { storeName, storeLocation, storeTeam, storeEmail, lastUpdated: new Date().toISOString() };
  localStorage.setItem("pi_store_profile", JSON.stringify(profile));

  const heading = document.getElementById("profileDisplayStoreName");
  if (heading) heading.textContent = storeName;
  const display = document.getElementById("profileDisplayTeam");
  if (display) display.textContent = storeTeam;

  SoundFX.actionSuccess();
  showToast("Store profile updated & saved to local storage!");
}
