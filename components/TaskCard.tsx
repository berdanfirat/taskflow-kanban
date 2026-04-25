'use client';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export function TaskCard({ task, onDeleteTask }: { task: any, onDeleteTask: (id: string) => void }) {
  const { setNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { type: 'Task', task }
  });

  const style = {
    transition,
    transform: CSS.Transform.toString(transform),
  };

  // Sürüklerken arkada kalan gölge görünümü
  if (isDragging) {
    return (
      <div 
        ref={setNodeRef} 
        style={style} 
        className="bg-indigo-50 border-2 border-indigo-400 border-dashed rounded-xl p-4 min-h-[100px] opacity-50" 
      />
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="group relative bg-white p-4 rounded-xl shadow-sm hover:shadow-md cursor-grab active:cursor-grabbing border border-gray-200 transition-shadow"
    >
      <h3 className="font-semibold text-gray-800 pr-6">{task.title}</h3>
      {task.description && <p className="text-sm text-gray-500 mt-2 line-clamp-2">{task.description}</p>}
      
      {/* Silme Butonu */}
      <button
        onClick={() => onDeleteTask(task.id)}
        onPointerDown={(e) => e.stopPropagation()} 
        className="absolute top-3 right-3 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-red-50"
        title="Görevi Sil"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
  );
}