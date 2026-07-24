<?php

namespace Tests\Unit;

use App\Services\DistrictResolverService;
use PHPUnit\Framework\TestCase;

class DistrictResolverServiceTest extends TestCase
{
    /** The nine active districts, in id order, as shown to the user. */
    private const NAMES = [
        'Petaling',
        'Gombak',
        'Hulu Langat',
        'Klang',
        'Kuala Langat',
        'Sepang',
        'Kuala Selangor',
        'Hulu Selangor',
        'Sabak Bernam',
    ];

    private function resolve(?string $input): ?string
    {
        return (new DistrictResolverService())->matchName($input, self::NAMES);
    }

    public function test_number_selects_by_position(): void
    {
        $this->assertSame('Petaling', $this->resolve('1'));
        $this->assertSame('Hulu Langat', $this->resolve('3'));
        $this->assertSame('Sabak Bernam', $this->resolve('9'));
    }

    public function test_out_of_range_numbers_are_rejected(): void
    {
        $this->assertNull($this->resolve('0'));
        $this->assertNull($this->resolve('10'));
        $this->assertNull($this->resolve('99'));
    }

    public function test_exact_name_is_case_and_space_insensitive(): void
    {
        // Inbound messages are lowercased by the webhook before we ever see them.
        $this->assertSame('Gombak', $this->resolve('gombak'));
        $this->assertSame('Hulu Langat', $this->resolve('Hulu Langat'));
        $this->assertSame('Hulu Langat', $this->resolve('hulu langat'));
        $this->assertSame('Klang', $this->resolve('  KLANG  '));
        $this->assertSame('Hulu Langat', $this->resolve("hulu   langat"));
    }

    public function test_unambiguous_partial_name_resolves(): void
    {
        $this->assertSame('Sabak Bernam', $this->resolve('sabak'));
        $this->assertSame('Sepang', $this->resolve('sepang'));
        $this->assertSame('Petaling', $this->resolve('petal'));
    }

    public function test_ambiguous_partial_name_is_rejected(): void
    {
        // Hulu Langat + Hulu Selangor
        $this->assertNull($this->resolve('hulu'));
        // Kuala Langat + Kuala Selangor
        $this->assertNull($this->resolve('kuala'));
        // Hulu Langat + Kuala Langat
        $this->assertNull($this->resolve('langat'));
    }

    public function test_unknown_and_empty_input_is_rejected(): void
    {
        $this->assertNull($this->resolve('gombk'));
        $this->assertNull($this->resolve('xyz'));
        $this->assertNull($this->resolve('shah alam'));
        $this->assertNull($this->resolve(''));
        $this->assertNull($this->resolve('   '));
        $this->assertNull($this->resolve(null));
    }

    public function test_empty_district_list_resolves_to_null(): void
    {
        $this->assertNull((new DistrictResolverService())->matchName('1', []));
    }
}
