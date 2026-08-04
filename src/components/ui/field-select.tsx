import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select'

export interface SelectOption {
  value: string
  label: string
}

/** 原生 select 风格 API 的 shadcn Select 包装(用于设置表单) */
export function FieldSelect({
  value,
  onChange,
  options,
  placeholder = '请选择…'
}: {
  value: string
  onChange: (v: string) => void
  options: SelectOption[]
  placeholder?: string
}) {
  return (
    <Select value={value || undefined} onValueChange={onChange}>
      <SelectTrigger className="h-9 w-full">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
