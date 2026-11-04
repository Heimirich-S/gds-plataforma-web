<?php
declare(strict_types=1);

require_once dirname(__DIR__, 2) . '/vendor/autoload.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception as MailerException;

class Mailer
{
    private PHPMailer $mail;
    private bool $configured;

    public function __construct(array $config = [])
    {
        $this->mail = new PHPMailer(true);
        $this->mail->CharSet = 'UTF-8';
        $this->mail->Encoding = 'base64';

        $host         = isset($config['host']) ? trim((string)$config['host']) : '';
        $port         = isset($config['port']) ? (int)$config['port'] : 0;
        $encryption   = isset($config['encryption']) ? strtolower(trim((string)$config['encryption'])) : '';
        $username     = isset($config['username']) ? (string)$config['username'] : '';
        $password     = isset($config['password']) ? (string)$config['password'] : '';
        $fromAddress  = isset($config['from_address']) ? trim((string)$config['from_address']) : '';
        $fromName     = isset($config['from_name']) ? (string)$config['from_name'] : '';

        if ($host === '' || $username === '' || $password === '' || $fromAddress === '') {
            $this->configured = false;
            return;
        }
        if (!filter_var($fromAddress, FILTER_VALIDATE_EMAIL)) {
            $this->configured = false;
            return;
        }

        $this->configured = true;

        $this->mail->isSMTP();
        $this->mail->Host       = $host;
        $this->mail->SMTPAuth   = true;
        $this->mail->Username   = $username;
        $this->mail->Password   = $password;
        $this->mail->Port       = $port > 0 ? $port : 587;

        if ($encryption === 'ssl') {
            $this->mail->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS;
        } elseif ($encryption === 'tls' || $encryption === 'starttls') {
            $this->mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
        }

        $this->mail->setFrom($fromAddress, $fromName);
    }

    public static function fromConfig(): self
    {
        if (!function_exists('gds_secreto')) {
            throw new \RuntimeException('Configuracion privada no disponible');
        }

        $privado = [];
        $archivo = dirname(__DIR__, 2) . '/config/gds.php';
        if (is_file($archivo)) {
            $cargado = require $archivo;
            if (is_array($cargado)) {
                $privado = $cargado;
            }
        }

        $config = [
            'host'          => gds_secreto('SMTP_HOST', $privado),
            'port'          => (int) gds_secreto('SMTP_PORT', $privado),
            'encryption'    => gds_secreto('SMTP_ENCRYPTION', $privado),
            'username'      => gds_secreto('SMTP_USERNAME', $privado),
            'password'      => gds_secreto('SMTP_PASSWORD', $privado),
            'from_address'  => gds_secreto('SMTP_FROM_EMAIL', $privado),
            'from_name'     => gds_secreto('SMTP_FROM_NAME', $privado),
        ];

        return new self($config);
    }

    public function isConfigured(): bool
    {
        return $this->configured;
    }

    public function prepareMessage(string $to, string $subject, string $htmlBody, string $textBody = ''): void
    {
        if (!$this->configured) {
            throw new \RuntimeException('Mailer no configurado');
        }
        if (!filter_var($to, FILTER_VALIDATE_EMAIL)) {
            throw new \InvalidArgumentException('Destinatario invalido');
        }

        $this->mail->clearAddresses();
        $this->mail->addAddress($to);
        $this->mail->Subject = $subject;
        $this->mail->isHTML(true);
        $this->mail->Body = $htmlBody;
        $this->mail->AltBody = ($textBody !== '') ? $textBody : strip_tags($htmlBody);
    }

    public function send(): bool
    {
        if (!$this->configured) {
            throw new \RuntimeException('Mailer no configurado');
        }
        try {
            return $this->mail->send();
        } catch (MailerException $e) {
            throw new \RuntimeException('No se pudo enviar el correo');
        }
    }
}
