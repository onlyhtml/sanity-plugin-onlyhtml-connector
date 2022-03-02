import pluginConfig from 'config:@onlyhtml/sanity-plugin-onlyhtml-connector'
import OnlyHtml from '../onlyhtml'

export { getDefaultDocumentNode } from './document_node';
export default () => new OnlyHtml(pluginConfig.blocks).createDeskStructure();

