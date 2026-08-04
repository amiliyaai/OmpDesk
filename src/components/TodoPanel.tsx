import { ListTodo } from 'lucide-react'
import { useStore } from '../store'
import { useI18n } from '../lib/useI18n'
import type { TodoItem } from '../shared/types'

const STATUS_ICON: Record<TodoItem['status'], string> = {
  pending: '○',
  in_progress: '◐',
  completed: '●',
  cancelled: '✕'
}

/** 右侧任务面板(todo 事件实时驱动) */
export function TodoPanel() {
  const { t } = useI18n()
  const todos = useStore((s) => s.todos)
  const chat = useStore((s) => s.chat)
  if (!chat || todos.length === 0) return null
  const done = todos.filter((t2) => t2.status === 'completed').length
  return (
    <aside className="todo-panel">
      <div className="todo-head">
        <ListTodo size={14} />
        <span>{t('todo.tasks')}</span>
        <span className="todo-count">{done}/{todos.length}</span>
      </div>
      <div className="todo-list">
        {todos.map((t2) => (
          <div key={t2.id} className={`todo-item ${t2.status}`} title={t2.text}>
            <span className="todo-bullet">{STATUS_ICON[t2.status]}</span>
            <span className="todo-text">{t2.text}</span>
          </div>
        ))}
      </div>
    </aside>
  )
}
