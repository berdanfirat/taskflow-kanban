'use client';
import { useState, useEffect } from 'react';
import { DndContext, closestCorners, DragEndEvent, DragOverEvent, DragStartEvent, PointerSensor, TouchSensor, useSensor, useSensors, DragOverlay } from '@dnd-kit/core';
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
  const [activeType, setActiveType] = useState<'Column' | 'Task' | null>(null);
  const [startColId, setStartColId] = useState<string | null>(null); // Sürükleme başlangıç noktası

  const [isMounted, setIsMounted] = useState(false);
  const [newColTitle, setNewColTitle] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
  );

  useEffect(() => { 
    setIsMounted(true); 
    fetchData(); 
    fetchLogs(); 

    // YENİ: REALTIME (GERÇEK ZAMANLI) BAĞLANTI
    const channel = supabase.channel('public-tasks')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'columns' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'activity_logs' }, () => fetchLogs())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchData = async () => {
    const { data: cols } = await supabase.from('columns').select('*').order('position', { ascending: true });
    const { data: tks } = await supabase.from('tasks').select('*').order('position', { ascending: true });
    if (cols) setColumns(cols);
    if (tks) setTasks(tks);
  };

  const fetchLogs = async () => {
    const { data } = await supabase.from('activity_logs').select('*').order('created_at', { ascending: false }).limit(20);
    if (data) setLogs(data);
  };

  const logActivity = async (taskTitle: string, fromColId: string, toColId: string) => {
    const fromCol = columns.find(c => c.id === fromColId)?.title || 'Bilinmiyor';
    const toCol = columns.find(c => c.id === toColId)?.title || 'Bilinmiyor';
    const newLog = { task_title: taskTitle, from_column: fromCol, to_column: toCol };
    
    setLogs(prev => [{ ...newLog, created_at: new Date().toISOString() }, ...prev].slice(0, 20));
    await supabase.from('activity_logs').insert(newLog);
  };

  // PANOYU PAYLAŞMA FONKSİYONU
  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    alert("🔗 Pano linki kopyalandı! Arkadaşlarına göndererek gerçek zamanlı birlikte çalışabilirsiniz.");
  };

  const onDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
    setActiveType(event.active.data.current?.type);
    if (event.active.data.current?.type === 'Task') {
      setStartColId(event.active.data.current.task.column_id);
    }
  };

  // YENİ: PÜRÜZSÜZ GEÇİŞ İÇİN (Sürüklerken anında sütun değiştirir)
  const onDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;
    
    const activeId = active.id;
    const overId = over.id;
    if (activeId === overId) return;

    const isActiveTask = active.data.current?.type === 'Task';
    const isOverTask = over.data.current?.type === 'Task';
    const isOverColumn = over.data.current?.type === 'Column';

    if (!isActiveTask) return;

    // Kartı başka bir kartın üzerine sürüklerken
    if (isActiveTask && isOverTask) {
      setTasks(prev => {
        const activeIdx = prev.findIndex(t => t.id === activeId);
        const overIdx = prev.findIndex(t => t.id === overId);
        if (prev[activeIdx].column_id !== prev[overIdx].column_id) {
          const newTasks = [...prev];
          newTasks[activeIdx].column_id = prev[overIdx].column_id;
          return arrayMove(newTasks, activeIdx, overIdx);
        }
        return arrayMove(prev, activeIdx, overIdx);
      });
    }

    // Kartı boş bir sütuna sürüklerken
    if (isActiveTask && isOverColumn) {
      setTasks(prev => {
        const activeIdx = prev.findIndex(t => t.id === activeId);
        const newTasks = [...prev];
        newTasks[activeIdx].column_id = overId as string;
        return arrayMove(newTasks, activeIdx, activeIdx);
      });
    }
  };

  const onDragEnd = async (event: DragEndEvent) => {
    setActiveId(null);
    setActiveType(null);

    const { active, over } = event;
    if (!over) return;

    // SÜTUN TAŞIMA DB GÜNCELLEMESİ
    if (active.data.current?.type === 'Column') {
      const oldIdx = columns.findIndex(c => c.id === active.id);
      const newIdx = columns.findIndex(c => c.id === over.id);
      const newCols = arrayMove(columns, oldIdx, newIdx);
      setColumns(newCols);
      newCols.forEach(async (col, i) => await supabase.from('columns').update({ position: i }).eq('id', col.id));
      return;
    }

    // GÖREV TAŞIMA DB GÜNCELLEMESİ (UI zaten onDragOver ile güncellendi)
    if (active.data.current?.type === 'Task') {
      const activeTask = tasks.find(t => t.id === active.id);
      if (activeTask) {
        // Eğer başlangıç sütunu ile bırakılan sütun farklıysa geçmişe kaydet
        if (startColId && startColId !== activeTask.column_id) {
          logActivity(activeTask.title, startColId, activeTask.column_id);
        }
        // DB'yi senkronize et
        await supabase.from('tasks').update({ column_id: activeTask.column_id }).eq('id', activeTask.id);
      }
    }
  };

  if (!isMounted) return null;

  return (
    <div className="flex flex-col items-center gap-8 w-full max-w-[1400px] mx-auto px-4 relative">
      
      <div className="flex flex-col sm:flex-row justify-between w-full max-w-4xl gap-4">
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

        <div className="flex gap-2">
          {/* YENİ: PAYLAŞ BUTONU */}
          <button onClick={handleShare} className="bg-indigo-50 border border-indigo-100 text-indigo-600 px-4 py-2 rounded-2xl font-bold hover:bg-indigo-100 transition-colors shadow-sm flex items-center justify-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
            <span className="hidden sm:inline">Paylaş</span>
          </button>

          <button onClick={() => setIsHistoryOpen(true)} className="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-2xl font-bold hover:bg-gray-50 transition-colors shadow-sm flex items-center justify-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <span className="hidden sm:inline">Geçmiş</span>
          </button>
        </div>
      </div>

      <div className="flex gap-6 overflow-x-auto pb-10 items-start w-full scrollbar-hide">
        {/* YENİ: onDragOver EKLENDİ */}
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={onDragStart} onDragOver={onDragOver} onDragEnd={onDragEnd}>
          <SortableContext items={columns.map(c => c.id)} strategy={horizontalListSortingStrategy}>
            {columns.map(col => (
              <Column 
                key={col.id} column={col} tasks={tasks.filter(t => t.column_id === col.id)} 
                onAddTask={async (colId: string, title: string, priority: string, dueDate: string, assignee: string) => {
                  const formattedDate = dueDate ? new Date(dueDate).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Belirtilmedi';
                  const finalAssignee = assignee.trim() !== '' ? assignee : 'Berdan Fırat';
                  const newTask = { id: uuidv4(), column_id: colId, title, position: tasks.length + 1, priority, due_date: formattedDate, assignee: finalAssignee };
                  setTasks(prev => [...prev, newTask]);
                  await supabase.from('tasks').insert(newTask);
                }}
                onDeleteTask={async (id: string) => { setTasks(tasks.filter(t => t.id !== id)); await supabase.from('tasks').delete().eq('id', id); }}
                onDeleteColumn={async (colId: string) => {
                  if (!confirm("Sütun silinsin mi?")) return;
                  setColumns(columns.filter(c => c.id !== colId));
                  setTasks(tasks.filter(t => t.column_id !== colId));
                  await supabase.from('tasks').delete().eq('column_id', colId);
                  await supabase.from('columns').delete().eq('id', colId);
                }}
              />
            ))}
          </SortableContext>
          
          <DragOverlay>
            {activeId && activeType === 'Task' ? <TaskCard task={tasks.find(t => t.id === activeId)} isOverlay /> : null}
          </DragOverlay>
        </DndContext>
      </div>

      {isHistoryOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/20 backdrop-blur-sm transition-opacity">
          <div className="w-full max-w-sm bg-white h-full shadow-2xl p-6 overflow-y-auto animate-in slide-in-from-right">
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-100">
              <h2 className="text-xl font-black text-gray-800 flex items-center gap-2">
                <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                Hareket Geçmişi
              </h2>
              <button onClick={() => setIsHistoryOpen(false)} className="text-gray-400 hover:text-red-500 bg-gray-50 p-2 rounded-full transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="flex flex-col gap-4">
              {logs.length === 0 ? (
                <p className="text-sm text-gray-400 text-center mt-10">Henüz bir hareket yok.</p>
              ) : (
                logs.map((log, i) => (
                  <div key={i} className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                    <p className="text-xs text-gray-800 font-medium leading-relaxed">
                      <span className="font-bold text-indigo-600">{log.task_title}</span> kartı, <span className="font-bold text-gray-500">{log.from_column}</span> sütunundan <span className="font-bold text-emerald-600">{log.to_column}</span> sütununa taşındı.
                    </p>
                    <p className="text-[10px] text-gray-400 mt-2 font-semibold">
                      {new Date(log.created_at).toLocaleString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </p>
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