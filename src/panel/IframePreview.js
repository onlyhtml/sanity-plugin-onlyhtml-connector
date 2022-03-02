import React, {useEffect, useRef, useState} from 'react'
import styles from './IframePreview.css'
import SanityFetcher from '../fetcher';
import sanityClient from 'part:@sanity/base/client'
import pluginConfig from 'config:@onlyhtml/sanity-plugin-onlyhtml-connector'

export const WebPreview = ({document: doc}) => {
    const {displayed} = doc;
    const {slug, _type} = displayed;

    let url = 'http://localhost:8080';
    // TODO change this url behaivour
    // https://docs.netlify.com/routing/redirects/
    if (slug && slug.current) {
        url += `/_${_type}`;
    }

    const iframeRef = useRef(undefined);
    const [records, setRecords] = useState([]);

    useEffect(() => {
        const fetcher = new SanityFetcher(sanityClient, pluginConfig.blocks);
        (async () => {
            const r = await fetcher.fetchRecords();
            console.log('fetcher got records', r);
            setRecords(r);
        })();
    }, [url]);

    const onIframeLoad = () => {
        console.log('iframe has loaded');
        renderRecords(iframeRef.current, records);
    };

    useEffect(() => {
        console.log('records changed!', records.length);
        if (iframeRef) {
            renderRecords(iframeRef.current, records);
        }
    }, [records]);

    return (
        <div className={styles.componentWrapper}>
            <div className={styles.iframeContainer}>
                <iframe src={url} frameBorder={'0'} ref={iframeRef} onLoad={onIframeLoad} />
            </div>
        </div>
    );
}

function renderRecords(iframe, records) {
    if (!iframe || !records) {
        console.warn('was asked to render undefined iframe or records');
        return;
    }

    iframe.contentWindow.postMessage(records, '*');
}

