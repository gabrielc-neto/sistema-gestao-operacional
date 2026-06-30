<?php

use App\Http\Controllers\Auth\LoginController;
use App\Http\Controllers\ClienteController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\FrotaController;
use App\Http\Controllers\HistoricoController;
use App\Http\Controllers\ManutencaoController;
use App\Http\Controllers\MotoristaController;
use App\Http\Controllers\OcController;
use App\Http\Controllers\OrdemServicoController;
use App\Http\Controllers\ProdutoController;
use App\Http\Controllers\UsinaController;
use Illuminate\Support\Facades\Route;

// ---------------------------------------------------------------------
// Autenticação (substitui Firebase Auth)
// ---------------------------------------------------------------------
Route::middleware('guest')->group(function () {
    Route::get('/login', [LoginController::class, 'mostrar'])->name('login');
    Route::post('/login', [LoginController::class, 'entrar']);
});
Route::post('/logout', [LoginController::class, 'sair'])->middleware('auth')->name('logout');

// ---------------------------------------------------------------------
// Área autenticada
// ---------------------------------------------------------------------
Route::middleware('auth')->group(function () {

    Route::get('/', [DashboardController::class, 'index'])->name('dashboard');

    // Frota -----------------------------------------------------------
    Route::middleware('perm:frota.ver')->group(function () {
        Route::get('frota', [FrotaController::class, 'index'])->name('frota.index');
    });
    Route::middleware('perm:frota.criar')->group(function () {
        Route::get('frota/novo', [FrotaController::class, 'create'])->name('frota.create');
        Route::post('frota', [FrotaController::class, 'store'])->name('frota.store');
    });
    Route::middleware('perm:frota.editar')->group(function () {
        Route::get('frota/{veiculo}/editar', [FrotaController::class, 'edit'])->name('frota.edit');
        Route::put('frota/{veiculo}', [FrotaController::class, 'update'])->name('frota.update');
        Route::post('frota/{veiculo}/bloquear', [FrotaController::class, 'bloquear'])->name('frota.bloquear');
        Route::post('frota/{veiculo}/desbloquear', [FrotaController::class, 'desbloquear'])->name('frota.desbloquear');
    });
    Route::delete('frota/{veiculo}', [FrotaController::class, 'destroy'])->name('frota.destroy')->middleware('perm:frota.excluir');

    // Motoristas ------------------------------------------------------
    Route::middleware('perm:motoristas.ver')->get('motoristas', [MotoristaController::class, 'index'])->name('motoristas.index');
    Route::middleware('perm:motoristas.criar')->group(function () {
        Route::get('motoristas/novo', [MotoristaController::class, 'create'])->name('motoristas.create');
        Route::post('motoristas', [MotoristaController::class, 'store'])->name('motoristas.store');
    });
    Route::middleware('perm:motoristas.editar')->group(function () {
        Route::get('motoristas/{motorista}/editar', [MotoristaController::class, 'edit'])->name('motoristas.edit');
        Route::put('motoristas/{motorista}', [MotoristaController::class, 'update'])->name('motoristas.update');
    });
    Route::delete('motoristas/{motorista}', [MotoristaController::class, 'destroy'])->name('motoristas.destroy')->middleware('perm:motoristas.excluir');

    // Clientes / Produtos / Usinas (cadastros simples) ----------------
    Route::resource('clientes', ClienteController::class)->except('show')->middleware('perm:clientes.ver');
    Route::resource('produtos', ProdutoController::class)->except('show')->middleware('perm:produtos.ver');
    Route::resource('usinas', UsinaController::class)->except('show')->middleware('perm:usinas.ver');

    // Ordens de Carregamento -----------------------------------------
    Route::middleware('perm:oc.ver')->group(function () {
        Route::get('oc', [OcController::class, 'index'])->name('oc.index');
        Route::get('oc/{oc}', [OcController::class, 'show'])->name('oc.show');
    });
    Route::middleware('perm:oc.criar')->group(function () {
        Route::get('oc-novo/form', [OcController::class, 'create'])->name('oc.create');
        Route::post('oc', [OcController::class, 'store'])->name('oc.store');
    });
    Route::delete('oc/{oc}', [OcController::class, 'destroy'])->name('oc.destroy')->middleware('perm:oc.excluir');

    // Manutenção (itens com vencimento) ------------------------------
    Route::resource('manutencao', ManutencaoController::class)->except('show')
        ->parameters(['manutencao' => 'manutencao'])->middleware('perm:manutencao.ver');

    // Ordens de Serviço (mecânica) — bloqueia veículo --------------
    Route::middleware('perm:os.ver')->get('os', [OrdemServicoController::class, 'index'])->name('os.index');
    Route::middleware('perm:os.criar')->group(function () {
        Route::get('os/novo', [OrdemServicoController::class, 'create'])->name('os.create');
        Route::post('os', [OrdemServicoController::class, 'store'])->name('os.store');
    });
    Route::middleware('perm:os.editar')->group(function () {
        Route::get('os/{os}/editar', [OrdemServicoController::class, 'edit'])->name('os.edit');
        Route::put('os/{os}', [OrdemServicoController::class, 'update'])->name('os.update');
    });
    Route::post('os/{os}/finalizar', [OrdemServicoController::class, 'finalizar'])->name('os.finalizar')->middleware('perm:os.finalizar');

    // Histórico / Auditoria ------------------------------------------
    Route::get('historico', [HistoricoController::class, 'index'])->name('historico.index')->middleware('perm:historico.ver');
});
