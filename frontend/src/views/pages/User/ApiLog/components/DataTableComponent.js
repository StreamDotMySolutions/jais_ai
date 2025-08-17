
import React, {  } from 'react';
import { Table } from 'react-bootstrap';
import useStore from '../../../../../store';
import PaginatorLink from '../../../../../libs/PaginatorLink';
import ViewJobModal from '../modals/ViewJobModal';


const DataTableComponent = () => {
    const store = useStore()
    const items = store.getValue('logs'); // get from index.js 
    const url = process.env.REACT_APP_SERVER_URL; 
    //console.log(items.data)
    
    return (
    <div>
            <Table>
                <thead>
                    <tr>
                        <th style={{ 'width': '20px'}}>ID</th>
                        <th  style={{ 'width': '20vH'}}>AI</th>
                        <th  style={{ 'width': '30vH'}}>Model</th>
                        <th  style={{ 'width': '30vH'}}>Module</th>
                        <th  style={{ 'width': '30vH'}}>Document Size ( MB )</th>
                        <th style={{ 'width': '20px'}} className='text-center'>Tokens</th>
                        <th style={{ 'width': '50px'}} className='text-center'>Time Taken (sec)</th>
                        <th className='text-center'>Action</th>
                    </tr>
                </thead>

            
                <tbody>
                 {items?.data?.length > 0 ? (
                    items.data.map((item, index) => (
                    <tr key={index}>
                        <td><span className="badge bg-dark">{item.id}</span></td>
                        <td className="text-left">{item.ai_name}</td>
                        <td className="text-left">{item.model_name}</td>
                        <td className="text-left">{item.module_name}</td>
                        <td className="text-left">
                              {(item.attachment_size / (1024 * 1024)).toFixed(2)} MB
                        </td>
                        <td className="text-center">{item.tokens_used}</td>
                        <td className="text-center">
                             {(item.time_taken / 1000).toFixed(2)}s
                        </td>
                        <td className="text-center" style={{ width: '200px' }}>
                            <ViewJobModal />
                        </td>
                    </tr>
                    ))
                ) : (
                    <tr>
                    <td colSpan={5} className="text-center">No data available</td>
                    </tr>
                )}
                </tbody>

            </Table>
            <PaginatorLink store={store} items={items} />
        </div>
    );
};

export default DataTableComponent;