const axios = require("axios");
const { authenticateRequest, getOAuthHeader } = require("../config/auth"); 
const { BASE_URL, UPLOAD_URL, USER_ID } = require("../config/constants");
require("dotenv").config();

const fs = require("fs");
const FormData = require("form-data");
const path = require("path");

const IMAGE_DIR = path.join(__dirname, "..", "uploads"); // Ensure images are stored in uploads/

if (!fs.existsSync(IMAGE_DIR)) {
    fs.mkdirSync(IMAGE_DIR, { recursive: true });
}

    


// ✅ Function to Get Tweet Details
const getTweetDetails = async (tweetId) => {
    const url = `https://api.x.com/2/tweets/${tweetId}`;
    const headers = getOAuthHeader(url, "GET");

    let attempts = 0;
    const maxRetries = 5;
    let delay = 5000;

    while (attempts < maxRetries) {
        try {
            const response = await axios.get(url, { headers });
            console.log("✅ Tweet Details Fetched Successfully!");
            return response.data;
        } catch (error) {
            if (error.response?.status === 429) {
                console.log(`⏳ Rate limit reached. Retrying in ${delay / 1000} seconds...`);
                await new Promise((resolve) => setTimeout(resolve, delay));
                delay *= 2;
                attempts++;
            } else {
                console.error("❌ Error Fetching Tweet:", error.response?.data || error.message);
                throw error;
            }
        }
    }

    throw new Error("❌ Too many failed requests. Try again later.");
};




// ✅ **Fix Retweet Function**
async function retweet(tweetId) {
    const url = `${BASE_URL}/users/${USER_ID}/retweets`;
    const headers = getOAuthHeader(url, "POST");

    try {
        const tweetDetails = await getTweetDetails(tweetId);

        if (!tweetDetails) {
            console.error("❌ Tweet details could not be retrieved. Skipping retweet.");
            return { error: "Tweet not found or API request failed." };
        }

        if (tweetDetails.data.retweeted) {
            console.log("⚠️ Tweet has already been retweeted. Skipping.");
            return { message: "Tweet already retweeted." };
        }

        let attempts = 0;
        const maxRetries = 2; // ✅ Reduce retries to 2 (instead of 3-5)
        let delay = 5000; // ✅ Start with a 5-second delay

        while (attempts < maxRetries) {
            try {
                const response = await axios.post(url, { tweet_id: tweetId }, { headers });

                if (response.data.errors) {
                    console.error("❌ Retweet Error:", response.data.errors);
                    
                    if (response.data.errors[0].code === 88) {
                        return { error: "Rate limit exceeded. No more retweets allowed." }; // ✅ Stop retrying
                    }
                }

                console.log("✅ Retweet Successful!");
                return response.data;
            } catch (error) {
                if (error.response?.status === 429) {
                    console.log(`⏳ Rate limit reached. Retrying in ${delay / 1000} seconds...`);
                    await new Promise((resolve) => setTimeout(resolve, delay));
                    delay *= 2;
                    attempts++;
                } else {
                    console.error("❌ Retweet Error:", error.response?.data || error.message);
                    return { error: "Failed to retweet. Possible rate limit issue." };
                }
            }
        }

        return { error: "Too many failed attempts. Retweet blocked by API." };
    } catch (error) {
        console.error("❌ Retweet Error:", error.response?.data || error.message);
        return { error: "Retweet failed. Please try again later." };
    }
}

// ✅ Function to Create a New Post
const createPost = async (text, mediaPath = null) => {
    const url = `${BASE_URL}/tweets`;
    const headers = getOAuthHeader(url, "POST");

    let postData = { text };

    if (mediaPath) {
        console.log("📷 Uploading Media...");
        const mediaId = await uploadMedia(mediaPath);
        if (!mediaId) {
            throw new Error("❌ Media upload failed. No media ID received.");
        }

        postData.media = { media_ids: [mediaId] }; // ✅ Ensure correct format
    }

    try {
        const response = await axios.post(url, postData, { headers });
        console.log("✅ Post Created Successfully!");
        return response.data;
    } catch (error) {
        console.error("❌ Error Creating Post:", error.response?.data || error.message);
        throw error;
    }
};


