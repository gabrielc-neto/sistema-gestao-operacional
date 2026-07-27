<?php
// API da intranet — portal por palavra-chave + painel de Configurações.
//
// A SPA é estática (o Apache serve a raiz do web-homol) e não fala com PostgreSQL
// direto; tudo passa por aqui. É de propósito: horário autorizado, expiração,
// trava de força bruta e privilégios só valem checados com o relógio e o estado do
// SERVIDOR — no navegador, qualquer um contorna pelo DevTools.
//
// DUAS PORTAS, DUAS CREDENCIAIS — não confundir:
//   PORTAL (/sistemas)       → palavra-chave individual, expira a cada 3 meses
//   CONFIGURAÇÕES (/intranet) → usuário e senha de administrador
//
// Mesmo padrão dos apps irmãos desta VPS (/integridade, /gestao-espaco,
// /gestao-compras): Alias no vhost + SetEnv DB_* + PDO.

declare(strict_types=1);
require __DIR__ . '/regras.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

const SESSAO_HORAS     = 8;
const TRAVA_FALHAS     = 5;
const TRAVA_JANELA_SEG = 15 * 60;
const CHAVE_MIN        = 6;
const SENHA_MIN        = 8;
const EXPIRA_MESES     = 3;

// Validação de certificado tem trava PRÓPRIA, e mais frouxa que a do login.
// Frouxa porque errar o código é normal: quem digita está copiando de um papel.
// Própria porque compartilhar a trava do login faria três erros de digitação
// trancarem a pessoa para fora do PORTAL — e o inverso, um ataque ao portal
// derrubar o validador público. São portas diferentes, com riscos diferentes.
// Conta só CÓDIGOS INEXISTENTES na janela — ver validacao_travada().
const CERT_TENTATIVAS  = 20;
const CERT_JANELA_SEG  = 5 * 60;
// Quantas vezes tentar de novo se o código sorteado já existir. Com ~8,5×10^11
// combinações a colisão é remotíssima, mas "remotíssimo" não é "impossível", e
// sem o laço a emissão falharia com erro de índice único.
const CERT_TENTA_CODIGO = 8;

// Como cada ação é autenticada.
//   'nenhum' → aberta            'portal' → sessão do portal
//   'admin'  → qualquer admin    'super'  → só o superusuário
const AUTH_POR_ACAO = [
    'publico'       => 'nenhum',  // links do portal
    'entrar'        => 'nenhum',  // palavra-chave → sessão do portal
    'login'         => 'nenhum',  // usuário+senha → sessão do painel
    'portal'        => 'portal',  // relê os links após um F5
    'painel'        => 'admin',
    'listarLinks'   => 'admin',
    'salvarLink'    => 'admin',
    'excluirLink'   => 'admin',
    'listarChaves'  => 'admin',
    'salvarChave'   => 'admin',
    'excluirChave'  => 'admin',
    'listarAcessos' => 'admin',
    'salvarConfig'  => 'admin',
    // Editar a PRÓPRIA conta é de qualquer admin: sem isto um terceiro não
    // conseguiria nem trocar a própria senha, e dependeria do super para isso.
    'salvarPerfil'  => 'admin',
    // Cadastrar usuários é de qualquer admin — quem entra aqui pode trazer outros
    // com os mesmos privilégios que tem.
    //
    // O limite não está aqui, e sim dentro da ação: NINGUÉM CONCEDE O QUE NÃO TEM.
    // Só um super cria ou promove outro super, e só um super mexe na conta de um
    // super. Sem essa regra, um terceiro se promoveria sozinho e o nível
    // "superusuário" viraria enfeite.
    'listarAdmins'  => 'admin',
    'salvarAdmin'   => 'admin',
    'excluirAdmin'  => 'admin',

    // ── Certificados ────────────────────────────────────────────────────────
    // `validarCertificado` é 'nenhum' DE PROPÓSITO, e é o único caso em que uma
    // ação aberta devolve dado de dentro. Quem confere um certificado está fora
    // da empresa — cliente, órgão, outra transportadora — e não tem palavra-chave
    // nem conta. Exigir login aqui tornaria o validador inútil.
    //
    // O que protege: o código é aleatório e imprevisível (só quem tem o
    // documento na mão sabe), a resposta é mascarada (CPF nunca sai inteiro) e
    // há trava de tentativas por IP contra varredura de códigos.
    'validarCertificado' => 'nenhum',
    'listarCertificados' => 'admin',
    'salvarCertificado'  => 'admin',
    'emitirLote'         => 'admin',
    'revogarCertificado' => 'admin',
    'excluirCertificado' => 'admin',
    'listarValidacoes'   => 'admin',
];

function responde(array $dados, int $status = 200): never
{
    http_response_code($status);
    echo json_encode($dados, JSON_UNESCAPED_UNICODE);
    exit;
}

function erro(string $msg, int $status = 400): never
{
    responde(['erro' => $msg], $status);
}

// Sem isto, qualquer exceção não tratada (uma PDOException, por exemplo) mata o
// PHP com display_errors=Off e o cliente recebe 200 com CORPO VAZIO — sem erro,
// sem log, sem pista. Já aconteceu aqui, com o bind de boolean.
set_exception_handler(function (Throwable $e): void {
    error_log('intranet-api: ' . $e::class . ': ' . $e->getMessage() . ' @ ' . $e->getFile() . ':' . $e->getLine());
    http_response_code(500);
    echo json_encode(['erro' => 'Erro interno. Verifique o log do servidor.'], JSON_UNESCAPED_UNICODE);
});

