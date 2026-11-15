// Initial Mock Data and Configuration for Smart Expiry Tracker
// Based on Product Ideation Practicals 1-7 (Green Basket Store)

const INITIAL_INVENTORY = [
  {
    id: "prod-1",
    name: "Mango Drink",
    category: "Beverages",
    barcode: "8902081014799",
    price: 25.00,
    stock: 3,
    unit: "bottles",
    mfgDate: "2026-03-01",
    expiryDate: "2026-11-12", // Expired 3 days ago
    supplier: "Sunrise Wholesale",
    storageLocation: "Pantry Shelf B",
    storageTips: "Store in cool, dry place away from direct sunlight. Refrigerate after opening and consume within 3 days.",
    notes: "Batch #MG24. High margin product.",
    image: "assets/mango-drink.svg",
    discount: 0,
    status: "expired"
  },
  {
    id: "prod-2",
    name: "Amul Toned Milk",
    category: "Dairy",
    barcode: "8901262010153",
    price: 27.00,
    stock: 12,
    unit: "packets",
    mfgDate: "2026-11-13",
    expiryDate: "2026-11-17", // Expiring in 2 days
    supplier: "Gujarat Co-op Milk Fed",
    storageLocation: "Chiller Section 1",
    storageTips: "Keep continuously refrigerated between 2°C and 4°C. Do not freeze.",
    notes: "Fast moving staple item.",
    image: "assets/amul-milk.svg",
    discount: 0,
    status: "expiring"
  },
  {
    id: "prod-3",
    name: "Whole Wheat Bread",
    category: "Bakery",
    barcode: "8901725181204",
    price: 45.00,
    stock: 5,
    unit: "loaves",
    mfgDate: "2026-11-12",
    expiryDate: "2026-11-18", // Expiring in 3 days
    supplier: "Modern Bakeries Ltd",
    storageLocation: "Bakery Rack A",
    storageTips: "Store in a cool dry breadbox. Avoid high humidity to prevent mold formation.",
    notes: "Customer favorite brown bread.",
    image: "assets/bread.svg",
    discount: 0,
    status: "expiring"
  },
  {
    id: "prod-4",
    name: "Orange Juice",
    category: "Beverages",
    barcode: "8901030582910",
    price: 110.00,
    stock: 24,
    unit: "cartons",
    mfgDate: "2026-10-15",
    expiryDate: "2026-12-15", // Fresh
    supplier: "Real Fruit Beverages",
    storageLocation: "Beverage Chiller 2",
    storageTips: "Store unopened cartons in ambient room temp. Refrigerate once opened.",
    notes: "100% juice blend with vitamin C.",
    image: "assets/orange-juice.svg",
    discount: 0,
    status: "fresh"
  },
  {
    id: "prod-5",
    name: "Sandwich Loaf",
    category: "Bakery",
    barcode: "8901725181310",
    price: 40.00,
    stock: 18,
    unit: "loaves",
    mfgDate: "2026-11-14",
    expiryDate: "2026-11-25", // Fresh
    supplier: "Modern Bakeries Ltd",
    storageLocation: "Bakery Rack B",
    storageTips: "Keep sealed in airtight packaging at room temperature.",
    notes: "Daily sandwich bread batch.",
    image: "assets/sandwich-loaf.svg",
    discount: 0,
    status: "fresh"
  },
  {
    id: "prod-6",
    name: "Strawberry Shake",
    category: "Dairy",
    barcode: "8901262018890",
    price: 45.00,
    stock: 7,
    unit: "bottles",
    mfgDate: "2026-11-01",
    expiryDate: "2026-11-19", // Expiring in 4 days
    supplier: "Gujarat Co-op Milk Fed",
    storageLocation: "Chiller Section 2",
    storageTips: "Shake well before consumption. Keep chilled at 4°C.",
    notes: "Popular with kids and evening shoppers.",
    image: "assets/strawberry-shake.svg",
    discount: 0,
    status: "expiring"
  },
  {
    id: "prod-7",
    name: "Vanilla Yogurt",
    category: "Dairy",
    barcode: "8901262014427",
    price: 30.00,
    stock: 4,
    unit: "cups",
    mfgDate: "2026-10-25",
    expiryDate: "2026-11-10", // Expired 5 days ago
    supplier: "Mother Dairy Delights",
    storageLocation: "Chiller Section 3",
    storageTips: "Store at 4°C or below. Consume immediately once opened.",
    notes: "Greek vanilla probiotic cup.",
    image: "assets/vanilla-yogurt.svg",
    discount: 0,
    status: "expired"
  },
  {
    id: "prod-8",
    name: "Farm Fresh Eggs",
    category: "Dairy",
    barcode: "8906001239912",
    price: 85.00,
    stock: 15,
    unit: "trays",
    mfgDate: "2026-11-08",
    expiryDate: "2026-11-28", // Fresh
    supplier: "Poultry Farms Anand",
    storageLocation: "Cool Pantry Bay 4",
    storageTips: "Store pointed end down in carton. Keep at steady refrigerator temperature.",
    notes: "Grade A fortified brown eggs.",
    image: "assets/eggs.svg",
    discount: 0,
    status: "fresh"
  },
  {
    id: "prod-9",
    name: "Fresh Paneer (Cottage Cheese)",
    category: "Dairy",
    barcode: "8901262021104",
    price: 90.00,
    stock: 6,
    unit: "packs",
    mfgDate: "2026-11-13",
    expiryDate: "2026-11-17", // Expiring in 2 days
    supplier: "Gujarat Co-op Milk Fed",
    storageLocation: "Chiller Section 1",
    storageTips: "Keep submerged in lightly salted water in an airtight box to stay soft.",
    notes: "Malai fresh block 200g.",
    image: "assets/paneer.svg",
    discount: 0,
    status: "expiring"
  },
  {
    id: "prod-10",
    name: "Basmati Rice 5kg",
    category: "Pantry",
    barcode: "8901262098711",
    price: 490.00,
    stock: 35,
    unit: "bags",
    mfgDate: "2026-08-01",
    expiryDate: "2027-08-01", // Fresh
    supplier: "Kohinoor Grain Traders",
    storageLocation: "Aisle 3 - Grains",
    storageTips: "Keep in airtight drum or dry moisture-free bag with bay leaves.",
    notes: "Long grain aged royal basmati.",
    image: "assets/rice.svg",
    discount: 0,
    status: "fresh"
  },
  {
    id: "prod-11",
    name: "Fortune Sunflower Oil 1L",
    category: "Pantry",
    barcode: "8906007281019",
    price: 155.00,
    stock: 28,
    unit: "pouches",
    mfgDate: "2026-09-10",
    expiryDate: "2027-05-10", // Fresh
    supplier: "Adani Wilmar Dist.",
    storageLocation: "Aisle 2 - Oils",
    storageTips: "Keep tightly sealed in a dark cupboard away from direct heat or stove.",
    notes: "Refined sunflower cooking oil.",
    image: "assets/oil.svg",
    discount: 0,
    status: "fresh"
  },
  {
    id: "prod-12",
    name: "Green Peas Frozen 500g",
    category: "Frozen",
    barcode: "8901725112239",
    price: 75.00,
    stock: 14,
    unit: "packs",
    mfgDate: "2026-06-20",
    expiryDate: "2027-06-20", // Fresh
    supplier: "Safal Frozen Foods",
    storageLocation: "Deep Freezer Unit 1",
    storageTips: "Maintain strictly at -18°C. Do not refreeze once defrosted.",
    notes: "Tender sweet green peas.",
    image: "assets/peas.svg",
    discount: 0,
    status: "fresh"
  }
];

