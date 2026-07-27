<?php
// Testes das regras do portão. Sem banco, sem servidor web.
//   php api-intranet/testes.php
//
// Cobrem o que não dá para conferir lendo o código: a conversão de fuso, o
// instante que muda o DIA ao converter, e a janela que cruza a meia-noite.

declare(strict_types=1);
require __DIR__ . '/regras.php';

$ok = 0;
$falhas = [];

function t(string $nome, $esperado, $obtido): void
{
    global $ok, $falhas;
    if ($esperado === $obtido) {
        $ok++;
        echo "  ok   $nome\n";
    } else {
        $falhas[] = $nome;
        echo "  FALHA $nome\n";
        echo "        esperado: " . var_export($esperado, true) . "\n";
        echo "        obtido:   " . var_export($obtido, true) . "\n";
    }
}

function utc(string $s): DateTimeImmutable
{
    return new DateTimeImmutable($s, new DateTimeZone('UTC'));
}

// 2026-07-15T14:30:00Z = quarta, 11:30 em São Paulo (UTC-3). É esta diferença de
// 3h que quebraria tudo se o fuso fosse ignorado.
$QUA_1130 = utc('2026-07-15T14:30:00');

echo "\n-- fuso horário\n";
$r = agora_em_sao_paulo($QUA_1130);
t('converte UTC para São Paulo (dia)', 3, $r['dia']);
t('converte UTC para São Paulo (11:30, não 14:30)', 11 * 60 + 30, $r['minutos']);

// 2026-07-16T02:00:00Z é quinta em UTC, mas ainda quarta 23:00 em São Paulo.
$r = agora_em_sao_paulo(utc('2026-07-16T02:00:00'));
t('instante que muda o DIA ao converter', 3, $r['dia']);
t('instante que muda o dia (23:00 local)', 23 * 60, $r['minutos']);

echo "\n-- janela de horário\n";
t('null libera 24h', true, dentro_do_horario(null, $QUA_1130));

$comercial = ['dias' => [1, 2, 3, 4, 5], 'inicio' => '08:00', 'fim' => '18:00'];
t('dentro da janela comercial', true, dentro_do_horario($comercial, $QUA_1130));
t('fora da janela pela HORA (22h)', false, dentro_do_horario($comercial, utc('2026-07-16T01:00:00')));
t('fora da janela pelo DIA (sábado)', false, dentro_do_horario($comercial, utc('2026-07-18T14:30:00')));
t('dias vazio = todos os dias', true, dentro_do_horario(['dias' => [], 'inicio' => '08:00', 'fim' => '18:00'], utc('2026-07-18T14:30:00')));

$noturna = ['dias' => [], 'inicio' => '22:00', 'fim' => '06:00'];
t('cruza meia-noite: aceita ANTES da virada (23h)', true, dentro_do_horario($noturna, utc('2026-07-16T02:00:00')));
t('cruza meia-noite: aceita DEPOIS da virada (02h)', true, dentro_do_horario($noturna, utc('2026-07-16T05:00:00')));
t('cruza meia-noite: recusa no meio do dia', false, dentro_do_horario($noturna, $QUA_1130));

$janela = ['dias' => [], 'inicio' => '08:00', 'fim' => '18:00'];
t('limite inicial é inclusivo (08:00)', true, dentro_do_horario($janela, utc('2026-07-15T11:00:00')));
t('limite final é inclusivo (18:00)', true, dentro_do_horario($janela, utc('2026-07-15T21:00:00')));
t('um minuto antes do início recusa', false, dentro_do_horario($janela, utc('2026-07-15T10:59:00')));

echo "\n-- expiração da palavra-chave (3 meses)\n";
t('data no futuro não expirou', false, expirada('2026-10-15 12:00:00+00', $QUA_1130));
t('data no passado expirou', true, expirada('2026-04-15 12:00:00+00', $QUA_1130));
t('vence exatamente agora já conta como expirada', true, expirada('2026-07-15 14:30:00+00', $QUA_1130));
t('um segundo antes de vencer ainda vale', false, expirada('2026-07-15 14:30:01+00', $QUA_1130));
t('sem data não expira', false, expirada(null, $QUA_1130));
t('data ilegível não tranca ninguém para fora', false, expirada('nao-e-data', $QUA_1130));
// A comparação é de instantes, então o fuso da string não pode mudar o veredito:
// 2026-07-15 11:30 em SP é o MESMO instante que 14:30 UTC.
t('mesmo instante em fuso diferente dá o mesmo resultado', true, expirada('2026-07-15 11:30:00-03', $QUA_1130));

echo "\n-- hash da palavra-chave\n";
t('determinístico', hash_chave('abc'), hash_chave('abc'));
t('sensível à chave', false, hash_chave('abc') === hash_chave('abd'));
t('formato sha256 hex', 1, preg_match('/^[a-f0-9]{64}$/', hash_chave('abc')));

