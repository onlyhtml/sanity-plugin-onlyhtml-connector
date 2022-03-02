import parse5 from 'parse5'
import blocksToHtml from '@sanity/block-content-to-html'
import imageUrlBuilder from '@sanity/image-url'

const BlockTypeCollection = 'collection';
export class ChangeType {
    static UPDATE_OR_CREATE = 'update_or_create';
    static DELETE = 'delete';
}

export default class SanityFetcher {

    /**
     * @param sanityConfig {object} config info for sanity
     * @param blocks {Map<string, Block>} mapping between type to block schema
     */
    constructor(sanityClient, blocks) {
        this.sanity = sanityClient;
        this.sanityConfig = sanityClient.config();
        this.blocks = getBlocksMap(blocks);
        this.query = '*[_type in $types] { ..., "order": coalesce(order, 0) } | order(order asc)';
        this.params = {
            types: Object.keys(this.blocks)
        }

        console.log('[fetcher] new instance', this.query, this.params, this.blocks.length);
    }

    /*
     * @returns {Promise<object>} a map from blockName -> document | list of documents 
     */
    async fetchRecords() {
        console.log('[fetcher] this?', this);
        // sanity returns a flat list of documents
        // the _type field is equivilent to the name of the field in interneto block
        const sanityDocs = await this.sanity.fetch(this.query, this.params);
        console.log('[fetcher] sanity docs:', sanityDocs);

        const records = {};
        for (const sanityDoc of sanityDocs) {
            this.blocks[sanityDoc._type];
            if (this.blocks[sanityDoc._type].type == BlockTypeCollection) {
                records[sanityDoc._type] = records[sanityDoc._type] || [];
                records[sanityDoc._type].push(await this._prepareDoc(sanityDoc));
                Object.assign(records, await this._prepareDirectChildren(sanityDoc));
                continue;
            }

            records[sanityDoc._type] = await this._prepareDoc(sanityDoc);
            Object.assign(records, await this._prepareDirectChildren(sanityDoc));
        }

        return records;
    }

    async _prepareDirectChildren(doc) {
        const block = this.blocks[doc._type];
        if (block === undefined) {return {};}
        return await this._prepareDirectChildrenWithBlock(doc, block);
    }

    async _prepareDirectChildrenWithBlock(doc, block) {
        if (!block.directChildren) {
            return {};
        }

        let internalRecords = {};
        for (const childBlock of block.directChildren) {
            if (!(childBlock.id in doc)) {
                continue
            }

            if (childBlock.type === BlockTypeCollection) {
                let childDocs = doc[childBlock.id];
                internalRecords[childBlock.id] = await Promise.all(childDocs.map(doc => {
                    if (doc.directChildren !== undefined && doc.directChildren.length !== 0) {
                        throw new Error("Unimlemented, direct children of child array");
                    }

                    return this._prepareDocWithBlock(doc, childBlock);
                }));

                continue;
            }

            const childDoc = doc[childBlock.id];
            internalRecords[childBlock.id] = await this._prepareDocWithBlock(childDoc, childBlock);
            Object.assign(internalRecords, await this._prepareDirectChildrenWithBlock(childDoc, childBlock));
        }

        return internalRecords;
    }

    async _prepareDoc(doc) {
        const block = this.blocks[doc._type];
        return await this._prepareDocWithBlock(doc, block);
    }


    async _prepareDocWithBlock(doc, block) {
        if (block === undefined) {
            throw new Error(`no block with type ${doc._type}`);
        }

        for (const field of block.fields) {
            if (!(field.id in doc)) {
                // field is in schema decleration but not in document
                continue;
            }

            // copy value so if we edit it we dont change the original field type
            let fieldType = field.type;

            // handle references before other types so we can handle references to images too
            if (fieldType === 'reference' && Array.isArray(doc[field.id]) === true) {
                const refs = doc[field.id].map(d => d._ref);
                const refDocs = await this.sanity.fetch('*[_id in $refs]', {refs: refs});
                doc[field.id] = refDocs;
                fieldType = 'array';
            }
            else if (fieldType === 'reference') {
                const refDoc = await this.sanity.fetch('*[_id == $_ref]', {_ref: doc[field.id]._ref});
                doc[field.id] = refDoc;
            }

            if (fieldType === 'array') {
                const newDocs = [];
                // recursive resolving for array of references
                for (const innerDoc of doc[field.id]) {
                    newDocs.push(await this._prepareDoc(innerDoc));
                }
                doc[field.id] = newDocs;
            }

            if (fieldType === 'html') {
                doc[field.id] = this._prepareHtmlField(doc[field.id]);
            }

            if (fieldType === 'image') {
                doc[field.id] = this._prepareImageField(doc[field.id]);
            }

            if (fieldType === 'video') {
                doc[field.id] = await this._prepareVideoField(doc[field.id]);
            }
        }

        if (block.type == BlockTypeCollection && doc.slug) {
            doc._permalink = `/${doc._type}/${doc.slug.current}`;
        }

        return doc;
    }

    _prepareHtmlField(source) {
        return blocksToHtml({
            blocks: source,
            projectId: this.sanityConfig.projectId,
            dataset: this.sanityConfig.dataset,
            serializers: {
                types: {
                    code: this._prepareHtmlCodeSection.bind(this),
                    raw: this._prepareRawSection.bind(this),
                    table: this._prepareTableSection.bind(this),
                }
            }
        });
    }

    _prepareTableSection(props) {
        const h = blocksToHtml.h;

        const rows = props.node.rows;
        if (rows.length < 1) {return '';}

        return h('table',
            h('tr', rows[0].cells.map(cell => h('th', cell))),
            rows.slice(1).map(row => {
                return h('tr',
                    row.cells.map(cell => h('td', cell)),
                )
            })
        );
    }

    _prepareHtmlCodeSection(props) {
        // `h` is a way to build HTML known as hyperscript
        const h = blocksToHtml.h;
        const className = `${props.node.language} language-${props.node.language}`;
        return h('pre', {className: className},
            h('code', {className: className}, props.node.code),
        );
    }

    _prepareRawSection(props) {
        return htmlToHyperscript(props.node.code);
    }

    _prepareImageField(source) {
        const builder = imageUrlBuilder(this.sanity);
        return builder.image(source).url();
    }

    async _prepareVideoField(source) {
        const assetDocument = await this.sanity.getDocument(source.asset._ref);
        return `mux:${assetDocument.playbackId}`
    }
}

function htmlToHyperscript(html) {
    const h = blocksToHtml.h;

    function parse5ToHyperscript(doc) {
        if (doc === undefined) {return undefined;}

        // return the actual content of the node, has no tag name as it is just text
        if (!doc.tagName && typeof doc.value === 'string') {
            return doc.value;
        }

        let children = [];
        if (Array.isArray(doc.childNodes)) {
            children = doc.childNodes.map(node => parse5ToHyperscript(node))
        }

        const attrs = {};
        doc.attrs.map(attr => attrs[attr.name] = attr.value);

        return h(doc.tagName, attrs, children);
    }

    const document = parse5.parseFragment(`<div class="embed">${html}</div>`);
    const documentHtml = document.childNodes[0];
    const out = parse5ToHyperscript(documentHtml);
    return out;
}


// return mapping block.id -> block
const getBlocksMap = (originalBlocks) => {
    const blocks = {};
    for (const block of originalBlocks) {
        blocks[block.id] = block;
    }
    return blocks;
};

