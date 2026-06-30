<?php

namespace App\Providers;

use Illuminate\Support\Facades\Blade;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        // Gate genérico: Gate::allows('permissao', 'frota.editar')
        Gate::define('permissao', function ($usuario, string $permissao) {
            return $usuario->temPermissao($permissao);
        });

        // Diretiva Blade: @perm('frota.editar') ... @endperm
        Blade::if('perm', function (string $permissao) {
            $u = auth()->user();
            return $u && $u->temPermissao($permissao);
        });
    }
}
