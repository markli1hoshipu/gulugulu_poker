import React from 'react';
import {
  User,
  Users,
  Mail,
  Phone,
  MapPin,
  DollarSign,
  FileText
} from 'lucide-react';
import { useEmployeeProfile } from '../context/EmployeeProfileContext';
import { DEFAULT_NEGOTIATION_STEPS } from '../constants';
import NegotiationStepsEditor from '../components/NegotiationStepsEditor';

const LeadCustomerDetailModal = () => {
  const {
    selectedEntry,
    setSelectedEntry,
    getCompanyInfo,
    leadNegotiationSteps,
    setLeadNegotiationSteps,
    customerNegotiationSteps,
    setCustomerNegotiationSteps
  } = useEmployeeProfile();

  if (!selectedEntry) return null;

  const { type, data } = selectedEntry;
  const companyInfo = getCompanyInfo(data);
  const isNegotiation = data.currentStage === 'Negotiation';

  const steps = type === 'lead' 
    ? (leadNegotiationSteps[data.id] || DEFAULT_NEGOTIATION_STEPS)
    : (customerNegotiationSteps[data.id] || DEFAULT_NEGOTIATION_STEPS);

  const setSteps = type === 'lead'
    ? fn => setLeadNegotiationSteps(prev => ({ 
        ...prev, 
        [data.id]: typeof fn === 'function' ? fn(prev[data.id] || DEFAULT_NEGOTIATION_STEPS) : fn 
      }))
    : fn => setCustomerNegotiationSteps(prev => ({ 
        ...prev, 
        [data.id]: typeof fn === 'function' ? fn(prev[data.id] || DEFAULT_NEGOTIATION_STEPS) : fn 
      }));

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-auto relative border border-gray-100">
        <button 
          className="absolute top-3 right-4 text-gray-400 hover:text-gray-600 text-2xl" 
          onClick={() => setSelectedEntry(null)}
        >
          ×
        </button>
        
        <div className="p-8 space-y-6">
          {/* Highlighted Company Info & Status */}
          <div className="flex flex-col md:flex-row gap-6">
            {/* Company Info Card */}
            <div className="flex-1 bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-100 rounded-xl shadow p-5 mb-2">
              <div className="flex items-center gap-2 mb-2">
                {type === 'lead' ? <User className="w-5 h-5 text-blue-500" /> : <Users className="w-5 h-5 text-purple-600" />}
                <h2 className="text-lg font-bold text-gray-900">{data.name}</h2>
                <span className="text-xs text-gray-500 ml-2">{type === 'lead' ? 'Lead' : 'Customer'}</span>
              </div>
              <div className="grid grid-cols-1 gap-2">
                <div className="flex items-center gap-2 text-xs text-gray-700">
                  <Mail className="w-4 h-4 text-blue-400" /> {companyInfo.email}
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-700">
                  <Phone className="w-4 h-4 text-green-400" /> {companyInfo.phone}
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-700">
                  <MapPin className="w-4 h-4 text-purple-400" /> {companyInfo.location}
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-700">
                  <DollarSign className="w-4 h-4 text-yellow-500" /> {companyInfo.dealValue}
                </div>
              </div>
            </div>
            
            {/* Status Card */}
            <div className="flex-1 bg-gradient-to-br from-green-50 to-yellow-50 border border-green-100 rounded-xl shadow p-5 mb-2 flex flex-col gap-2 justify-between">
              <div className="flex items-center gap-2 mb-2">
                <span className={`inline-block text-xs px-2 py-0.5 rounded font-medium ${
                  data.currentStage === 'Closed' ? 'bg-green-100 text-green-700' : 
                  data.currentStage === 'Negotiation' ? 'bg-yellow-100 text-yellow-700' : 
                  type === 'lead' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                }`}>
                  {data.currentStage}
                </span>
                <span className="inline-block text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                  Last Contact: {data.lastContactDate}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Progress:</span>
                <span className="font-medium text-gray-900">{data.progress}%</span>
                <div className="flex-1 w-32 bg-gray-200 rounded-full h-1.5">
                  <div 
                    className={`h-1.5 rounded-full ${
                      type === 'lead' 
                        ? 'bg-gradient-to-r from-blue-500 to-green-500' 
                        : 'bg-gradient-to-r from-purple-500 to-green-500'
                    }`} 
                    style={{ width: `${data.progress}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Notes Section */}
          <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 flex items-start gap-2">
            <FileText className="w-4 h-4 text-gray-400 mt-0.5" />
            <span className="text-xs text-gray-700">{companyInfo.notes}</span>
          </div>
          
          {/* Negotiation steps if applicable */}
          {isNegotiation && (
            <div className="mt-4">
              <div className="text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">Negotiation Steps</div>
              <div className="negotiation-steps-editor">
                <NegotiationStepsEditor
                  entry={data}
                  steps={steps}
                  setSteps={setSteps}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LeadCustomerDetailModal; 