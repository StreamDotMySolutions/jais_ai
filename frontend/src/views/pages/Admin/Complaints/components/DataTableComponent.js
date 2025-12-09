
import React, { useState, useEffect } from 'react';
import { Table,Button, Badge } from 'react-bootstrap';
import useStore from '../../../../../store';
import PaginatorLink from '../../../../../libs/PaginatorLink';
import CreateButton from '../../../../../libs/CreateButton';
import CreateModal from '../modals/CreateModal';
import ViewModal from '../modals/ViewModal';
import EditModal from '../modals/EditModal';
import DeleteModal from '../modals/DeleteModal';

const DataTableComponent = () => {
    const store = useStore()
    const items = store.getValue('users')
    return (
        <div>

            {/* <CreateButton>
                <CreateModal />
            </CreateButton> */}
            
   
            <Table>
                <thead>
                    <tr>
                        <th style={{ 'width': '20px'}}>ID</th>
                        <th>Nama</th>
                        <th>No K/P</th>
                        <th>Alamat</th>
                        <th>Telefon</th>
                        <th>Created At</th>
                        <th className='text-center'></th>
                    </tr>
                </thead>

                <tbody>
                    {items ?
                        <>
                            {items?.data?.map((item,index) => (
                            <tr key={index}>
                                <td><span className="badge bg-dark">{item.id}</span></td>
                                <td>{item.name}</td>
                                <td>{item.identification_number}</td>
                                <td>{item.address}</td>
                                <td>{item.contact_number}</td>
                                <td style={{'width':'180px'}}>{item.created_at}</td>
                                <td className='text-center' style={{'width':'200px'}}>
                                    <ViewModal id={item.id} />
                                </td>
                            </tr> 
                        ))}
                        </>
                    :
                        <tr>
                            <td colSpan={6}>loading ...</td>
                        </tr>
                    }
                   
                </tbody>
            </Table>
            <PaginatorLink store={store} items={items} />
        </div>
    );
};

export default DataTableComponent;