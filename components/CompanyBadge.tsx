import { Company } from '@/lib/supabase'

interface CompanyBadgeProps {
  company: Company | undefined | null
  size?: 'sm' | 'md'
}

export default function CompanyBadge({ company, size = 'sm' }: CompanyBadgeProps) {
  if (!company) return <span className="text-[#9ca3af]">–</span>

  const padding = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${padding}`}
      style={{ backgroundColor: company.color, color: company.text_color }}
    >
      {company.name}
    </span>
  )
}
