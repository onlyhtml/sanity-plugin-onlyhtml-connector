import S from '@sanity/desk-tool/structure-builder'
import EditIcon from 'part:@sanity/base/edit-icon'
import EyeIcon from 'part:@sanity/base/eye-icon'
import {WebPreview} from '../panel/IframePreview'

const getPreviewEditorNode = (schemaType) => {
    // Conditionally return a different configuration based on the schema type
    console.log('getEditorNode', schemaType);
    return S.document()
        .schemaType(schemaType)
        .views([
            S.view.form().icon(EditIcon),
            S.view.component(WebPreview)
                .title('Preview')
                .icon(EyeIcon).id('preview')
        ])
}

export const getDefaultDocumentNode = ({schemaType, documentId}) => {
    return getPreviewEditorNode(schemaType)
};
