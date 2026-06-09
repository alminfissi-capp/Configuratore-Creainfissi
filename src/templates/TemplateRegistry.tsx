import type { ProductMapping, ConfigurationData } from '../types'
import TemplateDinamico from './TemplateDinamico'

interface TemplateProps {
  mapping: ProductMapping
  onSave: (config: ConfigurationData, price: number) => void
}

export default function TemplateRegistry({ mapping, onSave }: TemplateProps) {
  return <TemplateDinamico mapping={mapping} onSave={onSave} />
}
