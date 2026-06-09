import React from 'react'
import type { ProductMapping, ConfigurationData } from '../types'
import TemplatePorteFinestre from './TemplatePorteFinestre'
import TemplateFallback from './TemplateFallback'

interface TemplateProps {
  mapping: ProductMapping
  onSave: (config: ConfigurationData, price: number) => void
}

const REGISTRY: Record<string, React.ComponentType<TemplateProps>> = {
  'porte-finestre': TemplatePorteFinestre,
}

export default function TemplateRegistry({ mapping, onSave }: TemplateProps) {
  const Component = REGISTRY[mapping.category_template]
  if (!Component) {
    return <TemplateFallback template={mapping.category_template} />
  }
  return <Component mapping={mapping} onSave={onSave} />
}
