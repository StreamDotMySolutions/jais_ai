<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;


class AuthRequest extends FormRequest
{

    public function rules()
    {
        return [
            'email' => ['required', 'string', 'max:255'],
            'password' => ['required', 'string'],
        ];
    }

    /**
     * Attempt to authenticate the request's credentials.
     *
     * @throws \Illuminate\Validation\ValidationException
     */

     public function authenticate()
     {
 
         if (! Auth::attempt($this->only('email', 'password'), $this->boolean('remember'))) {
 
             throw ValidationException::withMessages([
                 'email' => __('auth.failed'),
             ]);

         }
 
     }
}
