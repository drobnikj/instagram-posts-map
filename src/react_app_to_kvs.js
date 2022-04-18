const Apify = require('apify');
const fs = require('fs');
const { walk } = require('@root/walk');
const path = require('path');
const mime = require('mime');

const deployReactAppToKvs = async (kvsIntaData, appPath, kvsName, filesToReplace = {}, stringToReplace = {}) => {
    const folder = 'build';
    const buildFolder = path.join(__dirname, appPath, folder);
    const kvsRootUrl = kvsIntaData.getPublicUrl('');
    const filesMap = {};
    const walkFunc = async (err, pathname, dirent) => {
        if (err) {
            throw err;
        }

        if (dirent.name.startsWith(".")) {
            return false;
        }

        if (!dirent.isDirectory()) {
            const filePath = path.join(path.dirname(pathname), dirent.name);
            const filePathRel = filePath.replace(new RegExp(`^${buildFolder}/`), '');
            const key = filePathRel.replace(/\//g, '-');
            let content = filesToReplace[dirent.name] ? filesToReplace[dirent.name] : fs.readFileSync(filePath).toString();
            Object.keys(stringToReplace).forEach((str) => {
                content = content.replace(new RegExp(str, 'g'), stringToReplace[str]);
            });
            await kvsIntaData.setValue(key, content, {
                contentType: mime.getType(filePath),
            });
            filesMap[filePathRel] = key;
        }
    };
    await walk(buildFolder, walkFunc);
    // Replaces relative paths in index.html with url files from kvs.
    let fileString = fs.readFileSync(path.join(buildFolder, 'index.html')).toString();
    Object.keys(filesMap).forEach((filePath) => {
        fileString = fileString.replace(new RegExp(`/${filePath}`, 'g'), `${kvsRootUrl}${filesMap[filePath]}`);
        Object.keys(stringToReplace).forEach((str) => {
            fileString = fileString.replace(new RegExp(str, 'g'), stringToReplace[str]);
        });
    });
    await kvsIntaData.setValue('index.html', fileString, {
        contentType: 'text/html',
    });
};

module.exports = { deployReactAppToKvs };
