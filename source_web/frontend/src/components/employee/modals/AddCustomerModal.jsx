import React from 'react';
import { useEmployeeProfile } from '../context/EmployeeProfileContext';
import { Button, IconButton } from '../../shared';
import { FormField, FormGroup } from '../../shared';
import { X } from 'lucide-react';

const AddCustomerModal = () => {
  const {
    showAddCustomer,
    setShowAddCustomer,
    newCustomer,
    setNewCustomer,
    handleAddCustomer
  } = useEmployeeProfile();

  if (!showAddCustomer) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <form onSubmit={handleAddCustomer} className="bg-white rounded-xl shadow-lg max-w-md w-full flex flex-col gap-4 border" style={{padding: '32px'}}>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-bold text-purple-700">Add New Customer</h2>
          <IconButton
            icon={X}
            variant="ghost"
            onClick={() => setShowAddCustomer(false)}
          />
        </div>

        <FormGroup>
          <FormField
            label="Name"
            type="text"
            value={newCustomer.name}
            onChange={e => setNewCustomer(c => ({ ...c, name: e.target.value }))}
            required
          />

          <FormField
            label="Last Contact Date"
            type="date"
            value={newCustomer.lastContactDate}
            onChange={e => setNewCustomer(c => ({ ...c, lastContactDate: e.target.value }))}
          />

          <FormField
            label="Current Stage"
            value={newCustomer.currentStage}
            onChange={e => setNewCustomer(c => ({ ...c, currentStage: e.target.value }))}
          >
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={newCustomer.currentStage}
              onChange={e => setNewCustomer(c => ({ ...c, currentStage: e.target.value }))}
            >
              <option value="Warm">Warm</option>
              <option value="Negotiation">Negotiation</option>
              <option value="Closed">Closed</option>
            </select>
          </FormField>

          <FormField
            label="Progress (%)"
            type="number"
            min="0"
            max="100"
            value={newCustomer.progress}
            onChange={e => setNewCustomer(c => ({ ...c, progress: Number(e.target.value) }))}
          />
        </FormGroup>

        <div className="flex gap-2 mt-4">
          <Button type="button" variant="outline" onClick={() => setShowAddCustomer(false)}>
            Cancel
          </Button>
          <Button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white">
            Add Customer
          </Button>
        </div>
      </form>
    </div>
  );
};

export default AddCustomerModal;