import { useMemo, useState } from 'react'
import { Check, ChevronDown, RefreshCw } from 'lucide-react'
import { useStore } from '../store'
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover'

/** 模型下拉(Popover + get_available_models + set_model, 运行时切换) */
export function ModelPicker() {
  const models = useStore((s) => s.models)
  const chat = useStore((s) => s.chat)
  const setModel = useStore((s) => s.setModel)
  const loadModels = useStore((s) => s.loadModels)
  const [open, setOpen] = useState(false)

  const groups = useMemo(() => {
    const m = new Map<string, Array<(typeof models)[number]>>()
    for (const mod of models) {
      m.set(mod.provider, [...(m.get(mod.provider) ?? []), mod])
    }
    return [...m.entries()]
  }, [models])

  const current = chat?.model ?? null

  return (
    <Popover open={open} onOpenChange={(v) => {
      // 打开时若模型列表为空(进程池未启动)则懒加载
      if (v && models.length === 0) void loadModels()
      setOpen(v)
    }}>
      <PopoverTrigger asChild>
        <button className="model-picker-btn" title="切换模型 (运行时生效)">
          <span className="model-current">{current || '默认模型'}</span>
          <ChevronDown size={13} />
        </button>
      </PopoverTrigger>
      <PopoverContent className="model-menu w-[340px] p-0" align="end" sideOffset={6}>
        <div className="model-menu-head">
          <span>可用模型</span>
          <button className="icon-btn" title="刷新" onClick={() => void loadModels()}>
            <RefreshCw size={12} />
          </button>
        </div>
        <div className="model-menu-body">
          {groups.length === 0 && <div className="model-empty">暂无模型列表(未连接或未配置)</div>}
          {groups.map(([provider, list]) => (
            <div className="model-group" key={provider}>
              <div className="model-group-title">{provider}</div>
              {list.map((m) => {
                const selected = current === m.id
                return (
                  <button
                    key={m.id}
                    className={`model-item ${selected ? 'selected' : ''}`}
                    onClick={() => {
                      void setModel(provider, m.id)
                      setOpen(false)
                    }}
                  >
                    <span className="model-id">{m.name ?? m.id}</span>
                    {selected && <Check size={13} />}
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}
