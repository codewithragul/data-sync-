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
const CLIENT_ID = process.env.SHOPIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SHOPIFY_CLIENT_SECRET;

// =============================
// AUTO TOKEN REFRESH
// =============================
let tokenCache = {
  token: process.env.SHOPIFY_ADMIN_TOKEN,
  expiresAt: Date.now() + 82800000
};

async function getToken() {
  if (tokenCache.token && Date.now() < tokenCache.expiresAt - 300000) {
    return tokenCache.token;
  }
  console.log("Refreshing Shopify token...");
  const res = await axios.post(`https://${SHOP}/admin/oauth/access_token`, {
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    grant_type: "client_credentials"
  });
  tokenCache.token = res.data.access_token;
  tokenCache.expiresAt = Date.now() + (res.data.expires_in * 1000);
  console.log("✅ Token refreshed successfully!");
  return tokenCache.token;
}

// =============================
// HEALTH CHECK
// =============================
app.get("/", (req, res) => {
  res.json({
    status: "Shopify Sync Backend Running ✅",
    shop: SHOP,
    time: new Date().toISOString()
  });
});

// =============================
// SAVE CART
// =============================
app.post("/api/cart/sync", async (req, res) => {
  try {
    const { customerId, cart } = req.body;
    if (!customerId) return res.status(400).json({ error: "customerId is required" });
    const token = await getToken();

    const response = await axios.post(
      `https://${SHOP}/admin/api/2026-01/graphql.json`,
      {
        query: `
          mutation {
            metafieldsSet(metafields: [
              {
                ownerId: "gid://shopify/Customer/${customerId}",
                namespace: "custom",
                key: "synced_cart",
                type: "json",
                value: ${JSON.stringify(JSON.stringify(cart))}
              }
            ]) {
              metafields { id }
              userErrors { field message }
            }
          }
        `
      },
      { headers: { "X-Shopify-Access-Token": token, "Content-Type": "application/json" } }
    );

    const userErrors = response.data?.data?.metafieldsSet?.userErrors;
    if (userErrors && userErrors.length > 0) return res.status(400).json({ error: userErrors });

    console.log(`✅ Cart saved for customer ${customerId}: ${cart.length} items`);
    res.json({ success: true });

  } catch (error) {
    console.log("SAVE CART ERROR:", error.response?.data || error.message);
    res.status(500).json({ error: error.response?.data || error.message });
  }
});

// =============================
// GET CART
// =============================
app.get("/api/cart/:customerId", async (req, res) => {
  try {
    const { customerId } = req.params;
    const token = await getToken();

    const response = await axios.post(
      `https://${SHOP}/admin/api/2026-01/graphql.json`,
      {
        query: `
          {
            customer(id: "gid://shopify/Customer/${customerId}") {
              metafield(namespace: "custom", key: "synced_cart") {
                value
              }
            }
          }
        `
      },
      { headers: { "X-Shopify-Access-Token": token, "Content-Type": "application/json" } }
    );

    const value = response.data?.data?.customer?.metafield?.value || "[]";
    res.json(JSON.parse(value));

  } catch (error) {
    console.log("GET CART ERROR:", error.response?.data || error.message);
    res.json([]);
  }
});

// =============================
// SAVE WISHLIST
// =============================
app.post("/api/wishlist/sync", async (req, res) => {
  try {
    const { customerId, wishlist } = req.body;
    if (!customerId) return res.status(400).json({ error: "customerId is required" });
    const token = await getToken();

    const response = await axios.post(
      `https://${SHOP}/admin/api/2026-01/graphql.json`,
      {
        query: `
          mutation {
            metafieldsSet(metafields: [
              {
                ownerId: "gid://shopify/Customer/${customerId}",
                namespace: "custom",
                key: "synced_wishlist",
                type: "json",
                value: ${JSON.stringify(JSON.stringify(wishlist))}
              }
            ]) {
              metafields { id }
              userErrors { field message }
            }
          }
        `
      },
      { headers: { "X-Shopify-Access-Token": token, "Content-Type": "application/json" } }
    );

    const userErrors = response.data?.data?.metafieldsSet?.userErrors;
    if (userErrors && userErrors.length > 0) return res.status(400).json({ error: userErrors });

    console.log(`✅ Wishlist saved for customer ${customerId}: ${wishlist.length} items`);
    res.json({ success: true });

  } catch (error) {
    console.log("SAVE WISHLIST ERROR:", error.response?.data || error.message);
    res.status(500).json({ error: error.response?.data || error.message });
  }
});

