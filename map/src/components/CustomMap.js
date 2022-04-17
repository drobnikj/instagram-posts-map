import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from '!mapbox-gl'; // eslint-disable-line import/no-webpack-loader-syntax
// import places from '../places.json'; // Uncomment to test on local
const places = '--PLACES--' // --PLACES-- placeholder will be replaced during uploading map into kvs

export default function CustomMap(props) {
    mapboxgl.accessToken = props.accessToken;
    const mapContainerRef = useRef(null);

    const [lng, setLng] = useState(-8);
    const [lat, setLat] = useState(26);
    const [zoom, setZoom] = useState(2);

    // Initialize map when component mounts
    useEffect(() => {
        const map = new mapboxgl.Map({
            container: mapContainerRef.current,
            style: 'mapbox://styles/mapbox/streets-v11',
            center: [lng, lat],
            zoom: zoom
        });

        map.on('load', () => {
            map.addSource("guatemala-places", {
                // TODO: Use own ID in the source
                // generateId: true,
                type: "geojson",
                data: places,
                cluster: true,
                clusterMaxZoom: 12, // Max zoom to cluster points on
                clusterRadius: 50 // Radius of each cluster when clustering points (defaults to 50)
            });

            map.addLayer({
                id: "guatemala-clusters",
                type: "circle",
                source: "guatemala-places",
                filter: ["has", "point_count"],
                paint: {
                    "circle-radius": 0
                },
            });

            map.addLayer({
                id: "guatemala-points",
                type: "circle",
                source: "guatemala-places",
                filter: ["!=", "cluster", true],
                paint: {
                    // "circle-radius": 10
                    "circle-radius": 0
                },
                layout: {
                    // Make the layer visible by default.
                    // visibility: 'none'
                },
            });

            // Store IDs and cluster/marker HTMLElements
            const markers = new Map();
            let isUpdating = false;

            const updateMarkers = async () => {
                console.time('updateMarkers');
                if (isUpdating) return;
                else isUpdating = true;
                const features = map.querySourceFeatures('guatemala-places');
                const keepMarkers = [];

                for (let i = 0; i < features.length; i++) {
                    const coords = features[i].geometry.coordinates;
                    const props = features[i].properties;
                    const featureID = features[i].id;

                    const clusterID = props.cluster_id || null;

                    if (props.cluster && markers.has('cluster_' + clusterID)) {

                        //Cluster marker is already on screen
                        keepMarkers.push('cluster_' + clusterID);

                    } else if (props.cluster) {
                        const guatemalaClustersource = map.getSource(/* cluster layer data source id */'guatemala-places');
                        const getChildFeaturesPromise = (clusterId) => new Promise((resolve, reject) => {
                            guatemalaClustersource.getClusterChildren(clusterId, (err, features) => {
                                if (err) {
                                    reject(err);
                                } else {
                                    resolve(features);
                                }
                            });
                        });

                        let main;
                        let childClusterId = clusterID
                        while(!main) {
                            let childFeatures = await getChildFeaturesPromise(childClusterId);
                            for (const childFeat of childFeatures) {
                                if (childFeat.properties.image) {
                                    main = childFeat;
                                    break;
                                }
                            }
                            childClusterId = childFeatures[0].properties.cluster_id;
                        }


                        const el = document.createElement('div');
                        const width = 70;
                        const height = 70;
                        el.className = 'marker-cluster';
                        if (main) el.style.backgroundImage = `url(${main.properties.image})`;
                        el.style.width = `${width}px`;
                        el.style.height = `${height}px`;
                        el.style.backgroundSize = '100%';
                        el.dataset.type = props.type;
                        const count = document.createElement('div')
                        count.className = 'circle-txt';
                        count.innerText = props.point_count;
                        el.appendChild(count);

                        // const expansionZoom = await new Promise((resolve, reject) => {
                        //     guatemalaClustersource.getClusterExpansionZoom(clusterID, function (err, zoom) {
                        //         if (err) return reject(err);
                        //         resolve(zoom)
                        //     });
                        // })
                        // TODO: Still not work correctly
                        // el.addEventListener('click', (e) => {
                        //   map.flyTo({
                        //     center: coords,
                        //     zoom: expansionZoom,
                        //   });
                        // });

                        const marker = new mapboxgl.Marker({ element: el }).setLngLat(coords)
                        marker.addTo(map);
                        keepMarkers.push('cluster_' + featureID);
                        markers.set('cluster_' + clusterID, el);
                    } else if (markers.has(featureID)) {
                        // This feature is clustered, create an icon for it and use
                        // props.point_count for its count Feature marker is already on screen
                        keepMarkers.push(featureID);
                    } else {
                        // Feature is not clustered and has not been created, create an icon for it
                        const el = document.createElement('div');
                        const width = 50;
                        const height = 50;
                        el.className = 'marker';
                        el.style.backgroundImage = `url(${props.image})`;
                        el.style.width = `${width}px`;
                        el.style.height = `${height}px`;
                        el.style.backgroundSize = '100%';
                        el.dataset.type = props.type;
                        const marker = new mapboxgl.Marker({
                            element: el,
                            anchor: 'bottom'
                        }).setLngLat(coords)
                        .setPopup(
                            new mapboxgl.Popup({ offset: 25 }) // add popups
                            .setHTML(`<div class="post">
                <img src="${props.image}" class="post-image" alt=""></div>`
                            )
                        )
                        marker.addTo(map);
                        keepMarkers.push(featureID);
                        markers.set(featureID, el);
                    }

                }

                // Let's clean-up any old markers. Loop through all markers
                markers.forEach((value, key, map) => {
                    // If marker exists but is not in the keep array
                    if (keepMarkers.indexOf(key) === -1) {
                        // Remove it from the page
                        value.remove();
                        // Remove it from markers map
                        map.delete(key);
                    }
                });
                isUpdating = false;
                console.timeEnd('updateMarkers');
            }

            map.on('click', 'guatemala-points', (e) => {
                map.flyTo({
                    center: e.features[0].geometry.coordinates
                });
            });

            // Change the cursor to a pointer when the it enters a feature in the 'circle' layer.
            map.on('mouseenter', 'guatemala-points', () => {
                map.getCanvas().style.cursor = 'pointer';
            });

            // Change it back to a pointer when it leaves.
            map.on('mouseleave', 'guatemala-points', () => {
                map.getCanvas().style.cursor = 'default';
            });

            map.on('data', (e) => {
                if (e.sourceId !== 'guatemala-places' || !e.isSourceLoaded) return;
                map.on('moveend', updateMarkers); // moveend also fires on zoomend
                updateMarkers();
            });


        });

        // Helper to see coord in the map
        map.on('move', () => {
            setLng(map.getCenter()
            .lng
            .toFixed(4));
            setLat(map.getCenter()
            .lat
            .toFixed(4));
            setZoom(map.getZoom()
            .toFixed(2));
        });

        // Clean up on unmount
        return () => map.remove();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <div>
            <div className='map-container' ref={mapContainerRef}/>
        </div>
    );
}
