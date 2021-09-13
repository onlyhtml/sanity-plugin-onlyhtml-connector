import blockContent from './schemas/blockContent'
import link from './schemas/link'

import S from '@sanity/desk-tool/structure-builder'

import createSchema from 'part:@sanity/base/schema-creator'
import schemaTypes from 'all:part:@sanity/base/schema-type'

import sanityClient from 'part:@sanity/base/client'

const onlyhtmlToSanityTypes = {
    'text': 'string',
    'image': 'image',
    'html': 'blockContent',
    'link': 'link',
    'icon': 'iconPicker', // TODO add support in interneto-core
    'choice': 'boolean',
};

export default class OnlyHtml {
    constructor(blocks) {
        this.blocks = blocks.filter(block => block.fields.length > 0);
    }

    createSchema() {
        const documents = {};
        for (const block of this.blocks) {
            if (block.id in documents) {
                console.warn('duplicate block, is this handled correctly?');
            }

            documents[block.id] = this._convertBlockToSanityDocument(block);
        }

        console.log('done converting blocks to schema');
        const schemas = Object.values(documents);

        let types = schemaTypes;
        types = types.concat(schemas);
        types = types.concat([
            blockContent,
            link,
        ]);


        return createSchema({
            name: 'default',
            types: types,
        });
    }

    createDeskStructure() {
        const singletonDocuments = this.blocks.filter(block => isSingleton(block.type)).map(block => block.id);
        const collectionItems = S.documentTypeListItems().filter(listItem => !singletonDocuments.includes(listItem.getId()));
        const singletonItems = singletonDocuments.map(id => {
            return S.listItem().title(idToTitle(id)).child(
                S.editor()
                    .schemaType(id)
                    .documentId(id)
            );
        });

        singletonDocuments.map(async documentId => {
            // in our case id and type are the same from singleton documents
            const doc = {
                _id: documentId,
                _type: documentId,
            };

            await sanityClient.createIfNotExists(doc);
        });

        return S.list()
            .title('Sections')
            .items([
                ...singletonItems,
                S.divider(),
                ...collectionItems
            ])
    }

    _convertBlockToSanityDocument(block) {
        const sanityFields = [];

        for (const field of block.fields) {
            sanityFields.push({
                name: field.id,
                title: idToTitle(field.id),
                type: onlyhtmlToSanityTypes[field.type] || field.type,
            });
        }

        if (block.type === 'collection' && block.hasCollectionItems === true) {
            sanityFields.push({
                title: 'Slug',
                name: 'slug',
                type: 'slug',
                options: {
                    source: 'title', // best effort to automate slug creation from title if exists
                    slugify: input => input
                        .toLowerCase()
                        .replace(/[\s\/]+/g, '-')
                },
            });

        }

        if (block.type === 'collection' ) {
            // Works nice with https://www.sanity.io/plugins/order-documents
            sanityFields.push({
                name: 'order',
                title: 'Order',
                type: 'number',
                hidden: true,
            });
        }

        const sanityDocument = {
            name: block.id,
            title: idToTitle(block.id),
            type: 'document',
            fields: sanityFields
        };

        if (isSingleton(block.type)) {
            sanityDocument.__experimental_actions = ['update', 'publish']; // dont allow creating more than one
        }

        return sanityDocument;
    }
}

function isSingleton(blockType) {
    return blockType === 'page' || blockType === 'section';
}

function idToTitle(id) {
    id = id.replace('_', ' ');
    id = id.split(' ').map(val => val.charAt(0).toUpperCase() + val.substr(1)).join(' ');
    return id;
}