// =============================
// GET WISHLIST
// =============================
app.get("/api/wishlist/:customerId", async (req, res) => {
  try {
    const { customerId } = req.params;
    const token = await getToken();

    const response = await axios.post(
      `https://${SHOP}/admin/api/2026-01/graphql.json`,
      {
        query: `
          {
            customer(id: "gid://shopify/Customer/${customerId}") {
              metafield(namespace: "custom", key: "synced_wishlist") {
                value
              }
            }
          }
        `
      },
      { headers: { "X-Shopify-Access-Token": token, "Content-Type": "application/json" } }
    );

    const value = response.data?.data?.customer?.metafield?.value || "[]";
    res.json(JSON.parse(value));

  } catch (error) {
    console.log("GET WISHLIST ERROR:", error.response?.data || error.message);
    res.json([]);
  }
});

// =============================
// SAVE COMPARE
// =============================
app.post("/api/compare/sync", async (req, res) => {
  try {
    const { customerId, compare } = req.body;
    if (!customerId) return res.status(400).json({ error: "customerId is required" });
    const token = await getToken();

    const response = await axios.post(
      `https://${SHOP}/admin/api/2026-01/graphql.json`,
      {
        query: `
          mutation {
            metafieldsSet(metafields: [
              {
                ownerId: "gid://shopify/Customer/${customerId}",
                namespace: "custom",
                key: "synced_compare",
                type: "json",
                value: ${JSON.stringify(JSON.stringify(compare))}
              }
            ]) {
              metafields { id }
              userErrors { field message }
            }
          }
        `
      },
      { headers: { "X-Shopify-Access-Token": token, "Content-Type": "application/json" } }
    );

    res.json({ success: true });

  } catch (error) {
    console.log("SAVE COMPARE ERROR:", error.response?.data || error.message);
    res.status(500).json({ error: error.response?.data || error.message });
  }
});

// =============================
// GET COMPARE
// =============================
app.get("/api/compare/:customerId", async (req, res) => {
  try {
    const { customerId } = req.params;
    const token = await getToken();

    const response = await axios.post(
      `https://${SHOP}/admin/api/2026-01/graphql.json`,
      {
        query: `
          {
            customer(id: "gid://shopify/Customer/${customerId}") {
              metafield(namespace: "custom", key: "synced_compare") {
                value
              }
            }
          }
        `
      },
      { headers: { "X-Shopify-Access-Token": token, "Content-Type": "application/json" } }
    );

    const value = response.data?.data?.customer?.metafield?.value || "[]";
    res.json(JSON.parse(value));

  } catch (error) {
    console.log("GET COMPARE ERROR:", error.response?.data || error.message);
    res.json([]);
  }
});

// =============================
// KEEP ALIVE
// =============================
setInterval(() => {
  axios.get(`https://data-sync-backend-za62.onrender.com/`)
    .then(() => console.log("Self-ping OK"))
    .catch(() => console.log("Self-ping failed"));
}, 10 * 60 * 1000);


app.get("/token-status", async (req, res) => {
  const token = await getToken();
  res.json({
    token_preview: token.substring(0, 20) + "...",
    expires_at: new Date(tokenCache.expiresAt).toISOString(),
    expires_in_hours: ((tokenCache.expiresAt - Date.now()) / 3600000).toFixed(1),
    is_cached: true
  });
});



const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
