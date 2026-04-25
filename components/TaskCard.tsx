'use client';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export function TaskCard({ task, onDeleteTask }: any) {
  const { setNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { type: 'Task', task }
  });

  const style = {
    transition,
    transform: CSS.Transform.toString(transform),
  };

  if (isDragging) {
    return <div ref={setNodeRef} style={style} className="bg-indigo-50 border-2 border-indigo-400 border-dashed rounded-xl p-4 min-h-[100px] opacity-50" />;
  }

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      {...attributes} 
      {...listeners} 
      className="group bg-white p-4 rounded-xl shadow-sm border border-gray-200 hover:border-indigo-300 hover:shadow-md transition-all cursor-grab active:cursor-grabbing relative"
    >
      {/* Etiketler (Mülakatta vizyonunuzu gösterir) */}
      <div className="flex gap-1.5 mb-2">
        <span className="w-8 h-1.5 rounded-full bg-emerald-400" title="Tamamlanma Yakın"></span>
        <span className="w-8 h-1.5 rounded-full bg-amber-400" title="Orta Öncelik"></span>
      </div>

      <h3 className="text-sm font-semibold text-gray-800 leading-tight mb-1">{task.title}</h3>
      <p className="text-[10px] text-gray-400 font-medium"># {task.id.slice(0, 5)}</p>

      {/* Silme Butonu */}
      <button 
        onClick={() => onDeleteTask(task.id)} 
        onPointerDown={(e) => e.stopPropagation()} 
        className="absolute top-3 right-3 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
      </button>
    </div>
  );
}