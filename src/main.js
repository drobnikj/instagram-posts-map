const Apify = require('apify');
// const HttpsProxyAgent = require('https-proxy-agent');

const { utils: { log } } = Apify;
const axios = require('axios');
const { deployReactAppToKvs } = require('./react_app_to_kvs');

const apifyClient = Apify.newClient();

/**
 * Calls actor with log on stdout.
 * @param actorName
 * @param input
 * @param options
 * @return {Promise<ActorRun|void>}
 */
const callActorWithLog = async (actorName, input, options) => {
    // 2 secs just to init logging
    const run = await Apify.call(actorName, input, { ...options, waitSecs: 2 });
    log.info(`----- Log from run ${run.id} started -----`);
    const logStream = await apifyClient.log(run.id).stream();
    logStream.pipe(process.stdout);
    const finishedRun = await apifyClient.run(run.id).waitForFinish();
    log.info(`----- Log from run ${finishedRun.id} finished -----`);
    return finishedRun;
};

/**
 * Save posts images into kvs
 * Otherwise we cannot render images in react map (content-policy)
 * @param posts
 * @return {Promise<*>}
 */
const savePostImagesInKvs = async (posts, instagramDataKvs) => {
    // Do in series to avoid blocking
    // TODO: Use apify proxy, just need parse it from input.
    // const httpsAgent = new HttpsProxyAgent({
    //     host: 'proxy.apify.com',
    //     port: '8000',
    //     // Replace <YOUR_PROXY_PASSWORD> below with your password
    //     // found at https://console.apify.com/proxy
    //     auth: `groups-RESIDENTIAL:${process.env.APIFY_PROXY_PASSWORD}`,
    // });
    for (const post of posts) {
        const { id, displayUrl } = post;
        const postKey = `${id}.jpg`;
        if (!await instagramDataKvs.getValue(postKey)) {
            try {
                const response = await axios({
                    url: displayUrl,
                    responseType: 'arraybuffer',
                    // httpsAgent,
                });
                await instagramDataKvs.setValue(postKey, response.data, { contentType: 'image/jpeg' });
            } catch (e) {
                log.error('Cannot download image', e);
            }
        }
        post.kvsImage = instagramDataKvs.getPublicUrl(postKey);
    }
    return posts;
};

Apify.main(async () => {
    const input = await Apify.getInput();
    const { maxPosts = 200, proxy } = input;
    // Remove @ from username
    const username = input.username.startsWith('@') ? input.username.slice(1) : input.username;
    log.info(`Instagram username: ${username}`);
    const profileUrl = `https://www.instagram.com/${username}/`;
    log.info(`Loading posts from Instagram profile ${profileUrl}...`);
    // Used name kvs to keep data.
    const kvsIntaData = await Apify.openKeyValueStore(`instagram-data-${username.replace(/[^A-Za-z0-9]/g, '-')}`, { forceCloud: true });
    const postsInput = {
        directUrls: [profileUrl],
        resultsType: 'posts',
        searchType: 'hashtag',
        proxy,
        resultsLimit: maxPosts,
    };
    // Get posts from Instagram
    const run = await callActorWithLog('jaroslavhejlek/instagram-scraper', postsInput, { waitSecs: 1 });
    if (run.status !== 'SUCCEEDED') throw new Error('Cannot load posts!');
    const postsDtt = await Apify.openDataset(run.defaultDatasetId, { forceCloud: true });
    const { items: posts } = await postsDtt.getData();
    log.info(`Found ${posts.length} posts.`);
    // Cache posts with location
    const postsToLocation = {};
    posts.forEach((post) => {
        if (post.locationId) {
            if (!postsToLocation[post.locationId]) postsToLocation[post.locationId] = [];
            postsToLocation[post.locationId].push(post);
        } else {
            log.warning(`Post ${post.url} has no location! Update post to get it into map!`);
        }
    });

    // Get locations of posts, we need them because place coordinates
    const locationsUrls = Object.keys(postsToLocation).map((locationId) => {
        return `https://www.instagram.com/explore/locations/${locationId}/`;
    });
    log.info(`Loading ${locationsUrls.length} location details from Instagram...`);
    const locInput = {
        directUrls: locationsUrls,
        resultsType: 'details',
        searchType: 'hashtag',
        proxy,
        resultsLimit: locationsUrls.length,
    };
    const [locationsRun] = await Promise.all([
        callActorWithLog('jaroslavhejlek/instagram-scraper', locInput),
        savePostImagesInKvs(posts, kvsIntaData),
    ]);
    if (locationsRun.status !== 'SUCCEEDED') throw new Error('Cannot load posts!');
    const locationDtt = await Apify.openDataset(locationsRun.defaultDatasetId, { forceCloud: true });
    const { items: locations } = await locationDtt.getData({ clean: true });
    // Create geojson from the locations
    const mapPoints = [];
    locations.forEach((location, i) => {
        const locId = location.id !== 'undefined' ? location.id : location.locationId;
        const locationPosts = postsToLocation[locId];
        locationPosts.forEach((post) => {
            mapPoints.push({
                type: 'Feature',
                id: i,
                properties: {
                    image: post.kvsImage,
                },
                geometry: {
                    type: 'Point',
                    coordinates: [
                        location.lng,
                        location.lat,
                    ],
                },
            });
        });
    });
    log.info(`Loading from Instagram finished there are ${mapPoints.length} posts ready to show on map.`);
    log.info(`Generating map...`);
    await kvsIntaData.setValue('geo-json', { type: 'FeatureCollection', features: mapPoints });
    await deployReactAppToKvs(
        kvsIntaData,
        '../map',
        { '--INSTAGRAM_USERNAME--': username, '--PLACES--': kvsIntaData.getPublicUrl('geo-json') },
    );
    log.info(`Map generated.`, { url: kvsIntaData.getPublicUrl('index.html') });
    log.info('Done!');
    log.info(`----You can check map on URL:----`);
    log.info(`---- ${kvsIntaData.getPublicUrl('index.html')} ----`);
});
