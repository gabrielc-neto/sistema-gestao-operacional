<?php
// Regras puras do portão da intranet: hash da palavra-chave, faixas de IP,
// janela de horário e saneamento das coordenadas.
//
// Separadas do index.php de propósito: são a parte com bugs sutis — fuso horário
// e janela cruzando a meia-noite não dá para conferir lendo — e aqui podem ser
// testadas sem banco e sem servidor web (ver testes.php).

declare(strict_types=1);

// Precisa bater com o salt usado no seed (db/intranet/002_seed.sql), que grava
// os hashes. Se um mudar sem o outro, toda palavra-chave para de funcionar.
const INTRANET_SALT = 'pontual-intranet-v1';
const TZ_INTRANET   = 'America/Sao_Paulo';

function hash_chave(string $chave): string
{
    return hash('sha256', INTRANET_SALT . $chave);
}

/**
 * Compara um IP com uma regra: endereço exato ou faixa CIDR IPv4.
 * IPv6 cai na comparação exata.
 */
function ip_combina(string $ip, string $regra): bool
{
    $regra = trim($regra);
    if ($regra === '' || $ip === '') {
        return false;
    }
    if (!str_contains($regra, '/')) {
        return $ip === $regra;
    }

    [$base, $bits] = explode('/', $regra, 2);
    if (!ctype_digit($bits)) {
        return false;
    }
    $bits = (int) $bits;
    if ($bits < 0 || $bits > 32) {
        return false;
    }

    $ipLong   = ip2long($ip);
    $baseLong = ip2long($base);
    if ($ipLong === false || $baseLong === false) {
        return false;
    }
    // /0 casa com qualquer endereço; o shift de 32 seria indefinido, daí o caso à parte.
    $mask = $bits === 0 ? 0 : (-1 << (32 - $bits)) & 0xFFFFFFFF;
    return ($ipLong & $mask) === ($baseLong & $mask);
}

/**
 * Dia da semana (0=domingo) e minutos desde a meia-noite, no fuso de São Paulo.
 * O servidor roda em UTC: sem converter, todo horário autorizado erraria por 3h.
 *
 * $agora é injetável só para os testes fixarem um instante.
 */
function agora_em_sao_paulo(?DateTimeImmutable $agora = null): array
{
    $d = ($agora ?? new DateTimeImmutable('now', new DateTimeZone('UTC')))
        ->setTimezone(new DateTimeZone(TZ_INTRANET));
    return [
        'dia'     => (int) $d->format('w'),
        'minutos' => ((int) $d->format('G')) * 60 + ((int) $d->format('i')),
    ];
}

function hhmm_em_minutos(string $hhmm): int
{
    $p = explode(':', $hhmm);
    return ((int) ($p[0] ?? 0)) * 60 + ((int) ($p[1] ?? 0));
}

/**
 * $horario null = 24h/7. Senão ['dias'=>[0..6], 'inicio'=>'08:00', 'fim'=>'18:00'];
 * dias vazio = todos os dias.
 */
function dentro_do_horario(?array $horario, ?DateTimeImmutable $agora = null): bool
{
    if ($horario === null) {
        return true;
    }
    ['dia' => $dia, 'minutos' => $minutos] = agora_em_sao_paulo($agora);

    $dias = $horario['dias'] ?? [];
    if (is_array($dias) && count($dias) > 0 && !in_array($dia, $dias, true)) {
        return false;
    }

    $ini = hhmm_em_minutos((string) ($horario['inicio'] ?? '00:00'));
    $fim = hhmm_em_minutos((string) ($horario['fim'] ?? '23:59'));

    // Janela que cruza a meia-noite (22:00→06:00) é legítima e inverte a comparação.
    return $ini <= $fim
        ? ($minutos >= $ini && $minutos <= $fim)
        : ($minutos >= $ini || $minutos <= $fim);
}

/**
 * A palavra-chave venceu?
 *
 * Compara contra o relógio do SERVIDOR: a data vem do banco em UTC (timestamptz),
 * e a comparação é de instantes — não depende de fuso, então aqui não há o
 * problema de conversão que a janela de horário tem.
 *
 * $agora é injetável só para os testes fixarem um instante.
 */
function expirada(?string $expiraEm, ?DateTimeImmutable $agora = null): bool
{
    if (!$expiraEm) {
        return false;   // sem data = não expira
    }
    try {
        // O Postgres devolve "2026-10-15 20:11:41.66+00"; o DateTimeImmutable lê.
        $limite = new DateTimeImmutable($expiraEm);
    } catch (Exception) {
        return false;   // data ilegível não pode trancar ninguém para fora
    }
    return ($agora ?? new DateTimeImmutable('now')) >= $limite;
}

