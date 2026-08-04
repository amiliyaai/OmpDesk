import { ListTodo } from 'lucide-react'
import { useStore } from '../store'
import type { TodoItem } from '../shared/types'

const STATUS_ICON: Record<TodoItem['status'], string> = {
  pending: '○',
  in_progress: '◐',
  completed: '●',
  cancelled: '✕'
}

/** 右侧任务面板(todo 事件实时驱动) */
export function TodoPanel() {
  const todos = useStore((s) => s.todos)
  const chat = useStore((s) => s.chat)
  if (!chat || todos.length === 0) return null
  const done = todos.filter((t) => t.status === 'completed').length
  return (
    <aside className="todo-panel">
      <div className="todo-head">
        <ListTodo size={14} />
        <span>任务</span>
        <span className="todo-count">{done}/{todos.length}</span>
      </div>
      <div className="todo-list">
        {todos.map((t) => (
          <div key={t.id} className={`todo-item ${t.status}`} title={t.text}>
            <span className="todo-bullet">{STATUS_ICON[t.status]}</span>
            <span className="todo-text">{t.text}</span>
          </div>
        ))}
      </div>
    </aside>
  )
}