/**
 * Booleano do PHP para o PDO.
 *
 * PDO liga parâmetros como string e converte `false` para ''. O MySQL engole ''
 * como 0 — por isso os apps irmãos desta VPS nunca sofreram — mas o PostgreSQL
 * recusa: «invalid input syntax for type boolean: ""». 0/1 serve nos dois.
 */
function pgbool($v): int
{
    return $v ? 1 : 0;
}

function db(): PDO
{
    static $pdo = null;
    if ($pdo !== null) {
        return $pdo;
    }
    $host = getenv('DB_HOST') ?: '127.0.0.1';
    $name = getenv('DB_NAME') ?: 'intranet';
    $user = getenv('DB_USER') ?: 'intranet_app';
    $pass = getenv('DB_PASS') !== false ? getenv('DB_PASS') : '';
    try {
        $pdo = new PDO("pgsql:host=$host;port=5432;dbname=$name", $user, $pass, [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);
    } catch (PDOException $e) {
        error_log('intranet-api: falha de conexão: ' . $e->getMessage());
        erro('Erro de conexão com o banco de dados.', 500);
    }
    return $pdo;
}

function jsonb($v): string
{
    return json_encode($v ?? [], JSON_UNESCAPED_UNICODE);
}

function registra(string $tipo, ?string $quem, string $ip, ?array $coords, string $resultado): void
{
    db()->prepare('insert into acessos (tipo, quem, ip, coords, resultado) values (?,?,?,?,?)')
        ->execute([$tipo, $quem, $ip, $coords === null ? null : jsonb($coords), $resultado]);
}

// ---------------------------------------------------------------- trava
function ip_hash(string $ip): string
{
    return hash('sha256', $ip);
}

function ip_travado(string $ip): bool
{
    if ($ip === '') {
        return false;
    }
    $st = db()->prepare('select falhas, extract(epoch from (now() - desde)) as idade from travas where ip_hash = ?');
    $st->execute([ip_hash($ip)]);
    $t = $st->fetch();
    return $t && (float) $t['idade'] <= TRAVA_JANELA_SEG && (int) $t['falhas'] >= TRAVA_FALHAS;
}

function registra_falha(string $ip): void
{
    if ($ip === '') {
        return;
    }
    db()->prepare(
        'insert into travas (ip_hash, falhas, desde) values (?, 1, now())
         on conflict (ip_hash) do update set
           falhas = case when now() - travas.desde > make_interval(secs => ?) then 1 else travas.falhas + 1 end,
           desde  = case when now() - travas.desde > make_interval(secs => ?) then now() else travas.desde end'
    )->execute([ip_hash($ip), TRAVA_JANELA_SEG, TRAVA_JANELA_SEG]);
}

function limpa_trava(string $ip): void
{
    db()->prepare('delete from travas where ip_hash = ?')->execute([ip_hash($ip)]);
}

// ---------------------------------------------------------------- sessões
function nova_sessao(string $tabela, string $coluna, int $id): string
{
    $token = bin2hex(random_bytes(32));
    db()->prepare("insert into $tabela (token, $coluna, expira_em) values (?, ?, now() + make_interval(hours => ?))")
        ->execute([$token, $id, SESSAO_HORAS]);
    return $token;
}

/** Admin da sessão do painel. Revalida `ativo` a cada chamada. */
function admin_da_sessao(?string $token): ?array
{
    if (!$token) {
        return null;
    }
    $st = db()->prepare(
        'select a.* from sessoes_admin s join admins a on a.id = s.admin_id
         where s.token = ? and s.expira_em > now()'
    );
    $st->execute([$token]);
    $a = $st->fetch();
    return ($a && $a['ativo']) ? $a : null;
}

/** Chave da sessão do portal. Revalida ativo/bloqueio/expiração a cada chamada. */
function chave_da_sessao(?string $token): ?array
{
    if (!$token) {
        return null;
    }
    $st = db()->prepare(
        'select c.* from sessoes_portal s join chaves c on c.id = s.chave_id
         where s.token = ? and s.expira_em > now()'
    );
    $st->execute([$token]);
    $c = $st->fetch();
    if (!$c || !$c['ativo'] || $c['bloqueado']) {
        return null;
    }
    return $c;
}

function links_ativos(): array
{
    return array_map('formata_link', db()->query('select * from links where ativo = true order by ordem, id')->fetchAll());
}

function formata_link(array $l): array
{
    return [
        'id'           => (int) $l['id'],
        'nome'         => $l['nome'],
        'tipo'         => $l['tipo'],
        'url'          => $l['url'],
        'icone'        => $l['icone'],
        'cor'          => $l['cor'],
        'ativo'        => (bool) $l['ativo'],
        'ordem'        => (int) $l['ordem'],
        'subsecoes'    => json_decode($l['subsecoes'] ?? '[]', true) ?: [],
        'acessoDireto' => (bool) ($l['acesso_direto'] ?? true),
        'caminho'      => $l['caminho'] ?? '',
    ];
}

function config_ips(): array
{
    $r = db()->query("select valor from config where chave = 'ips'")->fetch();
    return $r ? (json_decode($r['valor'], true) ?: []) : [];
}

/** Admin para o cliente. senha_hash nunca sai daqui. */
function formata_admin(array $a): array
{
    return [
        'id'      => (int) $a['id'],
        'usuario' => $a['usuario'],
        'email'   => $a['email'] ?? '',
        'super'   => (bool) $a['super'],
        'ativo'   => (bool) $a['ativo'],
    ];
}

// ---------------------------------------------------------------- certificados

/** Certificado completo, para o painel de quem emite. */
function formata_certificado(array $c): array
{
    return [
        'id'              => (int) $c['id'],
        'codigo'          => $c['codigo'],
        'nome'            => $c['nome'],
        'documento'       => $c['documento'] ?? '',
        'curso'           => $c['curso'],
        'descricao'       => $c['descricao'] ?? '',
        'cargaHoraria'    => $c['carga_horaria'] === null ? null : (float) $c['carga_horaria'],
        'instrutor'       => $c['instrutor'] ?? '',
        'concluidoEm'     => $c['concluido_em'],
        'emitidoEm'       => $c['emitido_em'],
        'emitidoPor'      => $c['emitido_por'] ?? '',
        'revogado'        => (bool) $c['revogado'],
        'revogadoEm'      => $c['revogado_em'],
        'motivoRevogacao' => $c['motivo_revogacao'] ?? '',
    ];
}

/**
 * Certificado para a página pública de validação.
 *
 * Difere do de cima em duas coisas, e as duas são de segurança: o documento sai
 * mascarado, e o `id` não sai. O id é sequencial — entregá-lo diria quantos
 * certificados a empresa já emitiu e permitiria enumerar os vizinhos.
 */
function certificado_publico(array $c): array
{
    return [
        'codigo'          => $c['codigo'],
        'nome'            => $c['nome'],
        'documento'       => mascara_documento((string) ($c['documento'] ?? '')),
        'curso'           => $c['curso'],
        'descricao'       => $c['descricao'] ?? '',
        'cargaHoraria'    => $c['carga_horaria'] === null ? null : (float) $c['carga_horaria'],
        'instrutor'       => $c['instrutor'] ?? '',
        'concluidoEm'     => $c['concluido_em'],
        'emitidoEm'       => $c['emitido_em'],
        'revogado'        => (bool) $c['revogado'],
        'revogadoEm'      => $c['revogado_em'],
        'motivoRevogacao' => $c['motivo_revogacao'] ?? '',
    ];
}

function registra_validacao(string $codigo, ?int $certId, string $ip, string $resultado): void
{
    db()->prepare('insert into certificado_validacoes (codigo, certificado_id, ip, resultado) values (?,?,?,?)')
        ->execute([mb_substr($codigo, 0, 60), $certId, $ip, $resultado]);
}

/**
 * Falhas demais do mesmo IP na janela — varredura de códigos.
 *
 * Conta só `nao_encontrado`, e não toda consulta. Quem varre códigos produz
 * exatamente isso, porque não acerta; já o RH conferindo os 30 certificados de
 * uma turma acerta todos, e contar os acertos o trancaria para fora no meio do
 * trabalho. A trava mira quem erra em série.
 */
function validacao_travada(string $ip): bool
{
    if ($ip === '') {
        return false;
    }
    $st = db()->prepare(
        "select count(*) as n from certificado_validacoes
         where ip = ? and resultado = 'nao_encontrado' and em > now() - make_interval(secs => ?)"
    );
    $st->execute([$ip, CERT_JANELA_SEG]);
    return (int) ($st->fetch()['n'] ?? 0) >= CERT_TENTATIVAS;
}

/**
 * Campos do certificado vindos do cliente, já conferidos.
 * Devolve [nome, documento, curso, descricao, cargaHoraria, instrutor, concluidoEm].
 */
function saneia_certificado(array $dados, bool $comNome = true): array
{
    $nome  = trim((string) ($dados['nome'] ?? ''));
    $curso = trim((string) ($dados['curso'] ?? ''));
    if ($comNome && $nome === '') {
        erro('O nome do participante é obrigatório.');
    }
    if ($curso === '') {
        erro('O nome do curso ou treinamento é obrigatório.');
    }

    $concluido = trim((string) ($dados['concluidoEm'] ?? ''));
    // Data ruim aqui vira certificado com data errada impressa no papel — e o
    // papel já saiu da empresa quando alguém percebe. Confere agora.
    $d = DateTimeImmutable::createFromFormat('!Y-m-d', $concluido);
    if (!$d || $d->format('Y-m-d') !== $concluido) {
        erro('Informe a data de conclusão no formato AAAA-MM-DD.');
    }

    $carga = $dados['cargaHoraria'] ?? null;
    if ($carga === '' || $carga === null) {
        $carga = null;
    } else {
        if (!is_numeric($carga)) {
            erro('A carga horária precisa ser um número.');
        }
        $carga = (float) $carga;
        if ($carga <= 0 || $carga > 9999) {
            erro('A carga horária precisa estar entre 0 e 9999 horas.');
        }
    }

    return [
        $nome,
        trim((string) ($dados['documento'] ?? '')),
        $curso,
        trim((string) ($dados['descricao'] ?? '')),
        $carga,
        trim((string) ($dados['instrutor'] ?? '')),
        $concluido,
    ];
}

/**
 * Grava um certificado novo, sorteando o código até um não colidir.
 * Devolve o código emitido.
 */
function emite_certificado(array $campos, string $quem): string
{
    $ano = (int) (new DateTimeImmutable('now', new DateTimeZone(TZ_INTRANET)))->format('Y');
    $st  = db()->prepare(
        'insert into certificados (codigo, nome, documento, curso, descricao, carga_horaria, instrutor, concluido_em, emitido_por)
         values (?,?,?,?,?,?,?,?,?)'
    );
    for ($i = 0; $i < CERT_TENTA_CODIGO; $i++) {
        $codigo = gera_codigo_certificado($ano);
        try {
            $st->execute([$codigo, ...$campos, $quem]);
            return $codigo;
        } catch (PDOException $e) {
            if ($e->getCode() !== '23505') {   // unique_violation = código repetido
                throw $e;
            }
        }
    }
    erro('Não foi possível gerar um código único. Tente novamente.', 500);
}

// ---------------------------------------------------------------- roteamento
$corpo = json_decode(file_get_contents('php://input') ?: '{}', true) ?: [];
$acao  = (string) ($_GET['acao'] ?? $corpo['acao'] ?? '');
$dados = is_array($corpo['dados'] ?? null) ? $corpo['dados'] : [];
$token = $corpo['token'] ?? null;
$ip    = ip_do_cliente($_SERVER);

if (!array_key_exists($acao, AUTH_POR_ACAO)) {
    erro('Ação desconhecida.', 404);
}

$auth  = AUTH_POR_ACAO[$acao];
$admin = null;
$chave = null;

if ($auth === 'portal') {
    $chave = chave_da_sessao($token);
    if (!$chave) {
        erro('Sessão expirada. Entre novamente.', 401);
    }
} elseif ($auth === 'admin' || $auth === 'super') {
    $admin = admin_da_sessao($token);
    if (!$admin) {
        erro('Sessão expirada ou inválida. Entre novamente.', 401);
    }
    if ($auth === 'super' && !$admin['super']) {
        // Vale registrar: a UI esconde a aba, então isto não acontece por acidente.
        registra('painel', $admin['usuario'], $ip, null, 'sem_privilegio');
        erro('Apenas o superusuário pode gerenciar administradores.', 403);
    }
}

switch ($acao) {

    // ============================================== portal (público)
    case 'publico':
        responde(['links' => links_ativos()]);

    // ============================================== portal: palavra-chave
    case 'entrar': {
        $coords = sanear_coords($dados['coords'] ?? null);
        $senha  = (string) ($dados['keyword'] ?? '');

        if (ip_travado($ip)) {
            registra('portal', null, $ip, $coords, 'travado');
            erro('Muitas tentativas. Aguarde alguns minutos e tente de novo.', 429);
        }

        $ips = config_ips();
        if ($ips) {   // lista vazia = sem restrição de rede
            $bate = false;
            foreach ($ips as $regra) {
                if (ip_combina($ip, (string) $regra)) { $bate = true; break; }
            }
            if (!$bate) {
                registra_falha($ip);
                registra('portal', null, $ip, $coords, 'ip_negado');
                erro('Acesso permitido apenas na rede autorizada.', 403);
            }
        }

        if ($senha === '') {
            erro('Informe a palavra-chave.');
        }

        $st = db()->prepare('select * from chaves where keyword_hash = ? limit 1');
        $st->execute([hash_chave($senha)]);
        $c = $st->fetch();
        if (!$c) {
            registra_falha($ip);
            registra('portal', null, $ip, $coords, 'chave_invalida');
            erro('Palavra-chave incorreta.', 403);
        }

        $nome = $c['nome'];

        if (!$c['ativo'] || $c['bloqueado']) {
            registra('portal', $nome, $ip, $coords, 'bloqueado');
            erro('Seu acesso está bloqueado. Procure o administrador.', 403);
        }
        // Expiração antes do horário: "expirou" é mais útil que "fora do horário"
        // para quem está tentando entrar.
        if (expirada($c['expira_em'])) {
            registra('portal', $nome, $ip, $coords, 'expirada');
            erro('Sua palavra-chave expirou. Procure o administrador para receber uma nova.', 403);
        }
        if (!dentro_do_horario($c['horario'] ? json_decode($c['horario'], true) : null)) {
            registra('portal', $nome, $ip, $coords, 'fora_horario');
            erro('Fora do horário autorizado para o seu acesso.', 403);
        }

        $tk = nova_sessao('sessoes_portal', 'chave_id', (int) $c['id']);
        limpa_trava($ip);
        registra('portal', $nome, $ip, $coords, 'ok');

        // Cookie além do token: é ele que o guard.php lê ao proteger /gestao-espaco
        // e afins. sessionStorage não viaja nessas requisições; cookie sim.
        // httponly: o JS não precisa dele (usa o token) e assim XSS não o rouba.
        setcookie('intranet_sessao', $tk, [
            'expires'  => time() + SESSAO_HORAS * 3600,
            'path'     => '/',
            'secure'   => true,
            'httponly' => true,
            'samesite' => 'Lax',   // Lax deixa passar na navegação a partir do portal
        ]);

        responde(['token' => $tk, 'nome' => $nome, 'links' => links_ativos()]);
    }

    case 'portal':
        responde(['nome' => $chave['nome'], 'links' => links_ativos()]);

    // ============================================== painel: usuário e senha
    case 'login': {
        $usuario = trim((string) ($dados['usuario'] ?? ''));
        $senha   = (string) ($dados['senha'] ?? '');
        $coords  = sanear_coords($dados['coords'] ?? null);

        if (ip_travado($ip)) {
            registra('painel', null, $ip, $coords, 'travado');
            erro('Muitas tentativas. Aguarde alguns minutos e tente de novo.', 429);
        }
        if ($usuario === '' || $senha === '') {
            erro('Informe usuário e senha.');
        }

        $st = db()->prepare('select * from admins where usuario = ? limit 1');
        $st->execute([$usuario]);
        $a = $st->fetch();

        // password_verify entende o hash do pgcrypto direto: crypt(x, gen_salt('bf', 10))
        // produz bcrypt padrão ($2a$...), o mesmo formato que o PHP gera e lê.
        //
        // Mensagem única para usuário inexistente e senha errada: dizer qual dos
        // dois falhou entrega a lista de usuários válidos a quem está tentando.
        if (!$a || !password_verify($senha, $a['senha_hash'])) {
            registra_falha($ip);
            registra('painel', $usuario ?: null, $ip, $coords, 'senha_invalida');
            erro('Usuário ou senha incorretos.', 403);
        }
        if (!$a['ativo']) {
            registra('painel', $usuario, $ip, $coords, 'bloqueado');
            erro('Seu acesso está desativado.', 403);
        }

        $tk = nova_sessao('sessoes_admin', 'admin_id', (int) $a['id']);
        limpa_trava($ip);
        registra('painel', $usuario, $ip, $coords, 'ok');
        responde(['token' => $tk, 'admin' => formata_admin($a)]);
    }

    case 'painel':
        responde(['admin' => formata_admin($admin), 'ips' => config_ips()]);

    // Editar a própria conta. Separado do salvarAdmin de propósito: aqui o id é
    // sempre o da sessão, nunca vem do cliente — assim um terceiro não consegue
    // usar esta ação para mexer na conta de outra pessoa.
    case 'salvarPerfil': {
        $novoUsuario = trim((string) ($dados['usuario'] ?? ''));
        $email       = trim((string) ($dados['email'] ?? ''));
        $senha       = (string) ($dados['senha'] ?? '');

        if ($novoUsuario === '') {
            erro('O usuário é obrigatório.');
        }
        if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            erro('E-mail inválido.');
        }
        if ($senha !== '' && mb_strlen($senha) < SENHA_MIN) {
            erro('A senha precisa de ao menos ' . SENHA_MIN . ' caracteres.');
        }

        try {
            $sql  = 'update admins set usuario=?, email=?' . ($senha !== '' ? ", senha_hash=crypt(?, gen_salt('bf', 10))" : '') . ', atualizado_em=now() where id=?';
            $args = $senha !== ''
                ? [$novoUsuario, $email, $senha, (int) $admin['id']]
                : [$novoUsuario, $email, (int) $admin['id']];
            db()->prepare($sql)->execute($args);
        } catch (PDOException $e) {
            if ($e->getCode() === '23505') {   // unique_violation
                erro('Já existe um administrador com este usuário ou e-mail.', 409);
            }
            throw $e;
        }

        // Trocou a senha? As outras sessões desta conta caem — quem trocou a
        // senha normalmente quer justamente derrubar quem estava usando a antiga.
        if ($senha !== '') {
            db()->prepare('delete from sessoes_admin where admin_id = ? and token <> ?')
                ->execute([(int) $admin['id'], $token]);
        }
        responde(['ok' => true]);
    }

    // ============================================== links
    case 'listarLinks':
        responde(['links' => array_map('formata_link', db()->query('select * from links order by ordem, id')->fetchAll())]);

    case 'salvarLink': {
        $nome = trim((string) ($dados['nome'] ?? ''));
        if ($nome === '') {
            erro('O nome do link é obrigatório.');
        }
        // Caminho normalizado: o guard casa prefixo, então barra no fim faria
        // "/gestao-espaco/" não cobrir "/gestao-espaco".
        $caminho = rtrim(trim((string) ($dados['caminho'] ?? '')), '/');
        if ($caminho !== '' && !str_starts_with($caminho, '/')) {
            erro('O caminho protegido precisa começar com "/" (ex.: /gestao-espaco).');
        }
        if (str_starts_with($caminho, '/intranet-api')) {
            erro('Este caminho não pode ser protegido: é a própria API do portão.');
        }

        $campos = [
            $nome,
            (string) ($dados['tipo'] ?? 'url'),
            (string) ($dados['url'] ?? ''),
            (string) ($dados['icone'] ?? 'link'),
            (string) ($dados['cor'] ?? '#334155'),
            pgbool(($dados['ativo'] ?? true) !== false),
            (int) ($dados['ordem'] ?? 99),
            jsonb($dados['subsecoes'] ?? []),
            pgbool(($dados['acessoDireto'] ?? true) !== false),
            $caminho,
        ];
        if (!empty($dados['id'])) {
            db()->prepare('update links set nome=?, tipo=?, url=?, icone=?, cor=?, ativo=?, ordem=?, subsecoes=?, acesso_direto=?, caminho=?, atualizado_em=now() where id=?')
                ->execute([...$campos, (int) $dados['id']]);
        } else {
            db()->prepare('insert into links (nome, tipo, url, icone, cor, ativo, ordem, subsecoes, acesso_direto, caminho) values (?,?,?,?,?,?,?,?,?,?)')
                ->execute($campos);
        }
        responde(['ok' => true]);
    }

    case 'excluirLink': {
        if (empty($dados['id'])) {
            erro('Informe o link.');
        }
        db()->prepare('delete from links where id = ?')->execute([(int) $dados['id']]);
        responde(['ok' => true]);
    }

    // ============================================== palavras-chave
    case 'listarChaves': {
        $rows = db()->query('select * from chaves order by nome')->fetchAll();
        // keyword_hash nunca sai daqui.
        responde(['chaves' => array_map(fn ($c) => [
            'id'        => (int) $c['id'],
            'nome'      => $c['nome'],
            'ativo'     => (bool) $c['ativo'],
            'bloqueado' => (bool) $c['bloqueado'],
            'expiraEm'  => $c['expira_em'],
            'expirada'  => expirada($c['expira_em']),
            'horario'   => $c['horario'] ? json_decode($c['horario'], true) : null,
        ], $rows)]);
    }

    case 'salvarChave': {
        $nome = trim((string) ($dados['nome'] ?? ''));
        if ($nome === '') {
            erro('O nome é obrigatório.');
        }
        $id      = !empty($dados['id']) ? (int) $dados['id'] : null;
        $senha   = (string) ($dados['chave'] ?? '');
        $horario = $dados['horario'] ?? null;

        $comuns = [
            $nome,
            pgbool(($dados['ativo'] ?? true) !== false),
            pgbool(($dados['bloqueado'] ?? false) === true),
            $horario === null ? null : jsonb($horario),
        ];

        $h = null;
        if ($senha !== '') {
            if (mb_strlen($senha) < CHAVE_MIN) {
                erro('A palavra-chave precisa de ao menos ' . CHAVE_MIN . ' caracteres.');
            }
            $h = hash_chave($senha);
            // Chave duplicada tornaria o login ambíguo — o portão descobre quem é
            // a pessoa PELO hash. O unique do banco barraria, com erro ilegível.
            $st = db()->prepare('select id from chaves where keyword_hash = ? limit 1');
            $st->execute([$h]);
            $dono = $st->fetch();
            if ($dono && (int) $dono['id'] !== $id) {
                erro('Esta palavra-chave já pertence a outra pessoa. Escolha outra.', 409);
            }
        }

        if ($id) {
            if ($h !== null) {
                // Chave nova reinicia os 3 meses: renovar é justamente isso.
                db()->prepare('update chaves set nome=?, ativo=?, bloqueado=?, horario=?, keyword_hash=?, expira_em=now() + make_interval(months => ?), atualizado_em=now() where id=?')
                    ->execute([...$comuns, $h, EXPIRA_MESES, $id]);
            } else {
                db()->prepare('update chaves set nome=?, ativo=?, bloqueado=?, horario=?, atualizado_em=now() where id=?')
                    ->execute([...$comuns, $id]);
            }
        } else {
            if ($senha === '') {
                erro('Defina a palavra-chave da pessoa.');
            }
            db()->prepare('insert into chaves (nome, ativo, bloqueado, horario, keyword_hash, expira_em) values (?,?,?,?,?, now() + make_interval(months => ?))')
                ->execute([...$comuns, $h, EXPIRA_MESES]);
        }
        responde(['ok' => true]);
    }

    case 'excluirChave': {
        if (empty($dados['id'])) {
            erro('Informe a palavra-chave.');
        }
        db()->prepare('delete from chaves where id = ?')->execute([(int) $dados['id']]);
        responde(['ok' => true]);
    }

    // ============================================== administradores (só super)
    case 'listarAdmins':
        responde(['admins' => array_map('formata_admin', db()->query('select * from admins order by usuario')->fetchAll())]);

    case 'salvarAdmin': {
        $usuario = trim((string) ($dados['usuario'] ?? ''));
        if ($usuario === '') {
            erro('O usuário é obrigatório.');
        }
        $id    = !empty($dados['id']) ? (int) $dados['id'] : null;
        $email = trim((string) ($dados['email'] ?? ''));
        $senha = (string) ($dados['senha'] ?? '');
        $ativo = pgbool(($dados['ativo'] ?? true) !== false);

        if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            erro('E-mail inválido.');
        }
        if ($senha !== '' && mb_strlen($senha) < SENHA_MIN) {
            erro('A senha precisa de ao menos ' . SENHA_MIN . ' caracteres.');
        }

        $querSuper = ($dados['super'] ?? false) === true;
        $souSuper  = (bool) $admin['super'];

        // ── Ninguém concede o que não tem ───────────────────────────────────
        // Sem isto, um terceiro criaria um superusuário (ou se promoveria) e o
        // nível deixaria de significar qualquer coisa.
        if ($querSuper && !$souSuper) {
            erro('Só um superusuário pode criar ou promover outro superusuário.', 403);
        }
        // Nem mexe em quem tem mais: um terceiro que pudesse editar um super
        // trocaria a senha dele e entraria como ele.
        if ($id) {
            $st = db()->prepare('select super from admins where id = ?');
            $st->execute([$id]);
            $alvo = $st->fetch();
            if (!$alvo) {
                erro('Administrador não encontrado.', 404);
            }
            if ($alvo['super'] && !$souSuper) {
                erro('Só um superusuário pode alterar a conta de outro superusuário.', 403);
            }
        }
        // O super não se rebaixa nem se desativa: seria trancar o painel para
        // sempre se ele fosse o último.
        if ($id === (int) $admin['id'] && ($ativo === 0 || ($souSuper && !$querSuper))) {
            erro('Você não pode desativar nem rebaixar o seu próprio acesso.');
        }

        $ehSuper = pgbool($querSuper);
        try {
            if ($id) {
                $sql = 'update admins set usuario=?, email=?, super=?, ativo=?' . ($senha !== '' ? ', senha_hash=crypt(?, gen_salt(\'bf\', 10))' : '') . ', atualizado_em=now() where id=?';
                $args = $senha !== ''
                    ? [$usuario, $email, $ehSuper, $ativo, $senha, $id]
                    : [$usuario, $email, $ehSuper, $ativo, $id];
                db()->prepare($sql)->execute($args);
            } else {
                if ($senha === '') {
                    erro('Defina a senha do novo administrador.');
                }
                db()->prepare("insert into admins (usuario, email, senha_hash, super, ativo) values (?, ?, crypt(?, gen_salt('bf', 10)), ?, ?)")
                    ->execute([$usuario, $email, $senha, $ehSuper, $ativo]);
            }
        } catch (PDOException $e) {
            // 23505 = unique_violation. Mensagem legível em vez do SQL cru.
            if ($e->getCode() === '23505') {
                erro('Já existe um administrador com este usuário ou e-mail.', 409);
            }
            throw $e;
        }
        responde(['ok' => true]);
    }

    case 'excluirAdmin': {
        if (empty($dados['id'])) {
            erro('Informe o administrador.');
        }
        $id = (int) $dados['id'];
        if ($id === (int) $admin['id']) {
            erro('Você não pode excluir o seu próprio acesso.');
        }

        $st = db()->prepare('select super from admins where id = ?');
        $st->execute([$id]);
        $alvo = $st->fetch();
        if (!$alvo) {
            erro('Administrador não encontrado.', 404);
        }
        // Mesma regra do salvar: um terceiro apagando o super removeria justamente
        // quem o supervisiona.
        if ($alvo['super'] && !$admin['super']) {
            erro('Só um superusuário pode excluir outro superusuário.', 403);
        }
        // Não deixar o painel sem nenhum super: ninguém mais criaria supers, e o
        // nível sumiria do sistema sem volta.
        if ($alvo['super']) {
            $n = (int) db()->query('select count(*) as n from admins where super and ativo')->fetch()['n'];
            if ($n <= 1) {
                erro('Este é o único superusuário ativo. Promova outro antes de excluí-lo.');
            }
        }

        db()->prepare('delete from admins where id = ?')->execute([$id]);
        responde(['ok' => true]);
    }

    // ============================================== histórico e rede
    case 'listarAcessos': {
        $rows = db()->query('select * from acessos order by em desc limit 500')->fetchAll();
        responde(['acessos' => array_map(fn ($a) => [
            'id'        => (int) $a['id'],
            'tipo'      => $a['tipo'],
            'quem'      => $a['quem'],
            'ip'        => $a['ip'],
            'coords'    => $a['coords'] ? json_decode($a['coords'], true) : null,
            'resultado' => $a['resultado'],
            'em'        => $a['em'],
        ], $rows)]);
    }

    case 'salvarConfig': {
        $ips = [];
        foreach ((array) ($dados['ips'] ?? []) as $x) {
            $x = trim((string) $x);
            if ($x !== '') {
                $ips[] = $x;
            }
        }
        db()->prepare("insert into config (chave, valor) values ('ips', ?) on conflict (chave) do update set valor = excluded.valor")
            ->execute([jsonb($ips)]);
        responde(['ok' => true, 'ips' => $ips]);
    }

    // ============================================== certificados (validação pública)
    case 'validarCertificado': {
        $codigo = normaliza_codigo_certificado((string) ($dados['codigo'] ?? ''));
        if ($codigo === '') {
            erro('Informe o código do certificado.');
        }
        if (validacao_travada($ip)) {
            registra_validacao($codigo, null, $ip, 'travado');
            erro('Muitas consultas seguidas. Aguarde alguns minutos e tente de novo.', 429);
        }

        // A comparação usa a MESMA normalização do índice único
        // uq_certificados_codigo_norm — sem isso a consulta varreria a tabela.
        $st = db()->prepare("select * from certificados where upper(replace(codigo, '-', '')) = ? limit 1");
        $st->execute([$codigo]);
        $c = $st->fetch();

        if (!$c) {
            registra_validacao($codigo, null, $ip, 'nao_encontrado');
            erro('Nenhum certificado encontrado com este código. Confira os caracteres e tente de novo.', 404);
        }

        // Revogado responde 200, e não 404: quem está com o papel na mão precisa
        // saber que o certificado foi CANCELADO — resposta diferente de "não
        // existe", que ele leria como erro de digitação.
        registra_validacao($codigo, (int) $c['id'], $ip, $c['revogado'] ? 'revogado' : 'valido');
        responde(['certificado' => certificado_publico($c)]);
    }

    // ============================================== certificados (painel)
    case 'listarCertificados': {
        $busca = trim((string) ($dados['busca'] ?? ''));
        if ($busca === '') {
            $rows = db()->query('select * from certificados order by emitido_em desc limit 500')->fetchAll();
        } else {
            $st = db()->prepare(
                "select * from certificados
                 where nome ilike ? or curso ilike ? or upper(replace(codigo, '-', '')) like ?
                 order by emitido_em desc limit 500"
            );
            $st->execute(['%' . $busca . '%', '%' . $busca . '%', '%' . normaliza_codigo_certificado($busca) . '%']);
            $rows = $st->fetchAll();
        }
        responde(['certificados' => array_map('formata_certificado', $rows)]);
    }

    case 'salvarCertificado': {
        $campos = saneia_certificado($dados);
        $id     = !empty($dados['id']) ? (int) $dados['id'] : null;

        if ($id) {
            // O CÓDIGO NÃO MUDA na edição, nem quando o curso inteiro é corrigido.
            // Ele já foi impresso e entregue; trocá-lo transformaria todo
            // certificado em circulação em "não encontrado". Errou feio a ponto de
            // precisar de outro código? Revogue este e emita um novo.
            db()->prepare(
                'update certificados set nome=?, documento=?, curso=?, descricao=?, carga_horaria=?, instrutor=?, concluido_em=?, atualizado_em=now()
                 where id=?'
            )->execute([...$campos, $id]);
            responde(['ok' => true]);
        }

        responde(['ok' => true, 'codigo' => emite_certificado($campos, (string) $admin['usuario'])]);
    }

    // Uma turma inteira de uma vez. Sem isto, emitir 40 certificados de uma NR-20
    // seria preencher o mesmo formulário 40 vezes — e é assim que curso e data
    // saem diferentes entre certificados da MESMA turma.
    case 'emitirLote': {
        $pessoas = [];
        foreach ((array) ($dados['nomes'] ?? []) as $linha) {
            $linha = trim((string) $linha);
            if ($linha === '') {
                continue;
            }
            // "Nome" ou "Nome; CPF" — o CPF é opcional, por pessoa.
            $partes = array_map('trim', explode(';', $linha, 2));
            if ($partes[0] === '') {
                continue;
            }
            $pessoas[] = ['nome' => $partes[0], 'doc' => $partes[1] ?? ''];
        }
        if (!$pessoas) {
            erro('Informe ao menos um participante.');
        }
        if (count($pessoas) > 200) {
            erro('Máximo de 200 participantes por lote.');
        }

        // Nome e documento vêm da lista, um por pessoa; o resto é comum à turma.
        $campos = saneia_certificado($dados, false);

        $emitidos = [];
        db()->beginTransaction();
        try {
            foreach ($pessoas as $p) {
                $c    = $campos;
                $c[0] = $p['nome'];
                $c[1] = $p['doc'];
                $emitidos[] = ['nome' => $p['nome'], 'codigo' => emite_certificado($c, (string) $admin['usuario'])];
            }
            db()->commit();
        } catch (Throwable $e) {
            db()->rollBack();
            throw $e;
        }
        responde(['ok' => true, 'emitidos' => $emitidos]);
    }

    case 'revogarCertificado': {
        if (empty($dados['id'])) {
            erro('Informe o certificado.');
        }
        $id      = (int) $dados['id'];
        $revogar = ($dados['revogado'] ?? true) !== false;
        $motivo  = trim((string) ($dados['motivo'] ?? ''));

        // Motivo obrigatório: quem consultar o código vai LER esta frase. "Sem
        // motivo informado" numa tela de validação não explica nada a ninguém.
        if ($revogar && $motivo === '') {
            erro('Informe o motivo do cancelamento — ele aparece para quem validar o código.');
        }

        if ($revogar) {
            db()->prepare('update certificados set revogado=true, revogado_em=now(), motivo_revogacao=?, atualizado_em=now() where id=?')
                ->execute([$motivo, $id]);
        } else {
            db()->prepare("update certificados set revogado=false, revogado_em=null, motivo_revogacao='', atualizado_em=now() where id=?")
                ->execute([$id]);
        }
        responde(['ok' => true]);
    }

    // Existe para o certificado cadastrado errado que nunca foi entregue. Para
    // qualquer outro caso o certo é REVOGAR: excluir apaga o código do banco, e
    // quem tiver o papel na mão passa a receber "não encontrado" — que ele lê
    // como erro de digitação, não como cancelamento.
    case 'excluirCertificado': {
        if (empty($dados['id'])) {
            erro('Informe o certificado.');
        }
        db()->prepare('delete from certificados where id = ?')->execute([(int) $dados['id']]);
        responde(['ok' => true]);
    }

    case 'listarValidacoes': {
        $rows = db()->query(
            'select v.*, c.nome as cert_nome, c.codigo as cert_codigo
             from certificado_validacoes v
             left join certificados c on c.id = v.certificado_id
             order by v.em desc limit 300'
        )->fetchAll();
        responde(['validacoes' => array_map(fn ($v) => [
            'id'        => (int) $v['id'],
            // Sem certificado (código inexistente) mostramos o que foi digitado —
            // é justamente aí que se enxerga alguém varrendo códigos.
            'codigo'    => $v['cert_codigo'] ?: $v['codigo'],
            'nome'      => $v['cert_nome'],
            'ip'        => $v['ip'],
            'resultado' => $v['resultado'],
            'em'        => $v['em'],
        ], $rows)]);
    }
}
