<?php

return [
    'postmark' => [
        'token' => env('POSTMARK_TOKEN'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    // Integração SASCAR (WebService SOAP)
    'sascar' => [
        'wsdl'    => env('SASCAR_WSDL'),
        'usuario' => env('SASCAR_USUARIO'),
        'senha'   => env('SASCAR_SENHA'),
    ],
];
