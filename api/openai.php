<?php
// Set your API key
$apiKey = "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"; // or hardcode for testing

// File path
$imagePath = __DIR__ . "/image.png";

if (!file_exists($imagePath)) {
    http_response_code(404);
    echo json_encode(["error" => "File image.png not found"]);
    exit;
}

// Read image as base64
$imageData = base64_encode(file_get_contents($imagePath));
$imageMime = mime_content_type($imagePath);
$imageBase64 = "data:$imageMime;base64,$imageData";

// Prepare request payload
$payload = [
    "model" => "gpt-4o-mini", // Vision model
    "messages" => [
        [
            "role" => "user",
            "content" => [
                ["type" => "text", "text" => "Describe the image in detail."],
                ["type" => "image_url", "image_url" => $imageBase64]
            ]
        ]
    ],
    "max_tokens" => 300
];

// Send request to OpenAI
$ch = curl_init("https://api.openai.com/v1/chat/completions");
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "Authorization: Bearer $apiKey",
    "Content-Type: application/json"
]);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));

$response = curl_exec($ch);
if (curl_errno($ch)) {
    echo json_encode(["error" => curl_error($ch)]);
    curl_close($ch);
    exit;
}
curl_close($ch);

// Parse and return result
$result = json_decode($response, true);
$description = $result['choices'][0]['message']['content'] ?? "No description found";

header('Content-Type: application/json');
echo json_encode(["description" => $description]);
