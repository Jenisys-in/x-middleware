const express = require("express");
const { getTweetDetails, checkTweetType, uploadMedia, repostTweet, createPost, quoteTweet } = require("../services/xService");

const router = express.Router();
const multer = require("multer");
const upload = multer({ dest: "uploads/" }); // Files will be stored in 'uploads/' directory


const retryLimit = 3;
const retryDelay = (attempt) => Math.min(2000 * attempt, 10000); // Exponential backoff

// ✅ New Ping Endpoint to Keep the App Active
router.get("/ping", (req, res) => {
    console.log("✅ Ping request received - Keeping app active!");
    res.status(200).json({ message: "App is awake and running!" });
});


// ✅ Route to Process a Tweet (Repost)
router.post("/process-tweet/:id", async (req, res) => {
    const tweetId = req.params.id;

    try {
        if (await checkTweetType(tweetId)) {
            return res.status(400).json({ message: "Tweet is not eligible for reposting." });
        }

        await repostTweet(tweetId);
        res.json({ message: "Tweet processed successfully!" });
    } catch (error) {
        res.status(500).json({ error: "Failed to process tweet", details: error.message });
    }
});

// ✅ Route for Quote Tweet
router.post("/quote-tweet/:id", async (req, res) => {
    try {
        const { comment } = req.body;
        if (!comment) {
            return res.status(400).json({ error: "Comment is required for quote tweet" });
        }

        const result = await quoteTweet(req.params.id, comment);
        res.json({ message: "Quote Tweet Posted Successfully!", data: result });
    } catch (error) {
        res.status(500).json({ error: "Failed to post quote tweet", details: error.message });
    }
});


// ✅ Route to Create a Post with Media


router.post("/create-post-with-media", upload.single("media"), async (req, res) => {
    try {
        const { text } = req.body;
        if (!req.file) {
            return res.status(400).json({ error: "No media file uploaded" });
        }

        const mediaPath = req.file.path; // Get uploaded file path
        const post = await createPost(text, mediaPath);
        res.json(post);
    } catch (error) {
        res.status(500).json({ error: "Failed to create post with media", details: error.message });
    }
});





// ✅ Route to Repost a Tweet
router.post("/process-tweet/:id", async (req, res) => {
    const tweetId = req.params.id;

    try {
        if (await checkTweetType(tweetId)) {
            return res.status(400).json({ message: "Tweet is not eligible for reposting." });
        }

        await repostTweet(tweetId);

        res.json({ message: "Tweet processed successfully!" });
    } catch (error) {
        res.status(500).json({ error: "Failed to process tweet", details: error.message });
    }
});

router.post("/repost-tweet/:id", async (req, res) => {
    const tweetId = req.params.id;

    try {
        await repostTweet(tweetId);
        res.json({ message: "Tweet Reposted Successfully!" });
    } catch (error) {
        res.status(500).json({ error: "Failed to repost tweet", details: error.message });
    }
});


// ✅ Route to Create a New Post
router.post("/create-post", async (req, res) => {
    const { text, imageUrl } = req.body;

    try {
        const response = await createPost(text, imageUrl);
        res.json(response);
    } catch (error) {
        res.status(500).json({ error: "Failed to create post", details: error.message });
    }
});

module.exports = router;