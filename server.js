const express = require("express");
const cors = require("cors");
const axios = require("axios");
require("dotenv").config();

const app = express();

app.use(cors({
  origin: "https://in.twenty2yards.com",
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type"]
}));
app.use(express.json());

const SHOP = process.env.SHOPIFY_STORE;
const TOKEN = process.env.SHOPIFY_ADMIN_TOKEN;

// Log startup info
console.log("Shop:", SHOP);
console.log("Token:", TOKEN ? TOKEN.substring(0, 10) + "... ✅" : "MISSING ❌");

const shopifyAPI = (query) => axios.post(
  `https://${SHOP}/admin/api/2025-10/graphql.json`,
  { query },
  { headers: { "X-Shopify-Access-Token": TOKEN, "Content-Type": "application/json" } }
);

// HEALTH CHECK
app.get("/", (req, res) => {
  res.json({
    status: "Running ✅",
    shop: SHOP,
    token: TOKEN ? TOKEN.substring(0, 10) + "..." : "MISSING",
    time: new Date().toISOString()
  });
});

// SAVE WISHLIST
app.post("/api/wishlist/sync", async (req, res) => {
  try {
    const { customerId, wishlist } = req.body;
    if (!customerId) return res.status(400).json({ error: "customerId is required" });
    if (!Array.isArray(wishlist)) {
  return res.status(400).json({
    error: "Invalid wishlist"
  });
}

    const response = await shopifyAPI(`
      mutation {
        metafieldsSet(metafields: [{
          ownerId: "gid://shopify/Customer/${customerId}",
          namespace: "custom",
          key: "synced_wishlist",
          type: "json",
          value: ${JSON.stringify(JSON.stringify(wishlist))}
        }]) {
          metafields { id }
          userErrors { field message }
        }
      }
    `);

    const userErrors = response.data?.data?.metafieldsSet?.userErrors;
    if (userErrors?.length > 0) {
      console.log("WISHLIST USER ERRORS:", userErrors);
      return res.status(400).json({ error: userErrors });
    }

    console.log(`✅ Wishlist saved: customer ${customerId}, ${wishlist.length} items`);
    res.json({ success: true, count: wishlist.length });

  } catch (err) {
    const errMsg = err.response?.data || err.message;
    console.error("❌ WISHLIST SYNC ERROR:", JSON.stringify(errMsg));
    res.status(500).json({ error: errMsg });
  }
});

// GET WISHLIST
app.get("/api/wishlist/:customerId", async (req, res) => {
  try {
    const { customerId } = req.params;
    const response = await shopifyAPI(`
      {
        customer(id: "gid://shopify/Customer/${customerId}") {
          metafield(namespace: "custom", key: "synced_wishlist") { value }
        }
      }
    `);
    const value = response.data?.data?.customer?.metafield?.value || "[]";
    const parsed = JSON.parse(value);
    console.log(`✅ Wishlist fetched: customer ${customerId}, ${parsed.length} items`);
    res.json(parsed);
  } catch (err) {
    console.error("❌ GET WISHLIST ERROR:", err.response?.data || err.message);
    res.json([]);
  }
});

// SAVE CART
app.post("/api/cart/sync", async (req, res) => {
  try {
    const { customerId, cart } = req.body;
    if (!customerId) return res.status(400).json({ error: "customerId is required" });
    if (!Array.isArray(cart)) {
  return res.status(400).json({
    error: "Invalid cart"
  });
}

    const response = await shopifyAPI(`
      mutation {
        metafieldsSet(metafields: [{
          ownerId: "gid://shopify/Customer/${customerId}",
          namespace: "custom",
          key: "synced_cart",
          type: "json",
          value: ${JSON.stringify(JSON.stringify(cart))}
        }]) {
          metafields { id }
          userErrors { field message }
        }
      }
    `);

    const userErrors = response.data?.data?.metafieldsSet?.userErrors;
    if (userErrors?.length > 0) {
      console.log("CART USER ERRORS:", userErrors);
      return res.status(400).json({ error: userErrors });
    }

    console.log(`✅ Cart saved: customer ${customerId}, ${cart.length} items`);
    res.json({ success: true, count: cart.length });

  } catch (err) {
    const errMsg = err.response?.data || err.message;
    console.error("❌ CART SYNC ERROR:", JSON.stringify(errMsg));
    res.status(500).json({ error: errMsg });
  }
});

// GET CART
app.get("/api/cart/:customerId", async (req, res) => {
  try {
    const { customerId } = req.params;
    const response = await shopifyAPI(`
      {
        customer(id: "gid://shopify/Customer/${customerId}") {
          metafield(namespace: "custom", key: "synced_cart") { value }
        }
      }
    `);
    const value = response.data?.data?.customer?.metafield?.value || "[]";
    const parsed = JSON.parse(value);
    console.log(`✅ Cart fetched: customer ${customerId}, ${parsed.length} items`);
    res.json(parsed);
  } catch (err) {
    console.error("❌ GET CART ERROR:", err.response?.data || err.message);
    res.json([]);
  }
});

// SAVE COMPARE
app.post("/api/compare/sync", async (req, res) => {
  try {
    const { customerId, compare } = req.body;
    if (!customerId) return res.status(400).json({ error: "customerId is required" });
    if (!Array.isArray(compare)) {
  return res.status(400).json({
    error: "Invalid compare data"
  });
}

    const response = await shopifyAPI(`
      mutation {
        metafieldsSet(metafields: [{
          ownerId: "gid://shopify/Customer/${customerId}",
          namespace: "custom",
          key: "synced_compare",
          type: "json",
          value: ${JSON.stringify(JSON.stringify(compare))}
        }]) {
          metafields { id }
          userErrors { field message }
        }
      }
    `);

    console.log(`✅ Compare saved: customer ${customerId}, ${compare.length} items`);
    res.json({ success: true });

  } catch (err) {
    console.error("❌ COMPARE SYNC ERROR:", err.response?.data || err.message);
    res.status(500).json({ error: err.response?.data || err.message });
  }
});

// GET COMPARE
app.get("/api/compare/:customerId", async (req, res) => {
  try {
    const { customerId } = req.params;
    const response = await shopifyAPI(`
      {
        customer(id: "gid://shopify/Customer/${customerId}") {
          metafield(namespace: "custom", key: "synced_compare") { value }
        }
      }
    `);
    const value = response.data?.data?.customer?.metafield?.value || "[]";
    res.json(JSON.parse(value));
  } catch (err) {
    console.error("❌ GET COMPARE ERROR:", err.response?.data || err.message);
    res.json([]);
  }
});

// KEEP ALIVE
setInterval(() => {
  axios.get(`https://data-sync-backend-za62.onrender.com/`)
    .then(() => console.log("🔔 Self-ping OK — server awake"))
    .catch(() => console.log("⚠️ Self-ping failed"));
}, 10 * 60 * 1000);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));