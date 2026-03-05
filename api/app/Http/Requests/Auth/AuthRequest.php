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
        $userStatus = null;

        if ($login !== '' && str_contains($login, '@')) {
            $user = DB::table('users')
                ->where('email', $login)
                ->first(['email', 'status']);
            if ($user) {
                $credentials = ['email' => $user->email, 'password' => $this->input('password')];
                $userStatus = (int) ($user->status ?? 0);
            }
        } else {
            // Normalize IC by removing non-digits; allow inputs like 900101-01-0001.
            $icDigits = preg_replace('/\\D+/', '', $login);
            $userId = DB::table('staff')
                ->where('ic_number', $login)
                ->orWhere('ic_number', $icDigits)
                ->value('user_id');

            if ($userId) {
                $user = DB::table('users')
                    ->where('id', $userId)
                    ->first(['email', 'status']);
                if ($user && !empty($user->email)) {
                    $credentials = ['email' => $user->email, 'password' => $this->input('password')];
                    $userStatus = (int) ($user->status ?? 0);
                }
            }
        }

        if (! $credentials) {
            throw ValidationException::withMessages([
                'login' => __('auth.failed'),
                'email' => __('auth.failed'),
            ]);
        }

        if ($userStatus !== 1) {
            throw ValidationException::withMessages([
                'login' => 'Akaun tidak aktif. Sila hubungi pentadbir sistem.',
                'email' => 'Akaun tidak aktif. Sila hubungi pentadbir sistem.',
            ]);
        }

        if (! Auth::attempt($credentials, $this->boolean('remember'))) {
            // Return under both keys so legacy & new UI can show the message.
            throw ValidationException::withMessages([
                'login' => __('auth.failed'),
                'email' => __('auth.failed'),
            ]);
        }
 
     }
}
