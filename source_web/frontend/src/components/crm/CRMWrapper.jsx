import React from 'react';
import { CRMProvider } from '../../contexts/CRMContext';
import CustomerRelationshipManagement from './CustomerRelationshipManagement';

// Wrapper component that provides CRM context only to CRM components
const CRMWrapper = ({ wsConnection }) => {
  return (
    <CRMProvider>
      <CustomerRelationshipManagement wsConnection={wsConnection} />
    </CRMProvider>
  );
};

export default CRMWrapper;