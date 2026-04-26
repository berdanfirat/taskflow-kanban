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
    return <div ref={setNodeRef} style={style} className="bg-indigo-50 border-2 border-indigo-400 border-dashed rounded-xl p-4 min-h-[120px] opacity-50" />;
  }

  const priority = task.priority || 'Orta';
  const dueDate = task.due_date || 'Belirtilmedi';
  const assignee = task.assignee || 'BF';

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      {...attributes} 
      {...listeners} 
      className="group bg-white p-4 rounded-xl shadow-sm border border-gray-200 hover:border-indigo-300 hover:shadow-md transition-all cursor-grab active:cursor-grabbing relative touch-none select-none"
    >
      <div className="flex justify-between items-start mb-2">
        <div className="flex gap-2">
           <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider
             ${priority === 'Yüksek' ? 'bg-red-100 text-red-700' : 
               priority === 'Orta' ? 'bg-amber-100 text-amber-700' : 
               'bg-emerald-100 text-emerald-700'}`}
           >
             {priority}
           </span>
        </div>

        <button 
          onClick={() => onDeleteTask(task.id)} 
          onPointerDown={(e) => e.stopPropagation()} 
          className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
        </button>
      </div>

      <h3 className="text-sm font-semibold text-gray-800 leading-tight mb-4 pr-4">
        {task.title}
      </h3>

      <div className="flex justify-between items-end mt-auto pt-2 border-t border-gray-50">
        <div className="flex items-center gap-1 text-gray-400">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
          <span className="text-[10px] font-medium">{dueDate}</span>
        </div>

        <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center text-[10px] font-bold text-white shadow-sm" title="Sorumlu Kişi">
          {assignee}
        </div>
      </div>
    </div>
  );
}