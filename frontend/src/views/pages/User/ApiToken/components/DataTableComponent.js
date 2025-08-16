
import React, {  } from 'react';
import { Badge, Card, Figure, Table } from 'react-bootstrap';
import useStore from '../../../../../store';
import Ordering from './OrderingComponent';
import PaginatorLink from '../../../../../libs/PaginatorLink';
import CreateButton from '../../../../../libs/CreateButton';
import CreateModal from '../modals/CreateModal';
import EditModal from '../modals/EditModal';
import DeleteModal from '../modals/DeleteModal';
import StreamComponent from './StreamComponent';
import CheckStream from './CheckStream';

const DataTableComponent = () => {
    const store = useStore()
    const items = store.getValue('tokens'); 
    const url = process.env.REACT_APP_SERVER_URL; 
    console.log(items)
    
    return (
    <div>
       

    <div className="contaicolner">
        <div className="row align-items-center">
            {/* Left Column */}
            <div className="col-md-6">
                {/* <CheckStream /> */}
            </div>

            {/* Right Column */}
            <div className="col-md-6 d-flex justify-content-end">
                <CreateButton>
                    <CreateModal />
                </CreateButton>
            </div>
        </div>
    </div>
            

   
            <Table>
                <thead>
                    <tr>
                        <th style={{ 'width': '20px'}}>ID</th>
                        <th  style={{ 'width': '100vH'}}>Name</th>
                        <th  style={{ 'width': '100vH'}}>API Key</th>
                        <th style={{ 'width': '50px'}} className='text-center'>Created At</th>
                        <th style={{ 'width': '50px'}} className='text-center'>Last Used</th>
                        <th className='text-center'>Action</th>
                    </tr>
                </thead>

                {/* <tbody>
                    {items ? 
                    (
                        <>
                            {items.data && items.data.length > 0 ? 
                            (
                                <>
                                    {items.data.map((item, index) => (
                                        <tr key={index}>
                                            <td><span className="badge bg-dark">{item.id}</span></td>    
                                     
                                
                                        
                              
                                               
                              
                                            <td className='text-center'>{item.name}</td> 
                                            <td className='text-center'>{item.created_at}</td>    
                                            
                                                    
                                                        
                                            <td className='text-center' style={{width: '200px'}}>
                                          
                                                {' '}
                                              
                                                <DeleteModal id={item.id} />
                                            </td>
                                        </tr>
                                    ))}
                                </>
                            ) : 
                            (
                                <tr>
                                    <td colSpan={7} className="text-center">No data available</td>
                                </tr>
                            )}
                        </>
                    ) : 
                    (
                        <tr>
                            <td colSpan={7} className="text-center">No data available</td>
                        </tr>
                    )}
                </tbody> */}


                <tbody>
                {items?.data?.length > 0 ? (
                    items.data.map((item, index) => (
                    <tr key={index}>
                        <td><span className="badge bg-dark">{item.id}</span></td>
                        <td className="text-left">{item.name}</td>
                         <td className="text-left">{item.key}</td>
                        <td className="text-center">
                        {new Date(item.created_at).toLocaleString()}
                        </td>
                        <td className="text-center">
                        {item.last_used_at
                            ? new Date(item.last_used_at).toLocaleString()
                            : 'Never used'}
                        </td>
                        <td className="text-center" style={{ width: '200px' }}>
                        <DeleteModal id={item.id} />
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