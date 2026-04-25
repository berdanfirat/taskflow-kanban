'use client';
import { useState } from 'react';
import { useSortable, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { TaskCard } from './TaskCard';

export function Column({ column, tasks, onAddTask, onDeleteTask, onDeleteColumn }: any) {
  const [isAdding, setIsAdding] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');

  // Sütunun kendisini sürüklenebilir yapıyoruz
  const { setNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({
    id: column.id,
    data: { type: 'Column', column }
  });

  const style = {
    transition,
    transform: CSS.Transform.toString(transform),
  };

  // Sürükleme anındaki hayalet görünüm
  if (isDragging) {
    return (
      <div ref={setNodeRef} style={style} className="bg-gray-300 w-80 min-w-[320px] h-[500px] rounded-2xl opacity-40 border-2 border-indigo-400" />
    );
  }

  const handleAdd = () => {
    if (!newTaskTitle.trim()) { setIsAdding(false); return; }
    onAddTask(column.id, newTaskTitle);
    setNewTaskTitle('');
    setIsAdding(false);
  };

  return (
    <div ref={setNodeRef} style={style} className="bg-gray-200/50 w-80 min-w-[320px] rounded-2xl p-4 flex flex-col gap-4 min-h-[500px] group/col">
      <div className="flex items-center justify-between px-2">
        {/* Sütun Tutamacı: Sadece başlığa basınca sürüklensin istersek listeners'ı buraya verebiliriz */}
        <div {...attributes} {...listeners} className="flex items-center gap-2 cursor-grab active:cursor-grabbing">
          <h2 className="font-bold text-gray-700 text-sm uppercase tracking-wider">{column.title}</h2>
          <span className="bg-gray-200 text-gray-600 text-xs font-bold px-2 py-1 rounded-full">{tasks.length}</span>
        </div>

        {/* Sütun Silme Butonu */}
        <button 
          onClick={() => onDeleteColumn(column.id)}
          className="opacity-0 group-hover/col:opacity-100 p-1 hover:bg-red-100 text-red-500 rounded transition-all"
          title="Sütunu Sil"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
        </button>
      </div>

      <div className="flex flex-col gap-3 flex-grow">
        <SortableContext items={tasks.map((t: any) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task: any) => (
             <TaskCard key={task.id} task={task} onDeleteTask={onDeleteTask} />
          ))}
        </SortableContext>
        
        {isAdding ? (
          <div className="flex flex-col gap-2 mt-2">
            <input
              autoFocus
              type="text"
              className="w-full p-3 text-sm rounded-xl border-2 border-indigo-500 outline-none text-gray-900 bg-white"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            />
            <div className="flex gap-2">
              <button onClick={handleAdd} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold">Ekle</button>
              <button onClick={() => setIsAdding(false)} className="text-gray-500 text-sm">İptal</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setIsAdding(true)} className="flex items-center gap-2 text-gray-400 hover:text-indigo-700 p-3 rounded-xl text-sm font-medium mt-auto transition-colors">
            + Görev Ekle
          </button>
        )}
      </div>
    </div>
  );
}