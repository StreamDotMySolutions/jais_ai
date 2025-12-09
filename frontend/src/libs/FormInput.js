import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Row,Col,Form, InputGroup } from 'react-bootstrap';
import { React} from 'react';
import useStore from '../store';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css'; // import styles

export function appendFormData(formData, data) {
    if (data instanceof Array) {
        data.forEach(item => {
            const { key, value } = item;
            if (value !== null && value !== undefined) {
                formData.append(key, value);
            }
        });
    } else if (typeof data === 'object') {
        for (const key in data) {
            const value = data[key];
            if (value !== null && value !== undefined) {
                formData.append(key, value);
            }
        }
    }
}
export function TextEditor({fieldName}){
    const store = useStore()
    const errors = store.getValue('errors')

    return (
        <div className="mb-5">
            <ReactQuill
              value={store.getValue(fieldName) ||  ''}
              onChange={(content) => {
                store.setValue(fieldName, content);
              }}
            style={{ height: '400px' }}
            />
                   
        </div>
               
      );
}

export function InputText({fieldName, placeholder, icon, isLoading, type='text'}){
    const store = useStore()
    const errors = store.getValue('errors')

    return(<>
                <InputGroup>
                    <InputGroup.Text><i className={`fs-5 ${icon}`}></i></InputGroup.Text>
                    <Form.Control 
                        placeholder={placeholder}
                        type={type}
                        value={store.getValue(fieldName) ||  ''}
                        name={fieldName}
                        size='md' 
                        readOnly={isLoading}
                        //required 
                        isInvalid={errors?.hasOwnProperty(fieldName)}
                        onChange={ (e) => { 
                          store.setValue(fieldName, e.target.value)                         
                        } }
                    />
                    {
                        errors?.hasOwnProperty(fieldName) &&
                            (
                                <Form.Control.Feedback type="invalid">   
                                { errors[fieldName] ? errors[fieldName] : null }
                                </Form.Control.Feedback>
                            )
                    }  
                </InputGroup>
            </>)
}

export function InputTextarea({fieldName, placeholder, icon, rows, isLoading}){
    const store = useStore()
    const errors = store.getValue('errors')

    return(<>
                <InputGroup>
                    <InputGroup.Text><i className={`fs-5 ${icon}`}></i></InputGroup.Text>
                    <Form.Control 
                        as="textarea" 
                        rows={rows}
                        placeholder={placeholder}
                        value={store.getValue(fieldName) ||  ''}
                        name={fieldName}
                        size='md' 
                        readOnly={isLoading}
                        //required 
                        isInvalid={errors?.hasOwnProperty(fieldName)}
                        onChange={ (e) => { 
                          store.setValue(fieldName, e.target.value)                         
                        } }
                    />
                    {
                        errors?.hasOwnProperty(fieldName) &&
                            (
                                <Form.Control.Feedback type="invalid">   
                                { errors[fieldName] ? errors[fieldName] : null }
                                </Form.Control.Feedback>
                            )
                    }  
                </InputGroup>
            </>)
}

export function InputSelect({fieldName, placeholder, icon, isLoading, options}){
    const store = useStore()
    const errors = store.getValue('errors')

    return(<>
                <InputGroup>
                    <InputGroup.Text><i className={`fs-5 ${icon}`}></i></InputGroup.Text>
                    <Form.Select
                        name={fieldName}
                        size='md' 
                        readOnly={isLoading}
                        required 
                        isInvalid={errors?.hasOwnProperty(fieldName)}
                        //value={store.getValue(fieldName) ? store.getValue(fieldName) : '' }  // Parent select manages the selected value
                        value={store.getValue(fieldName) !== undefined && store.getValue(fieldName) !== null
                                ? store.getValue(fieldName)
                                : ''
}
                        onChange={ (e) => { 
                          store.setValue(fieldName, e.target.value)                         
                        } }
                    >
                        <option>{placeholder}</option>
                        {options?.map((option,index) => (
                            <option 
                                value={option.id}
                                key={index}
                                //selected={option.id === store.getValue(fieldName)}  
                            >{option.name}</option>
                        ))}
             
                    </Form.Select>
                    {
                        errors?.hasOwnProperty(fieldName) &&
                            (
                                <Form.Control.Feedback type="invalid">   
                                { errors[fieldName] ? errors[fieldName] : null }
                                </Form.Control.Feedback>
                            )
                    }  
                </InputGroup>
            </>)
}

