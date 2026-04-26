'use client';
import { useState, useEffect } from 'react';
import { 
  DndContext, 
  closestCorners, 
  DragEndEvent, 
  PointerSensor, 
  TouchSensor, 
  useSensor, 
  useSensors 
} from '@dnd-kit/core';
import { arrayMove, SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { v4 as uuidv4 } from 'uuid';
import { Column } from './Column';
import { supabase } from '../lib/supabaseClient';

export default function KanbanBoard() {
  const [columns, setColumns] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [newColTitle, setNewColTitle] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 5 },
    })
  );

  useEffect(() => {
    setIsMounted(true);
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: cols } = await supabase.from('columns').select('*').order('position', { ascending: true });
    const { data: tks } = await supabase.from('tasks').select('*').order('position', { ascending: true });
    if (cols) setColumns(cols);
    if (tks) setTasks(tks);
  };

  const handleAddColumn = async () => {
    if (!newColTitle.trim()) return;
    const newCol = { id: uuidv4(), title: newColTitle, position: columns.length + 1 };
    setColumns([...columns, newCol]);
    setNewColTitle('');
    await supabase.from('columns').insert(newCol);
  };

  const handleDeleteColumn = async (colId: string) => {
    if (!confirm("Sütun ve içindeki tüm görevler silinecek. Onaylıyor musun?")) return;
    setColumns(columns.filter(c => c.id !== colId));
    setTasks(tasks.filter(t => t.column_id !== colId));
    await supabase.from('tasks').delete().eq('column_id', colId);
    await supabase.from('columns').delete().eq('id', colId);
  };

  const onDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    const activeId = active.id;
    const overId = over.id;
    if (activeId === overId) return;

    const isActiveAColumn = active.data.current?.type === 'Column';
    if (isActiveAColumn) {
      const oldIndex = columns.findIndex(c => c.id === activeId);
      const newIndex = columns.findIndex(c => c.id === overId);
      const newCols = arrayMove(columns, oldIndex, newIndex);
      setColumns(newCols);
      newCols.forEach(async (col, idx) => {
        await supabase.from('columns').update({ position: idx }).eq('id', col.id);
      });
      return;
    }

    const activeTask = tasks.find(t => t.id === activeId);
    const isOverAColumn = columns.some(col => col.id === overId);

    if (isOverAColumn && activeTask) {
      if (activeTask.column_id !== overId) {
        setTasks(prev => prev.map(t => t.id === activeId ? { ...t, column_id: overId as string } : t));
        await supabase.from('tasks').update({ column_id: overId }).eq('id', activeId);
      }
      return;
    }

    if (activeTask) {
      const overTask = tasks.find(t => t.id === overId);
      if (overTask && activeTask.column_id !== overTask.column_id) {
        setTasks(prev => prev.map(t => t.id === activeId ? { ...t, column_id: overTask.column_id } : t));
        await supabase.from('tasks').update({ column_id: overTask.column_id }).eq('id', activeId);
      } else {
        const oldIdx = tasks.findIndex(t => t.id === activeId);
        const newIdx = tasks.findIndex(t => t.id === overId);
        setTasks(arrayMove(tasks, oldIdx, newIdx));
      }
    }
  };

  if (!isMounted) return null;

  return (
    <div className="flex flex-col items-center gap-8 w-full max-w-[1400px] mx-auto px-4">
      <div className="flex gap-2 bg-white p-2 rounded-2xl shadow-sm border border-gray-100 w-full max-w-md">
        <input 
          type="text" 
          placeholder="Yeni Sütun..." 
          className="flex-grow px-4 py-2 outline-none text-gray-900 text-sm"
          value={newColTitle}
          onChange={(e) => setNewColTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAddColumn()}
        />
        <button onClick={handleAddColumn} className="bg-indigo-600 text-white px-5 py-2 rounded-xl text-sm font-bold active:scale-95 transition-all">
          Sütun Ekle
        </button>
      </div>

      <div className="flex gap-6 overflow-x-auto pb-10 items-start w-full scrollbar-hide">
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={onDragEnd}>
          <SortableContext items={columns.map(c => c.id)} strategy={horizontalListSortingStrategy}>
            {columns.map(col => (
              <Column 
                key={col.id} 
                column={col} 
                tasks={tasks.filter(t => t.column_id === col.id)} 
                
                // YENİ BÖLÜM: Parametreler alındı ve objeye aktarıldı
                onAddTask={async (colId: string, title: string, priority: string, dueDate: string, assignee: string) => {
                  const formattedDate = dueDate ? new Date(dueDate).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }) : 'Belirtilmedi';
                  const finalAssignee = assignee.trim() !== '' ? assignee : 'BF';

                  const newTask = { 
                    id: uuidv4(), 
                    column_id: colId, 
                    title, 
                    position: tasks.length + 1,
                    priority,
                    due_date: formattedDate,
                    assignee: finalAssignee
                  };
                  
                  setTasks([...tasks, newTask]);
                  await supabase.from('tasks').insert(newTask);
                }}
                
                onDeleteTask={async (id: string) => {
                  setTasks(tasks.filter(t => t.id !== id));
                  await supabase.from('tasks').delete().eq('id', id);
                }}
                onDeleteColumn={handleDeleteColumn}
              />
            ))}
          </SortableContext>
        </DndContext>
      </div>
    </div>
  );
}