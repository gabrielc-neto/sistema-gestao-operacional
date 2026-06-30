<?php

namespace App\Console\Commands;

use App\Models\CercaEletronica;
use App\Models\CercaEvento;
use App\Models\SascarPosicao;
use App\Services\Geofence;
use App\Services\SascarService;
use Illuminate\Console\Command;

/**
 * Substitui a Cloud Function agendada `sascarPosicoes` do sistema Firebase.
 * Busca pacotes de posição, persiste a última posição por veículo e gera
 * eventos de entrada/saída de cerca (geofence). Roda via scheduler (a cada minuto).
 */
class SascarSync extends Command
{
    protected $signature = 'sascar:sync {--empresa=1 : ID da empresa (tenant)}';
    protected $description = 'Sincroniza posições SASCAR e gera eventos de cerca';

    public function handle(SascarService $sascar): int
    {
        if (!$sascar->configurado()) {
            $this->warn('SASCAR não configurado (.env: SASCAR_USUARIO / SASCAR_SENHA). Pulando.');
            return self::SUCCESS;
        }

        $empresaId = (int) $this->option('empresa');
        $cercas = CercaEletronica::where('empresa_id', $empresaId)->get();

        $pacotes = $sascar->obterPacotePosicoes(200);
        $this->info('Pacotes recebidos: ' . count($pacotes));

        foreach ($pacotes as $p) {
            $idVeiculo = (int) ($p['idVeiculo'] ?? 0);
            if (!$idVeiculo) {
                continue;
            }

            $lat = isset($p['latitude']) ? (float) $p['latitude'] : null;
            $lng = isset($p['longitude']) ? (float) $p['longitude'] : null;

            $dentroDe = ($lat !== null && $lng !== null)
                ? Geofence::cercasContendoPonto($lat, $lng, $cercas)
                : [];

            $anterior = SascarPosicao::where('empresa_id', $empresaId)
                ->where('id_veiculo', $idVeiculo)->first();

            $this->gerarEventosCerca($empresaId, $p, $anterior?->dentro_de ?? [], $dentroDe, $cercas, $lat, $lng);

            SascarPosicao::updateOrCreate(
                ['empresa_id' => $empresaId, 'id_veiculo' => $idVeiculo],
                [
                    'placa'        => $p['placa'] ?? null,
                    'id_pacote'    => isset($p['idPacote']) ? (int) $p['idPacote'] : null,
                    'data_posicao' => $p['dataPosicao'] ?? null,
                    'data_pacote'  => $p['dataPacote'] ?? null,
                    'latitude'     => $lat,
                    'longitude'    => $lng,
                    'direcao'      => isset($p['direcao']) ? (int) $p['direcao'] : null,
                    'velocidade'   => isset($p['velocidade']) ? (int) $p['velocidade'] : null,
                    'ignicao'      => isset($p['ignicao']) ? (int) $p['ignicao'] : null,
                    'gps'          => isset($p['gps']) ? (int) $p['gps'] : null,
                    'uf'           => $p['uf'] ?? null,
                    'cidade'       => $p['cidade'] ?? null,
                    'status_texto' => $this->statusDoPacote($p),
                    'dentro_de'    => $dentroDe,
                ],
            );
        }

        return self::SUCCESS;
    }

    /** EM_MOVIMENTO | PARADO_LIGADO | ESTACIONADO (igual statusFromPacote do original). */
    private function statusDoPacote(array $p): string
    {
        $ign = (int) ($p['ignicao'] ?? 0);
        $vel = (int) ($p['velocidade'] ?? 0);
        if ($ign === 1) {
            return $vel > 0 ? 'EM_MOVIMENTO' : 'PARADO_LIGADO';
        }
        return 'ESTACIONADO';
    }

    /** Compara cercas antes/depois e grava ENTRADA/SAIDA idempotente. */
    private function gerarEventosCerca(int $empresaId, array $p, array $antes, array $depois, $cercas, ?float $lat, ?float $lng): void
    {
        $entrou = array_diff($depois, $antes);
        $saiu   = array_diff($antes, $depois);
        $idVeiculo = (int) $p['idVeiculo'];
        $idPacote  = $p['idPacote'] ?? '0';

        foreach (['ENTRADA' => $entrou, 'SAIDA' => $saiu] as $tipo => $ids) {
            foreach ($ids as $cercaId) {
                $cerca = $cercas->firstWhere('id', (int) $cercaId);
                $sufixo = $tipo === 'ENTRADA' ? 'E' : 'S';
                CercaEvento::updateOrCreate(
                    ['empresa_id' => $empresaId, 'chave' => "{$idVeiculo}_{$cercaId}_{$idPacote}_{$sufixo}"],
                    [
                        'tipo'         => $tipo,
                        'id_veiculo'   => $idVeiculo,
                        'placa'        => $p['placa'] ?? null,
                        'cerca_id'     => (int) $cercaId,
                        'cerca_nome'   => $cerca?->nome,
                        'cerca_tipo'   => $cerca?->tipo,
                        'latitude'     => $lat,
                        'longitude'    => $lng,
                        'id_pacote'    => is_numeric($idPacote) ? (int) $idPacote : null,
                        'data_posicao' => $p['dataPosicao'] ?? null,
                        'criado_em_ms' => (int) (microtime(true) * 1000),
                    ],
                );
            }
        }
    }
}
