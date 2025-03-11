const axios = require("axios");
const { getOAuthHeader } = require("./src/config/auth");

const url = "https://api.x.com/2/users/me";
const headers = getOAuthHeader(url, "GET");

console.log("🔄 Sending request to X.com API...");
console.log("Headers:", headers);

axios.get(url, { headers })
    .then(response => console.log("✅ API Response:", response.data))
    .catch(error => console.error("❌ API Error:", error.response?.data || error.message));
