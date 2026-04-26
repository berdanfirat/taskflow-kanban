'use client';
import { useState, useEffect, useCallback } from 'react';
import { 
  DndContext, closestCorners, DragEndEvent, DragOverEvent, DragStartEvent, 
  PointerSensor, TouchSensor, useSensor, useSensors, DragOverlay 
} from '@dnd-kit/core';
import { arrayMove, SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { v4 as uuidv4 } from 'uuid';
import { Column } from './Column';
import { TaskCard } from './TaskCard';
import { supabase } from '../lib/supabaseClient';

export default function KanbanBoard() {
  const [columns, setColumns] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeTask, setActiveTask] = useState<any>(null);

  const [isMounted, setIsMounted] = useState(false);
  const [newColTitle, setNewColTitle] = useState('');

  // SENSÖR TOLERANSLARI ARTIRILDI (Takılmaları önlemek için)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
  );

  const fetchData = useCallback(async () => {
    const { data: cols } = await supabase.from('columns').select('*').order('position', { ascending: true });
    const { data: tks } = await supabase.from('tasks').select('*').order('position', { ascending: true });
    if (cols) setColumns(cols);
    if (tks) setTasks(tks);
  }, []);

  const fetchLogs = useCallback(async () => {
    const { data } = await supabase.from('activity_logs').select('*').order('created_at', { ascending: false }).limit(20);
    if (data) setLogs(data);
  }, []);

  useEffect(() => { 
    setIsMounted(true); 
    fetchData(); 
    fetchLogs(); 

    const channel = supabase.channel('taskflow-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'columns' }, () => fetchData())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activity_logs' }, () => fetchLogs())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchData, fetchLogs]);

  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      alert("🔗 Pano linki kopyalandı! (Gerçek zamanlı test edebilirsiniz)");
    }).catch(() => {
      prompt("Kopyalamak için link:", url);
    });
  };

  const onDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveId(active.id as string);
    if (active.data.current?.type === 'Task') {
      setActiveTask(active.data.current.task);
    }
  };

  // 1. ÇÖZÜM: KARTLARIN SÜTUNLAR ARASI GEÇMEMESİ VE TAKILMASI
  const onDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    if (activeId === overId) return;

    const isActiveTask = active.data.current?.type === 'Task';
    const isOverTask = over.data.current?.type === 'Task';
    const isOverColumn = over.data.current?.type === 'Column';

    if (!isActiveTask) return;

    // Kartı başka bir kartın üzerine sürüklerken
    if (isOverTask) {
      setTasks((tasks) => {
        const activeIndex = tasks.findIndex((t) => t.id === activeId);
        const overIndex = tasks.findIndex((t) => t.id === overId);
        
        // Eğer sütunlar farklıysa kartı diğer sütuna kopyala
        if (tasks[activeIndex].column_id !== tasks[overIndex].column_id) {
          const newTasks = [...tasks];
          newTasks[activeIndex] = { ...newTasks[activeIndex], column_id: tasks[overIndex].column_id };
          return arrayMove(newTasks, activeIndex, overIndex - 1);
        }
        
        // Aynı sütundaysa sadece yerini değiştir
        return arrayMove(tasks, activeIndex, overIndex);
      });
    }

    // Kartı BOŞ bir sütuna sürüklerken
    if (isOverColumn) {
      setTasks((tasks) => {
        const activeIndex = tasks.findIndex((t) => t.id === activeId);
        const newTasks = [...tasks];
        newTasks[activeIndex] = { ...newTasks[activeIndex], column_id: overId };
        return arrayMove(newTasks, activeIndex, activeIndex);
      });
    }
  };

  const onDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setActiveTask(null);

    if (!over) return;

    // A. Sütun Taşıma
    if (active.data.current?.type === 'Column') {
      const oldIdx = columns.findIndex(c => c.id === active.id);
      const newIdx = columns.findIndex(c => c.id === over.id);
      const newCols = arrayMove(columns, oldIdx, newIdx);
      setColumns(newCols);
      newCols.forEach(async (col, i) => await supabase.from('columns').update({ position: i }).eq('id', col.id));
      return;
    }

    // B. Görev Taşıma ve 2. ÇÖZÜM: AKTİVİTE GEÇMİŞİ (State hatası giderildi)
    if (active.data.current?.type === 'Task') {
      const currentTaskState = tasks.find(t => t.id === active.id);
      const originalTaskData = active.data.current.task; // Sürüklenmeye başladığı andaki ham veri

      if (currentTaskState) {
        // Eğer görev başka bir sütuna geçmişse LOG kaydı oluştur
        if (originalTaskData.column_id !== currentTaskState.column_id) {
          const fromTitle = columns.find(c => c.id === originalTaskData.column_id)?.title || "Bilinmeyen Sütun";
          const toTitle = columns.find(c => c.id === currentTaskState.column_id)?.title || "Bilinmeyen Sütun";
          
          await supabase.from('activity_logs').insert({
            task_title: originalTaskData.title,
            from_column: fromTitle,
            to_column: toTitle
          });
        }

        // DB'yi yeni sütun id'si ve yeni pozisyonuyla güncelle
        await supabase.from('tasks').update({ 
          column_id: currentTaskState.column_id,
          position: tasks.filter(t => t.column_id === currentTaskState.column_id).findIndex(t => t.id === currentTaskState.id) 
        }).eq('id', currentTaskState.id);
      }
    }
  };

  if (!isMounted) return null;

  return (
    <div className="flex flex-col items-center gap-8 w-full max-w-[1400px] mx-auto px-4 relative">
      <div className="flex flex-col sm:flex-row justify-between w-full max-w-4xl gap-4">
        {/* Sütun Ekleme Formu */}
        <div className="flex gap-2 bg-white p-2 rounded-2xl shadow-sm border border-gray-100 flex-grow">
          <input type="text" placeholder="Yeni Sütun..." className="flex-grow px-4 py-2 outline-none text-gray-900 text-sm" value={newColTitle} onChange={(e) => setNewColTitle(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (async () => {
            if (!newColTitle.trim()) return;
            const newCol = { id: uuidv4(), title: newColTitle, position: columns.length + 1 };
            setColumns([...columns, newCol]); setNewColTitle('');
            await supabase.from('columns').insert(newCol);
          })()} />
          <button onClick={async () => {
            if (!newColTitle.trim()) return;
            const newCol = { id: uuidv4(), title: newColTitle, position: columns.length + 1 };
            setColumns([...columns, newCol]); setNewColTitle('');
            await supabase.from('columns').insert(newCol);
          }} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-xl text-sm font-bold active:scale-95 transition-all">Ekle</button>
        </div>

        {/* Aksiyon Butonları */}
        <div className="flex gap-2">
          <button onClick={handleShare} className="bg-indigo-50 border border-indigo-100 text-indigo-600 px-4 py-2 rounded-2xl font-bold hover:bg-indigo-100 transition-colors shadow-sm flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            <span className="hidden sm:inline">Paylaş</span>
          </button>
          <button onClick={() => setIsHistoryOpen(true)} className="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-2xl font-bold hover:bg-gray-50 shadow-sm flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            <span className="hidden sm:inline">Geçmiş</span>
          </button>
        </div>
      </div>

      {/* Board Alanı */}
      <div className="flex gap-6 overflow-x-auto pb-10 items-start w-full scrollbar-hide">
        <DndContext 
          sensors={sensors} 
          collisionDetection={closestCorners} 
          onDragStart={onDragStart} 
          onDragOver={onDragOver} 
          onDragEnd={onDragEnd}
        >
          <SortableContext items={columns.map(c => c.id)} strategy={horizontalListSortingStrategy}>
            {columns.map(col => (
              <Column 
                key={col.id} 
                column={col} 
                tasks={tasks.filter(t => t.column_id === col.id)} 
                onAddTask={async (colId: string, title: string, priority: string, dueDate: string, assignee: string) => {
                  const formattedDate = dueDate ? new Date(dueDate).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Belirtilmedi';
                  const newTask = { id: uuidv4(), column_id: colId, title, position: tasks.length + 1, priority, due_date: formattedDate, assignee: assignee || 'Berdan Fırat' };
                  setTasks(prev => [...prev, newTask]);
                  await supabase.from('tasks').insert(newTask);
                }}
                onDeleteTask={async (id: string) => { setTasks(prev => prev.filter(t => t.id !== id)); await supabase.from('tasks').delete().eq('id', id); }}
                onDeleteColumn={async (colId: string) => {
                  if (!confirm("Sütun silinsin mi?")) return;
                  setColumns(prev => prev.filter(c => c.id !== colId));
                  await supabase.from('tasks').delete().eq('column_id', colId);
                  await supabase.from('columns').delete().eq('id', colId);
                }}
              />
            ))}
          </SortableContext>
          
          <DragOverlay>
            {activeId && activeTask ? <TaskCard task={activeTask} isOverlay /> : null}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Geçmiş Paneli */}
      {isHistoryOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/20 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-white h-full shadow-2xl p-6 overflow-y-auto animate-in slide-in-from-right">
            <div className="flex justify-between items-center mb-6 pb-4 border-b">
              <h2 className="text-xl font-black">Hareket Geçmişi</h2>
              <button onClick={() => setIsHistoryOpen(false)} className="text-gray-400 hover:text-red-500 bg-gray-50 p-2 rounded-full">✕</button>
            </div>
            <div className="flex flex-col gap-4">
              {logs.length === 0 ? (
                <p className="text-sm text-gray-400 text-center mt-10">Henüz bir hareket yok.</p>
              ) : (
                logs.map((log, i) => (
                  <div key={i} className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                    <p className="text-xs text-gray-800">
                      <span className="font-bold text-indigo-600">{log.task_title}</span>, <span className="font-bold">{log.from_column}</span> → <span className="font-bold text-emerald-600">{log.to_column}</span> taşındı.
                    </p>
                    <p className="text-[10px] text-gray-400 mt-1">{new Date(log.created_at).toLocaleString('tr-TR')}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}