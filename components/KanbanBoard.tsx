'use client';
import { useState, useEffect } from 'react';
import { DndContext, closestCorners, DragEndEvent, PointerSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core';
import { DndContext, closestCorners, DragEndEvent, DragStartEvent, PointerSensor, TouchSensor, useSensor, useSensors, DragOverlay } from '@dnd-kit/core';
import { arrayMove, SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { v4 as uuidv4 } from 'uuid';
import { Column } from './Column';
import { TaskCard } from './TaskCard'; // Overlay için eklendi
import { supabase } from '../lib/supabaseClient';

export default function KanbanBoard() {
  const [columns, setColumns] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]); // YENİ: Geçmiş verisi
  const [isHistoryOpen, setIsHistoryOpen] = useState(false); // YENİ: Çekmece durumu

  // YENİ: Sürüklenen öğeyi takip etme (Overlay için)
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<'Column' | 'Task' | null>(null);

  const [isMounted, setIsMounted] = useState(false);
  const [newColTitle, setNewColTitle] = useState('');

@@ -17,7 +25,7 @@ export default function KanbanBoard() {
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
  );

  useEffect(() => { setIsMounted(true); fetchData(); }, []);
  useEffect(() => { setIsMounted(true); fetchData(); fetchLogs(); }, []);

  const fetchData = async () => {
    const { data: cols } = await supabase.from('columns').select('*').order('position', { ascending: true });
@@ -26,7 +34,34 @@ export default function KanbanBoard() {
    if (tks) setTasks(tks);
  };

  const fetchLogs = async () => {
    const { data } = await supabase.from('activity_logs').select('*').order('created_at', { ascending: false }).limit(20);
    if (data) setLogs(data);
  };

  // Aktivite kaydetme fonksiyonu
  const logActivity = async (taskTitle: string, fromColId: string, toColId: string) => {
    const fromCol = columns.find(c => c.id === fromColId)?.title || 'Bilinmiyor';
    const toCol = columns.find(c => c.id === toColId)?.title || 'Bilinmiyor';

    const newLog = { task_title: taskTitle, from_column: fromCol, to_column: toCol };

    // UI'ı anında güncelle
    setLogs(prev => [{ ...newLog, created_at: new Date().toISOString() }, ...prev].slice(0, 20));

    // DB'ye yaz
    await supabase.from('activity_logs').insert(newLog);
  };

  const onDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
    setActiveType(event.active.data.current?.type);
  };

  const onDragEnd = async (event: DragEndEvent) => {
    setActiveId(null);
    setActiveType(null);

    const { active, over } = event;
    if (!over) return;
    const activeId = active.id;
@@ -48,6 +83,7 @@ export default function KanbanBoard() {

    if (isOverAColumn && activeTask) {
      if (activeTask.column_id !== overId) {
        logActivity(activeTask.title, activeTask.column_id, overId as string); // LOG KAYDI
        setTasks(prev => prev.map(t => t.id === activeId ? { ...t, column_id: overId as string } : t));
        await supabase.from('tasks').update({ column_id: overId }).eq('id', activeId);
      }
@@ -57,6 +93,7 @@ export default function KanbanBoard() {
    if (activeTask) {
      const overTask = tasks.find(t => t.id === overId);
      if (overTask && activeTask.column_id !== overTask.column_id) {
        logActivity(activeTask.title, activeTask.column_id, overTask.column_id); // LOG KAYDI
        setTasks(prev => prev.map(t => t.id === activeId ? { ...t, column_id: overTask.column_id } : t));
        await supabase.from('tasks').update({ column_id: overTask.column_id }).eq('id', activeId);
      } else {
@@ -70,34 +107,44 @@ export default function KanbanBoard() {
  if (!isMounted) return null;

  return (
    <div className="flex flex-col items-center gap-8 w-full max-w-[1400px] mx-auto px-4">
      <div className="flex gap-2 bg-white p-2 rounded-2xl shadow-sm border border-gray-100 w-full max-w-md">
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
        }} className="bg-indigo-600 text-white px-5 py-2 rounded-xl text-sm font-bold active:scale-95 transition-all">Ekle</button>
    <div className="flex flex-col items-center gap-8 w-full max-w-[1400px] mx-auto px-4 relative">

      {/* Üst Panel: Sütun Ekleme ve Geçmiş Butonu */}
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
          }} className="bg-indigo-600 text-white px-5 py-2 rounded-xl text-sm font-bold active:scale-95 transition-all">Ekle</button>
        </div>

        {/* GEÇMİŞ BUTONU */}
        <button onClick={() => setIsHistoryOpen(true)} className="bg-white border border-gray-200 text-gray-700 px-6 py-2 rounded-2xl font-bold hover:bg-gray-50 transition-colors shadow-sm flex items-center justify-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          Geçmiş
        </button>
      </div>

      <div className="flex gap-6 overflow-x-auto pb-10 items-start w-full scrollbar-hide">
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={onDragEnd}>
        {/* SÜRÜKLEME SENSÖRLERİ VE EVENTLERİ EKLENDİ */}
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={onDragStart} onDragEnd={onDragEnd}>
          <SortableContext items={columns.map(c => c.id)} strategy={horizontalListSortingStrategy}>
            {columns.map(col => (
              <Column 
                key={col.id} column={col} tasks={tasks.filter(t => t.column_id === col.id)} 
                onAddTask={async (colId: string, title: string, priority: string, dueDate: string, assignee: string) => {
                  // YIL VE TAM AY GÖSTERİMİ
                  const formattedDate = dueDate ? new Date(dueDate).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Belirtilmedi';
                  const finalAssignee = assignee.trim() !== '' ? assignee : 'Berdan Fırat';
                  const newTask = { id: uuidv4(), column_id: colId, title, position: tasks.length + 1, priority, due_date: formattedDate, assignee: finalAssignee };
                  setTasks([...tasks, newTask]);
                  setTasks(prev => [...prev, newTask]);
                  await supabase.from('tasks').insert(newTask);
                }}
                onDeleteTask={async (id: string) => { setTasks(tasks.filter(t => t.id !== id)); await supabase.from('tasks').delete().eq('id', id); }}
@@ -111,8 +158,52 @@ export default function KanbanBoard() {
              />
            ))}
          </SortableContext>

          {/* SİHİRLİ KATMAN: DRAG OVERLAY */}
          <DragOverlay>
            {activeId && activeType === 'Task' ? (
              <TaskCard task={tasks.find(t => t.id === activeId)} isOverlay />
            ) : null}
            {/* Sütun DragOverlay istenirse buraya eklenebilir, şimdilik sadece kartlar için aktif */}
          </DragOverlay>

        </DndContext>
      </div>

      {/* AKTİVİTE GEÇMİŞİ ÇEKMECESİ (SIDEBAR) */}
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