const quoteTweet = async (tweetId, comment, media_id) => {
    try {
        let tweetData = {
            quote_tweet_id: tweetId,  // ✅ Uses X.com's built-in quote system
            text: comment,            // ✅ Only the quote text, nothing else
        };

        // ✅ If media is provided, attach it
        if (media_id) {
            tweetData.media = { media_ids: [media_id] };
        }

        const response = await axios.post(
            `${BASE_URL}/tweets`,
            tweetData,
            { headers: getOAuthHeader(`${BASE_URL}/tweets`, "POST") }
        );

        return response.data;
    } catch (error) {
        console.error("❌ Quote Tweet Error:", error.response?.data || error.message);
        throw new Error("Quote tweet failed.");
    }
};


// ✅ Function to Check Tweet Type (Avoids Reposts/Quotes)
const checkTweetType = async (tweetId) => {
    const url = `${BASE_URL}/tweets/${tweetId}`;
    const headers = getOAuthHeader(url, "GET");

    let attempts = 0;
    const maxRetries = 5;
    let delay = 5000;

    while (attempts < maxRetries) {
        try {
            const response = await axios.get(url, { headers });
            if (!response.data || !response.data.data) {
                console.log("❌ Tweet Not Found - Skipping Repost");
                return true;
            }

            const postData = response.data.data;
            console.log("✅ Tweet Data Received:", postData);

            if (postData.referenced_tweets) {
                const isRepost = postData.referenced_tweets.some(
                    (tweet) => tweet.type === "retweeted" || tweet.type === "quoted"
                );
                if (isRepost) {
                    console.log("❌ Tweet is a Retweet or Quote Tweet - Skipping Repost");
                    return true;
                }
            }

            return false;
        } catch (error) {
            if (error.response?.status === 429) {
                console.log(`⏳ Rate limit reached. Retrying in ${delay / 1000} seconds...`);
                await new Promise((resolve) => setTimeout(resolve, delay));
                delay *= 2;
                attempts++;
            } else {
                console.error("❌ Error checking tweet type:", error.response?.data || error.message);
                return true; // Fail-safe: Avoid reposting unknown tweet types
            }
        }
    }

    throw new Error("❌ Too many failed requests. Try again later.");
};

// ✅ Function to Upload Media


// ✅ **Fix Image Upload Issue**
// ✅ Function to Upload Media
const uploadMedia = async (imageUrl) => {
    try {
        console.log("⬆ Downloading image:", imageUrl);

        // Download image data
        const response = await axios.get(imageUrl, { responseType: "arraybuffer" });
        const fileName = `uploaded_${Date.now()}.jpg`;
        const filePath = path.join(IMAGE_DIR, fileName);

        fs.writeFileSync(filePath, response.data);

        // Prepare for X.com API upload
        const formData = new FormData();
        formData.append("media", fs.createReadStream(filePath));

        const headers = {
            ...getOAuthHeader(UPLOAD_URL, "POST"),
            ...formData.getHeaders(),
        };

        const uploadResponse = await axios.post(UPLOAD_URL, formData, { headers });
        console.log("✅ Media Uploaded Successfully:", uploadResponse.data);

        return uploadResponse.data.media_id_string;
    } catch (error) {
        console.error("❌ Media Upload Error:", error.response?.data || error.message);
        return null;
    }
};

// ✅ Function to Clean Up Old Images
const cleanupOldImages = (days = 7) => {
    const now = Date.now();
    const cutoffTime = now - days * 24 * 60 * 60 * 1000;

    fs.readdir(IMAGE_DIR, (err, files) => {
        if (err) {
            console.error("❌ Error reading image directory:", err);
            return;
        }

        files.forEach(file => {
            const filePath = path.join(IMAGE_DIR, file);
            fs.stat(filePath, (err, stats) => {
                if (err) {
                    console.error("❌ Error getting file stats:", err);
                    return;
                }

                if (stats.mtimeMs < cutoffTime) {
                    fs.unlink(filePath, err => {
                        if (err) {
                            console.error("❌ Error deleting file:", err);
                        } else {
                            console.log(`🗑 Deleted old image: ${filePath}`);
                        }
                    });
                }
            });
        });
    });
};

// Run cleanup every day
setInterval(() => cleanupOldImages(7), 24 * 60 * 60 * 1000);

module.exports = { getTweetDetails, quoteTweet, checkTweetType, uploadMedia, retweet, createPost };