/**
 * A coordenada vem do cliente, então é forjável: vale como conveniência, não como
 * prova de onde a pessoa estava. Quem sustenta a auditoria é o IP, observado pelo
 * servidor. Retorna null quando ausente, negada ou fora do planeta.
 */
function sanear_coords($c): ?array
{
    if (!is_array($c)) {
        return null;
    }
    if (!isset($c['lat'], $c['lng']) || !is_numeric($c['lat']) || !is_numeric($c['lng'])) {
        return null;
    }
    $lat = (float) $c['lat'];
    $lng = (float) $c['lng'];
    if ($lat < -90 || $lat > 90 || $lng < -180 || $lng > 180) {
        return null;
    }
    return [
        'lat'      => $lat,
        'lng'      => $lng,
        'precisao' => isset($c['precisao']) && is_numeric($c['precisao']) ? (float) $c['precisao'] : null,
    ];
}

// ---------------------------------------------------------------- certificados

/**
 * Alfabeto do código do certificado.
 *
 * Sem O, 0, I, 1 e L de propósito: o código é DIGITADO por gente lendo um papel
 * (ou um PDF), e "0 ou O?" vira chamado de suporte para um sistema cujo ponto
 * inteiro é conferir o documento em dois segundos.
 */
const CERT_ALFABETO = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

/**
 * Código público do certificado: PNT-2026-K7QP-3F2D.
 *
 * random_int é do gerador criptográfico — não é enfeite: com rand() comum, quem
 * visse alguns códigos emitidos no mesmo dia conseguiria prever os próximos e
 * "validar" certificados que nunca existiram.
 *
 * 8 caracteres em 31 símbolos ≈ 8,5×10^11 combinações. A unicidade quem garante
 * é o índice do banco; aqui só reduzimos a chance de colisão a praticamente zero.
 */
function gera_codigo_certificado(int $ano): string
{
    $bloco = static function (): string {
        $s = '';
        for ($i = 0; $i < 4; $i++) {
            $s .= CERT_ALFABETO[random_int(0, strlen(CERT_ALFABETO) - 1)];
        }
        return $s;
    };
    return sprintf('PNT-%d-%s-%s', $ano, $bloco(), $bloco());
}

/**
 * Forma canônica do código para busca: maiúsculas, só letras e dígitos.
 *
 * Quem valida digita o que está no papel — com hifens, sem hifens, em minúscula,
 * com espaço colado do copiar-e-colar. Tudo isso é o mesmo certificado, e casa
 * com o índice `uq_certificados_codigo_norm`, que aplica a mesma normalização.
 */
function normaliza_codigo_certificado(string $codigo): string
{
    return strtoupper(preg_replace('/[^A-Za-z0-9]/', '', $codigo) ?? '');
}

/**
 * CPF (ou outro documento) mascarado para a página pública de validação.
 *
 * O documento existe no certificado para provar que o "João Silva" do papel é
 * ESTE João Silva. Mas a validação é aberta a qualquer um com o código, e código
 * circula por e-mail e WhatsApp: devolver o CPF inteiro transformaria o validador
 * numa consulta de CPF alheio. Os dígitos do meio bastam para conferir.
 */
function mascara_documento(string $doc): string
{
    $d = preg_replace('/\D/', '', $doc) ?? '';
    if ($d === '') {
        return '';
    }
    if (strlen($d) === 11) {   // CPF
        return '***.' . substr($d, 3, 3) . '.' . substr($d, 6, 3) . '-**';
    }
    // Qualquer outro formato: só os dois últimos, o resto vira asterisco.
    return str_repeat('*', max(0, strlen($d) - 2)) . substr($d, -2);
}

/**
 * IP de quem chamou.
 *
 * Cuidado: X-Forwarded-For é controlado pelo cliente e pode ser forjado. A
 * restrição por IP é conveniência, não barreira — quem protege é a palavra-chave
 * individual somada à trava de tentativas.
 */
function ip_do_cliente(array $server): string
{
    $xff = $server['HTTP_X_FORWARDED_FOR'] ?? '';
    if ($xff !== '') {
        return trim(explode(',', $xff)[0]);
    }
    return $server['REMOTE_ADDR'] ?? '';
}
