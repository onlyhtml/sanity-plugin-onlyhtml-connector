export default {
    title: 'Link',
    name: 'link',
    type: 'document',
    fields: [
        {
            name: 'text',
            title: 'Text',
            type: 'string',
        },
        {
            name: 'href',
            title: 'Link',
            type: 'url',
            validation: Rule => Rule.uri({
                scheme: ['http', 'https', 'mailto', 'tel'],
                allowRelative: true,
            }),
        },
    ],
}
