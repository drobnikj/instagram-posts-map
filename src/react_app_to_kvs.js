const Apify = require('apify');
const fs = require('fs');
const { walk } = require("@root/walk");
const path = require("path");
const mime = require('mime');

const apifyClient = Apify.newClient();

const deployReactAppToKvs = async (appPath, kvsName, filesToReplace = {}, stringToReplace = {}) => {
    const folder = 'build';
    // Named kvs to persist map
    const kvs = await apifyClient.keyValueStores().getOrCreate(kvsName);
    const kvsClient = apifyClient.keyValueStore(kvs.id);
    const kvsRoot = `https://api.apify.com/v2/key-value-stores/${kvs.id}/records/`;
    const filesMap = {};
    const walkFunc = async (err, pathname, dirent) => {
        if (err) {
            throw err;
        }

        if (dirent.isDirectory() && dirent.name.startsWith('.')) {
            return false;
        }

        if (!dirent.isDirectory()) {
            const filePath = path.join(path.dirname(pathname), dirent.name);
            const filePathRel = filePath.replace(new RegExp(`^${folder}/`), '');
            const key = filePathRel.replace(/\//g, '-');
            let content = filesToReplace[dirent.name] ? filesToReplace[dirent.name] : fs.readFileSync(filePath).toString();
            Object.keys(stringToReplace).forEach((str) => {
                content = content.replace(new RegExp(str, 'g'), stringToReplace[str]);
            });
            await kvsClient.setRecord({
                key,
                value: content,
                contentType: mime.getType(filePath),
            });
            filesMap[filePathRel] = key;
        }
    };

    await walk(path.join(__dirname, appPath, folder), walkFunc);
    // Replaces relative paths in index.html with url files from kvs.
    let fileString = fs.readFileSync(path.join(appPath, folder, 'index.html')).toString();
    Object.keys(filesMap).forEach((filePath) => {
        fileString = fileString.replace(new RegExp(`/${filePath}`, 'g'), `${kvsRoot}${filesMap[filePath]}`);
    });
    await kvsClient.setRecord({
        key: 'index.html',
        value: fileString,
        contentType: 'text/html',
    });
};

module.exports = { deployReactAppToKvs };
