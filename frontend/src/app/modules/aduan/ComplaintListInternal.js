import React from 'react';
import ComplaintList from './ComplaintList';

const ComplaintListInternal = (props) => {
    return <ComplaintList {...props} publicMode={false} />;
};

export default ComplaintListInternal;
