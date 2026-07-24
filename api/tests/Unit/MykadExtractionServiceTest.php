<?php

namespace Tests\Unit;

use App\Services\MykadExtractionService;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class MykadExtractionServiceTest extends TestCase
{
    private function fakeOpenAi(array $content): void
    {
        Http::fake([
            'api.openai.com/*' => Http::response([
                'choices' => [
                    ['message' => ['content' => json_encode($content)]],
                ],
            ], 200),
        ]);
    }

    private function extract(): ?array
    {
        config(['services.openai.api_key' => 'test-key']);

        return (new MykadExtractionService())->extract('rawbytes', 'image/jpeg');
    }

    public function test_valid_mykad_returns_normalized_fields(): void
    {
        $this->fakeOpenAi([
            'success' => true,
            'name'    => 'AHMAD BIN ALI',
            'nric'    => '900101-14-5523',   // dashed — must be stripped to 12 digits
            'address' => 'NO 1, JALAN SATU, 40000 SHAH ALAM, SELANGOR',
        ]);

        $result = $this->extract();

        $this->assertNotNull($result);
        $this->assertSame('AHMAD BIN ALI', $result['name']);
        $this->assertSame('900101145523', $result['nric']);
        $this->assertSame('NO 1, JALAN SATU, 40000 SHAH ALAM, SELANGOR', $result['address']);
    }

    public function test_unreadable_mykad_returns_null(): void
    {
        $this->fakeOpenAi(['success' => false]);

        $this->assertNull($this->extract());
    }

    public function test_invalid_nric_length_is_rejected(): void
    {
        $this->fakeOpenAi([
            'success' => true,
            'name'    => 'AHMAD BIN ALI',
            'nric'    => '12345',            // not 12 digits
            'address' => 'NO 1, JALAN SATU',
        ]);

        $this->assertNull($this->extract());
    }

    public function test_missing_address_is_rejected(): void
    {
        $this->fakeOpenAi([
            'success' => true,
            'name'    => 'AHMAD BIN ALI',
            'nric'    => '900101145523',
            'address' => '',
        ]);

        $this->assertNull($this->extract());
    }
}
