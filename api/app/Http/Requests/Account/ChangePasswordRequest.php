<?php

namespace App\Http\Requests\Account;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ChangePasswordRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'current_password' => ['required', 'current_password'],
            'password' => ['required', 'min:8', 'confirmed', 'different:current_password'],
        ];
    }

    public function messages(): array
    {
        return [
            'current_password.required' => 'Kata laluan semasa wajib diisi.',
            'current_password.current_password' => 'Kata laluan semasa tidak tepat.',
            'password.required' => 'Kata laluan baharu wajib diisi.',
            'password.min' => 'Kata laluan baharu mesti sekurang-kurangnya 8 aksara.',
            'password.confirmed' => 'Pengesahan kata laluan tidak sepadan.',
            'password.different' => 'Kata laluan baharu mesti berbeza daripada kata laluan semasa.',
        ];
    }
}
