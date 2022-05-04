const Apify = require('apify');
const fs = require('fs');
const { walk } = require('@root/walk');
const path = require('path');
const mime = require('mime');

const deployReactAppToKvs = async (kvsIntaData, appPath, stringToReplace = {}) => {
    const folder = 'build';
    const buildFolder = path.join(__dirname, appPath, folder);
    const kvsRootUrl = kvsIntaData.getPublicUrl('');
    const filesMap = {};
    const walkFunc = async (err, pathname, dirent) => {
        if (err) {
            throw err;
        }

        if (dirent.name.startsWith('.')) {
            return false;
        }

        if (!dirent.isDirectory()) {
            const filePath = path.join(path.dirname(pathname), dirent.name);
            let filePathRel = filePath.replace(new RegExp(`^${buildFolder}/`), '');
            // consider all /public files as root ones
            filePathRel = filePathRel.replace('public/', '');
            const key = filePathRel.replace(/\//g, '-');
            const content = fs.readFileSync(filePath);
            filesMap[filePathRel] = {
                key,
                contentType: mime.getType(filePath),
                content,
            };
        }
    };
    // Find all resource of app to upload
    await walk(buildFolder, walkFunc);
    // Upload all resources to KVS
    for (const file of Object.values(filesMap)) {
        const { key, contentType } = file;
        let { content } = file;
        if (contentType.includes('text') || contentType.includes('application')) {
            content = content.toString();
            Object.keys(filesMap).forEach((filePath) => {
                content = content.replace(new RegExp(`/${filePath}`, 'g'), `${kvsRootUrl}${filesMap[filePath].key}`);
                Object.keys(stringToReplace).forEach((str) => {
                    content = content.replace(new RegExp(str, 'g'), stringToReplace[str]);
                });
            });
        }
        await kvsIntaData.setValue(key, content, {
            contentType,
        });
    }
};

module.exports = { deployReactAppToKvs };
