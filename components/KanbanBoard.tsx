'use client';
import { useState, useEffect, useCallback } from 'react';
import { 
  DndContext, 
  closestCorners, 
  DragEndEvent, 
  DragOverEvent, 
  DragStartEvent, 
  PointerSensor, 
  TouchSensor, 
  useSensor, 
  useSensors, 
  DragOverlay 
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
  const [startColId, setStartColId] = useState<string | null>(null);

  const [isMounted, setIsMounted] = useState(false);
  const [newColTitle, setNewColTitle] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
  );

  // Verileri Çekme (fetchData'yı useCallback içine aldık ki sonsuz döngü olmasın)
  const fetchData = useCallback(async () => {
    const { data: cols } = await supabase.from('columns').select('*').order('position', { ascending: true });
    const { data: tks } = await supabase.from('tasks').select('*').order('position', { ascending: true });
    if (cols) setColumns(cols);
    if (tks) setTasks(tks);
  }, []);

  const fetchLogs = useCallback(async () => {
    const { data } = await supabase.from('activity_logs').select('*').order('created_at', { ascending: false }).limit(15);
    if (data) setLogs(data);
  }, []);

  useEffect(() => { 
    setIsMounted(true); 
    fetchData(); 
    fetchLogs(); 

    // REALTIME SUBSCRIPTION
    const taskChannel = supabase.channel('kanban-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'columns' }, () => fetchData())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activity_logs' }, () => fetchLogs())
      .subscribe();

    return () => { supabase.removeChannel(taskChannel); };
  }, [fetchData, fetchLogs]);

  // Paylaşım Linki Düzeltmesi (Secure Context Check)
  const handleShare = () => {
    const url = window.location.href;
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(url).then(() => {
        alert("🔗 Pano linki kopyalandı!");
      });
    } else {
      // Yedek yöntem
      const textArea = document.createElement("textarea");
      textArea.value = url;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert("🔗 Link kopyalandı!");
    }
  };

  const onDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveId(active.id as string);
    if (active.data.current?.type === 'Task') {
      setActiveTask(active.data.current.task);
      setStartColId(active.data.current.task.column_id);
    }
  };

  // TAKILMAYI ÖNLEYEN KRİTİK FONKSİYON
  const onDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    if (activeId === overId) return;

    const isActiveTask = active.data.current?.type === 'Task';
    const isOverTask = over.data.current?.type === 'Task';

    if (!isActiveTask) return;

    // Kartı başka bir kartın üzerine getirdiğimizde
    if (isOverTask) {
      setTasks((prev) => {
        const activeIdx = prev.findIndex((t) => t.id === activeId);
        const overIdx = prev.findIndex((t) => t.id === overId);

        if (prev[activeIdx].column_id !== prev[overIdx].column_id) {
          prev[activeIdx].column_id = prev[overIdx].column_id;
          return arrayMove(prev, activeIdx, overIdx - 1);
        }

        return arrayMove(prev, activeIdx, overIdx);
      });
    }

    // Kartı boş bir sütun üzerine getirdiğimizde
    const isOverColumn = over.data.current?.type === 'Column';
    if (isOverColumn) {
      setTasks((prev) => {
        const activeIdx = prev.findIndex((t) => t.id === activeId);
        prev[activeIdx].column_id = overId as string;
        return arrayMove(prev, activeIdx, activeIdx);
      });
    }
  };

  const onDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setActiveTask(null);

    if (!over) return;

    // Sütun taşıma
    if (active.data.current?.type === 'Column') {
      const oldIdx = columns.findIndex(c => c.id === active.id);
      const newIdx = columns.findIndex(c => c.id === over.id);
      const newCols = arrayMove(columns, oldIdx, newIdx);
      setColumns(newCols);
      newCols.forEach(async (col, i) => await supabase.from('columns').update({ position: i }).eq('id', col.id));
      return;
    }

    // Kart taşıma sonrası veritabanı ve log güncelleme
    const task = tasks.find(t => t.id === active.id);
    if (task) {
      // Sütun değişmişse log at
      if (startColId && startColId !== task.column_id) {
        const fromTitle = columns.find(c => c.id === startColId)?.title || "Eski Sütun";
        const toTitle = columns.find(c => c.id === task.column_id)?.title || "Yeni Sütun";
        
        await supabase.from('activity_logs').insert({
          task_title: task.title,
          from_column: fromTitle,
          to_column: toTitle
        });
      }
      // Pozisyonu ve sütunu güncelle
      await supabase.from('tasks').update({ 
        column_id: task.column_id,
        position: tasks.filter(t => t.column_id === task.column_id).findIndex(t => t.id === task.id) 
      }).eq('id', task.id);
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
          }} className="bg-indigo-600 text-white px-5 py-2 rounded-xl text-sm font-bold active:scale-95 transition-all">Ekle</button>
        </div>

        {/* Aksiyon Butonları */}
        <div className="flex gap-2">
          <button onClick={handleShare} className="bg-indigo-50 border border-indigo-100 text-indigo-600 px-4 py-2 rounded-2xl font-bold hover:bg-indigo-100 transition-colors shadow-sm flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Paylaş
          </button>
          <button onClick={() => setIsHistoryOpen(true)} className="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-2xl font-bold hover:bg-gray-50 shadow-sm flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Geçmiş
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

      {/* Geçmiş Paneli (Öncekiyle aynı kalabilir) */}
      {isHistoryOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/20 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-white h-full shadow-2xl p-6 overflow-y-auto animate-in slide-in-from-right">
            <div className="flex justify-between items-center mb-6 pb-4 border-b">
              <h2 className="text-xl font-black">Hareket Geçmişi</h2>
              <button onClick={() => setIsHistoryOpen(false)} className="text-gray-400 p-2">✕</button>
            </div>
            <div className="flex flex-col gap-4">
              {logs.map((log, i) => (
                <div key={i} className="bg-gray-50 rounded-xl p-3 border">
                  <p className="text-xs text-gray-800">
                    <span className="font-bold text-indigo-600">{log.task_title}</span>, <span className="font-bold">{log.from_column}</span> → <span className="font-bold text-emerald-600">{log.to_column}</span> taşındı.
                  </p>
                  <p className="text-[10px] text-gray-400 mt-1">{new Date(log.created_at).toLocaleString('tr-TR')}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}