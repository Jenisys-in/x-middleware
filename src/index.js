require("dotenv").config();
const express = require("express");
const cors = require("cors");
const tweetRoutes = require("./routes/tweetRoutes");

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api", tweetRoutes);

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
});