// Barcode Catalog for Quick Scanning / Simulation
const BARCODE_CATALOG = {
  "8902081014799": {
    name: "Mango Drink 500ml",
    category: "Beverages",
    price: 25.00,
    supplier: "Sunrise Wholesale",
    shelfLifeDays: 180,
    storageTips: "Refrigerate after opening, keep out of sun."
  },
  "8901262010153": {
    name: "Amul Toned Milk 500ml",
    category: "Dairy",
    price: 27.00,
    supplier: "Gujarat Co-op Milk Fed",
    shelfLifeDays: 4,
    storageTips: "Keep continuously refrigerated at 2-4°C."
  },
  "8901725181204": {
    name: "Whole Wheat Brown Bread 400g",
    category: "Bakery",
    price: 45.00,
    supplier: "Modern Bakeries Ltd",
    shelfLifeDays: 6,
    storageTips: "Store in cool dry breadbox."
  },
  "8901030582910": {
    name: "Real Orange Juice 1L",
    category: "Beverages",
    price: 110.00,
    supplier: "Real Fruit Beverages",
    shelfLifeDays: 90,
    storageTips: "Refrigerate after seal breach."
  },
  "8901262018890": {
    name: "Amul Strawberry Shake 200ml",
    category: "Dairy",
    price: 45.00,
    supplier: "Gujarat Co-op Milk Fed",
    shelfLifeDays: 20,
    storageTips: "Serve chilled, store at 4°C."
  },
  "8901262014427": {
    name: "Mother Dairy Vanilla Yogurt 100g",
    category: "Dairy",
    price: 30.00,
    supplier: "Mother Dairy Delights",
    shelfLifeDays: 15,
    storageTips: "Keep refrigerated at 4°C."
  },
  "8906001239912": {
    name: "Farm Fresh Brown Eggs 6-Pack",
    category: "Dairy",
    price: 85.00,
    supplier: "Poultry Farms Anand",
    shelfLifeDays: 21,
    storageTips: "Store pointed tip downward in fridge."
  },
  "8901058852217": {
    name: "Maggi 2-Minute Masala Noodles 280g",
    category: "Snacks",
    price: 55.00,
    supplier: "Nestle India",
    shelfLifeDays: 240,
    storageTips: "Store in a dry airtight container."
  },
  "8901725112239": {
    name: "Safal Tender Green Peas 500g",
    category: "Frozen",
    price: 75.00,
    supplier: "Safal Frozen Foods",
    shelfLifeDays: 365,
    storageTips: "Maintain strictly at -18°C."
  }
};

