<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;


class AuthRequest extends FormRequest
{

    public function rules()
    {
        return [
            // Accept either email or IC in a single field for staff login.
            // Keep backward-compat with older clients sending `email`.
            'login' => ['required_without:email', 'nullable', 'string', 'max:255'],
            'email' => ['required_without:login', 'nullable', 'string', 'max:255'],
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
        $loginRaw = (string) ($this->input('login') ?? $this->input('email') ?? '');
        $login = trim($loginRaw);

        $credentials = null;

        if ($login !== '' && str_contains($login, '@')) {
            $credentials = ['email' => $login, 'password' => $this->input('password')];
        } else {
            // Normalize IC by removing non-digits; allow inputs like 900101-01-0001.
            $icDigits = preg_replace('/\\D+/', '', $login);
            $userId = DB::table('staff')
                ->where('ic_number', $login)
                ->orWhere('ic_number', $icDigits)
                ->value('user_id');

            if ($userId) {
                $email = DB::table('users')->where('id', $userId)->value('email');
                if ($email) {
                    $credentials = ['email' => $email, 'password' => $this->input('password')];
                }
            }
        }

        if (! $credentials || ! Auth::attempt($credentials, $this->boolean('remember'))) {
            // Return under both keys so legacy & new UI can show the message.
            throw ValidationException::withMessages([
                'login' => __('auth.failed'),
                'email' => __('auth.failed'),
            ]);
        }
 
     }
}
