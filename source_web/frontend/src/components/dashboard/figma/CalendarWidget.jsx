import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import DayDetailsModal from './DayDetailsModal';

const fmtDate = (d) => d.toISOString().slice(0, 10);
const isSameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const today = startOfDay(new Date());

const getMonthMatrix = (anchor) => {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());
  const weeks = [];
  for (let w = 0; w < 6; w++) {
    const row = [];
    for (let d = 0; d < 7; d++) {
      const cell = new Date(start);
      cell.setDate(start.getDate() + w * 7 + d);
      row.push(cell);
    }
    weeks.push(row);
  }
  return weeks;
};

const Badge = ({ children, color = 'slate' }) => {
  const map = {
    slate: 'bg-slate-100 text-slate-700 border-slate-200',
    amber: 'bg-amber-100 text-amber-700 border-amber-200',
    indigo: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${map[color]}`}>{children}</span>
  );
};

const CalendarWidget = ({ month, selected, events, onSelect, onPrev, onNext }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalDate, setModalDate] = useState(null);
  const [modalEvents, setModalEvents] = useState([]);

  const matrix = useMemo(() => getMonthMatrix(month), [month]);
  const thisMonth = month.getMonth();

  const eventsByDay = useMemo(() => {
    const map = new Map();
    for (const ev of events) {
      const list = map.get(ev.date) ?? [];
      list.push(ev);
      map.set(ev.date, list);
    }
    return map;
  }, [events]);

  return (
    <motion.div className="font-sans" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between mb-4">
            <CardTitle className="text-base font-semibold">
              {month.toLocaleString('en-US', { month: 'long' })} {month.getFullYear()}
            </CardTitle>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" onClick={onPrev} className="w-8 h-8 p-0 hover:bg-slate-100">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={onNext} className="w-8 h-8 p-0 hover:bg-slate-100">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-6 pb-6">
          {/* Week headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['SUN','MON','TUE','WED','THU','FRI','SAT'].map((d) => (
              <div key={d} className="text-center text-xs font-medium text-slate-500 p-2">{d}</div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="space-y-1">
            {matrix.map((week, weekIndex) => (
              <div key={weekIndex} className="grid grid-cols-7 gap-1">
                {week.map((d, dayIndex) => {
                  const key = d ? fmtDate(d) : `empty-${weekIndex}-${dayIndex}`;
                  const dayEvents = d ? eventsByDay.get(fmtDate(d)) || [] : [];
                  const inactive = d ? d.getMonth() !== thisMonth : true;
                  const isToday = d ? isSameDay(d, today) : false;
                  const isSel = d && selected ? isSameDay(d, selected) : false;
                  const hasEvents = dayEvents.length > 0;

                  return (
                    <div key={key} className="aspect-square flex items-center justify-center relative">
                      {d && (
                        <motion.button
                          onClick={() => {
                            onSelect(d);
                            if (hasEvents) {
                              setModalDate(d);
                              setModalEvents(dayEvents);
                              setModalOpen(true);
                            }
                          }}
                          className={[
                            'w-9 h-9 rounded-lg flex items-center justify-center text-sm font-medium transition-colors relative border',
                            isSel ? 'bg-indigo-600 text-white hover:bg-indigo-700 border-indigo-600' : 'border-transparent',
                            isToday && !isSel ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : '',
                            inactive ? 'text-slate-300 opacity-40 hover:opacity-60' : 'text-slate-700 hover:bg-slate-100 hover:border-slate-200',
                          ].join(' ')}
                          whileHover={{ scale: 1.05 }}
                        >
                          {d.getDate()}
                          {hasEvents && (
                            <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 flex gap-0.5">
                              {dayEvents.slice(0, 3).map((_, index) => (
                                <div key={index} className={`w-1.5 h-1.5 rounded-full ${
                                  isSel ? 'bg-white' : 'bg-red-500'
                                }`}></div>
                              ))}
                            </div>
                          )}
                        </motion.button>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <DayDetailsModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        date={modalDate}
        events={modalEvents}
      />
    </motion.div>
  );
};

export default CalendarWidget;
