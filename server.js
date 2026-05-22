const express = require("express");
const cors = require("cors");
const axios = require("axios");
require("dotenv").config();

const app = express();

app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "ngrok-skip-browser-warning"]
}));
app.use(express.json());

const SHOP = process.env.SHOPIFY_STORE;
const TOKEN = process.env.SHOPIFY_ADMIN_TOKEN; // ← permanent, never refreshes

const shopifyAPI = (query) => axios.post(
  `https://${SHOP}/admin/api/2025-01/graphql.json`,
  { query },
  { headers: { "X-Shopify-Access-Token": TOKEN, "Content-Type": "application/json" } }
);

// HEALTH CHECK
app.get("/", (req, res) => {
  res.json({ status: "Running ✅", shop: SHOP, time: new Date().toISOString() });
});

// TOKEN STATUS (honest version)
app.get("/token-status", (req, res) => {
  res.json({
    token_preview: TOKEN?.substring(0, 20) + "...",
    is_permanent: true,
    note: "Custom app tokens never expire. No refresh needed."
  });
});

// SAVE WISHLIST
app.post("/api/wishlist/sync", async (req, res) => {
  try {
    const { customerId, wishlist } = req.body;
    if (!customerId) return res.status(400).json({ error: "customerId is required" });

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
    if (userErrors?.length > 0) return res.status(400).json({ error: userErrors });

    res.json({ success: true });
  } catch (err) {
    console.error("WISHLIST SYNC ERROR:", err.response?.data || err.message);
    res.status(500).json({ error: err.response?.data || err.message });
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
    res.json(JSON.parse(value));
  } catch (err) {
    res.json([]);
  }
});

// SAVE CART
app.post("/api/cart/sync", async (req, res) => {
  try {
    const { customerId, cart } = req.body;
    if (!customerId) return res.status(400).json({ error: "customerId is required" });

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
    if (userErrors?.length > 0) return res.status(400).json({ error: userErrors });

    res.json({ success: true });
  } catch (err) {
    console.error("CART SYNC ERROR:", err.response?.data || err.message);
    res.status(500).json({ error: err.response?.data || err.message });
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
    res.json(JSON.parse(value));
  } catch (err) {
    res.json([]);
  }
});

// SAVE COMPARE
app.post("/api/compare/sync", async (req, res) => {
  try {
    const { customerId, compare } = req.body;
    if (!customerId) return res.status(400).json({ error: "customerId is required" });

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

    res.json({ success: true });
  } catch (err) {
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
    res.json([]);
  }
});

// KEEP ALIVE
setInterval(() => {
  axios.get(`https://data-sync-backend-za62.onrender.com/`)
    .then(() => console.log("Self-ping OK"))
    .catch(() => console.log("Self-ping failed"));
}, 10 * 60 * 1000);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
