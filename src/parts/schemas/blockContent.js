export default function getBlockContentSchema(supportedSchemaTypes) {

    const blockContent = {
        title: 'Block Content',
        name: 'blockContent',
        type: 'array',
        of: [
            {
                title: 'Block',
                type: 'block',
                // Styles let you set what your user can mark up blocks with. These
                // correspond with HTML tags, but you can set any title or value
                // you want and decide how you want to deal with it where you want to
                // use your content.
                styles: [
                    {title: 'Normal', value: 'normal'},
                    {title: 'H1', value: 'h1'},
                    {title: 'H2', value: 'h2'},
                    {title: 'H3', value: 'h3'},
                    {title: 'H4', value: 'h4'},
                    {title: 'Quote', value: 'blockquote'},
                ],
                lists: [{title: 'Bullet', value: 'bullet'}],
                // Marks let you mark up inline text in the block editor.
                marks: {
                    // Decorators usually describe a single property – e.g. a typographic
                    // preference or highlighting by editors.
                    decorators: [
                        {title: 'Strong', value: 'strong'},
                        {title: 'Emphasis', value: 'em'},
                        {title: 'Code', value: 'code'},
                        {title: "Underline", value: "underline" },
                        {title: "Strike", value: "strike-through"}
                    ],
                    // Annotations can be any object structure – e.g. a link or a footnote.
                    annotations: [
                        {
                            title: 'URL',
                            name: 'link',
                            type: 'object',
                            fields: [
                                {
                                    title: 'URL',
                                    name: 'href',
                                    type: 'url',
                                },
                            ],
                        },
                    ],
                },
            },
            // You can add additional types here. Note that you can't use
            // primitive types such as 'string' and 'number' in the same array
            // as a block type.
            {
                type: 'image',
                options: {hotspot: true},
                fields: [
                    {
                        type: 'text',
                        name: 'alt',
                        title: 'Alternative text',
                        description: `Some of your visitors cannot see images, 
            be they blind, color-blind, low-sighted; 
            alternative text is of great help for those 
            people that can rely on it to have a good idea of 
            what\'s on your page.`,
                        options: {
                            isHighlighted: true
                        }
                    }
                ]
            },
        ],
    };

    if (supportedSchemaTypes.includes("code")) {
        console.log('type code is supported');

        // code snippets
        blockContent.of.push({
            type: 'code',
        });


        // raw code in portable text
        blockContent.of.push({
            type: 'code',
            name: 'raw',
            title: 'Raw Content',
            description: 'Enter raw HTML content to be added to the post',
            options: {
                language: 'html',
            }
        });
    }

    if (supportedSchemaTypes.includes("table")) {
        blockContent.of.push({
            type: 'table',
            title: 'Table',
            name: 'table',
        });
    }

    return blockContent;
};
