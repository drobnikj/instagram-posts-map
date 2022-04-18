import React from 'react';
import CustomMap from './components/CustomMap';

// TODO: This is token from mapbox example, use my own token.
const MAPBOX_ACCESS_TOKEN = 'pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4M29iazA2Z2gycXA4N2pmbDZmangifQ.-g_vE53SD2WrJ6tFX7QHmA';
const INSTAGRAM_USERNAME = '--INSTAGRAM_USERNAME--'; // --INSTAGRAM_USERNAME-- placeholder will be replaced during uploading map to kvs

export default function App() {
    return (
        <div>
            <div className='sidebarStyle left'>
                <a href={`https://www.instagram.com/${INSTAGRAM_USERNAME}/`} target="_blank">
                    <img className="instaIcon" src="/instagram_logo.png" /> <span className="instaText" >@{INSTAGRAM_USERNAME}</span>
                </a>
            </div>
            <div className='sidebarStyle right'>
                <a href={`https://www.apify.com/drobnikj/instagram-posts-map`} target="_blank">
                    <img className="apify" src="/powered_by_apify_white.png" />
                </a>
            </div>
            <CustomMap accessToken={MAPBOX_ACCESS_TOKEN} />
        </div>
    );
}
