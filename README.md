# Instagram posts into map

This tool creates a nice map of Instagram posts for your timeline.

![example map](./images/map-example.jpeg)
You can see live example of the [map here](https://api.apify.com/v2/key-value-stores/YjrOVaZkvIdP2Nfr9/records/index.html).

## Embed map on your blog or website

You can embed the map into your blog or any other website by using this HTML code.
(replace `src` with URL of the map which will be generated by the tool):

```html
<iframe src="https://api.apify.com/v2/key-value-stores/YjrOVaZkvIdP2Nfr9/records/index.html" frameborder="0" style="width: 100%; height: 500px; border: none;" allow="fullscreen"></iframe>
```

## Notes

* For the best results, you need to have set up location at the most of your IG posts. If you don't have location set up, you can simply edit your post.
* The tool uses [Instagram scraper](https://apify.com/jaroslavhejlek/instagram-scraper) under the hood. Please check this scraper to get more information about usage and proxies.
