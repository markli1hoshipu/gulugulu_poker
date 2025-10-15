import React from 'react';
import { useEmployeeProfile } from '../context/EmployeeProfileContext';
import { Button } from '../../ui/button';

const AddLeadModal = () => {
  const {
    showAddLead,
    setShowAddLead,
    newLead,
    setNewLead,
    handleAddLead
  } = useEmployeeProfile();

  if (!showAddLead) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <form onSubmit={handleAddLead} className="bg-white rounded-xl shadow-lg max-w-md w-full p-6 flex flex-col gap-4 border">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-bold text-purple-700">Add New Lead</h2>
          <button 
            type="button" 
            className="text-gray-400 hover:text-gray-600 text-2xl" 
            onClick={() => setShowAddLead(false)}
          >
            ×
          </button>
        </div>
        
        <label className="text-sm font-medium text-gray-700">
          Name
          <input 
            type="text" 
            className="mt-1 border rounded px-3 py-2 w-full" 
            value={newLead.name} 
            onChange={e => setNewLead(l => ({ ...l, name: e.target.value }))} 
            required 
          />
        </label>
        
        <label className="text-sm font-medium text-gray-700">
          Last Contact Date
          <input 
            type="date" 
            className="mt-1 border rounded px-3 py-2 w-full" 
            value={newLead.lastContactDate} 
            onChange={e => setNewLead(l => ({ ...l, lastContactDate: e.target.value }))} 
          />
        </label>
        
        <label className="text-sm font-medium text-gray-700">
          Current Stage
          <select 
            className="mt-1 border rounded px-3 py-2 w-full" 
            value={newLead.currentStage} 
            onChange={e => setNewLead(l => ({ ...l, currentStage: e.target.value }))}
          >
            <option value="Contacted">Contacted</option>
            <option value="Negotiation">Negotiation</option>
            <option value="Closed">Closed</option>
          </select>
        </label>
        
        <label className="text-sm font-medium text-gray-700">
          Progress (%)
          <input 
            type="number" 
            min="0" 
            max="100" 
            className="mt-1 border rounded px-3 py-2 w-full" 
            value={newLead.progress} 
            onChange={e => setNewLead(l => ({ ...l, progress: Number(e.target.value) }))} 
          />
        </label>
        
        <div className="flex gap-2 mt-4">
          <Button type="button" variant="outline" onClick={() => setShowAddLead(false)}>
            Cancel
          </Button>
          <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">
            Add Lead
          </Button>
        </div>
      </form>
    </div>
  );
};

export default AddLeadModal; 