<?php

namespace App\Http\Requests\User;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreRequest extends FormRequest
{
    public function rules(): array
    {
        $roleTable = config('permission.table_names.roles');

        return [
            'name' => 'required',
            'role_id' => ['required', Rule::exists($roleTable, 'id')],
            'email' => ['required','email', Rule::unique('users')],
            'password' => 'required|min:6|confirmed',    
            'status' => ['required', 'in:0,1'], // Only allows 0 or 1
        ];
    }

    public function messages(): array
    {
        return [
            'role_id.required' => 'Please select a role.', // Custom error message for role_id field
        ];
    }
}