echo "\n-- faixas de IP\n";
t('IP exato casa', true, ip_combina('200.1.2.3', '200.1.2.3'));
t('IP exato diferente não casa', false, ip_combina('200.1.2.4', '200.1.2.3'));
t('CIDR /24 dentro', true, ip_combina('200.1.2.55', '200.1.2.0/24'));
t('CIDR /24 fora', false, ip_combina('200.1.3.55', '200.1.2.0/24'));
t('CIDR /8 dentro', true, ip_combina('10.0.5.1', '10.0.0.0/8'));
t('/32 é um único endereço', true, ip_combina('200.1.2.3', '200.1.2.3/32'));
t('/32 recusa o vizinho', false, ip_combina('200.1.2.4', '200.1.2.3/32'));
t('/0 casa com qualquer um', true, ip_combina('8.8.8.8', '0.0.0.0/0'));
t('IP vazio não casa', false, ip_combina('', '200.1.2.0/24'));
t('regra vazia não casa', false, ip_combina('200.1.2.3', ''));
t('IP inválido não casa', false, ip_combina('nao-e-ip', '200.1.2.0/24'));
t('bits inválidos não casam', false, ip_combina('200.1.2.3', '200.1.2.0/99'));

echo "\n-- coordenadas\n";
t('coordenada válida passa', ['lat' => -23.5, 'lng' => -46.6, 'precisao' => 12.0], sanear_coords(['lat' => -23.5, 'lng' => -46.6, 'precisao' => 12]));
t('ausente vira null', null, sanear_coords(null));
t('string vira null', null, sanear_coords('-23.5,-46.6'));
t('objeto vazio vira null', null, sanear_coords([]));
t('latitude fora do planeta', null, sanear_coords(['lat' => 91, 'lng' => 0]));
t('longitude fora do planeta', null, sanear_coords(['lat' => 0, 'lng' => 181]));
t('não numérico vira null', null, sanear_coords(['lat' => 'x', 'lng' => 'y']));
t('precisão ausente vira null', ['lat' => 1.0, 'lng' => 2.0, 'precisao' => null], sanear_coords(['lat' => 1, 'lng' => 2]));

echo "\n-- código do certificado\n";
$cod = gera_codigo_certificado(2026);
t('formato PNT-ano-XXXX-XXXX', 1, preg_match('/^PNT-2026-[A-Z2-9]{4}-[A-Z2-9]{4}$/', $cod));
// O código é digitado de um papel: O/0 e I/1/L lado a lado viram chamado de
// suporte. Confere que o alfabeto realmente não os contém — só nos blocos
// sorteados: o prefixo "PNT-2026" tem um zero que veio do ano, não do sorteio.
$sorteado = '';
for ($i = 0; $i < 200; $i++) {
    $p = explode('-', gera_codigo_certificado(2026));
    $sorteado .= $p[2] . $p[3];
}
t('sem caracteres ambíguos (O 0 I 1 L) em 200 sorteios', 0, preg_match('/[O0I1L]/', $sorteado));
$distintos = [];
for ($i = 0; $i < 50; $i++) {
    $distintos[gera_codigo_certificado(2026)] = true;
}
t('50 sorteios não repetem', 50, count($distintos));

echo "\n-- normalização do código digitado\n";
$alvo = 'PNT2026K7QP3F2D';
t('forma canônica passa igual', $alvo, normaliza_codigo_certificado('PNT-2026-K7QP-3F2D'));
t('minúsculas sobem', $alvo, normaliza_codigo_certificado('pnt-2026-k7qp-3f2d'));
t('sem hifens casa o mesmo', $alvo, normaliza_codigo_certificado('PNT2026K7QP3F2D'));
t('espaços do copiar-e-colar somem', $alvo, normaliza_codigo_certificado('  PNT 2026 K7QP 3F2D '));
t('pontuação avulsa some', $alvo, normaliza_codigo_certificado('PNT.2026/K7QP_3F2D'));
t('só pontuação vira vazio', '', normaliza_codigo_certificado('---'));
t('vazio continua vazio', '', normaliza_codigo_certificado(''));

echo "\n-- máscara do documento (validação é página aberta)\n";
t('CPF formatado', '***.456.789-**', mascara_documento('123.456.789-01'));
t('CPF só dígitos', '***.456.789-**', mascara_documento('12345678901'));
t('sem documento continua vazio', '', mascara_documento(''));
t('texto sem dígito vira vazio', '', mascara_documento('não informado'));
t('outro formato mostra só os dois últimos', '************14', mascara_documento('12345678000114'));

echo "\n-- IP do cliente\n";
t('usa REMOTE_ADDR quando não há proxy', '9.9.9.9', ip_do_cliente(['REMOTE_ADDR' => '9.9.9.9']));
t('usa o primeiro do X-Forwarded-For', '1.1.1.1', ip_do_cliente(['HTTP_X_FORWARDED_FOR' => '1.1.1.1, 2.2.2.2', 'REMOTE_ADDR' => '3.3.3.3']));
t('sem nada vira vazio', '', ip_do_cliente([]));

$total = $ok + count($falhas);
echo "\n" . str_repeat('-', 50) . "\n";
echo count($falhas) === 0
    ? "TODOS OS $total TESTES PASSARAM\n"
    : sprintf("%d de %d FALHARAM: %s\n", count($falhas), $total, implode(', ', $falhas));
exit(count($falhas) === 0 ? 0 : 1);
