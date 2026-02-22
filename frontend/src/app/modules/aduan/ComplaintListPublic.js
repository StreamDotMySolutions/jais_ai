import React from 'react';
import ComplaintList from './ComplaintList';

const ComplaintListPublic = (props) => {
    return <ComplaintList {...props} publicMode />;
};

export default ComplaintListPublic;