export function InputFile({fieldName, placeholder, icon,accept='image/*', isLoading}){
    const store = useStore()
    const errors = store.getValue('errors')

    return(<>
                <InputGroup>
                    <InputGroup.Text><i className={`fs-5 ${icon}`}></i></InputGroup.Text>
                    <Form.Control 
                        placeholder={placeholder}
                        type={'file'}
                        //value={store.getValue(fieldName) ||  ''}
                        name={fieldName}
                        size='md' 
                        readOnly={isLoading}
                        accept={accept}
                        isInvalid={errors?.hasOwnProperty(fieldName)}
                        onChange={ (e) => { 
                          store.setValue(fieldName, e.target.files[0])                         
                        } }
                    />
                    {
                        errors?.hasOwnProperty(fieldName) &&
                            (
                                <Form.Control.Feedback type="invalid">   
                                { errors[fieldName] ? errors[fieldName] : null }
                                </Form.Control.Feedback>
                            )
                    }  
                </InputGroup>
            </>)
}

export function InputRadio({fieldName,label,options=[]}){

    const store = useStore()
    const errors = store.getValue('errors')

    return (

        <>
            <Form>
                <Form.Group>
                    <Form.Label><h6>{label}</h6></Form.Label>
                    <Row>
                    {options.map( (item,index) => (
                    
                        <Col key={index}>
                            <Form.Check
                                type="radio"
                                label={item.label}
                                name={fieldName}
                                value={item.value}
                                isInvalid={errors?.hasOwnProperty(fieldName)}
                                checked={store.getValue(fieldName) == item.value }
                                onChange={(e) => { 
                                    store.setValue(fieldName, item.value)
                                }}
                            />
                        </Col>
                    
                    ))}
                    </Row>
                </Form.Group>
            </Form>    
        </>
    )
}

export function InputRadioBoolean({fieldName,icon,label="Active", yesLabel="Yes", noLabel="No"}){
    const store = useStore()
    const errors = store.getValue('errors')

    return(
        <>
        <Form>
            <Form.Group>
                <Form.Label><h6>{label}</h6></Form.Label>
                <Row>
                    <Col>
                    <Form.Check
                        type="radio"
                        label={yesLabel}
                        name={fieldName}
                        value="1"
                        isInvalid={errors?.hasOwnProperty(fieldName)}
                        checked={store.getValue(fieldName) == 1}
                        onChange={(e) => { 
                            store.setValue(fieldName, '1');
                        }}
                    />
                    </Col>
                    <Col>
                    <Form.Check
                        type="radio"
                        label={noLabel}
                        name={fieldName}
                        value="0"
                        isInvalid={errors?.hasOwnProperty(fieldName)}
                        checked={store.getValue(fieldName) == 0}
                        onChange={(e) => { 
                            store.setValue(fieldName,'0');
                        }}
                    />
                    </Col>
                </Row>
                {errors?.hasOwnProperty(fieldName) && (
                    <span className='text-danger'>   
                        {errors[fieldName] ? errors[fieldName] : null}
                    </span>
                )}
                </Form.Group>
            </Form>
        </>
    )
}

export function InputDate({fieldName, icon}){
    const store = useStore()
    const errors = store.getValue('errors')

    return(<>
    
    <InputGroup>
        <InputGroup.Text><i className={`fas ${icon}`}></i></InputGroup.Text>
        <Form.Control 
            name={fieldName}
            type="date" 
            value={store.getValue(fieldName)}
            isInvalid={errors?.hasOwnProperty(fieldName)}
            onChange={(e) => { 
                store.setValue(fieldName, e.target.value ? e.target.value : null);
            }}
            
        />

        {
            errors?.hasOwnProperty(fieldName) &&
                (
                    <Form.Control.Feedback type="invalid">   
                    { errors[fieldName] ? errors[fieldName] : null }
                    </Form.Control.Feedback>
                )
         }  
    </InputGroup>
    </>)
}