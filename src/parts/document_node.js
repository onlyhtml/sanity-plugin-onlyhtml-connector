import S from '@sanity/desk-tool/structure-builder'
import EditIcon from 'part:@sanity/base/edit-icon'
import EyeIcon from 'part:@sanity/base/eye-icon'
import {WebPreview} from '../panel/IframePreview'

export const getEditorNode = (schemaType) => {
    // Conditionally return a different configuration based on the schema type
    console.log('getEditorNode', schemaType);
    return S.editor()
        .schemaType(schemaType)
        .views([
            S.view.form().icon(EditIcon),
            S.view.component(WebPreview)
                .title('Preview')
                .icon(EyeIcon)
        ])
}
