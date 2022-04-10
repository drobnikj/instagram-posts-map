const { ApifyClient } = require('apify-client');
const fs = require('fs');
const { walk } = require("@root/walk");
const path = require("path");
const mime = require('mime');

const apifyClient = new ApifyClient({ token: process.env.APIFY_TOKEN });





(async () => {
    const user = await apifyClient.user('me').get()
    const folder = 'build';
    console.log(user)
    const kvs = await apifyClient.keyValueStores().getOrCreate('map-test');
    const kvsClient = apifyClient.keyValueStore(kvs.id);
    const kvsRoot = `https://api.apify.com/v2/key-value-stores/${kvs.id}/records/`;
    const filesMap = {

    };
    const walkFunc = async (err, pathname, dirent) => {
        if (err) {
            throw err;
        }

        if (dirent.isDirectory() && dirent.name.startsWith(".")) {
            return false;
        }

        if (!dirent.isDirectory()) {
            // console.log("name:", dirent.name, "in", path.dirname(pathname));
            const filePath = path.join(path.dirname(pathname), dirent.name)
            const filePatRel = filePath.replace(new RegExp(`^${folder}/`), '')
            const key = filePatRel.replace(/\//g, '-');
            console.log(filePath);
            console.log(mime.getType(filePath))
            console.log(key);
            await kvsClient.setRecord({
                key,
                value: fs.readFileSync(filePath),
                contentType: mime.getType(filePath)
            });
            filesMap[filePatRel] = key;
        }

    };

    await walk(`./${folder}`, walkFunc);
    console.log(filesMap);
    // fix index.html
    let fileString = fs.readFileSync(path.join(folder, 'index.html')).toString();
    Object.keys(filesMap).forEach((filePath) => {
        fileString = fileString.replace(new RegExp(`/${filePath}`, 'g'), `${kvsRoot}${filesMap[filePath]}`);
    });
    await kvsClient.setRecord({
        key: 'index.html',
        value: fileString,
        contentType: 'text/html'
    });
})()
