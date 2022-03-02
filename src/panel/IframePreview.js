import {useEffect, useRef, useState} from 'react'
import styles from './IframePreview.css'
import SanityFetcher from '../fetcher';
import sanityClient from 'part:@sanity/base/client'
import pluginConfig from 'config:@onlyhtml/sanity-plugin-onlyhtml-connector'

export const WebPreview = ({document: doc}) => {
    const {displayed} = doc;
    const {slug, _type} = displayed;

    let url = 'http://localhost:8080';
    if (slug.current) {
        url += `/${_type}/${slug.current}`;
    }

    const iframeRef = useRef(undefined);
    const [records, setRecords] = useState([]);

    useEffect(async () => {
        const fetcher = new SanityFetcher(sanityClient, pluginConfig.blocks);
        setRecords(await fetcher.fetchRecords());
    }, [url]);

    const onIframeLoad = () => {
        console.log('iframe has loaded');
        renderRecords(iframeRef.current, records);
    };

    useEffect(() => {
        console.log('records changed!');
        if (iframeRef) {
            renderRecords(iframeRef.current, records);
        }
    }, [records]);

    return (
        <div className={styles.componentWrapper}>
            <div className={styles.iframeContainer}>
                <iframe src={url} frameBorder={'0'} ref={iframeRef}  onLoad={onIframeLoad}/>
            </div>
        </div>
    );
}

function renderRecords(iframe, records) {
        iframe.contentWindow.postMessage(records, '*');
}

