const crypto = require("crypto");
const OAuth = require("oauth-1.0a");
require("dotenv").config();

// Initialize OAuth 1.0a
const oauth = OAuth({
    consumer: {
        key: process.env.API_KEY,
        secret: process.env.API_SECRET
    },
    signature_method: "HMAC-SHA1",
    hash_function(base_string, key) {
        return crypto.createHmac("sha1", key).update(base_string).digest("base64");
    }
});

// Generate OAuth 1.0 headers
const getOAuthHeader = (url, method) => {
    const token = {
        key: process.env.ACCESS_TOKEN,
        secret: process.env.ACCESS_TOKEN_SECRET
    };

    const request_data = { url, method };

    return {
        Authorization: oauth.toHeader(oauth.authorize(request_data, token)).Authorization,
        "Content-Type": "application/json"
    };
};

module.exports = { getOAuthHeader };
