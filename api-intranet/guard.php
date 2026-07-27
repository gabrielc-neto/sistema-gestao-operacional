<?php
// Guard de acesso direto aos sistemas da intranet.
//
// COMO ENTRA EM AÇÃO: o vhost aponta `php_value auto_prepend_file` para este
// arquivo no <Directory> de cada sistema protegido. O PHP o executa ANTES do
// código do app — então Integridade, GLPI, Espaço e Compras não precisam saber
// que ele existe, e nenhuma linha deles muda.
//
// O QUE RESOLVE: até aqui o portal era uma vitrine de links. Quem digitasse
// web-homol.../gestao-espaco/ entrava direto; a palavra-chave protegia a LISTA,
// não os sistemas. Agora, um sistema marcado como "sem acesso direto" só abre
// para quem tem sessão válida do portal.
//
// COMO SABE QUEM É: o cookie `intranet_sessao`, gravado pela API quando a
// palavra-chave é aceita. Cookie, e não sessionStorage, porque só cookie viaja
// sozinho nas requisições para /gestao-espaco/ e afins.

declare(strict_types=1);

(static function (): void {
    $caminho = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';

    // Nunca se proteger: cairia num laço, já que o portão vive aqui.
    if (str_starts_with($caminho, '/intranet-api')) {
        return;
    }

    $pdo = null;
    $sistema = null;
    $liberado = false;

    try {
        // NÃO usar getenv('DB_*'): este arquivo roda dentro do <Directory> de
        // OUTROS apps, e lá essas variáveis são as DELES — MySQL, do Espaço ou do
        // Compras. O guard tentaria falar PostgreSQL com credencial de MySQL,
        // falharia, e (por falhar fechando) bloquearia TODOS os sistemas de uma
        // vez. Foi exatamente o que aconteceu na primeira tentativa. Por isso a
        // credencial vem de arquivo próprio, fora do docroot.
        $cfg = require '/etc/intranet/db.php';
        $pdo = new PDO(
            "pgsql:host={$cfg['host']};port=5432;dbname={$cfg['nome']}",
            $cfg['user'],
            $cfg['pass'],
            [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_TIMEOUT            => 3,
            ],
        );

        // Este caminho está protegido? Casa por prefixo: /gestao-espaco cobre
        // /gestao-espaco/relatorio.php também.
        $st = $pdo->prepare(
            "select nome from links
             where caminho <> '' and acesso_direto = false and ? like caminho || '%'
             limit 1"
        );
        $st->execute([$caminho]);
        $protegido = $st->fetch();

        if (!$protegido) {
            $liberado = true;   // sistema aberto — segue para o app
        } else {
            $sistema = $protegido['nome'];
            $token = $_COOKIE['intranet_sessao'] ?? '';
            if ($token !== '') {
                $st = $pdo->prepare(
                    'select 1 from sessoes_portal s join chaves c on c.id = s.chave_id
                     where s.token = ? and s.expira_em > now()
                       and c.ativo = true and c.bloqueado = false and c.expira_em > now()'
                );
                $st->execute([$token]);
                $liberado = (bool) $st->fetch();   // tem sessão válida → passa
            }
        }
    } catch (Throwable $e) {
        // Falha fechando: banco fora = ninguém entra em sistema protegido. No resto
        // do sistema um erro derruba a proteção; aqui a proteção É o produto, então
        // indisponível é melhor que aberto.
        //
        // Contrapartida assumida: se o Postgres cair, os sistemas RESTRITOS ficam
        // inacessíveis mesmo para quem tem sessão. Os não-restritos também — porque
        // sem banco não dá para saber quais são quais.
        error_log('intranet-guard: ' . $e->getMessage());
    }

    if ($liberado) {
        return;
    }

    // Registra a tentativa. Best-effort: se o log falhar, o bloqueio acontece
    // igual — não vale liberar alguém porque o registro quebrou.
    try {
        if ($pdo !== null) {
            $ip = trim(explode(',', (string) ($_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? ''))[0]);
            $pdo->prepare('insert into acessos (tipo, quem, ip, resultado) values (?,?,?,?)')
                ->execute(['portal', $sistema ? "acesso direto: $sistema" : 'acesso direto', $ip, 'acesso_direto_negado']);
        }
    } catch (Throwable) { /* silêncio proposital */ }

    http_response_code(403);
    header('Content-Type: text/html; charset=utf-8');
    header('Cache-Control: no-store');
    $s = htmlspecialchars((string) ($sistema ?? 'Este sistema'), ENT_QUOTES, 'UTF-8');
    echo <<<HTML
    <!doctype html>
    <html lang="pt-BR"><head><meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Acesso direto não autorizado</title>
    <style>
      body { margin:0; min-height:100vh; display:flex; align-items:center; justify-content:center;
             background:#0f172a; color:#e2e8f0; font-family:Montserrat,system-ui,sans-serif; padding:24px; }
      .cx { max-width:460px; text-align:center; }
      h1 { font-size:1.4rem; margin:0 0 12px; }
      p  { color:#94a3b8; line-height:1.6; margin:0 0 22px; font-size:.95rem; }
      a  { display:inline-block; padding:12px 26px; border-radius:999px; text-decoration:none;
           color:#fff; font-weight:700; background:rgba(255,255,255,.14);
           border:1px solid rgba(255,255,255,.28); }
      a:hover { background:rgba(255,255,255,.24); }
    </style></head><body><div class="cx">
      <h1>Acesso direto não autorizado</h1>
      <p><strong>$s</strong> só pode ser aberto pela intranet. Entre com a sua
         palavra-chave e acesse por lá.</p>
      <a href="/acesso">Ir para a intranet</a>
    </div></body></html>
    HTML;
    exit;
})();
