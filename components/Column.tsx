'use client';
import { useState } from 'react';
import { useSortable, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { TaskCard } from './TaskCard';

export function Column({ column, tasks, onAddTask, onDeleteTask, onDeleteColumn }: any) {
  const [isAdding, setIsAdding] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  
  // YENİ: Form state'leri
  const [newPriority, setNewPriority] = useState('Orta');
  const [newDueDate, setNewDueDate] = useState('');
  const [newAssignee, setNewAssignee] = useState('');

  const { setNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({
    id: column.id,
    data: { type: 'Column', column }
  });

  const { setNodeRef: setDroppableRef } = useDroppable({ id: column.id });

  const style = {
    transition,
    transform: CSS.Transform.toString(transform),
  };

  if (isDragging) {
    return <div ref={setNodeRef} style={style} className="bg-indigo-100/50 w-80 min-w-[320px] h-[600px] rounded-2xl border-2 border-indigo-300 border-dashed" />;
  }

  const handleAdd = () => {
    if (!newTaskTitle.trim()) { setIsAdding(false); return; }
    onAddTask(column.id, newTaskTitle, newPriority, newDueDate, newAssignee);
    setNewTaskTitle('');
    setNewPriority('Orta');
    setNewDueDate('');
    setNewAssignee('');
    setIsAdding(false);
  };

  return (
    <div ref={setNodeRef} style={style} className="bg-gray-100 w-80 min-w-[320px] rounded-2xl p-4 flex flex-col gap-4 min-h-[500px] shadow-sm border border-gray-200 group/col">
      <div className="flex items-center justify-between px-1">
        <div {...attributes} {...listeners} className="flex items-center gap-2 cursor-grab active:cursor-grabbing grow">
          <h2 className="font-bold text-gray-700 text-xs uppercase tracking-widest">{column.title}</h2>
          <span className="bg-gray-200 text-gray-500 text-[10px] font-black px-2 py-0.5 rounded-full">{tasks.length}</span>
        </div>
        <button onClick={() => onDeleteColumn(column.id)} className="opacity-0 group-hover/col:opacity-100 text-gray-400 hover:text-red-500 transition-all">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
        </button>
      </div>

      <div ref={setDroppableRef} className="flex flex-col gap-3 flex-grow">
        <SortableContext items={tasks.map((t: any) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task: any) => (
             <TaskCard key={task.id} task={task} onDeleteTask={onDeleteTask} />
          ))}
        </SortableContext>
        
        {isAdding ? (
          <div className="bg-white p-3 rounded-xl shadow-md border-2 border-indigo-400 animate-in fade-in slide-in-from-top-2 flex flex-col gap-2">
            <input
              autoFocus
              className="w-full text-sm font-semibold outline-none text-gray-900 bg-white placeholder-gray-400"
              placeholder="Görev adı..."
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
            />
            
            <div className="flex gap-2">
              <select 
                className="text-xs bg-gray-50 border border-gray-200 rounded p-1 outline-none text-gray-700"
                value={newPriority}
                onChange={(e) => setNewPriority(e.target.value)}
              >
                <option value="Düşük">Düşük</option>
                <option value="Orta">Orta</option>
                <option value="Yüksek">Yüksek</option>
              </select>

              <input 
                type="date" 
                className="text-xs bg-gray-50 border border-gray-200 rounded p-1 outline-none text-gray-700 w-full"
                value={newDueDate}
                onChange={(e) => setNewDueDate(e.target.value)}
              />
            </div>

            <input 
              type="text" 
              maxLength={2}
              placeholder="Sorumlu (Örn: BF)"
              className="text-xs bg-gray-50 border border-gray-200 rounded p-1.5 outline-none text-gray-700 uppercase"
              value={newAssignee}
              onChange={(e) => setNewAssignee(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            />

            <div className="flex gap-2 mt-1">
              <button onClick={handleAdd} className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold w-full hover:bg-indigo-700">Kaydet</button>
              <button onClick={() => setIsAdding(false)} className="text-gray-500 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg text-xs font-medium w-full">İptal</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setIsAdding(true)} className="flex items-center gap-2 text-gray-400 hover:text-indigo-600 p-3 rounded-xl text-sm font-bold transition-all hover:bg-white/50 border border-transparent hover:border-gray-200 mt-auto">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Görev Ekle
          </button>
        )}
      </div>
    </div>
  );
}