import OnlyHtml from './onlyhtml'
import pluginConfig from 'config:onlyhtml-connector'

export default new OnlyHtml(pluginConfig.blocks).createSchema();
