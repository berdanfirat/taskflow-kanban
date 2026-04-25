'use client';
import { useState, useEffect } from 'react';
import { DndContext, closestCorners, DragEndEvent, DragStartEvent, DragOverEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { v4 as uuidv4 } from 'uuid';
import { Column } from './Column';
import { supabase } from '../lib/supabaseClient';

export default function KanbanBoard() {
  const [columns, setColumns] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [newColTitle, setNewColTitle] = useState('');

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

  // --- SÜTUN İŞLEMLERİ ---
  const handleAddColumn = async () => {
    if (!newColTitle.trim()) return;
    const newCol = {
      id: uuidv4(),
      title: newColTitle,
      position: columns.length + 1,
      board_id: '11111111-1111-1111-1111-111111111111' 
    };
    setColumns([...columns, newCol]);
    setNewColTitle('');
    await supabase.from('columns').insert(newCol);
  };

  const handleDeleteColumn = async (colId: string) => {
    if (!confirm("Bu sütunu ve içindeki tüm görevleri silmek istediğine emin misin?")) return;
    setColumns(columns.filter(c => c.id !== colId));
    setTasks(tasks.filter(t => t.column_id !== colId));
    await supabase.from('tasks').delete().eq('column_id', colId);
    await supabase.from('columns').delete().eq('id', colId);
  };

  // --- GÖREV İŞLEMLERİ ---
  const handleAddTask = async (columnId: string, title: string) => {
    const newTask = {
      id: uuidv4(),
      column_id: columnId,
      title: title,
      position: tasks.filter(t => t.column_id === columnId).length + 1
    };
    setTasks([...tasks, newTask]);
    await supabase.from('tasks').insert(newTask);
  };

  const handleDeleteTask = async (taskId: string) => {
    setTasks(tasks.filter(t => t.id !== taskId));
    await supabase.from('tasks').delete().eq('id', taskId);
  };

  // --- SÜRÜKLE BIRAK (ON DRAG END) ---
  const onDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    if (activeId === overId) return;

    // A. SÜTUN SÜRÜKLEME
    const isActiveAColumn = active.data.current?.type === 'Column';
    if (isActiveAColumn) {
      const oldIndex = columns.findIndex(c => c.id === activeId);
      const newIndex = columns.findIndex(c => c.id === overId);
      const newCols = arrayMove(columns, oldIndex, newIndex);
      setColumns(newCols);
      
      // DB Güncelleme (Position)
      newCols.forEach(async (col, idx) => {
        await supabase.from('columns').update({ position: idx }).eq('id', col.id);
      });
      return;
    }

    // B. GÖREV SÜRÜKLEME
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
    <div className="flex flex-col items-center gap-8 w-full max-w-[1400px] mx-auto">
      {/* Sütun Ekleme Paneli */}
      <div className="flex gap-2 bg-white p-3 rounded-2xl shadow-sm border border-gray-100 w-full max-w-md">
        <input 
          type="text"
          placeholder="Yeni Sütun Başlığı..."
          className="flex-grow px-4 py-2 outline-none text-gray-900 text-sm bg-transparent"
          value={newColTitle}
          onChange={(e) => setNewColTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAddColumn()}
        />
        <button onClick={handleAddColumn} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-xl text-sm font-bold transition-all active:scale-95">
          Sütun Ekle
        </button>
      </div>

      {/* Yatay Sıralanabilir Sütun Alanı */}
      <div className="flex gap-6 overflow-x-auto pb-8 items-start w-full px-4 scrollbar-hide">
        <DndContext collisionDetection={closestCorners} onDragEnd={onDragEnd}>
          <SortableContext items={columns.map(c => c.id)} strategy={horizontalListSortingStrategy}>
            {columns.map(col => (
              <Column 
                key={col.id} 
                column={col} 
                tasks={tasks.filter(t => t.column_id === col.id)} 
                onAddTask={handleAddTask}
                onDeleteTask={handleDeleteTask}
                onDeleteColumn={handleDeleteColumn}
              />
            ))}
          </SortableContext>
        </DndContext>
      </div>
    </div>
  );
}