<?php

namespace App\Services;

use App\Models\CercaEletronica;

/**
 * Detecção de ponto dentro de cerca. Porte fiel de
 * functions/src/sascar/geofence.js (sistema Firebase original).
 * Suporta polígono (ray-casting) e círculo (haversine).
 */
class Geofence
{
    private const R_TERRA = 6378137; // raio da Terra em metros (WGS84)

    /** Distância haversine em metros entre dois pontos lat/lng. */
    public static function haversineMetros(float $lat1, float $lng1, float $lat2, float $lng2): float
    {
        $dLat = deg2rad($lat2 - $lat1);
        $dLng = deg2rad($lng2 - $lng1);
        $a = sin($dLat / 2) ** 2
            + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLng / 2) ** 2;
        return 2 * self::R_TERRA * asin(sqrt($a));
    }

    /** Ray-casting: ponto dentro do polígono fechado? $pontos = [[lat,lng],...]. */
    private static function pontoEmPoligono(float $lat, float $lng, array $pontos): bool
    {
        $dentro = false;
        $n = count($pontos);
        for ($i = 0, $j = $n - 1; $i < $n; $j = $i++) {
            $xi = $pontos[$i][1]; $yi = $pontos[$i][0];
            $xj = $pontos[$j][1]; $yj = $pontos[$j][0];
            $intersect = (($yi > $lat) !== ($yj > $lat))
                && ($lng < (($xj - $xi) * ($lat - $yi)) / ($yj - $yi) + $xi);
            if ($intersect) {
                $dentro = !$dentro;
            }
        }
        return $dentro;
    }

    /** (lat,lng) está dentro da cerca? Round-robin entre formatos. */
    public static function pontoEmCerca(float $lat, float $lng, CercaEletronica $cerca): bool
    {
        if ($cerca->formato === 'circulo') {
            if ($cerca->centro_lat === null || $cerca->centro_lng === null || !$cerca->raio) {
                return false;
            }
            return self::haversineMetros($lat, $lng, (float) $cerca->centro_lat, (float) $cerca->centro_lng) <= $cerca->raio;
        }

        $pts = $cerca->pontos;
        if (!is_array($pts) || count($pts) < 3) {
            return false;
        }
        return self::pontoEmPoligono($lat, $lng, $pts);
    }

    /** IDs das cercas que contêm o ponto. */
    public static function cercasContendoPonto(float $lat, float $lng, iterable $cercas): array
    {
        $dentro = [];
        foreach ($cercas as $c) {
            if (self::pontoEmCerca($lat, $lng, $c)) {
                $dentro[] = (string) $c->id;
            }
        }
        return $dentro;
    }
}
