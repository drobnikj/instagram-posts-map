// This is the main Node.js source code file of your actor.

// Import Apify SDK. For more information, see https://sdk.apify.com/
const Apify = require('apify');
const { utils: { requestAsBrowser } } = Apify;
const { promisify } = require('util');
const { pipeline } = require('stream');
const axios = require('axios');



Apify.main(async () => {
    // Get input of the actor (here only for demonstration purposes).
    const input = await Apify.getInput();
    console.log('Input:');
    console.dir(input);
    const postsInput = {
        "directUrls": [
            "https://www.instagram.com/jakub_drobnik"
        ],
        "resultsType": "posts",
        "searchType": "hashtag",
        "proxy": {
            "useApifyProxy": true,
            "apifyProxyGroups": [
                "RESIDENTIAL"
            ]
        },
        "likedByLimit": 0,
        "followingLimit": 0,
        "followedByLimit": 0,
        "extendOutputFunction": "async ({ data, item, helpers, page, customData, label }) => {\n  return item;\n}",
        "extendScraperFunction": "async ({ page, request, label, response, helpers, requestQueue, logins, addProfile, addPost, addLocation, addHashtag, doRequest, customData, Apify }) => {\n \n}",
        "expandOwners": false,
        "debugLog": false,
        "resultsLimit": 200,
        "searchLimit": 10,
        "maxRequestRetries": 7,
        "maxErrorCount": 3,
        "cookiesPerConcurrency": 1,
        "customData": {}
    };
    // const run = await Apify.call('jaroslavhejlek/instagram-scraper', postsInput);
    // const ddt = await Apify.openDataset(run.defaultDatasetId, { forceCloud: true });
    const ddt = await Apify.openDataset('Ib0wpopwNgtRgf9OR', { forceCloud: true });
    const posts = await ddt.getData();
    console.log(posts);
    const postsToLocation = {};
    posts.items.forEach((post) => {
        if (post.locationId) {
            postsToLocation[post.locationId] = post;
        }
    });
    const locUrls = Object.keys(postsToLocation)
    .map((locationId) => {
        return `https://www.instagram.com/explore/locations/${locationId}/`;
    });

    const locInput = {
        "directUrls": locUrls,
        "resultsType": "details",
        "searchType": "hashtag",
        "proxy": {
            "useApifyProxy": true,
            "apifyProxyGroups": [
                "RESIDENTIAL"
            ]
        },
        "likedByLimit": 0,
        "followingLimit": 0,
        "followedByLimit": 0,
        "extendOutputFunction": "async ({ data, item, helpers, page, customData, label }) => {\n  return item;\n}",
        "extendScraperFunction": "async ({ page, request, label, response, helpers, requestQueue, logins, addProfile, addPost, addLocation, addHashtag, doRequest, customData, Apify }) => {\n \n}",
        "expandOwners": false,
        "debugLog": false,
        "resultsLimit": 200,
        "searchLimit": 10,
        "maxRequestRetries": 7,
        "maxErrorCount": 3,
        "cookiesPerConcurrency": 1,
        "customData": {}
    }

    // const locRun = await Apify.call('jaroslavhejlek/instagram-scraper', locInput);
    // const ddtLocs = await Apify.openDataset(locRun.defaultDatasetId, { forceCloud: true });
    const ddtLocs = await Apify.openDataset('hKDhzcWhmVFQh8iAO', { forceCloud: true });
    const locations = await ddtLocs.getData({ clean: true });
    const kvsIntaImages = await Apify.openKeyValueStore('insta-img', { forceCloud: true });
    for(const post of posts.items) {
        const imageUrl = post.displayUrl;
        console.log(imageUrl);
        const response = await axios({
            url: imageUrl,
            responseType: "arraybuffer"
        });
        await kvsIntaImages.setValue(`${post.id}.jpg`, response.data, { contentType: 'image/jpeg' });
        console.log(typeof response.data);
        post.kvsImage = kvsIntaImages.getPublicUrl(`${post.id}.jpg`);
        // await promisify(pipeline)(response.data, kvsIntaClient.setRecord(imageUrl));
        console.log(post.kvsImage)
    }
    const geoJson = locations.items.map((location, i) => {
        console.log(location);
        const post = postsToLocation[location.id];
        console.log(post)
        return {
            "type": "Feature",
            "id": i,
            "properties": {
                "image": post.kvsImage,
            },
            "geometry": {
                "type": "Point",
                "coordinates": [
                    location.lng,
                    location.lat
                ]
            }
        }
    });
    console.log(JSON.stringify(geoJson));
    /**
     * Actor code
     */
});
