<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Notifications\Notifiable;

/**
 * Usuário do sistema. Substitui o Firebase Auth.
 * RBAC: Usuário -> Cargo -> Permissões (pivot cargo_permissao).
 * Super admin (is_super_admin ou role legado master/admin) ignora validação.
 */
class Usuario extends Authenticatable
{
    use Notifiable;

    protected $table = 'usuarios';

    protected $fillable = [
        'empresa_id', 'nome', 'email', 'password',
        'setor_id', 'cargo_id', 'is_super_admin', 'ativo', 'role',
    ];

    protected $hidden = ['password', 'remember_token'];

    protected function casts(): array
    {
        return [
            'is_super_admin'    => 'boolean',
            'ativo'             => 'boolean',
            'email_verified_at' => 'datetime',
            'password'          => 'hashed',
        ];
    }

    // Relacionamentos -------------------------------------------------
    public function empresa(): BelongsTo
    {
        return $this->belongsTo(Empresa::class);
    }

    public function setor(): BelongsTo
    {
        return $this->belongsTo(Setor::class);
    }

    public function cargo(): BelongsTo
    {
        return $this->belongsTo(Cargo::class);
    }

    // RBAC ------------------------------------------------------------

    /** Super admin: ignora qualquer checagem de permissão. */
    public function isSuperAdmin(): bool
    {
        return $this->is_super_admin
            || in_array($this->role, ['master', 'admin'], true);
    }

    /** Lista de nomes de permissão do cargo (cache em memória). */
    public function permissoes(): array
    {
        if ($this->isSuperAdmin()) {
            return ['*'];
        }
        return $this->cargo
            ? $this->cargo->permissoes->pluck('nome')->all()
            : [];
    }

    /** Checa "<modulo>.<acao>". Super admin sempre true. */
    public function temPermissao(string $permissao): bool
    {
        if ($this->isSuperAdmin()) {
            return true;
        }
        return in_array($permissao, $this->permissoes(), true);
    }
}
