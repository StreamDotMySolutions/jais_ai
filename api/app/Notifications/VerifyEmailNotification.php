<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\URL;

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
            ->salutation('Sekian, terima kasih.');
    }

    protected function verificationUrl($notifiable): string
    {
        return URL::temporarySignedRoute(
            'verification.verify',
            Carbon::now()->addMinutes(Config::get('auth.verification.expire', 60)),
            [
                'id' => $notifiable->getKey(),
                'hash' => sha1($notifiable->getEmailForVerification()),
            ]
        );
    }
}
