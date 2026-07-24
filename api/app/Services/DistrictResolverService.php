<?php

namespace App\Services;

use App\Models\District;

class DistrictResolverService
{
    /**
     * Active district names in the order they are presented to the user.
     *
     * The 1-based position in this array IS the number the user picks, so the
     * prompt and the resolver must both read it from here — never from the
     * district id, which drifts from the position as soon as one is deactivated.
     *
     * @return array<int, string>
     */
    public function activeNames(): array
    {
        return District::where('is_active', true)
            ->orderBy('id')
            ->pluck('name')
            ->all();
    }

    /**
     * Active districts rendered as a numbered list for prompt injection.
     */
    public function numberedList(): string
    {
        $lines = [];
        foreach ($this->activeNames() as $index => $name) {
            $lines[] = ($index + 1) . '. ' . $name;
        }

        return implode("\n", $lines);
    }

    /**
     * Resolve user/LLM input to a canonical active district name, or null when
     * it cannot be resolved unambiguously.
     */
    public function resolve(?string $input): ?string
    {
        return $this->matchName($input, $this->activeNames());
    }

    /**
     * Pure matcher — no database access, so it is unit testable on its own.
     *
     * @param array<int, string> $names
     */
    public function matchName(?string $input, array $names): ?string
    {
        $normalized = $this->normalize((string) $input);

        if ($normalized === '' || $names === []) {
            return null;
        }

        // A bare number selects by position in the list shown to the user.
        // Out-of-range values fall through to null rather than wrapping.
        if (ctype_digit($normalized)) {
            return $names[((int) $normalized) - 1] ?? null;
        }

        foreach ($names as $name) {
            if ($this->normalize($name) === $normalized) {
                return $name;
            }
        }

        // Partial name, accepted only when exactly one district matches: "sabak"
        // resolves, but "hulu" (Hulu Langat / Hulu Selangor) is ambiguous and is
        // rejected so the bot re-prompts instead of guessing.
        $matches = [];
        foreach ($names as $name) {
            if (str_contains($this->normalize($name), $normalized)) {
                $matches[] = $name;
            }
        }

        return count($matches) === 1 ? $matches[0] : null;
    }

    private function normalize(string $value): string
    {
        return mb_strtolower(trim((string) preg_replace('/\s+/', ' ', $value)));
    }
}
