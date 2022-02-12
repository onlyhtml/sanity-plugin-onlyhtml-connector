import React from 'react'
import styles from './IframePreview.css'

export const WebPreview = ({document}) => {
    const {displayed} = document;
    const url = assembleProjectUrl({displayed});

    if (!url) {
      return (<div className={styles.componentWrapper}>
        <p>Hmm. Having problems constructing the web front-end URL.</p>
      </div>);
    }

    return (
        <div className={styles.componentWrapper}>
            <div className={styles.iframeContainer}>
                <iframe src={url} frameBorder={'0'} />
            </div>
        </div>
    );
}

const assembleProjectUrl = ({displayed, options}) => {
    console.log('displayed', displayed);
    const baseUrl = 'http://localhost:5001/onlysites-3fd15/us-central1/render';
    const {slug, _type} = displayed;
    const {previewURL} = options || {};
    if (!slug && !previewURL) {
        console.warn('Missing slug or previewURL', {slug, previewURL});
        return '';
    }

    return `${baseUrl}/${_type}/${slug.current}`;
}
