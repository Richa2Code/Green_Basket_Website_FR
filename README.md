# 🛒 Green Basket | Smart Product Expiry Tracker & Inventory Management Website

> **Product Ideation (Course Code: 102003408)**  
> **Branch**: Computer Engineering (CP2), Semester III, Batch C  
> **Team SHE Innovates**: Prakruti Tandel, Priya Chauhan, Pushti Shah, Richa Makwana, Richi Patel  
> **Institution**: CVM University &bull; GCET (G H Patel College of Engineering & Technology)

---

## 📌 Executive Summary

**Green Basket** is a **full-featured, desktop SaaS web application** engineered specifically for grocery supermarket managers, shopkeepers, and household pantries to eradicate food spoilage, prevent financial loss, and automate inventory rotation using **First-In-First-Out (FIFO)** principles.

Developed purely with standard **HTML5, modern CSS3 (Flexbox & CSS Grid), and vanilla JavaScript (ES6+)**, the website operates entirely standalone with zero external build tools, zero node package dependencies, and offline resilience.

---

## 🖥️ Desktop Web Architecture & Layout

Unlike a mobile phone frame, this system is architected as an **executive desktop management portal**:

```
+---------------------------------------------------------------------------------------------------------+
| [LOGO] Green Basket Supermarket   | [Search Inventory...]              [Live Status] [Theme] [Notifs] [+Add] |
+------------------+--------------------------------------------------------------------------------------+
| OVERVIEW         |                                                                                      |
| • 📊 Dashboard   |  [5-KPI Executive Metrics Grid: Stock | Expiring Soon | Expired | Saved | Donated]    |
| • 🥫 Pantry      |                                                                                      |
|                  |  +--------------------------------------------+  +---------------------------------+  |
| OPERATIONS       |  |  Store Revenue & Sparkline Chart          |  | Urgent Spoilage Action Center   |  |
| • 📷 Barcode     |  |  ₹48,250 (+18.5%) [Today|Week|Month]       |  | 3 Dairy Items Expiring < 48h    |  |
| • ⚠️ Expiry      |  +--------------------------------------------+  +---------------------------------+  |
| • 🤝 Donation    |                                                                                      |
|                  |  +--------------------------------------------+  +---------------------------------+  |
| KNOWLEDGE        |  |  Shopping & Low-Stock Restock List        |  | Category Health Distribution    |  |
| • 💡 Storage     |  +--------------------------------------------+  +---------------------------------+  |
| • 📈 Analytics   |                                                                                      |
| • ⚙️ Settings     |                                                                                      |
+------------------+--------------------------------------------------------------------------------------+
```

---

## 🚀 Desktop Pages & Modules

### 1. 📊 Executive Dashboard (`#viewDashboard`)
- **5-KPI Executive Metric Tiles**:
  - `1,248` Total items currently in stock across all aisles.
  - `24` Expiring Soon items ($\le$ 4 days).
  - `7` Expired items requiring immediate removal.
  - `₹6,450` Monthly losses prevented via clearance markdowns.
  - `18` Items donated to community food banks.
- **Revenue Sparkline Card**: Real-time sales graph with period filters (`Today`, `This Week`, `This Month`).
- **Urgent Spoilage Action Center**: One-click clearance markdown calculator and donation trigger for imminent expiries.
- **Shopping & Restock Checklist**: Interactive checklist for products nearing minimum threshold (*Amul Toned Milk*, *Brown Bread*, *Fresh Eggs*).

### 2. 🥫 Pantry & Inventory Management Table (`#viewPantry`)
- **Desktop Data Table**: Displays Product Thumbnail, Name, Department, Barcode SKU, Unit Price, Stock Units, Manufacturing Date, Expiry Date, Days Remaining countdown, and Color-Coded Status Badge.
- **Instant Search & Department Filtering**: Fast filtering by `All`, `Dairy`, `Bakery`, `Beverages`, `Pantry Staples`, `Frozen`, or `Snacks`.
- **FIFO Sorting**: Automatically sorts products by **Earliest Expiry First (FIFO)** so older stock is circulated before newer shipments.
- **Row Quick Actions**: Instant clearance markdown (`%`), mark as sold (`✓`), or delete (`🗑️`).

