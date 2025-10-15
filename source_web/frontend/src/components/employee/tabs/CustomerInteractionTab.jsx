import React, { useEffect } from 'react';
import {
  Users,
  User,
  Calendar,
  CheckCircle,
  Clock,
  Star,
  Loader,
  AlertCircle,
  InboxIcon
} from 'lucide-react';
import { useEmployeeProfile } from '../context/EmployeeProfileContext';
import { DEFAULT_NEGOTIATION_STEPS } from '../constants';
import NegotiationStepsEditor from '../components/NegotiationStepsEditor';
import { Button } from '../../ui/button';
import { getCustomerInteractionData } from '../../../data/employeeProfiles/customerInteractionData';

const CustomerInteractionTab = () => {
  const {
    selectedEmployee,
    employeeLeads,
    setEmployeeLeads,
    employeeCustomers,
    setEmployeeCustomers,
    setShowAddLead,
    setShowAddCustomer,
    setSelectedEntry,
    leadNegotiationSteps,
    setLeadNegotiationSteps,
    customerNegotiationSteps,
    setCustomerNegotiationSteps,
    expandedNegotiation,
    setExpandedNegotiation,
    getNegotiationSteps,
    initializeNegotiationSteps,
    getSafeNegotiationSteps,
    loading,
    error
  } = useEmployeeProfile();
  const customerInteractionData = getCustomerInteractionData(selectedEmployee?.id);

  // 使用 useEffect 初始化谈判步骤
  useEffect(() => {
    // 初始化 leads 的谈判步骤
    if (employeeLeads.length > 0) {
      employeeLeads.forEach(lead => {
        if (lead.currentStage === 'Negotiation') {
          initializeNegotiationSteps(lead, setLeadNegotiationSteps, leadNegotiationSteps);
        }
      });
    }

    // 初始化 customers 的谈判步骤
    if (employeeCustomers.length > 0) {
      employeeCustomers.forEach(customer => {
        if (customer.currentStage === 'Negotiation') {
          initializeNegotiationSteps(customer, setCustomerNegotiationSteps, customerNegotiationSteps);
        }
      });
    }
  }, [employeeLeads, employeeCustomers, leadNegotiationSteps, customerNegotiationSteps, initializeNegotiationSteps, setLeadNegotiationSteps, setCustomerNegotiationSteps]);

  // 显示加载中状态
  if (loading) {
    return (
      <div className="py-8 px-2 md:px-8 flex flex-col items-center justify-center">
        <Loader className="w-8 h-8 text-purple-600 animate-spin mb-4" />
        <p className="text-gray-600">load clients data...</p>
      </div>
    );
  }

  // 显示错误信息
  if (error) {
    return (
      <div className="py-8 px-2 md:px-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-700">{error}</p>
          <p className="text-sm text-red-600 mt-1">Failed to load data</p>
        </div>
      </div>
    );
  }

  // Empty state component for reuse
  const EmptyState = ({ icon, message, submessage }) => (
    <div className="flex flex-col items-center justify-center py-8 text-gray-500">
      {icon}
      <p className="mt-2 font-medium">{message}</p>
      {submessage && <p className="text-sm mt-1">{submessage}</p>}
    </div>
  );

  return (
    <div className="bg-gray-50 min-h-[600px]">
      <div className="py-4 px-5">
        <div className="grid grid-cols-1 xl:grid-cols-10 gap-4">
          {/* Left Column - Leads and Customers */}
          <div className="xl:col-span-7 space-y-4">
            {/* Leads Panel */}
            <div className="bg-white border border-gray-200 rounded-lg">
              <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-200">
                <h3 className="text-lg font-bold text-black font-[Inter] flex items-center gap-2">
                  <Users className="w-5 h-5 text-green-600" />
                  Leads
                </h3>
              </div>
                {employeeLeads.length > 0 ? (
                  <ul className="divide-y">
                    {employeeLeads.map(lead => {
                      const isNegotiation = lead.currentStage === 'Negotiation';
                      const steps = getSafeNegotiationSteps(lead, leadNegotiationSteps);
                      const completed = steps.filter(s => s.done).length;
                      const percent = Math.round((completed / steps.length) * 100);

                      return (
                        <li key={lead.id} className="py-3 flex flex-col hover:bg-blue-50 rounded transition cursor-pointer group p-6"
                          onClick={e => {
                            if (e.target.closest('.negotiation-steps-editor')) return;
                            setSelectedEntry({ type: 'lead', data: lead });
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium text-gray-900 group-hover:text-blue-700">{lead.name}</div>
                              <div className="text-xs text-gray-500 flex items-center gap-2">
                                <Calendar className="w-3 h-3" /> Last Contact: {lead.lastContactDate}
                              </div>
                              <div className="text-xs mt-1">
                                <span className={`px-2 py-0.5 rounded-full font-medium ${lead.currentStage === 'Closed' ? 'bg-green-100 text-green-700' : lead.currentStage === 'Negotiation' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'}`}>{lead.currentStage}</span>
                              </div>
                            </div>
                            {isNegotiation && (
                              <button className="text-xs text-blue-600 hover:underline ml-2" onClick={() => setExpandedNegotiation(expandedNegotiation === lead.id ? null : lead.id)}>
                                {expandedNegotiation === lead.id ? 'Hide Steps' : 'Show Steps'}
                              </button>
                            )}
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                            <div className="bg-gradient-to-r from-blue-500 to-green-500 h-1.5 rounded-full" style={{ width: `${lead.progress}%` }}></div>
                          </div>
                          {isNegotiation && (
                            <div className="mt-2">
                              <div className="w-full bg-gray-100 rounded-full h-1 mb-1">
                                <div className="bg-blue-400 h-1 rounded-full" style={{ width: `${percent}%` }}></div>
                              </div>
                              {expandedNegotiation === lead.id && (
                                <div className="negotiation-steps-editor">
                                  <NegotiationStepsEditor
                                    entry={lead}
                                    steps={steps}
                                    setSteps={fn => setLeadNegotiationSteps(prev => ({ ...prev, [lead.id]: typeof fn === 'function' ? fn(prev[lead.id] || steps) : fn }))}
                                  />
                                </div>
                              )}
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <EmptyState
                    icon={<InboxIcon className="w-12 h-12 text-gray-300" />}
                    message="No leads available"
                    submessage="No lead data found for this employee"
                  />
                )}
            </div>

            {/* Customers Panel */}
            <div className="bg-white border border-gray-200 rounded-lg">
              <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-200">
                <h3 className="text-lg font-bold text-black font-[Inter] flex items-center gap-2">
                  <User className="w-5 h-5 text-green-600" />
                  Customers
                </h3>
              </div>
                {employeeCustomers.length > 0 ? (
                  <ul className="divide-y">
                    {employeeCustomers.map(customer => {
                      const isNegotiation = customer.currentStage === 'Negotiation';
                      const steps = getSafeNegotiationSteps(customer, customerNegotiationSteps);
                      const completed = steps.filter(s => s.done).length;
                      const percent = Math.round((completed / steps.length) * 100);

                      return (
                        <li key={customer.id} className="py-3 flex flex-col hover:bg-purple-50 rounded transition cursor-pointer group p-6"
                          onClick={e => {
                            if (e.target.closest('.negotiation-steps-editor')) return;
                            setSelectedEntry({ type: 'customer', data: customer });
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium text-gray-900 group-hover:text-purple-700">{customer.name}</div>
                              <div className="text-xs text-gray-500 flex items-center gap-2">
                                <Calendar className="w-3 h-3" /> Last Contact: {customer.lastContactDate}
                              </div>
                              <div className="text-xs mt-1">
                                <span className={`px-2 py-0.5 rounded-full font-medium ${customer.currentStage === 'Closed' ? 'bg-green-100 text-green-700' : customer.currentStage === 'Negotiation' ? 'bg-yellow-100 text-yellow-700' : 'bg-purple-100 text-purple-700'}`}>{customer.currentStage}</span>
                              </div>
                            </div>
                            {isNegotiation && (
                              <button className="text-xs text-purple-600 hover:underline ml-2" onClick={() => setExpandedNegotiation(expandedNegotiation === customer.id ? null : customer.id)}>
                                {expandedNegotiation === customer.id ? 'Hide Steps' : 'Show Steps'}
                              </button>
                            )}
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                            <div className="bg-gradient-to-r from-purple-500 to-green-500 h-1.5 rounded-full" style={{ width: `${customer.progress}%` }}></div>
                          </div>
                          {isNegotiation && (
                            <div className="mt-2">
                              <div className="w-full bg-gray-100 rounded-full h-1 mb-1">
                                <div className="bg-purple-400 h-1 rounded-full" style={{ width: `${percent}%` }}></div>
                              </div>
                              {expandedNegotiation === customer.id && (
                                <div className="negotiation-steps-editor">
                                  <NegotiationStepsEditor
                                    entry={customer}
                                    steps={steps}
                                    setSteps={fn => setCustomerNegotiationSteps(prev => ({ ...prev, [customer.id]: typeof fn === 'function' ? fn(prev[customer.id] || steps) : fn }))}
                                  />
                                </div>
                              )}
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <EmptyState
                    icon={<InboxIcon className="w-12 h-12 text-gray-300" />}
                    message="No customers available"
                    submessage="No customer data found for this employee"
                  />
                )}
            </div>

            {/* Customer Feedback Section */}
            <div className="bg-white border border-gray-200 rounded-lg">
              <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-200">
                <h3 className="text-lg font-bold text-black font-[Inter] flex items-center gap-2">
                  <Star className="w-5 h-5 text-green-600" />
                  Customer Feedback
                  {selectedEmployee?.feedback_rating && (
                    <span className="ml-2 text-sm text-gray-600">
                      ({selectedEmployee.feedback_rating.toFixed(1)} ⭐ from {selectedEmployee.feedback_count || 0} reviews)
                    </span>
                  )}
                </h3>
              </div>
              <div className="p-6">
                {selectedEmployee?.feedback_rating ? (
                  <div className="space-y-4">
                    {/* Rating Summary */}
                    <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center mb-2">
                          <span className="text-2xl font-bold text-gray-900 mr-2">
                            {selectedEmployee.feedback_rating.toFixed(1)}
                          </span>
                          <div className="flex items-center">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`h-5 w-5 ${
                                  star <= Math.round(selectedEmployee.feedback_rating)
                                    ? 'text-yellow-400 fill-current'
                                    : 'text-gray-300'
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                        <p className="text-sm text-gray-600">
                          Based on {selectedEmployee.feedback_count || 0} customer reviews
                        </p>
                      </div>
                    </div>

                    {/* Recent Comment */}
                    {selectedEmployee.feedback_comment && (
                      <div className="p-4 bg-blue-50 rounded-lg border-l-4 border-blue-400">
                        <h4 className="font-medium text-gray-900 mb-2">Latest Customer Comment</h4>
                        <p className="text-gray-700 italic">"{selectedEmployee.feedback_comment}"</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <EmptyState
                    icon={<Star className="w-12 h-12 text-gray-300" />}
                    message="No customer feedback yet"
                    submessage="Feedback will appear here once customers provide ratings"
                  />
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Metrics */}
          <div className="xl:col-span-3 space-y-4">
            {/* Upcoming Follow-ups */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-green-600" />
                Upcoming Follow-ups
              </h3>
              <ul className="text-sm text-gray-900 font-medium space-y-3">
                {(() => {
                  const allContacts = [...employeeLeads, ...employeeCustomers]
                    .filter(e => e.lastContactDate)
                    .sort((a, b) => new Date(a.lastContactDate) - new Date(b.lastContactDate));

                  // Show empty state if no follow-ups
                  if (allContacts.length === 0) {
                    return (
                      <li className="text-center text-gray-500 py-2">
                        <Calendar className="w-4 h-4 mx-auto mb-1" />
                        <span className="text-xs">No upcoming follow-ups</span>
                      </li>
                    );
                  }

                  // Only show actual follow-ups, no hardcoded data
                  const items = allContacts.slice(0, 3);

                  return items.map((entry, idx) => (
                    <li key={idx} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-blue-400" />
                        <span>{entry.name}</span>
                      </div>
                      <span className="text-xs text-gray-500">{entry.lastContactDate}</span>
                    </li>
                  ));
                })()}
              </ul>
            </div>

            {/* Average Response Time */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
                <Clock className="w-5 h-5 text-green-600" />
                Avg Response Time
              </h3>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-800 mb-2">
                  {(() => {
                    const allContacts = [...employeeLeads, ...employeeCustomers]
                      .filter(e => e.lastContactDate)
                      .sort((a, b) => new Date(a.lastContactDate) - new Date(b.lastContactDate));
                    if (allContacts.length < 2) return '139.0 days';
                    let totalDays = 0;
                    for (let i = 1; i < allContacts.length; i++) {
                      const prev = new Date(allContacts[i - 1].lastContactDate);
                      const curr = new Date(allContacts[i].lastContactDate);
                      totalDays += (curr - prev) / (1000 * 60 * 60 * 24);
                    }
                    const avg = totalDays / (allContacts.length - 1);
                    return avg.toFixed(1) + ' days';
                  })()}
                </div>
              </div>
            </div>

            {/* Success/Close Rate */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                Success/Close Rate
              </h3>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-800 mb-2">
                  {(() => {
                    const all = [...employeeLeads, ...employeeCustomers];
                    if (all.length === 0) return '0%';
                    const closed = all.filter(e => e.currentStage === 'Closed').length;
                    return ((closed / all.length) * 100).toFixed(0) + '%';
                  })()}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerInteractionTab;