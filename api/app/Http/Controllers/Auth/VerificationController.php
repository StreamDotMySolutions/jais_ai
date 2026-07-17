<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;

class VerificationController extends Controller
{
    public function verify(Request $request, $id, $hash)
    {
        $frontendUrl = config('app.frontend_url', 'http://localhost:3000');

        $user = User::findOrFail($id);

        if (! hash_equals((string) $hash, sha1($user->getEmailForVerification()))) {
            return redirect($frontendUrl . '/email-verified?status=invalid');
        }

        if ($user->hasVerifiedEmail()) {
            return redirect($frontendUrl . '/email-verified?status=already_verified');
        }

        $user->markEmailAsVerified();
        $user->update(['status' => 1]);

        return redirect($frontendUrl . '/email-verified?status=success');
    }

    public function resend(Request $request)
    {
        $request->validate(['email' => 'required|email|exists:users,email']);

        $user = User::where('email', $request->email)->first();

        if ($user->hasVerifiedEmail()) {
            return response()->json([
                'message' => 'Emel telah disahkan sebelum ini. Sila log masuk.',
            ]);
        }

        $user->sendEmailVerificationNotification();

        return response()->json([
            'message' => 'Emel verifikasi telah dihantar semula. Sila semak peti masuk emel anda.',
        ]);
    }
}
