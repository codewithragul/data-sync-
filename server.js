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
  expiresAt: Date.now() + 82800000 // 23 hrs
};

async function getToken() {
  if (tokenCache.token && Date.now() < tokenCache.expiresAt - 300000) {
    return tokenCache.token; // return cached token
  }
  console.log("Refreshing Shopify token...");
  const res = await axios.post(`https://${SHOP}/admin/oauth/access_token`, {
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    grant_type: "client_credentials"
  });
  tokenCache.token = res.data.access_token;
  tokenCache.expiresAt = Date.now() + (res.data.expires_in * 1000);
  console.log("Token refreshed successfully!");
  return tokenCache.token;
}

app.get("/", (req, res) => {
  res.send("Shopify Sync Backend Running");
});


// =============================
// SAVE CART
// =============================
app.post("/api/cart/sync", async (req, res) => {
  try {
    const { customerId, cart } = req.body;
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
              metafields {
                id
              }
              userErrors {
                field
                message
              }
            }
          }
        `,
      },
      { headers: { "X-Shopify-Access-Token": token, "Content-Type": "application/json" } }
    );

    res.json(response.data);

  } catch (error) {
    console.log(error.response?.data || error.message);
    res.status(500).json({ error: error.response?.data || error.message });
  }
});


// =============================
// GET CART
// =============================
app.get("/api/cart/:customerId", async (req, res) => {
  try {
    const customerId = req.params.customerId;
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
        `,
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
              metafields {
                id
              }
              userErrors {
                field
                message
              }
            }
          }
        `,
      },
      { headers: { "X-Shopify-Access-Token": token, "Content-Type": "application/json" } }
    );

    res.json(response.data);

  } catch (error) {
    console.log(error.response?.data || error.message);
    res.status(500).json({ error: error.response?.data || error.message });
  }
});


// =============================
// GET WISHLIST
// =============================
app.get("/api/wishlist/:customerId", async (req, res) => {
  try {
    const customerId = req.params.customerId;
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
        `,
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


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});
