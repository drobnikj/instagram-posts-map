import React, { useRef, useEffect, useState } from 'react';
import mapboxgl from '!mapbox-gl'; // eslint-disable-line import/no-webpack-loader-syntax

mapboxgl.accessToken =
    'pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4M29iazA2Z2gycXA4N2pmbDZmangifQ.-g_vE53SD2WrJ6tFX7QHmA';

const geojson = {
  'type': 'FeatureCollection',
  'features': [{"type":"Feature","id":0,"properties":{"image":"https://api.apify.com/v2/key-value-stores/A23WttM2YrSWZJhKf/records/2712064481155814600.jpg"},"geometry":{"type":"Point","coordinates":[-112.9930114746,37.1975184212]}},{"type":"Feature","id":1,"properties":{"image":"https://api.apify.com/v2/key-value-stores/A23WttM2YrSWZJhKf/records/2681655517717468143.jpg"},"geometry":{"type":"Point","coordinates":[-118.2445,34.0564]}},{"type":"Feature","id":2,"properties":{"image":"https://api.apify.com/v2/key-value-stores/A23WttM2YrSWZJhKf/records/2738028087493381217.jpg"},"geometry":{"type":"Point","coordinates":[-122.4351221323,37.7618008768]}},{"type":"Feature","id":3,"properties":{"image":"https://api.apify.com/v2/key-value-stores/A23WttM2YrSWZJhKf/records/1582643987394934520.jpg"},"geometry":{"type":"Point","coordinates":[25.4592048725,35.2932198608]}},{"type":"Feature","id":4,"properties":{"image":"https://api.apify.com/v2/key-value-stores/A23WttM2YrSWZJhKf/records/2367017537714318869.jpg"},"geometry":{"type":"Point","coordinates":[19.81109611,39.79679889]}},{"type":"Feature","id":5,"properties":{"image":"https://api.apify.com/v2/key-value-stores/A23WttM2YrSWZJhKf/records/2807253227303803629.jpg"},"geometry":{"type":"Point","coordinates":[-89.5190777699,-0.7778443139]}},{"type":"Feature","id":6,"properties":{"image":"https://api.apify.com/v2/key-value-stores/A23WttM2YrSWZJhKf/records/1527780633719648750.jpg"},"geometry":{"type":"Point","coordinates":[14.4478769874,50.0958849003]}},{"type":"Feature","id":7,"properties":{"image":"https://api.apify.com/v2/key-value-stores/A23WttM2YrSWZJhKf/records/2760068180290671908.jpg"},"geometry":{"type":"Point","coordinates":[-89.6249704721,20.966472324]}},{"type":"Feature","id":8,"properties":{"image":"https://api.apify.com/v2/key-value-stores/A23WttM2YrSWZJhKf/records/2717323973121314307.jpg"},"geometry":{"type":"Point","coordinates":[-119.5903873444,37.7468968077]}},{"type":"Feature","id":9,"properties":{"image":"https://api.apify.com/v2/key-value-stores/A23WttM2YrSWZJhKf/records/2234958325572993351.jpg"},"geometry":{"type":"Point","coordinates":[7.7952777778,60.4702777778]}},{"type":"Feature","id":10,"properties":{"image":"https://api.apify.com/v2/key-value-stores/A23WttM2YrSWZJhKf/records/2776466588890866428.jpg"},"geometry":{"type":"Point","coordinates":[-90.8827777778,14.4827777778]}},{"type":"Feature","id":11,"properties":{"image":"https://api.apify.com/v2/key-value-stores/A23WttM2YrSWZJhKf/records/2797069598036546414.jpg"},"geometry":{"type":"Point","coordinates":[-90.3515625,-0.5273363048]}}],
};

mapboxgl.accessToken = 'pk.eyJ1IjoiZHJvYm5pa2oiLCJhIjoiY2wwYWRnbDB1MGJyYjNqcnRic3MzcjBkbSJ9.bPu4FgZSiyUCChDkPRHBYg';

export default function App() {
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
        data: geojson,  //"https://docs.mapbox.com/mapbox-gl-js/assets/earthquakes.geojson",
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
        layout: {
          // visibility: 'none'
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

      const updateMarkers = async () => {
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
            const childFeatures = await new Promise((resolve, reject) => {
              guatemalaClustersource.getClusterChildren(clusterID, (err, features) => {
                if (err) {
                  reject(err);
                } else {
                  resolve(features);
                }
              });
            });
            const expansionZoom = await new Promise((resolve, reject) => {
              guatemalaClustersource.getClusterExpansionZoom(clusterID, function (err, zoom) {
                if (err) return reject(err);
                resolve(zoom)
              });
            })

            let main;
            for (const childFeat of childFeatures) {
              if (childFeat.properties.image) {
                main = childFeat;
                break;
              }
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
            el.innerText = props.point_count;

            // TODO: Still not work correctly
            // el.addEventListener('click', (e) => {
            //   map.flyTo({
            //     center: coords,
            //     zoom: expansionZoom,
            //   });
            // });

            const marker = new mapboxgl.Marker({ element: el }).setLngLat(coords);
            marker.addTo(map);
            keepMarkers.push('cluster_' + featureID);
            markers.set('cluster_' + clusterID, el);
          } else if (markers.has(featureID)) {
            // This feature is clustered, create an icon for it and use props.point_count for its count
            // Feature marker is already on screen
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
            const marker = new mapboxgl.Marker({ element: el, anchor: 'bottom' }).setLngLat(coords);
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
      setLng(map.getCenter().lng.toFixed(4));
      setLat(map.getCenter().lat.toFixed(4));
      setZoom(map.getZoom().toFixed(2));
    });

    // Clean up on unmount
    return () => map.remove();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
      <div>
        <div className='sidebarStyle'>
          <div>
            Longitude: {lng} | Latitude: {lat} | Zoom: {zoom}
          </div>
        </div>
        <div className='map-container' ref={mapContainerRef} />
      </div>
  );
}
