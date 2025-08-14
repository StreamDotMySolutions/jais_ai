<?php
use Tests\TestCase;

uses(TestCase::class);

it('returns a successful response from /test-openai-key', function () {
    // Hit the Laravel route directly (forces HTTPS)
    $response = $this->getJson(route('test-openai-key', [], true));

    // Assert HTTP 200 and that the response contains expected keys
    $response->assertStatus(200)
             ->assertJsonStructure([
                 'success',
                 'message',
             ]);
});
