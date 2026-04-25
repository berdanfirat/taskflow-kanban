'use client';
import { useState } from 'react';
import { useDroppable } from '@dnd-kit/core'; // YENİ
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { TaskCard } from './TaskCard';

export function Column({ column, tasks, onAddTask, onDeleteTask }: any) {
  const [isAdding, setIsAdding] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');

  // YENİ: Sütunu bir bırakma hedefi olarak kaydediyoruz
  const { setNodeRef } = useDroppable({
    id: column.id,
  });

  const handleAdd = () => {
    if (newTaskTitle.trim() === '') {
      setIsAdding(false);
      return;
    }
    onAddTask(column.id, newTaskTitle);
    setNewTaskTitle('');
    setIsAdding(false);
  };

  return (
    <div 
      ref={setNodeRef} // YENİ: Droppable referansını buraya veriyoruz
      className="bg-gray-200/50 w-80 min-w-[320px] rounded-2xl p-4 flex flex-col gap-4 min-h-[500px]" // min-h eklemek alanı genişletir
    >
      <div className="flex items-center justify-between px-2">
        <h2 className="font-bold text-gray-700 text-sm uppercase tracking-wider">{column.title}</h2>
        <span className="bg-gray-200 text-gray-600 text-xs font-bold px-2 py-1 rounded-full">
          {tasks.length}
        </span>
      </div>

      <div className="flex flex-col gap-3 flex-grow"> {/* flex-grow ekledik ki alan tüm sütunu kaplasın */}
        <SortableContext items={tasks.map((t: any) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task: any) => (
             <TaskCard key={task.id} task={task} onDeleteTask={onDeleteTask} />
          ))}
        </SortableContext>
        
        {/* Görev Ekleme Arayüzü */}
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
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 text-gray-500 hover:text-indigo-700 p-3 rounded-xl text-sm font-semibold mt-auto"
          >
            + Yeni Görev Ekle
          </button>
        )}
      </div>
    </div>
  );
}