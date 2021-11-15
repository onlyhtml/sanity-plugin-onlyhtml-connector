import S from '@sanity/desk-tool/structure-builder'
import createSchema from 'part:@sanity/base/schema-creator'
import schemaTypes from 'all:part:@sanity/base/schema-type'
import sanityClient from 'part:@sanity/base/client'

import IconSingle from './panel/IconSingle'
import IconCollection from './panel/IconCollection'

import getBlockContentSchema from './parts/schemas/blockContent'
import link from './parts/schemas/link'

const onlyhtmlToSanityTypes = {
    'text': 'string',
    'image': 'image',
    'html': 'blockContent',
    'link': 'link',
    'icon': 'iconPicker', // TODO add support in interneto-core
    'choice': 'boolean',
    'reference': 'reference',
};

export default class OnlyHtml {
    constructor(blocks) {
        this.blocks = blocks.filter(block => block.fields.length > 0);
        this.blockIds = blocks.map(block => block.id);
    }

    createSchema() {
        const documents = {};
        for (const block of this.blocks) {
            if (block.id in documents) {
                console.warn('duplicate block, is this handled correctly?');
            }

            documents[block.id] = this._convertBlockToSanityDocument(block);

            // Notice this is not recursiver rather one level deep
            if (block.directChildren && block.directChildren.length > 0) {
                for(const childBlock of block.directChildren) {
                    documents[childBlock.id] = this._convertBlockToSanityDocument(childBlock);
                }
            }
        }

        console.log('done converting blocks to schema');

        // use default schema types and add auto-generated site specific ones on top
        let types = schemaTypes;
        const schemas = Object.values(documents);
        types = types.concat(schemas);
        types = types.concat([
            getBlockContentSchema(schemaTypes.map(t => t.name)),
            link,
        ]);

        return createSchema({
            name: 'default',
            types: types,
        });
    }

    createDeskStructure() {
        const singletonDocuments = this.blocks.filter(block => isSingleton(block.type)).map(block => block.id);

        const collectionItems = S.documentTypeListItems()
            .filter(listItem => !singletonDocuments.includes(listItem.getId()))
            .filter(listItem => this.blockIds.includes(listItem.getId())) // remove direct children block types from main navigation
            .map(listItem => listItem.icon(IconCollection));

        const singletonItems = singletonDocuments.map(id => {
            return S.listItem().title(idToTitle(id)).icon(IconSingle).child(
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
            ]);
    }

    _convertBlockToSanityDocument(block) {
        let sanityFields = [];

        for (const field of block.fields) {
            const sanityField = {
                name: field.id,
                title: idToTitle(field.id),
                type: onlyhtmlToSanityTypes[field.type] || field.type,
            };

            if (field.type === 'reference' && field.options.multiple) {
                sanityField.type = 'array';
                sanityField.of = [{
                    type: 'reference',
                    to: [{ type: field.options.target }],
                }];
            } 
            else if (field.type === 'reference') {
                sanityField.to = [{
                    type: field.options.target 
                }];
            }

            sanityFields.push(sanityField);
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

        if (block.type === 'collection') {
            // Works nice with https://www.sanity.io/plugins/order-documents
            sanityFields.push({
                name: 'order',
                title: 'Order',
                type: 'number',
                hidden: true,
            });
        }

        if (block.type === 'page' || block.type === 'section') {
            if (block.directChildren) {
                const directChildrenFields = block.directChildren.map(c => {
                    // const docType = this._convertBlockToSanityDocument(c)
                    const sanityField = {
                        name: c.id,
                        title: idToTitle(c.id),
                        type: 'array',
                        of: [{type: c.id}], // we have created a schema for this specific type and here we use it
                    };
                    return sanityField;
                });

                sanityFields = sanityFields.concat(directChildrenFields);
            }
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
    id = id.replaceAll('_', ' ');
    id = id.split(' ').map(val => val.charAt(0).toUpperCase() + val.substr(1)).join(' ');
    return id;
}