// Storage Guide Knowledge Base (Practicals 1, 3, 5)
const STORAGE_GUIDES = [
  {
    category: "Dairy & Eggs",
    icon: "milk",
    temp: "2°C to 4°C",
    shelfLifeTips: "Keep in the main section of refrigerator where temperature is constant, not on the door. Seal opened cheese in parchment paper, then zip foil. Keep eggs in original carton.",
    wasteReduction: "Turn near-expiry milk into homemade paneer, yogurt, or use for baking. Freeze butter up to 9 months."
  },
  {
    category: "Bakery & Breads",
    icon: "bread",
    temp: "18°C to 22°C (Dry)",
    shelfLifeTips: "Do not store bread in the refrigerator as cold temperatures speed up retrogradation (staling). Keep in a breathable breadbox or paper sack.",
    wasteReduction: "Turn stale bread into croutons, breadcrumbs, french toast, or bread pudding before mold sets in."
  },
  {
    category: "Fruits & Vegetables",
    icon: "apple",
    temp: "4°C to 12°C",
    shelfLifeTips: "Keep ethylene gas releasers (bananas, apples, tomatoes) away from ethylene-sensitive items (leafy greens, carrots, cucumbers). Do not wash berries until ready to eat.",
    wasteReduction: "Chop overripe fruits and freeze for smoothies. Simmer vegetable peels and leftover greens into a nutrient-rich vegetable stock."
  },
  {
    category: "Beverages & Liquids",
    icon: "cup",
    temp: "4°C (Post opening)",
    shelfLifeTips: "Store unopened shelf-stable tetra packs in dark cool cupboard. Once opened, refrigerate and consume within 3-5 days. Always close caps tightly.",
    wasteReduction: "Freeze remaining citrus juices into ice cubes for cooking marinades or flavored water."
  },
  {
    category: "Pantry Staples & Grains",
    icon: "archive",
    temp: "Ambient Dry (< 25°C)",
    shelfLifeTips: "Store flours, pulses, and rice in airtight airtight glass or steel containers with dry neem or bay leaves to prevent weevil infestation. Keep away from stove heat.",
    wasteReduction: "Follow FIFO (First In, First Out) strictly. Label jars with opening date."
  },
  {
    category: "Frozen Foods",
    icon: "snowflake",
    temp: "-18°C or below",
    shelfLifeTips: "Store at deep sub-zero temperatures. Keep tightly wrapped to prevent freezer burn. Defrost inside the refrigerator overnight, never on countertop.",
    wasteReduction: "Portion into smaller vacuum/airtight bags before freezing so you only thaw what you need."
  }
];

// Verified Community Donation Centers & Food Banks (Practical 1 & 3)
const DONATION_CENTERS = [
  {
    id: "dc-1",
    name: "Akshaya Patra Foundation Hub",
    distance: "1.8 km away",
    contact: "+91 98250 12345",
    address: "Plot 42, GIDC Estate, Anand",
    acceptedItems: "Packaged grains, dairy, sealed beverages, edible bakery",
    operatingHours: "9:00 AM - 7:00 PM",
    rating: "4.9 ★ (Verified)"
  },
  {
    id: "dc-2",
    name: "Robin Hood Army - Local Chapter",
    distance: "2.4 km away",
    contact: "+91 98980 67890",
    address: "Community Center, Station Road, Vallabh Vidyanagar",
    acceptedItems: "Surplus fresh bakery, unopened dairy, fruits, packaged food",
    operatingHours: "10:00 AM - 9:00 PM (Instant Pickup available)",
    rating: "4.8 ★ (Volunteer Network)"
  },
  {
    id: "dc-3",
    name: "Feeding India by Zomato Hub",
    distance: "3.5 km away",
    contact: "+91 94080 34567",
    address: "Near CVM Campus Gate, Vidyanagar",
    acceptedItems: "All hygienic sealed foods nearing expiry (min 24h remaining)",
    operatingHours: "8:00 AM - 8:00 PM",
    rating: "4.9 ★ (Verified Partner)"
  }
];

// Initial Store Statistics
const DEFAULT_STORE_STATS = {
  storeName: "Green Basket",
  ownerName: "Prakruti & Team (SHE Innovates)",
  branch: "CP2 - Anand",
  todaySales: 48250,
  growthRate: "+18.5%",
  monthlySavedAmount: 6450,
  donatedCount: 18,
  remindersSent: 12,
  wasteReductionRate: "92.4%",
  lowStockItems: [
    { name: "Amul Toned Milk", count: "12 packets", status: "Low" },
    { name: "Brown Bread", count: "6 loaves", status: "Low" },
    { name: "Fresh Eggs", count: "4 trays", status: "Urgent" }
  ],
  categoryBreakdown: [
    { label: "Dairy", percentage: 34, color: "#10B981" },
    { label: "Bakery", percentage: 28, color: "#3B82F6" },
    { label: "Beverages", percentage: 18, color: "#F59E0B" },
    { label: "Snacks", percentage: 10, color: "#8B5CF6" },
    { label: "Frozen", percentage: 10, color: "#06B6D4" }
  ]
};

