<?php

namespace App\Http\Requests\User;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateRequest extends FormRequest
{
    public function rules(): array
    {
        $roleTable = config('permission.table_names.roles');

        return [
            'role_id' => ['sometimes','required', Rule::exists($roleTable, 'id')],
            'email' => [
                    'required',
                    'email',
                    // assuming id is pk
                    Rule::unique('users', 'email')->ignore($this->user->id),
                ],
            'password' => 'required_if:password_present,true|min:6|confirmed',
            'name' => 'sometimes|required',    
            'status' => ['sometimes', 'in:0,1'], // Only allows 0 or 1
        ];
    }

    public function messages(): array
    {
        return [
            //'role_id.required' => 'Please select a role.', // Custom error message for role_id field
        ];
    }
}
