# 🌐 x.com Middleware Integration for Make.com

A lightweight middleware web service designed to interface Make.com with `x.com`'s API. It acts as a secure, configurable request forwarder and response handler — transforming, routing, and optionally validating the data in both directions.

---

## ✨ Features

- ✅ Stateless API gateway for `x.com` access
- ✅ Custom request forwarding with token/header injection
- ✅ JSON transformation (pre-send and post-receive)
- ✅ Minimal authentication (basic secret/token or IP filtering)
- ✅ Compatible with Make.com HTTP modules
- ✅ Lightweight, fast, and cost-efficient

---

## 🛠️ Technologies Used

- Node.js (Express)
- Axios for outgoing HTTP requests
- Hosted on Vercel / Render / Railway (optional)
- Secure `.env` support for secrets & tokens

---

## 📁 Folder Structure
```text
├── index.js # Core server script (Express) ├── routes/ │ └── forward.js # Main endpoint to handle and proxy requests ├── utils/ │ └── transform.js # Optional: Modify request/response data ├── .env # API keys, secrets └── README.md


---

## 🔧 Usage

### 1. Endpoint Overview

**POST** `/api/forward`

Forwards a Make.com request to `x.com` API with optional transformation.

#### Headers (Optional):
- `Authorization: Bearer <token>`
- `x-api-key: <middleware_secret>`

#### Body:
```json
{
  "target_url": "https://api.x.com/endpoint",
  "method": "POST",
  "headers": {
    "Content-Type": "application/json"
  },
  "data": {
    "query": "example"
  }
}
✅ Sample Scenario (Make.com)

Use HTTP module → POST to your deployed middleware URL
Pass the target x.com endpoint + payload
Receive clean, transformed response back into Make.com
🔒 Environment Variables

MIDDLEWARE_SECRET=some_custom_token
DEFAULT_HEADERS=Content-Type:application/json
FORCE_PROXY=true
🧪 Testing & Debugging

✅ Can be tested locally via Postman
✅ Logs requests/responses for easy inspection
✅ Handles rate limits and basic retries
🚀 Deployment

Vercel (Zero config)
Render / Railway (easy web service)
Or use Supabase Edge Function for low-latency hosting (optional)
📄 License

MIT License © 2025 Tuhin Das

🤝 Client

Built for: Luke Fraser
By: Tuhin Das
