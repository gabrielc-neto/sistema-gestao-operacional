<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;

/**
 * Cliente do WebService SOAP da SASCAR (SasIntegra).
 * Porte de functions/src/sascar/soap.js — chamadas SOAP via HTTP raw,
 * parse genérico dos blocos <return>.
 *
 * Credenciais: SASCAR_USUARIO / SASCAR_SENHA no .env.
 */
class SascarService
{
    private const NS = 'http://webservice.web.integracao.sascar.com.br/';
    private string $endpoint;
    private string $usuario;
    private string $senha;

    public function __construct()
    {
        // WSDL aponta para .../SasIntegraWSService?wsdl — o endpoint é o mesmo sem ?wsdl
        $this->endpoint = (string) str_replace('?wsdl', '', config('services.sascar.wsdl', env('SASCAR_WSDL', '')));
        $this->usuario  = (string) env('SASCAR_USUARIO', '');
        $this->senha    = (string) env('SASCAR_SENHA', '');
    }

    public function configurado(): bool
    {
        return $this->endpoint && $this->usuario && $this->senha;
    }

    /** Lista de veículos cadastrados na SASCAR. */
    public function obterVeiculos(int $quantidade = 1000, int $idVeiculo = 0): array
    {
        $params = "<usuario>{$this->usuario}</usuario><senha>{$this->senha}</senha>"
            . "<quantidade>{$quantidade}</quantidade><idVeiculo>{$idVeiculo}</idVeiculo>";
        $xml = $this->soapCall('obterVeiculos', $params, 'web');
        return $this->parseReturns($xml);
    }

    /** Pacotes de posição mais recentes (fila da SASCAR). */
    public function obterPacotePosicoes(int $quantidade = 200): array
    {
        $params = "<usuario>{$this->usuario}</usuario><senha>{$this->senha}</senha>"
            . "<quantidade>{$quantidade}</quantidade>";
        $xml = $this->soapCall('obterPacotePosicoes', $params, 'ws');
        return $this->parseReturns($xml);
    }

    // ----------------------------------------------------------------
    private function envelope(string $method, string $paramsXml, string $alias): string
    {
        $ns = self::NS;
        return <<<XML
<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:{$alias}="{$ns}">
<soapenv:Header/>
<soapenv:Body>
<{$alias}:{$method}>{$paramsXml}</{$alias}:{$method}>
</soapenv:Body>
</soapenv:Envelope>
XML;
    }

    private function soapCall(string $method, string $paramsXml, string $alias): string
    {
        $body = $this->envelope($method, $paramsXml, $alias);
        $resp = Http::withHeaders([
            'Content-Type' => 'text/xml; charset=utf-8',
            'SOAPAction'   => '',
        ])->withBody($body, 'text/xml')->post($this->endpoint);

        $text = $resp->body();
        if (preg_match('/<faultstring>([\s\S]*?)<\/faultstring>/', $text, $m)) {
            throw new \RuntimeException("SASCAR fault: {$m[1]}");
        }
        return $text;
    }

    /** Parse genérico dos blocos <return>...</return> em arrays associativos. */
    private function parseReturns(string $xml): array
    {
        preg_match_all('/<return>([\s\S]*?)<\/return>/', $xml, $blocos);
        return array_map(fn ($b) => $this->camposDe($b), $blocos[1] ?? []);
    }

    /** Extrai todos os pares <tag>valor</tag> de um bloco. */
    private function camposDe(string $bloco): array
    {
        preg_match_all('/<(\w+)>([^<]*)<\/\1>/', $bloco, $pares, PREG_SET_ORDER);
        $out = [];
        foreach ($pares as $p) {
            $out[$p[1]] = $p[2];
        }
        return $out;
    }
}
