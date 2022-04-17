# Instagram posts map

## NOTES

### Run scraper to get geojson data.
Login using `apify login`
`cd scraper && apify run`

After copy json into `App.js` line 9.

### Build the map

`cd map && npm install && npm run build`
Upload map into kvs.
`./deploy-to-kvs-test.js`

### Embed the map
```html
<iframe src="https://api.apify.com/v2/key-value-stores/GDOdo4Jzh1UFTzvvp/records/index.html" frameborder="0" style="width: 100%; height: 500px; border: none;" allow="fullscreen"></iframe>
```
