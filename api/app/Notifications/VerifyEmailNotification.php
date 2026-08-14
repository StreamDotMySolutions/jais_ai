<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Str;

class VerifyEmailNotification extends Notification
{
    use Queueable;

    public function via($notifiable): array
    {
        return ['mail'];
    }

    public function toMail($notifiable): MailMessage
    {
        $verificationUrl = $this->verificationUrl($notifiable);

        return (new MailMessage)
            ->subject('Sahkan Alamat Emel - i-SYAEMS')
            ->greeting('Assalamualaikum ' . $notifiable->name . ',')
            ->line('Terima kasih kerana mendaftar di i-SYAEMS.')
            ->line('Sila klik butang di bawah untuk mengesahkan alamat emel anda.')
            ->action('Sahkan Emel', $verificationUrl)
            ->line('Jika anda tidak mendaftar akaun ini, sila abaikan emel ini.')
            ->line('Pautan ini sah selama 24 jam. Jika telah tamat tempoh, sila minta penghantaran semula.')
            ->salutation('Sekian, terima kasih.');
    }

    protected function verificationUrl($notifiable): string
    {
        $token = Str::random(64);
        $notifiable->forceFill([
            'email_verify_token' => $token,
            'email_verify_token_expires_at' => now()->addHours(24),
        ])->save();

        $base = rtrim(config('app.url', 'http://localhost'), '/');

        return $base . '/api/email/verify/token/' . $token;
    }
}
