<?php

use Illuminate\Support\Facades\Schedule;

// Sincronização SASCAR a cada minuto (substitui a Cloud Function agendada).
// Configure SASCAR_USUARIO/SASCAR_SENHA no .env antes de habilitar.
Schedule::command('sascar:sync')->everyMinute()->withoutOverlapping();
