const axios = require("axios");
const { authenticateRequest, getOAuthHeader } = require("../config/auth"); 
const { BASE_URL, UPLOAD_URL, USER_ID } = require("../config/constants");
require("dotenv").config();

const fs = require("fs");
const FormData = require("form-data");

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


const quoteTweet = async (tweetId, comment) => {
    const url = `https://api.x.com/2/tweets`;
    const headers = getOAuthHeader(url, "POST");

    let attempts = 0;
    const maxRetries = 5;
    let delay = 5000;

    // ✅ Check if the tweet exists before quoting
    const exists = await getTweetDetails(tweetId);
    if (!exists) {
        throw new Error("Tweet does not exist, cannot quote tweet.");
    }

    while (attempts < maxRetries) {
        try {
            const postData = {
                text: comment,
                quote_tweet_id: tweetId 
            };

            const response = await axios.post(url, postData, { headers });
            console.log("✅ Quote Tweet Posted Successfully!");
            return response.data;
        } catch (error) {
            if (error.response?.status === 429) {
                console.log(`⏳ Rate limit reached. Retrying in ${delay / 1000} seconds...`);
                await new Promise((resolve) => setTimeout(resolve, delay));
                delay *= 2;
                attempts++;
            } else {
                console.error("❌ Error Posting Quote Tweet:", error.response?.data || error.message);
                throw error;
            }
        }
    }

    throw new Error("❌ Too many failed requests. Try again later.");
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
async function uploadMedia(imageUrl) {
    try {
        // ✅ Step 1: Download the image
        const response = await axios.get(imageUrl, { responseType: "arraybuffer" });
        const tempFilePath = "./temp_image.jpg";

        // ✅ Step 2: Save the image locally
        fs.writeFileSync(tempFilePath, response.data);

        // ✅ Step 3: Prepare multipart/form-data request
        const formData = new FormData();
        formData.append("media", fs.createReadStream(tempFilePath)); // ✅ Fix: Ensure 'media' parameter is present

        // ✅ Step 4: Set OAuth headers correctly
        const url = "https://upload.twitter.com/1.1/media/upload.json";
        const headers = {
            ...getOAuthHeader(url, "POST"),
            ...formData.getHeaders(), // ✅ Fix: Include FormData headers
        };

        // ✅ Step 5: Send the media upload request
        const twitterResponse = await axios.post(url, formData, { headers });

        // ✅ Step 6: Delete temp file after upload
        fs.unlinkSync(tempFilePath);

        // ✅ Step 7: Return success response
        return { message: "Media Uploaded Successfully!", media_id: twitterResponse.data.media_id_string };
    } catch (error) {
        console.error("❌ Media Upload Error:", error.response?.data || error.message);
        return { error: "Media upload failed. Ensure image URL is correct and API tokens are valid." };
    }
}


module.exports = { getTweetDetails, quoteTweet, checkTweetType, uploadMedia, retweet, createPost };
