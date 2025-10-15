import React, { useState, useEffect } from 'react';
import { Users, TrendingUp, Building, MapPin, DollarSign, Activity, AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import { useEmployeeProfile } from '../context/EmployeeProfileContext';
import customerApiService from '../../../services/customerApi';
import employeeApiService from '../../../services/employeeApi';
import semanticMatchingService from '../../../services/semanticMatchingService';

const MatchTab = () => {
  const { selectedEmployee } = useEmployeeProfile();
  const [customerMatches, setCustomerMatches] = useState([]);
  const [leadMatches, setLeadMatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modelLoading, setModelLoading] = useState(false);
  const [error, setError] = useState(null);
  const [assigningSelected, setAssigningSelected] = useState(false);
  const [notification, setNotification] = useState(null);
  const [activeTab, setActiveTab] = useState('customers'); // 'customers' or 'leads'
  const [selectedCustomers, setSelectedCustomers] = useState(new Set());
  const [selectedLeads, setSelectedLeads] = useState(new Set());

  // Toggle selection for individual matches
  const toggleSelection = (match, clientType) => {
    const clientId = match.customer?.id || match.customer?.customer_id;
    if (!clientId) return;

    if (clientType === 'customer') {
      const newSelection = new Set(selectedCustomers);
      if (newSelection.has(clientId)) {
        newSelection.delete(clientId);
      } else {
        newSelection.add(clientId);
      }
      setSelectedCustomers(newSelection);
    } else {
      const newSelection = new Set(selectedLeads);
      if (newSelection.has(clientId)) {
        newSelection.delete(clientId);
      } else {
        newSelection.add(clientId);
      }
      setSelectedLeads(newSelection);
    }
  };

  // Select all matches in current tab
  const handleSelectAll = (selectAll) => {
    if (activeTab === 'customers') {
      if (selectAll) {
        const allCustomerIds = customerMatches.map(m => m.customer?.id || m.customer?.customer_id).filter(Boolean);
        setSelectedCustomers(new Set(allCustomerIds));
      } else {
        setSelectedCustomers(new Set());
      }
    } else {
      if (selectAll) {
        const allLeadIds = leadMatches.map(m => m.customer?.id || m.customer?.customer_id).filter(Boolean);
        setSelectedLeads(new Set(allLeadIds));
      } else {
        setSelectedLeads(new Set());
      }
    }
  };

  // Assign all selected matches
  const handleAssignSelected = async () => {
    const currentMatches = activeTab === 'customers' ? customerMatches : leadMatches;
    const currentSelection = activeTab === 'customers' ? selectedCustomers : selectedLeads;

    if (currentSelection.size === 0) {
      setNotification({
        type: 'error',
        message: 'No matches selected for assignment'
      });
      setTimeout(() => setNotification(null), 3000);
      return;
    }

    setAssigningSelected(true);

    const selectedMatches = currentMatches.filter(match => {
      const clientId = match.customer?.id || match.customer?.customer_id;
      return currentSelection.has(clientId);
    });

    let successCount = 0;
    let errorCount = 0;

    for (const match of selectedMatches) {
      try {
        const clientName = match.customer?.customer_name || match.customer?.name;
        const matchedScore = match.matchScore;
        const notes = `Assigned via AI matching system`;
        const clientType = activeTab === 'customers' ? 'customer' : 'lead';

        await customerApiService.assignCustomerToEmployee(
          clientName,
          selectedEmployee.name,
          matchedScore,
          notes,
          clientType
        );

        successCount++;
        console.log(`✅ Successfully assigned "${clientName}" to employee "${selectedEmployee.name}"`);
      } catch (error) {
        errorCount++;
        console.error('Failed to assign:', match.customer?.customer_name, error);
      }
    }

    // Clear selection after assignment
    if (activeTab === 'customers') {
      setSelectedCustomers(new Set());
    } else {
      setSelectedLeads(new Set());
    }

    // Show results notification
    if (successCount > 0) {
      setNotification({
        type: 'success',
        message: `Successfully assigned ${successCount} ${activeTab}${successCount > 1 ? '' : ''} to ${selectedEmployee.name}` +
                 (errorCount > 0 ? `. ${errorCount} failed.` : '')
      });
    } else {
      setNotification({
        type: 'error',
        message: `Failed to assign all selected ${activeTab}`
      });
    }

    setTimeout(() => setNotification(null), 5000);
    setAssigningSelected(false);
  };

  const fetchMatches = async () => {
    if (!selectedEmployee?.id) return;

    setLoading(true);
    setError(null);

    try {
      // Fetch all customers/leads and employees for matching
      const [allClients, employees] = await Promise.all([
        customerApiService.getAllCustomers({ excludeAssigned: true }),
        employeeApiService.getAllEmployees()
      ]);

      // Separate customers and leads based on client_type
      const customers = allClients.filter(c => c.client_type === 'customer' || !c.client_type);
      const leads = allClients.filter(c => c.client_type === 'lead');

      // Check if semantic matching service is available
      let semanticAvailable = await semanticMatchingService.checkServiceHealth();

      // If service is running but model isn't loaded yet, trigger loading and wait
      if (!semanticAvailable) {
        console.log('🤖 MatchTab: Semantic matching service not ready, checking if already preloading...');
        setModelLoading(true);

        try {
          // Make a test request to trigger model loading (in case preload didn't work)
          await fetch(`${import.meta.env.VITE_SEMANTIC_MATCHING_API_URL || 'http://localhost:7002'}/semantic-similarity`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text1: 'test', text2: 'test' })
          });
        } catch (error) {
          console.log('MatchTab: Failed to trigger model loading:', error);
        }

        // Shorter wait since model should be preloaded
        console.log('🤖 MatchTab: Waiting 2 seconds for model (should be preloaded)...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        semanticAvailable = await semanticMatchingService.checkServiceHealth();

        // One final retry with shorter wait
        if (!semanticAvailable) {
          console.log('🤖 MatchTab: Final retry in 2 seconds...');
          await new Promise(resolve => setTimeout(resolve, 2000));
          semanticAvailable = await semanticMatchingService.checkServiceHealth();
        }

        setModelLoading(false);
      }

      console.log(`🤖 MatchTab: Semantic matching service: ${semanticAvailable ? 'Available' : 'Unavailable - using fallback'}`);

      if (semanticAvailable) {
        console.log('🔄 MatchTab: Using semantic matching for customer-employee assignments...');
        // Create a global assignment matrix: calculate all customer-employee pairs
        console.log('🔄 Calculating global customer-employee assignment matrix...');
        const assignmentMatrix = [];

        // Calculate match scores for all customer-employee pairs
        for (const customer of customers) {
          for (const employee of employees) {
            try {
              const matchResult = await semanticMatchingService.matchCustomerToEmployees(
                customer,
                [employee]
              );

              if (matchResult.matches && matchResult.matches.length > 0) {
                const match = matchResult.matches[0];
                assignmentMatrix.push({
                  customer,
                  employee,
                  matchScore: match.total_score * 100, // Backend provides total score including rule-based bonuses
                  industryAlignment: match.industry_similarity * 100,
                  skillsMatch: match.skills_similarity * 100,
                  overallSimilarity: match.overall_similarity * 100,
                  confidence: match.overall_confidence,
                  reasons: [
                    `Semantic score: ${(match.semantic_score * 100).toFixed(1)}%`,
                    `Profile match: ${(match.overall_similarity * 100).toFixed(1)}%`,
                    `Industry alignment: ${(match.industry_similarity * 100).toFixed(1)}%`,
                    `Skills compatibility: ${(match.skills_similarity * 100).toFixed(1)}%`,
                    ...(match.rule_based_reasons || [])
                  ]
                });
              }
            } catch (err) {
              console.warn(`Failed to match customer ${customer.customer_name || customer.name} to employee ${employee.name}:`, err);
            }
          }
        }

        // Sort all pairs by match score (highest first)
        assignmentMatrix.sort((a, b) => b.matchScore - a.matchScore);

        // Create a global assignment matrix: calculate all customer-employee pairs
        console.log('🔄 Calculating global customer-employee assignment matrix...');
        const customerAssignmentMatrix = [];
        const leadAssignmentMatrix = [];

        // Calculate match scores for all customer-employee pairs
        for (const customer of customers) {
          for (const employee of employees) {
            try {
              const matchResult = await semanticMatchingService.matchCustomerToEmployees(
                customer,
                [employee]
              );

              if (matchResult.matches && matchResult.matches.length > 0) {
                const match = matchResult.matches[0];
                customerAssignmentMatrix.push({
                  customer,
                  employee,
                  matchScore: match.total_score * 100, // Backend provides total score including rule-based bonuses
                  industryAlignment: match.industry_similarity * 100,
                  skillsMatch: match.skills_similarity * 100,
                  overallSimilarity: match.overall_similarity * 100,
                  confidence: match.overall_confidence,
                  reasons: [
                    `Semantic score: ${(match.semantic_score * 100).toFixed(1)}%`,
                    `Profile match: ${(match.overall_similarity * 100).toFixed(1)}%`,
                    `Industry alignment: ${(match.industry_similarity * 100).toFixed(1)}%`,
                    `Skills compatibility: ${(match.skills_similarity * 100).toFixed(1)}%`,
                    ...(match.rule_based_reasons || [])
                  ]
                });
              }
            } catch (err) {
              console.warn(`Failed to match customer ${customer.customer_name || customer.name} to employee ${employee.name}:`, err);
            }
          }
        }

        // Calculate match scores for all lead-employee pairs
        for (const lead of leads) {
          for (const employee of employees) {
            try {
              const matchResult = await semanticMatchingService.matchCustomerToEmployees(
                lead,
                [employee]
              );

              if (matchResult.matches && matchResult.matches.length > 0) {
                const match = matchResult.matches[0];

                leadAssignmentMatrix.push({
                  customer: lead, // Keep as 'customer' for compatibility
                  employee,
                  matchScore: match.total_score * 100, // Backend provides total score including rule-based bonuses
                  industryAlignment: match.industry_similarity * 100,
                  skillsMatch: match.skills_similarity * 100,
                  overallSimilarity: match.overall_similarity * 100,
                  confidence: match.overall_confidence,
                  reasons: [
                    `Semantic score: ${(match.semantic_score * 100).toFixed(1)}%`,
                    `Profile match: ${(match.overall_similarity * 100).toFixed(1)}%`,
                    `Industry alignment: ${(match.industry_similarity * 100).toFixed(1)}%`,
                    `Skills compatibility: ${(match.skills_similarity * 100).toFixed(1)}%`,
                    ...(match.rule_based_reasons || [])
                  ]
                });
              }
            } catch (err) {
              console.warn(`Failed to match lead ${lead.customer_name || lead.name} to employee ${employee.name}:`, err);
            }
          }
        }

        // Sort all pairs by match score (highest first)
        customerAssignmentMatrix.sort((a, b) => b.matchScore - a.matchScore);
        leadAssignmentMatrix.sort((a, b) => b.matchScore - a.matchScore);

        // Balanced assignment algorithm for customers
        const assignedCustomers = new Set();
        const customerEmployeeAssignments = new Map();

        // Initialize assignment tracking for all employees
        employees.forEach(emp => {
          customerEmployeeAssignments.set(emp.id, []);
        });

        // Calculate target customers per employee for even distribution
        const targetCustomersPerEmployee = Math.ceil(customers.length / employees.length);
        console.log(`🎯 Target customers per employee: ${targetCustomersPerEmployee} (${customers.length} customers / ${employees.length} employees)`);

        // Assign customers using balanced algorithm
        for (const assignment of customerAssignmentMatrix) {
          const { customer, employee, matchScore, industryAlignment, skillsMatch, overallSimilarity, confidence, reasons } = assignment;

          // Skip if customer already assigned
          if (assignedCustomers.has(customer.id || customer.customer_code)) {
            continue;
          }

          // Get current assignments for this employee
          const currentAssignments = customerEmployeeAssignments.get(employee.id) || [];

          // Skip if employee already has target number of customers
          if (currentAssignments.length >= targetCustomersPerEmployee) {
            continue;
          }

          // Assign customer to employee
          const matchData = {
            customer,
            matchScore: Number(matchScore.toFixed(1)),
            industryAlignment: Number(industryAlignment.toFixed(1)),
            skillsMatch: Number(skillsMatch.toFixed(1)),
            overallSimilarity: Number(overallSimilarity.toFixed(1)),
            confidence,
            reasons
          };

          currentAssignments.push(matchData);
          customerEmployeeAssignments.set(employee.id, currentAssignments);
          assignedCustomers.add(customer.id || customer.customer_code);
        }

        // Handle remaining unassigned customers
        const unassignedCustomers = customers.filter(c => !assignedCustomers.has(c.id || c.customer_code));
        console.log(`📊 Unassigned customers: ${unassignedCustomers.length}`);

        for (const customer of unassignedCustomers) {
          // Find employee with least assignments
          let minAssignments = Infinity;
          let targetEmployeeId = null;

          for (const [empId, assignments] of customerEmployeeAssignments.entries()) {
            if (assignments.length < minAssignments) {
              minAssignments = assignments.length;
              targetEmployeeId = empId;
            }
          }

          if (targetEmployeeId) {
            const assignments = customerEmployeeAssignments.get(targetEmployeeId);
            assignments.push({
              customer,
              matchScore: 50,
              industryAlignment: 50,
              skillsMatch: 50,
              overallSimilarity: 50,
              confidence: 0.5,
              reasons: ['Assigned for balanced distribution']
            });
          }
        }

        // Balanced assignment algorithm for leads
        const assignedLeads = new Set();
        const leadEmployeeAssignments = new Map();

        // Initialize assignment tracking for all employees
        employees.forEach(emp => {
          leadEmployeeAssignments.set(emp.id, []);
        });

        // Calculate target leads per employee for even distribution
        const targetLeadsPerEmployee = Math.ceil(leads.length / employees.length);
        console.log(`🎯 Target leads per employee: ${targetLeadsPerEmployee} (${leads.length} leads / ${employees.length} employees)`);

        // Assign leads using balanced algorithm
        for (const assignment of leadAssignmentMatrix) {
          const { customer: lead, employee, matchScore, industryAlignment, skillsMatch, overallSimilarity, confidence, reasons } = assignment;

          // Skip if lead already assigned
          if (assignedLeads.has(lead.id || lead.customer_code)) {
            continue;
          }

          // Get current assignments for this employee
          const currentAssignments = leadEmployeeAssignments.get(employee.id) || [];

          // Skip if employee already has target number of leads
          if (currentAssignments.length >= targetLeadsPerEmployee) {
            continue;
          }

          // Assign lead to employee
          const matchData = {
            customer: lead, // Keep as 'customer' for compatibility
            matchScore: Number(matchScore.toFixed(1)),
            industryAlignment: Number(industryAlignment.toFixed(1)),
            skillsMatch: Number(skillsMatch.toFixed(1)),
            overallSimilarity: Number(overallSimilarity.toFixed(1)),
            confidence,
            reasons
          };

          currentAssignments.push(matchData);
          leadEmployeeAssignments.set(employee.id, currentAssignments);
          assignedLeads.add(lead.id || lead.customer_code);
        }

        // Handle remaining unassigned leads
        const unassignedLeads = leads.filter(l => !assignedLeads.has(l.id || l.customer_code));
        console.log(`📊 Unassigned leads: ${unassignedLeads.length}`);

        for (const lead of unassignedLeads) {
          // Find employee with least assignments
          let minAssignments = Infinity;
          let targetEmployeeId = null;

          for (const [empId, assignments] of leadEmployeeAssignments.entries()) {
            if (assignments.length < minAssignments) {
              minAssignments = assignments.length;
              targetEmployeeId = empId;
            }
          }

          if (targetEmployeeId) {
            const assignments = leadEmployeeAssignments.get(targetEmployeeId);
            assignments.push({
              customer: lead,
              matchScore: 50,
              industryAlignment: 50,
              skillsMatch: 50,
              overallSimilarity: 50,
              confidence: 0.5,
              reasons: ['Assigned for balanced distribution']
            });
          }
        }

        // Get matches for the selected employee after balanced assignment
        const employeeCustomerMatches = (customerEmployeeAssignments.get(selectedEmployee.id) || [])
          .sort((a, b) => b.matchScore - a.matchScore);

        const employeeLeadMatches = (leadEmployeeAssignments.get(selectedEmployee.id) || [])
          .sort((a, b) => b.matchScore - a.matchScore);

        // Log assignment results
        console.log(`✅ Employee ${selectedEmployee.name} assigned:`);
        console.log(`   - ${employeeCustomerMatches.length} customers`);
        console.log(`   - ${employeeLeadMatches.length} leads`);

        // Log overall distribution
        console.log('\n📊 Overall Assignment Distribution:');
        for (const [empId, assignments] of customerEmployeeAssignments.entries()) {
          const emp = employees.find(e => e.id === empId);
          console.log(`   ${emp?.name || 'Unknown'}: ${assignments.length} customers`);
        }

        setCustomerMatches(employeeCustomerMatches);
        setLeadMatches(employeeLeadMatches);

      } else {
        // Fallback: Simple assignment without semantic matching
        console.log('🔄 MatchTab: Using fallback matching (no semantic service)...');

        // Calculate how many customers and leads each employee should get
        const customersPerEmployee = Math.ceil(customers.length / employees.length);
        const leadsPerEmployee = Math.ceil(leads.length / employees.length);

        // Find the index of the selected employee
        const employeeIndex = employees.findIndex(emp => emp.id === selectedEmployee.id);

        // Get the customers assigned to this employee (based on even distribution)
        const startCustomerIndex = employeeIndex * customersPerEmployee;
        const endCustomerIndex = Math.min(startCustomerIndex + customersPerEmployee, customers.length);
        const assignedCustomers = customers.slice(startCustomerIndex, endCustomerIndex);

        // Get the leads assigned to this employee (based on even distribution)
        const startLeadIndex = employeeIndex * leadsPerEmployee;
        const endLeadIndex = Math.min(startLeadIndex + leadsPerEmployee, leads.length);
        const assignedLeads = leads.slice(startLeadIndex, endLeadIndex);

        // Create fallback matches for assigned customers
        const customerFallbackMatches = assignedCustomers.map(customer => ({
          customer,
          matchScore: Math.floor(Math.random() * 40) + 60,
          industryAlignment: Math.floor(Math.random() * 30) + 70,
          skillsMatch: Math.floor(Math.random() * 30) + 70,
          overallSimilarity: Math.floor(Math.random() * 30) + 70,
          confidence: 0.5,
          reasons: ['Fallback assignment - semantic matching unavailable']
        }));

        // Create fallback matches for assigned leads
        const leadFallbackMatches = assignedLeads.map(lead => ({
          customer: lead, // Keep as 'customer' for compatibility
          matchScore: Math.floor(Math.random() * 40) + 60,
          industryAlignment: Math.floor(Math.random() * 30) + 70,
          skillsMatch: Math.floor(Math.random() * 30) + 70,
          overallSimilarity: Math.floor(Math.random() * 30) + 70,
          confidence: 0.5,
          reasons: ['Fallback assignment - semantic matching unavailable']
        }));

        setCustomerMatches(customerFallbackMatches);
        setLeadMatches(leadFallbackMatches);
      }

    } catch (err) {
      console.error('Error fetching matches:', err);
      setError(`Failed to load customer matches: ${err.message || 'Unknown error'}`);

      // Set empty state as fallback
      setCustomerMatches([]);
      setLeadMatches([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedEmployee?.id) {
      fetchMatches();
    }
  }, [selectedEmployee?.id]);

  // Early return if no employee selected
  if (!selectedEmployee) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg border border-yellow-200 p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600" />
            <p className="text-gray-600">No employee selected for customer matching.</p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div className="bg-white rounded-lg border p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="h-5 w-40 bg-gray-200 rounded animate-pulse" />
              <div className="flex bg-gray-100 rounded-lg p-1 gap-2">
                <div className="h-7 w-20 bg-gray-200 rounded-md animate-pulse" />
                <div className="h-7 w-20 bg-gray-200 rounded-md animate-pulse" />
              </div>
            </div>
            <div className="h-8 w-24 bg-gray-200 rounded-lg animate-pulse" />
          </div>

          {/* Selection Controls Skeleton */}
          <div className="flex items-center justify-between mb-4 p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 bg-gray-200 rounded border animate-pulse" />
              <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
              <div className="h-4 w-40 bg-gray-100 rounded animate-pulse" />
            </div>
            <div className="h-8 w-40 bg-gray-200 rounded-lg animate-pulse" />
          </div>

          {/* Match Cards Skeleton */}
          <div className="space-y-4">
            {[...Array(3)].map((_, idx) => (
              <div key={idx} className="border rounded-lg p-4 bg-white">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse" />
                    <div className="flex-1 min-w-0">
                      <div className="h-4 w-64 bg-gray-200 rounded animate-pulse mb-2" />
                      <div className="h-3 w-48 bg-gray-100 rounded animate-pulse mb-2" />
                      <div className="flex items-center gap-2 mb-2">
                        <div className="h-5 w-24 bg-gray-200 rounded-full animate-pulse" />
                        <div className="h-5 w-24 bg-gray-200 rounded-full animate-pulse" />
                        <div className="h-5 w-24 bg-gray-200 rounded-full animate-pulse" />
                      </div>
                      <div className="w-full bg-gray-200 rounded h-1.5">
                        <div className="h-1.5 bg-gray-300 rounded animate-pulse" style={{ width: '60%' }} />
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 ml-4">
                    <div className="h-8 w-32 bg-gray-200 rounded-lg animate-pulse" />
                    <div className="h-8 w-24 bg-gray-200 rounded-lg animate-pulse" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (modelLoading) {
    return (
      <div className="space-y-6">
        {/* Model Loading Skeleton (same layout for consistency) */}
        <div className="bg-white rounded-lg border p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="h-5 w-40 bg-gray-200 rounded animate-pulse" />
              <div className="flex bg-gray-100 rounded-lg p-1 gap-2">
                <div className="h-7 w-20 bg-gray-200 rounded-md animate-pulse" />
                <div className="h-7 w-20 bg-gray-200 rounded-md animate-pulse" />
              </div>
            </div>
            <div className="h-8 w-32 bg-gray-200 rounded-lg animate-pulse" />
          </div>

          {/* Selection Controls Skeleton */}
          <div className="flex items-center justify-between mb-4 p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 bg-gray-200 rounded border animate-pulse" />
              <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
              <div className="h-4 w-40 bg-gray-100 rounded animate-pulse" />
            </div>
            <div className="h-8 w-40 bg-gray-200 rounded-lg animate-pulse" />
          </div>

          <div className="space-y-4">
            {[...Array(2)].map((_, idx) => (
              <div key={idx} className="border rounded-lg p-4 bg-white">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse" />
                    <div className="flex-1 min-w-0">
                      <div className="h-4 w-56 bg-gray-200 rounded animate-pulse mb-2" />
                      <div className="h-3 w-40 bg-gray-100 rounded animate-pulse mb-2" />
                      <div className="flex items-center gap-2 mb-2">
                        <div className="h-5 w-24 bg-gray-200 rounded-full animate-pulse" />
                        <div className="h-5 w-24 bg-gray-200 rounded-full animate-pulse" />
                        <div className="h-5 w-24 bg-gray-200 rounded-full animate-pulse" />
                      </div>
                      <div className="w-full bg-gray-200 rounded h-1.5">
                        <div className="h-1.5 bg-gray-300 rounded animate-pulse" style={{ width: '45%' }} />
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 ml-4">
                    <div className="h-8 w-28 bg-gray-200 rounded-lg animate-pulse" />
                    <div className="h-8 w-20 bg-gray-200 rounded-lg animate-pulse" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg border border-red-200 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <div>
              <h3 className="font-medium text-gray-900">Customer Matching Unavailable</h3>
              <p className="text-sm text-gray-600">{error}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={fetchMatches}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Retry Matching
            </button>
          </div>
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-700">
              Customer matching requires the semantic matching service to be running.
              Please ensure all services are started and try again.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 py-4 px-5">
      {/* Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg max-w-md ${
          notification.type === 'success'
            ? 'bg-green-100 border border-green-400 text-green-700'
            : 'bg-red-100 border border-red-400 text-red-700'
        }`}>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${
              notification.type === 'success' ? 'bg-green-600' : 'bg-red-600'
            }`} />
            <p className="text-sm font-medium">{notification.message}</p>
            <button
              onClick={() => setNotification(null)}
              className="ml-auto text-lg leading-none hover:opacity-70"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Matching Stats */}
      {/* Matching statistics removed as requested */}

      {/* Tab Navigation */}
      <div className="bg-white rounded-lg border p-5 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-green-600" />
              Matches for {selectedEmployee.name}
            </h3>
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setActiveTab('customers')}
                className={`px-3 py-1 rounded-md text-sm transition-colors ${
                  activeTab === 'customers'
                    ? 'bg-white shadow-sm text-gray-900 font-medium'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Customers ({customerMatches.length})
              </button>
              <button
                onClick={() => setActiveTab('leads')}
                className={`px-3 py-1 rounded-md text-sm transition-colors ${
                  activeTab === 'leads'
                    ? 'bg-white shadow-sm text-gray-900 font-medium'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Leads ({leadMatches.length})
              </button>
            </div>
          </div>
          <button
            onClick={async () => {
              try {
                setLoading(true);
                try {
                  await semanticMatchingService.clearCache();
                } catch (e) {
                  console.warn('Backend cache clear failed, falling back to local clear', e);
                  semanticMatchingService.clearLocalCache();
                }
                await fetchMatches();
              } finally {
                setLoading(false);
              }
            }}
            className="flex items-center gap-2 px-3 py-1 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        {/* Selection Controls */}
        <div className="flex items-center justify-between mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="select-all"
                checked={activeTab === 'customers'
                  ? selectedCustomers.size === customerMatches.length && customerMatches.length > 0
                  : selectedLeads.size === leadMatches.length && leadMatches.length > 0}
                onChange={(e) => handleSelectAll(e.target.checked)}
                className="rounded border-gray-300 text-green-600 focus:ring-green-500"
              />
              <label htmlFor="select-all" className="text-sm text-gray-700">
                Select All
              </label>
            </div>
            <span className="text-sm text-gray-500">
              {activeTab === 'customers'
                ? `${selectedCustomers.size} of ${customerMatches.length} customers selected`
                : `${selectedLeads.size} of ${leadMatches.length} leads selected`}
            </span>
          </div>
          <button
            onClick={handleAssignSelected}
            disabled={assigningSelected || (activeTab === 'customers' ? selectedCustomers.size === 0 : selectedLeads.size === 0)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              assigningSelected || (activeTab === 'customers' ? selectedCustomers.size === 0 : selectedLeads.size === 0)
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            {assigningSelected ? 'Assigning...' : `Assign Selected (${activeTab === 'customers' ? selectedCustomers.size : selectedLeads.size})`}
          </button>
        </div>

        {/* Customer Matches Tab */}
        {activeTab === 'customers' && (
          <div>
            {customerMatches.length > 0 ? (
              <div className="space-y-4">
                {customerMatches.map((match, index) => {
                  const clientId = match.customer?.id || match.customer?.customer_id;
                  const isSelected = selectedCustomers.has(clientId);

                  return (
                    <div key={index} className={`border rounded-lg p-4 transition-colors ${
                      isSelected ? 'border-green-200 bg-green-50' : 'border-gray-200 hover:bg-gray-50'
                    }`}>
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelection(match, 'customer')}
                            className="mt-1 rounded border-gray-300 text-green-600 focus:ring-green-500"
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h4 className="font-medium text-gray-900">
                                {match.customer?.customer_name || match.customer?.name || 'Unknown Customer'}
                              </h4>
                              <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                Customer
                              </span>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                match.matchScore >= 80
                                  ? 'bg-green-100 text-green-700'
                                  : match.matchScore >= 60
                                  ? 'bg-yellow-100 text-yellow-700'
                                  : 'bg-red-100 text-red-700'
                              }`}>
                                {match.matchScore}%
                              </span>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 mb-3">
                              <div className="flex items-center gap-2">
                                <Users className="w-4 h-4" />
                                <span>Profile: {match.overallSimilarity}%</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Building className="w-4 h-4" />
                                <span>Industry: {match.industryAlignment}%</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <TrendingUp className="w-4 h-4" />
                                <span>Skills: {match.skillsMatch}%</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <DollarSign className="w-4 h-4" />
                                <span>
                                  Value: ${(match.customer?.total_sales || match.customer?.contractValue || 0).toLocaleString()}
                                </span>
                              </div>
                            </div>

                            <div className="text-xs text-gray-500">
                              <strong>Reasons:</strong> {match.reasons?.join(', ') || 'No specific reasons available'}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center text-gray-500 text-sm py-8">
                <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p>No customer matches found for this employee.</p>
                <p className="text-xs mt-1">Try refreshing or check if customers are available in the system.</p>
              </div>
            )}
          </div>
        )}

        {/* Lead Matches Tab */}
        {activeTab === 'leads' && (
          <div>
            {leadMatches.length > 0 ? (
              <div className="space-y-4">
                {leadMatches.map((match, index) => {
                  const clientId = match.customer?.id || match.customer?.customer_id;
                  const isSelected = selectedLeads.has(clientId);

                  return (
                    <div key={index} className={`border rounded-lg p-4 transition-colors ${
                      isSelected ? 'border-green-200 bg-green-50' : 'border-gray-200 hover:bg-gray-50'
                    }`}>
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelection(match, 'lead')}
                            className="mt-1 rounded border-gray-300 text-green-600 focus:ring-green-500"
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h4 className="font-medium text-gray-900">
                                {match.customer?.customer_name || match.customer?.name || 'Unknown Lead'}
                              </h4>
                              <span className="px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
                                Lead
                              </span>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                match.matchScore >= 80
                                  ? 'bg-green-100 text-green-700'
                                  : match.matchScore >= 60
                                  ? 'bg-yellow-100 text-yellow-700'
                                  : 'bg-red-100 text-red-700'
                              }`}>
                                {match.matchScore}%
                              </span>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 mb-3">
                              <div className="flex items-center gap-2">
                                <Users className="w-4 h-4" />
                                <span>Profile: {match.overallSimilarity}%</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Building className="w-4 h-4" />
                                <span>Industry: {match.industryAlignment}%</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <TrendingUp className="w-4 h-4" />
                                <span>Skills: {match.skillsMatch}%</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <DollarSign className="w-4 h-4" />
                                <span>
                                  Value: ${(match.customer?.total_sales || match.customer?.contractValue || 0).toLocaleString()}
                                </span>
                              </div>
                            </div>

                            <div className="text-xs text-gray-500">
                              <strong>Reasons:</strong> {match.reasons?.join(', ') || 'No specific reasons available'}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center text-gray-500 text-sm py-8">
                <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p>No lead matches found for this employee.</p>
                <p className="text-xs mt-1">Try refreshing or check if leads are available in the system.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MatchTab;