### 3. 📷 Barcode Intake & Stock Registration (`#viewIntake`)
- **Split Desktop Intake Layout**:
  - **Left**: Live camera viewfinder with animated laser line and optional webcam streaming (`navigator.mediaDevices.getUserMedia`). Includes **1-Click Barcode Simulation Buttons** (*Amul Milk*, *Mango Drink*, *Brown Bread*, *Yogurt*, *Eggs*, *Noodles*) that trigger an authentic scanner beep via the **Web Audio API**!
  - **Right**: Comprehensive intake form with real-time shelf life calculation, past-date error prevention, and automated storage recommendations.

### 4. ⚠️ Inventory Health & Expiry Monitor (`#viewExpiry`)
- **Segmented Health Tabs**: Filter across `All Products`, `Expired (Action Required)`, `Expiring Soon (< 4 Days)`, and `Fresh & Safe Stock`.
- **Card-Grid Interface**: Color-coded borders (Red for expired, Amber for near-expiry, Green for safe) with direct markdown and food bank donation buttons.

### 5. 🤝 Community Food Donation & NGO Hub (`#viewDonation`)
- Connects the store with verified food recovery organizations:
  - **Akshaya Patra Foundation Hub** (1.8 km away)
  - **Robin Hood Army Local Chapter** (2.4 km away)
  - **Feeding India by Zomato Hub** (3.5 km away)
- Direct scheduling of volunteer pickups to divert edible surplus food from landfills.

### 6. 💡 Smart Storage Guides (`#viewStorage`)
- Knowledge base from Product Ideation research covering Dairy, Bakery, Fresh Produce, Beverages, Grains, and Frozen foods.
- Outlines optimal temperature ranges, ethylene gas separation rules, and zero-waste hacks.

### 7. 📈 Reports & Financial Wastage Analytics (`#viewAnalytics`)
- **Interactive SVG Donut Chart**: Visualizes departmental stock distribution (*Dairy 34%*, *Bakery 28%*, *Beverages 18%*, *Snacks 10%*, *Frozen 10%*).
- **Efficiency Metrics**: Tracks Reminders Sent (12), Top Sellers (8), Slow Sellers (3), and High Wastage Risks (2).
- **One-Click CSV Export**: Downloads complete store inventory with all attributes to a spreadsheet file.

### 8. ⚙️ Store Configuration & Settings (`#viewSettings`)
- Customizable alert threshold window (1, 2, 4, or 7 days before expiry).
- Store profile details management.
- Reset to original Product Ideation sample dataset.

---

## 🛡️ Usability & Ergonomics (Practical 5)

| Usability Principle | Implementation in Desktop Web App |
|---|---|
| **Heuristic H1: Visibility of System Status** | Live status indicators, color-coded health badges, and real-time days left countdowns. |
| **Heuristic H3: User Control & Freedom** | **Floating Desktop Undo Toast**: Deleting or selling an item triggers a 5-second recovery toast at bottom-right to restore data instantly. |
| **Heuristic H5: Error Prevention** | Prevents entering invalid dates, warns on past expiry dates, and prevents negative stock values. |
| **Heuristic H7: Flexibility & Efficiency** | Dual input methods: 1-click barcode scanner simulation or keyboard-optimized data entry form. |

---

## 📂 Project Directory Structure

```
Frontend PI/
├── index.html           # Full desktop SaaS layout (Sidebar, Navbar, Tables, Modals)
├── css/
│   └── styles.css       # Desktop CSS3 design system, responsive grids, and dark theme
├── js/
│   ├── data.js          # Catalog of mock inventory, barcodes, storage rules & NGOs
│   └── app.js           # Desktop routing, table sorting, audio synthesizer & CRUD
├── assets/              # Vector SVGs for grocery items
│   ├── amul-milk.svg
│   ├── bread.svg
│   ├── eggs.svg
│   ├── mango-drink.svg
│   ├── oil.svg
│   ├── orange-juice.svg
│   ├── paneer.svg
│   ├── peas.svg
│   ├── rice.svg
│   ├── sandwich-loaf.svg
│   ├── strawberry-shake.svg
│   └── vanilla-yogurt.svg
└── README.md            # Comprehensive system documentation
```

---

## 🌐 How to Launch

1. Double-click [index.html](file:///d:/richa_work/Product%20Ideation/Frontend%20PI/index.html) to open directly in any modern desktop browser (**Google Chrome, Microsoft Edge, Firefox, Safari**).
2. Or serve it via Python:
   ```powershell
   python -m http.server 8080
   ```
   and navigate to `http://localhost:8080`.
