import React, {useEffect, useMemo, useRef, useState} from 'react'
import styles from './IframePreview.css'
import SanityFetcher from '../fetcher';
import sanityClient from 'part:@sanity/base/client'
import pluginConfig from 'config:@onlyhtml/sanity-plugin-onlyhtml-connector'

export const WebPreview = ({document: doc}) => {
    const {displayed, draft} = doc;
    const {slug, _type} = displayed;

    let url = pluginConfig.previewHost;
    if (!url) {
        return (<div>
            Invalid preivew host in config.
        </div>);
    }
    // TODO change this url behaivour
    // https://docs.netlify.com/routing/redirects/
    if (slug && slug.current) {
        url += `/_${_type}`;
    }

    const iframeRef = useRef(undefined);
    const [records, setRecords] = useState([]);

    // create fetcher once per view
    const fetcher = useMemo(() => {
        console.log('created fetcher!');
        return new SanityFetcher(
            sanityClient.withConfig({
                apiVersion: '2021-02-02',
                useCdn: true,
                withCredentials: true,
            }),
            pluginConfig.blocks
        );
    }, [url]);


    useEffect(() => {
        fetcher.fetchRecords().then(r => {
            console.log('fetcher got records!', r);
            if (r === undefined) {
                console.warn('got undefined records from fetcher');
            }
            setRecords(r)
        }).catch(e => {
            console.error('got error while fetching', e);
        });
    }, [fetcher]);

    useEffect(() => {
        if (!draft) {
            fetcher.fetchRecords().then(r => setRecords(r))
        }
    }, [draft]);

    const onIframeLoad = () => {
        console.log('iframe has loaded');
        renderRecords(iframeRef.current, records);
    };

    useEffect(() => {
        console.log('records changed!', records, 'doc', draft);
        if (!iframeRef) {
            return;
        }

        (async () => {
            const currentDoc = draft || displayed;
            const enrichedRecords = await fetcher.enrichSanityDoc(records, currentDoc);
            console.log('got enriched records', enrichedRecords);
            renderRecords(iframeRef.current, enrichedRecords);
        })();
    }, [records, draft?._rev]);


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
    console.log('sent new records successfully');
}

