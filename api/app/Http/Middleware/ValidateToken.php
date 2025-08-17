<?php
namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use App\Models\ApiToken;

class ValidateToken
{
    public function handle(Request $request, Closure $next)
    {
        $plainToken = $request->bearerToken();

        if (!$plainToken) {
            return response()->json(['message' => 'Unauthorized, token missing'], 401);
        }

        // Cari token dalam DB
        $apiToken = ApiToken::with('user')
            //->where('key', hash('sha256', $plainToken))
            ->where('key', $plainToken)
            ->first();

        if (!$apiToken) {
            return response()->json(['message' => 'Unauthorized, invalid token'], 401);
        }

        // Check kalau user ada & status == true
        if (!$apiToken->user || !$apiToken->user->status) {
            return response()->json(['message' => 'Unauthorized, inactive user'], 401);
        }

        // Update last_used_at
        $apiToken->update(['last_used_at' => now()]);

        // Optionally attach user ke request (senang guna)
        $request->merge(['auth_user' => $apiToken->user]);

        // Terus setkan user
        $request->setUserResolver(fn () => $apiToken->user);

        return $next($request);
    }
}
