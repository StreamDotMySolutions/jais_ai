<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class VerifyWhatsappWebSecret
{
    public function handle(Request $request, Closure $next): Response
    {
        $expected = config('services.whatsappweb.internal_secret');
        $provided = $request->header('X-WAWEB-SECRET', '');

        if (!$expected || !is_string($provided) || !hash_equals($expected, $provided)) {
            return response()->json(['error' => 'Forbidden'], 403);
        }

        return $next($request);
    }
}
