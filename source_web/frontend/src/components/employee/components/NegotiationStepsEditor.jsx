import React, { useState } from 'react';
import {
  Plus,
  CheckCircle,
  Edit,
  Trash2,
  ArrowUp,
  ArrowDown,
  Check,
  X
} from 'lucide-react';
import { IconButton } from '../../shared';

const NegotiationStepsEditor = ({ entry, steps, setSteps }) => {
  const [editingIdx, setEditingIdx] = useState(null);
  const [editValue, setEditValue] = useState('');

  const handleToggle = idx => setSteps(s => s.map((step, i) => i === idx ? { ...step, done: !step.done } : step));
  const handleAdd = () => setSteps(s => [...s, { label: 'New Step', done: false }]);
  const handleRemove = idx => setSteps(s => s.filter((_, i) => i !== idx));

  const handleEdit = idx => {
    setEditingIdx(idx);
    setEditValue(steps[idx].label);
  };

  const handleEditSave = idx => {
    setSteps(s => s.map((step, i) => i === idx ? { ...step, label: editValue } : step));
    setEditingIdx(null);
    setEditValue('');
  };

  const handleEditCancel = () => {
    setEditingIdx(null);
    setEditValue('');
  };

  const handleMove = (idx, dir) => {
    setSteps(s => {
      const arr = [...s];
      const [removed] = arr.splice(idx, 1);
      arr.splice(idx + dir, 0, removed);
      return arr;
    });
  };

  return (
    <div className="mt-2 bg-white rounded-lg shadow border p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold text-gray-700 uppercase tracking-wide">Negotiation Steps</span>
        <IconButton
          icon={Plus}
          variant="ghost"
          size="sm"
          onClick={handleAdd}
          className="text-blue-600 hover:text-blue-800"
        >
          Add Step
        </IconButton>
      </div>
      <ul className="space-y-1">
        {steps.map((step, idx) => (
          <li key={idx} className={`flex items-center gap-2 px-2 py-1 rounded group ${step.done ? 'bg-green-50' : 'hover:bg-gray-50'}`}>
            <IconButton
              variant="ghost"
              size="sm"
              onClick={() => handleToggle(idx)}
              className="h-6 w-6 p-0"
            >
              {step.done ? <CheckCircle className="w-4 h-4 text-green-600" /> : <span className="inline-block w-4 h-4 border border-gray-300 rounded-full"></span>}
            </IconButton>
            {editingIdx === idx ? (
              <>
                <input
                  type="text"
                  value={editValue}
                  onChange={e => setEditValue(e.target.value)}
                  className="text-xs border rounded px-1 py-0.5 flex-1"
                  autoFocus
                  onBlur={() => handleEditSave(idx)}
                  onKeyDown={e => { if (e.key === 'Enter') handleEditSave(idx); if (e.key === 'Escape') handleEditCancel(); }}
                />
                <IconButton icon={Check} variant="ghost" size="sm" onClick={() => handleEditSave(idx)} title="Save" className="h-6 w-6 p-0 ml-1 text-gray-400 hover:text-gray-700" />
                <IconButton icon={X} variant="ghost" size="sm" onClick={handleEditCancel} title="Cancel" className="h-6 w-6 p-0 ml-1 text-gray-400 hover:text-gray-700" />
              </>
            ) : (
              <span className={`flex-1 text-xs ${step.done ? 'line-through text-green-700' : 'text-gray-800'}`}>{step.label}</span>
            )}
            <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100">
              <IconButton icon={Edit} variant="ghost" size="sm" onClick={() => handleEdit(idx)} title="Edit" className="h-6 w-6 p-0 text-gray-400 hover:text-blue-600" />
              <IconButton icon={Trash2} variant="ghost" size="sm" onClick={() => handleRemove(idx)} title="Delete" className="h-6 w-6 p-0 text-gray-400 hover:text-red-600" />
              <IconButton icon={ArrowUp} variant="ghost" size="sm" disabled={idx === 0} onClick={() => handleMove(idx, -1)} title="Move Up" className="h-6 w-6 p-0 text-gray-400 hover:text-gray-700" />
              <IconButton icon={ArrowDown} variant="ghost" size="sm" disabled={idx === steps.length - 1} onClick={() => handleMove(idx, 1)} title="Move Down" className="h-6 w-6 p-0 text-gray-400 hover:text-gray-700" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default NegotiationStepsEditor; 